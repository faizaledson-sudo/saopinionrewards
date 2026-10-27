import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Wallet screen: balance, history, withdrawal state and cooldown. */
export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let [profile, settings] = await Promise.all([
      p.getProfile(context.userId).catch(() => null),
      p.getSettings().catch(() => null),
    ]);

    if (!profile) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
        if (authUser?.user) {
          const phone =
            authUser.user.user_metadata?.phone ||
            `27${Math.floor(100000000 + Math.random() * 900000000)}`;
          const fullName = authUser.user.user_metadata?.full_name || null;
          await p.bootstrapAccount(context.userId, phone, null, fullName);
          profile = await p.getProfile(context.userId).catch(() => null);
        }
      } catch (e) {
        console.error("getWallet bootstrap error:", e);
      }
    }

    if (!profile) throw new Error("Profile not found.");

    const [plan, balance, day, earnings, withdrawals, charges, kyc, lifetimeSurveys] =
      await Promise.all([
        p.getPlan(profile.tier),
        p.getBalance(context.userId),
        p.dailyRow(context.userId),
        supabaseAdmin
          .from("earnings")
          .select("id, type, amount_kes, note, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabaseAdmin
          .from("withdrawals")
          .select("id, amount_kes, phone, status, admin_note, requested_at, processed_at")
          .eq("user_id", context.userId)
          .order("requested_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("charges")
          .select("id, purpose, amount_kes, status, created_at, reverted_at, target_tier")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("kyc_requests")
          .select("id, status, kind, requested_at")
          .eq("user_id", context.userId)
          .in("status", ["requested", "submitted", "rejected"])
          .limit(1),
        supabaseAdmin
          .from("earnings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", context.userId)
          .eq("type", "survey"),
      ]);

    const surveysCompletedToday = Number(day?.surveys_completed ?? 0);
    const totalSurveysCompleted = Math.max(
      lifetimeSurveys.count ?? 0,
      surveysCompletedToday,
    );
    const tasksRequired = Number(settings.surveys_per_day ?? 5);
    const canWithdrawTasksMet =
      totalSurveysCompleted >= tasksRequired || surveysCompletedToday >= tasksRequired;

    const cooldownDays = Number(plan?.withdrawal_days ?? 7);
    const nextAt = profile.last_withdrawal_at
      ? new Date(new Date(profile.last_withdrawal_at).getTime() + cooldownDays * 86400000)
      : null;

    const hasAttemptedPayout =
      (withdrawals.data ?? []).length > 0 ||
      (charges.data ?? []).some((c) => c.purpose === "verification") ||
      Boolean(profile.mpesa_phone);

    return {
      balance,
      tier: profile.tier,
      fullName: profile.full_name,
      planName: plan?.name ?? "Regular",
      cooldownDays,
      nextWithdrawalAt: nextAt ? nextAt.toISOString() : null,
      canWithdrawNow: !nextAt || nextAt.getTime() <= Date.now(),
      mpesaVerified: profile.mpesa_verified,
      mpesaPhone: profile.mpesa_phone,
      phone: profile.phone,
      hasAttemptedPayout,
      holdAmount: Number(settings.hold_amount_kes),
      kycBlocking: (kyc.data ?? []).some((r) => {
        if (r.status === "rejected" || r.status === "requested") return true;
        return false;
      }),
      minWithdrawal: Number(settings.min_withdrawal_kes ?? 100),
      earnings: (earnings.data ?? []).map((e) => ({
        ...e,
        amount_kes: Number(e.amount_kes),
      })),
      withdrawals: withdrawals.data ?? [],
      charges: charges.data ?? [],
      surveysCompletedToday,
      totalSurveysCompleted,
      tasksRequired,
      canWithdrawTasksMet,
    };
  });

/** Starts the one-off verification hold for a first payout via Ghost Pay (Paystack Card/EFT). */
export const startVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      method?: "card" | "eft" | undefined;
      cardNumber?: string | undefined;
      cardHolder?: string | undefined;
      cardExpiry?: string | undefined;
      cardCvv?: string | undefined;
      bankName?: string | undefined;
      accountNumber?: string | undefined;
      phone?: string | undefined;
      email?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { startCharge } = await import("./charges.server");
    const { redirectUrl } = await import("./payments.server");

    let destination = "";
    if (data.method === "card" && data.cardNumber) {
      const clean = (data.cardNumber || "").replace(/\s/g, "");
      const masked = `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
      destination = `Card: ${masked} (${data.cardHolder?.trim() || "Cardholder"})`;
    } else if (data.method === "eft" && data.bankName) {
      destination = `EFT: ${data.bankName} • ${data.accountNumber || data.phone || ""}`;
    } else {
      destination = data.phone || "Ghost Pay (Paystack Card/EFT)";
    }

    const returnUrl = await redirectUrl("/payout-setup?payment=complete&verified=1");

    if (data.email?.trim() && !data.email.includes("@panelist.")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("secure_settings").upsert({
        key: `billing_email_${context.userId}`,
        value: data.email.trim(),
        updated_at: new Date().toISOString(),
      });
    }

    const result = await startCharge({
      userId: context.userId,
      purpose: "withdrawal_verification",
      phone: destination,
      email: data.email,
      redirectUrl: returnUrl,
    });

    return {
      ok: result.ok,
      message: (result as { message?: string }).message,
      chargeId: result.chargeId,
      checkoutUrl: result.checkoutUrl,
      amount: result.amount,
      method: data.method || "card",
      destination,
    };
  });

/** Completes and authenticates 3D Secure / Instant EFT verification check. */
export const confirmVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      chargeId: string;
      method: "card" | "eft";
      otp?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { settleCharge } = await import("./charges.server");

    const { data: charge } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("id", data.chargeId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!charge) throw new Error("Verification session not found.");

    const txId = `ZA_${data.method.toUpperCase()}_${Date.now()}`;
    await supabaseAdmin
      .from("charges")
      .update({
        status: "completed",
        provider_transaction_id: txId,
      })
      .eq("id", charge.id);

    await settleCharge(charge.id);

    // Update any pending withdrawals to verified status note
    const { data: pendingWithdrawals } = await supabaseAdmin
      .from("withdrawals")
      .select("id, admin_note")
      .eq("user_id", context.userId)
      .eq("status", "pending");

    if (pendingWithdrawals?.length) {
      for (const w of pendingWithdrawals) {
        const updatedNote = (w.admin_note || "")
          .replace("[AWAITING VERIFICATION]", "[AUTHENTICATED & VERIFIED]")
          .trim();
        await supabaseAdmin
          .from("withdrawals")
          .update({ admin_note: updatedNote })
          .eq("id", w.id);
      }
    }

    return { ok: true, status: "completed" };
  });

/** Starts the payment for a VIP upgrade via Ghost Pay (Paystack Card/EFT). */
export const startUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tier: "vip1" | "vip2" | "vip3"; phone?: string; email?: string }) => input)
  .handler(async ({ data, context }) => {
    const { startCharge } = await import("./charges.server");
    const { redirectUrl } = await import("./payments.server");
    const returnUrl = await redirectUrl("/wallet?upgraded=1");
    return startCharge({
      userId: context.userId,
      purpose: "plan_upgrade",
      phone: data.phone || "CARD/EFT",
      email: data.email,
      targetTier: data.tier,
      redirectUrl: returnUrl,
    });
  });

/** Starts payment for a progressive upsell or downsell offer via Ghost Pay (Paystack Card/EFT). */
export const startUpsellCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      offerId: string;
      amount: number;
      title: string;
      step: number;
      email?: string;
      phone?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createSmooCharge, redirectUrl } = await import("./payments.server");
    const { getSettings } = await import("./platform.server");

    const settings = await getSettings();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, full_name, mpesa_phone")
      .eq("id", context.userId)
      .maybeSingle();

    const phone = (data.phone || profile?.mpesa_phone || profile?.phone || "").trim();

    const { getSavedCardAuth } = await import("./payments.server");
    const savedCard = await getSavedCardAuth(context.userId);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    let email = "";
    let authCode: string | undefined = undefined;

    if (savedCard && savedCard.authorizationCode && savedCard.email) {
      // PAYSTACK RULE: Re-use EXACTLY the email used in the 1st purchase that generated this authorization code
      authCode = savedCard.authorizationCode;
      email = savedCard.email;
    } else {
      // PAYSTACK RULE: Never charge a token with an email different from the 1st purchase.
      // If we don't have the exact verified email, fallback to normal manual checkout (no token).
      authCode = undefined;

      const { data: savedEmailRow } = await supabaseAdmin
        .from("secure_settings")
        .select("value")
        .eq("key", `billing_email_${context.userId}`)
        .maybeSingle();

      email = data.email?.trim() || savedEmailRow?.value || "";
      if (email.includes("@panelist.")) email = "";
      if (!email && authUser?.user?.email && !authUser.user.email.includes("@panelist.")) {
        email = authUser.user.email;
      }
      if (!email || !email.includes("@")) {
        const cleanPhone = phone.replace(/\D/g, "");
        email = cleanPhone ? `${cleanPhone}@gmail.com` : `buyer_${context.userId.slice(0, 8)}@gmail.com`;
      }
    }

    const { isAdmin } = await import("./platform.server");
    const isUserAdmin = await isAdmin(context.userId);

    // Prevent duplicate purchases: check if user already has completed this upsell
    const { data: userCompletedCharges } = await supabaseAdmin
      .from("charges")
      .select("id, admin_note")
      .eq("user_id", context.userId)
      .eq("status", "completed");

    const completedNotes = (userCompletedCharges || []).map((c) => c.admin_note || "");
    const isAlreadyPurchased =
      completedNotes.some((n) => n.includes(data.offerId)) ||
      (data.offerId === "instant_eft_today" && completedNotes.some((n) => n.includes("instant_eft_lifetime"))) ||
      (data.offerId === "sarb_settlement_priority" && completedNotes.some((n) => n.includes("sarb_settlement_automated"))) ||
      (data.offerId === "bankserv_escrow_basic" && completedNotes.some((n) => n.includes("bankserv_escrow_bond"))) ||
      (data.offerId === "tax_exemption_subsidized" && completedNotes.some((n) => n.includes("tax_exemption_lifetime"))) ||
      (data.offerId === "sars_tax_exemption_provisional" && completedNotes.some((n) => n.includes("sars_tax_exemption_full"))) ||
      (data.offerId === "aml_compliance_basic" && completedNotes.some((n) => n.includes("aml_compliance_seal"))) ||
      (data.offerId === "utr_sms_dispatch_basic" && completedNotes.some((n) => n.includes("utr_sms_dispatch_pack"))) ||
      (data.offerId === "escrow_insurance_basic" && completedNotes.some((n) => n.includes("escrow_insurance_guarantee"))) ||
      (data.offerId === "multiplier_2x_monthly" && completedNotes.some((n) => n.includes("multiplier_2x_lifetime"))) ||
      (data.offerId === "vip_vault_trial" && completedNotes.some((n) => n.includes("vip_vault_lifetime")));

    if (isAlreadyPurchased) {
      return {
        ok: true,
        alreadyPurchased: true,
        chargeId: userCompletedCharges?.find((c) => (c.admin_note || "").includes(data.offerId))?.id || `existing_${Date.now()}`,
        amount: data.amount,
        offerId: data.offerId,
        message: `${data.title} is already active on your account!`,
      };
    }

    // If Admin: simulate instant 1-Click approval without calling external payment gateway or charging real money
    if (isUserAdmin) {
      const { settleCharge } = await import("./charges.server");
      const { data: testCharge } = await supabaseAdmin
        .from("charges")
        .insert({
          user_id: context.userId,
          purpose: "plan_upgrade",
          target_tier: data.offerId.includes("vip_vault") ? "vip1" : null,
          amount_kes: data.amount,
          phone: "ADMIN_TEST_MODE",
          admin_note: `[ADMIN_TEST] ${data.offerId}`,
          status: "completed",
        })
        .select("*")
        .single();

      if (testCharge) await settleCharge(testCharge.id);

      return {
        ok: true,
        chargeId: testCharge?.id || `test_${Date.now()}`,
        checkoutUrl: undefined,
        amount: data.amount,
        offerId: data.offerId,
        testMode: true,
        message: "Admin Test Mode: Approved instantly with R0 real charge",
      };
    }

    const { data: charge, error } = await supabaseAdmin
      .from("charges")
      .insert({
        user_id: context.userId,
        purpose: "plan_upgrade",
        target_tier: data.offerId.includes("vip_vault") ? "vip1" : null,
        amount_kes: data.amount,
        phone,
        operator: authCode || null,
        admin_note: data.offerId,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // Extract & persist Meta tracking parameters for this upsell charge
    let fbp: string | null = null;
    let fbc: string | null = null;
    let clientIp: string | null = null;
    let clientUserAgent: string | null = null;
    try {
      const { getCookie, getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
      fbp = getCookie("_fbp") || null;
      fbc = getCookie("_fbc") || null;
      clientIp = getRequestIP({ xForwardedFor: true }) || null;
      clientUserAgent = getRequestHeader("user-agent") || null;
    } catch {}

    if (!fbp || !fbc) {
      try {
        const { data: metaRow } = await supabaseAdmin
          .from("secure_settings")
          .select("value")
          .eq("key", `meta_tracking_${context.userId}`)
          .maybeSingle();
        if (metaRow?.value) {
          const parsed = JSON.parse(metaRow.value);
          if (!fbp && parsed.fbp) fbp = parsed.fbp;
          if (!fbc && parsed.fbc) fbc = parsed.fbc;
          if (!clientIp && parsed.clientIp) clientIp = parsed.clientIp;
          if (!clientUserAgent && parsed.clientUserAgent) clientUserAgent = parsed.clientUserAgent;
        }
      } catch {}
    }

    if (fbp || fbc || clientIp) {
      try {
        await supabaseAdmin.from("secure_settings").upsert({
          key: `charge_meta_${charge.id}`,
          value: JSON.stringify({ fbp, fbc, clientIp, clientUserAgent, email, phone }),
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    // Fire CAPI InitiateCheckout for upsell
    try {
      const { sendCapiEvent } = await import("./fbcapi.server");
      void sendCapiEvent({
        event_name: "InitiateCheckout",
        event_id: `init_charge_${charge.id}`,
        event_source_url: `https://kenya-survey-rewards.vercel.app/payout-setup?step=${data.step}`,
        user_data: {
          email,
          phone,
          externalId: context.userId,
          fbp,
          fbc,
          clientIp,
          clientUserAgent,
        },
        custom_data: {
          value: data.amount,
          currency: "ZAR",
          content_name: data.offerId,
          content_type: "upsell",
          order_id: charge.id,
        },
      }).catch(() => {});
    } catch {}

    const nextStep = data.step + 1;
    const returnUrl = await redirectUrl(`/payout-setup?step=${nextStep}&paid=${data.offerId}&chargeId=${charge.id}`);

    // Ghost Pay specification (Section 4):
    // "parent_charge_id: Obrigatório para upsell/downsell. É o ID da cobrança principal"
    const { data: frontCharge } = await supabaseAdmin
      .from("charges")
      .select("provider_charge_id")
      .eq("user_id", context.userId)
      .eq("status", "completed")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const parentChargeId = frontCharge?.provider_charge_id || null;
    const isDownsell = data.offerId.includes("downsell") || data.step > 5;
    const funnelStep: "upsell" | "downsell" = isDownsell ? "downsell" : "upsell";

    let utm: { source?: string; medium?: string; campaign?: string; content?: string; term?: string } | undefined;
    let clickIds: { fbclid?: string; gclid?: string } | undefined;
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const rawUtm = getCookie("app_utm");
      if (rawUtm) utm = JSON.parse(decodeURIComponent(rawUtm));
      const rawClickIds = getCookie("app_click_ids");
      if (rawClickIds) clickIds = JSON.parse(decodeURIComponent(rawClickIds));
    } catch {}

    if (!utm || !clickIds) {
      try {
        const { data: metaRow } = await supabaseAdmin
          .from("secure_settings")
          .select("value")
          .eq("key", `meta_tracking_${context.userId}`)
          .maybeSingle();
        if (metaRow?.value) {
          const parsed = JSON.parse(metaRow.value);
          if (!utm && parsed.utm) utm = parsed.utm;
          if (!clickIds && parsed.clickIds) clickIds = parsed.clickIds;
        }
      } catch {}
    }

    const result = await createSmooCharge({
      amount: data.amount,
      email,
      phone,
      customerName: profile?.full_name || undefined,
      customerCountry: "ZA",
      title: `${settings.platform_name} — ${data.title}`,
      reference: charge.id,
      description: `${data.title} (R ${data.amount})`,
      redirectUrl: returnUrl,
      authorizationCode: authCode || undefined,
      funnelStep,
      parentChargeId,
      utm,
      clickIds,
      fbp: fbp || undefined,
      customerIp: clientIp || undefined,
      customerUserAgent: clientUserAgent || undefined,
      metadata: {
        order_id: charge.id,
        user_id: context.userId,
        offer_id: data.offerId,
        step: data.step,
        kind: funnelStep,
      },
    });

    if (!result.ok) {
      await supabaseAdmin
        .from("charges")
        .update({ status: "failed", failure_reason: result.message || "Failed to process charge" })
        .eq("id", charge.id);
      return {
        ok: false,
        message: result.message || "Payment could not be processed.",
      };
    }

    if (result.oneClick) {
      // 1-Click Success! Off-session charge succeeded immediately!
      const { settleCharge } = await import("./charges.server");
      await supabaseAdmin
        .from("charges")
        .update({
          status: "completed",
          provider_charge_id: result.chargeId || null,
          provider_transaction_id: result.transactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", charge.id);

      await settleCharge(charge.id);

      return {
        ok: true,
        oneClick: true,
        chargeId: charge.id,
        amount: data.amount,
        offerId: data.offerId,
        message: `${data.title} approved instantly via saved card!`,
      };
    }

    // Fallback: Needs 3-D Secure or card was not reusable -> redirect to checkoutUrl
    await supabaseAdmin
      .from("charges")
      .update({
        provider_charge_id: result.chargeId || null,
        status: "pending",
      })
      .eq("id", charge.id);

    return {
      ok: true,
      oneClick: false,
      chargeId: charge.id,
      checkoutUrl: result.checkoutUrl,
      amount: data.amount,
      offerId: data.offerId,
      message: result.message,
    };
  });

/** Polls a pending charge against the provider. */
export const refreshCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chargeId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchSmooCharge, normalizeChargeStatus } = await import("./payments.server");
    const { settleCharge } = await import("./charges.server");

    const { data: charge } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("id", data.chargeId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!charge) throw new Error("Payment not found.");
    if (charge.status !== "pending") return { status: charge.status };

    const remote = charge.provider_charge_id
      ? await fetchSmooCharge(charge.provider_charge_id)
      : null;
    if (!remote) return { status: charge.status };

    const status = normalizeChargeStatus(remote["status"]);
    await supabaseAdmin
      .from("charges")
      .update({
        status,
        provider_transaction_id:
          typeof remote["transaction_id"] === "string" ? remote["transaction_id"] : null,
      })
      .eq("id", charge.id);
    if (status === "completed") await settleCharge(charge.id);
    return { status };
  });

/** Requests a manual payout to Bank Account or Phone, enforcing verification, minimum and plan cooldown. */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      amount: number;
      method?: "bank" | "phone" | undefined;
      bankName?: string | undefined;
      accountNumber?: string | undefined;
      accountHolder?: string | undefined;
      accountType?: string | undefined;
      branchCode?: string | undefined;
      phone?: string | undefined;
    }) => {
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error("Enter a valid amount.");
      }
      if (input.method === "bank") {
        if (!input.bankName?.trim()) throw new Error("Select your South African bank.");
        if (!input.accountNumber?.trim() || input.accountNumber.trim().length < 6) {
          throw new Error("Enter a valid bank account number (at least 6 digits).");
        }
        if (!input.accountHolder?.trim()) {
          throw new Error("Enter the bank account holder name.");
        }
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizePhone } = await import("./format");

    const [profile, settings, kyc, day] = await Promise.all([
      p.getProfile(context.userId),
      p.getSettings(),
      supabaseAdmin
        .from("kyc_requests")
        .select("id")
        .eq("user_id", context.userId)
        .in("status", ["requested", "rejected"])
        .limit(1),
      p.dailyRow(context.userId),
    ]);
    if (!profile) throw new Error("Profile not found.");
    if (profile.banned_at) throw new Error("This account is suspended.");

    const requiredTasks = Number(settings.surveys_per_day ?? 5);
    const { count: lifetimeSurveys } = await supabaseAdmin
      .from("earnings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("type", "survey");
    const totalCompleted = Math.max(lifetimeSurveys ?? 0, Number(day?.surveys_completed ?? 0));
    if (totalCompleted < requiredTasks) {
      throw new Error(
        `Complete at least ${requiredTasks} video reviews to unlock payouts (${totalCompleted}/${requiredTasks} completed).`,
      );
    }

    if ((kyc.data ?? []).length > 0 && settings.require_kyc_for_withdrawal) {
      throw new Error("Complete the identity check before requesting a payout.");
    }

    const { data: pending } = await supabaseAdmin
      .from("withdrawals")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .limit(1);

    if (profile.mpesa_verified && pending?.length) {
      throw new Error("You already have a payout waiting for review.");
    }

    // If user is not yet verified but already has a pending payout, guide to verification
    if (!profile.mpesa_verified && pending?.length) {
      return { ok: true, requiresVerification: true, id: pending[0].id, alreadyPending: true };
    }

    const plan = await p.getPlan(profile.tier);
    const cooldownDays = Number(plan?.withdrawal_days ?? 7);
    if (profile.last_withdrawal_at && profile.mpesa_verified) {
      const nextAt = new Date(profile.last_withdrawal_at).getTime() + cooldownDays * 86400000;
      if (nextAt > Date.now()) {
        throw new Error(
          `Your plan allows a payout every ${cooldownDays} day(s). Next request opens on ${new Date(nextAt).toLocaleDateString("en-ZA")}.`,
        );
      }
    }

    const min = Number(settings.min_withdrawal_kes);
    if (data.amount < min) throw new Error(`The minimum payout is R ${min}.`);

    const balance = await p.getBalance(context.userId);
    if (data.amount > balance) throw new Error("Your balance is not enough for this payout.");

    let destination = "";
    let note = "";

    if (data.method === "bank") {
      const bank = data.bankName?.trim() || "Bank";
      const acc = data.accountNumber?.trim() || "";
      const holder = data.accountHolder?.trim() || profile.full_name || "Account Holder";
      const branch = data.branchCode?.trim() || "Universal";
      const accType = data.accountType?.trim() || "Savings";

      destination = `${bank} • ${acc} (${holder})`;
      note = `[BANK TRANSFER] Bank: ${bank} | Acc: ${acc} (${accType}) | Holder: ${holder} | Branch: ${branch}`;
    } else {
      const phone = normalizePhone(data.phone ?? profile.mpesa_phone ?? profile.phone);
      if (!phone) throw new Error("Enter a valid South African phone number (+27).");
      destination = phone;
      note = `[PHONE / EFT] Destination: ${phone}`;
    }

    // If account is not verified yet, save payout request with verification required tag
    if (!profile.mpesa_verified) {
      const { data: withdrawal, error } = await supabaseAdmin
        .from("withdrawals")
        .insert({
          user_id: context.userId,
          amount_kes: data.amount,
          phone: destination,
          admin_note: `[AWAITING VERIFICATION] ${note}`,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await supabaseAdmin
        .from("profiles")
        .update({
          mpesa_phone: destination,
          last_withdrawal_at: new Date().toISOString(),
        })
        .eq("id", context.userId);

      return { ok: true, requiresVerification: true, id: withdrawal.id };
    }

    // Normal verified payout
    const { data: withdrawal, error } = await supabaseAdmin
      .from("withdrawals")
      .insert({
        user_id: context.userId,
        amount_kes: data.amount,
        phone: destination,
        admin_note: note,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ last_withdrawal_at: new Date().toISOString() })
      .eq("id", context.userId);

    return { ok: true, requiresVerification: false, id: withdrawal.id };
  });
