import { getSecureSetting } from "./secure-settings.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface GreenSendOrder {
  idempotency_key: string;
  channel: "email";
  sender_name?: string;
  to: string;
  message: {
    subject: string;
    text?: string;
    html?: string;
    reply_to?: string;
  };
  metadata?: Record<string, string>;
}

export interface GreenSendResult {
  ok: boolean;
  job_id?: string;
  status?: string;
  duplicate?: boolean;
  error?: string;
}

export interface GreenSendDispatchLogEntry {
  job_id?: string;
  idempotency_key: string;
  to: string;
  subject: string;
  status: "QUEUED" | "DUPLICATE" | "FAILED";
  error?: string;
  created_at: string;
  triggered_by?: string;
}

/**
 * Retrieves the Green Send API Key from secure_settings or environment variables.
 */
export async function getGreenSendApiKey(): Promise<string | null> {
  const key = await getSecureSetting("green_send_api_key");
  return key?.trim() || process.env.GREEN_SEND_API_KEY?.trim() || null;
}

/**
 * Appends a dispatch record to app_settings.greensend_dispatch_log for audit & dashboard tracking.
 */
async function appendGreenSendLog(entry: GreenSendDispatchLogEntry): Promise<void> {
  try {
    const { data: logRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "greensend_dispatch_log")
      .maybeSingle();

    const currentLog = (logRow?.value as GreenSendDispatchLogEntry[]) || [];
    currentLog.unshift(entry);

    await supabaseAdmin.from("app_settings").upsert(
      {
        key: "greensend_dispatch_log",
        value: currentLog.slice(0, 100) as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  } catch (err) {
    console.error("[GreenSend] Failed to append dispatch log:", err);
  }
}

/**
 * Sends an email order via Green Send (https://greensend.app).
 */
export async function sendGreenSendEmail(
  order: Omit<GreenSendOrder, "channel">,
  options?: { triggeredBy?: string },
): Promise<GreenSendResult> {
  const apiKey = await getGreenSendApiKey();
  if (!apiKey) {
    const error = "Green Send API Key is not configured in secure_settings or GREEN_SEND_API_KEY.";
    console.warn(`[GreenSend] ${error}`);
    return { ok: false, error };
  }

  const cleanTo = order.to.trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes("@") || cleanTo.includes("@panelist.")) {
    return { ok: false, error: `Invalid recipient email (${order.to})` };
  }

  const payload: GreenSendOrder = {
    idempotency_key: order.idempotency_key,
    channel: "email",
    sender_name: order.sender_name || "Opinion Rewards",
    to: cleanTo,
    message: {
      subject: order.message.subject.trim(),
      text: order.message.text,
      html: order.message.html,
      reply_to: order.message.reply_to || "support@opinionrewards.co.za",
    },
    ...(order.metadata ? { metadata: order.metadata } : {}),
  };

  const baseUrl = process.env.GREEN_SEND_URL || "https://greensend.app";

  let lastError: string = "Unknown error";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(new URL("/v1/messages", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });

      const data = (await res.json()) as {
        job_id?: string;
        status?: string;
        duplicate?: boolean;
        error?: string;
        details?: unknown;
      };

      if (res.status === 200 || res.status === 202) {
        await appendGreenSendLog({
          job_id: data.job_id,
          idempotency_key: order.idempotency_key,
          to: cleanTo,
          subject: order.message.subject,
          status: data.duplicate ? "DUPLICATE" : "QUEUED",
          created_at: new Date().toISOString(),
          triggered_by: options?.triggeredBy || "api_send",
        });

        return {
          ok: true,
          job_id: data.job_id,
          status: data.status,
          duplicate: Boolean(data.duplicate),
        };
      }

      lastError = data.error
        ? `Green Send error: ${data.error}`
        : `Green Send returned HTTP ${res.status}`;

      // If it's a 4xx error (e.g. invalid email format), don't retry
      if (res.status >= 400 && res.status < 500 && res.status !== 409) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Failed to connect to Green Send";
      if (attempt < 2) {
        // Wait 1.5s before retry as per Green Send docs
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
    }
  }

  await appendGreenSendLog({
    idempotency_key: order.idempotency_key,
    to: cleanTo,
    subject: order.message.subject,
    status: "FAILED",
    error: lastError,
    created_at: new Date().toISOString(),
    triggered_by: options?.triggeredBy || "api_send",
  });

  return { ok: false, error: lastError };
}

/**
 * Retrieves the billing email for a user from secure_settings or auth profile.
 */
export async function getUserBillingEmail(userId: string): Promise<string | null> {
  const [billRow, authEmailRow] = await Promise.all([
    supabaseAdmin.from("secure_settings").select("value").eq("key", `billing_email_${userId}`).maybeSingle(),
    supabaseAdmin.from("secure_settings").select("value").eq("key", `card_auth_email_${userId}`).maybeSingle(),
  ]);

  const candidate = (billRow.data?.value || authEmailRow.data?.value || "").trim();
  if (candidate && candidate.includes("@") && !candidate.includes("@panelist.")) {
    return candidate;
  }

  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email?.trim();
    if (email && email.includes("@") && !email.includes("@panelist.")) {
      return email;
    }
  } catch {}

  return null;
}

/**
 * Builds high-converting HTML and plain text recovery email templates.
 */
/**
 * Helper to build high-inbox, clean transactional HTML matching Google & Resend anti-spam standards.
 */
function createCleanTransactionalEmail(options: {
  pretitle: string;
  title: string;
  firstName: string;
  paragraphs: string[];
  highlightText: string;
  buttonText: string;
  buttonUrl: string;
}): string {
  const paragraphsHtml = options.paragraphs
    .map((p) => `<p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">${p}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Opinion Rewards</title>
</head>
<body style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Opinion Rewards</span>
    </div>

    <div style="font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
      ${options.pretitle}
    </div>

    <h2 style="font-size: 19px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
      ${options.title}
    </h2>

    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      Hi ${options.firstName},
    </p>

    ${paragraphsHtml}

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <span style="font-size: 14px; font-weight: 600; color: #166534;">
        ${options.highlightText}
      </span>
    </div>

    <div style="margin: 28px 0; text-align: left;">
      <a href="${options.buttonUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
        ${options.buttonText} →
      </a>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      Need assistance with your panel account? Simply reply directly to this email to reach our desk.
    </p>

    <div style="margin-top: 24px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
      Opinion Rewards South Africa • Member Payout Desk<br>
      To manage your notification preferences or unsubscribe, reply with "unsubscribe".
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds multi-step perpetual recovery templates for unverified leads (Front - R200).
 */
export function buildPerpetualFrontTemplate(step: number, name: string, recoveryUrl: string) {
  const firstName = name?.trim().split(" ")[0] || "Valued Panelist";

  if (step === 1) {
    const subject = "Update regarding your pending Opinion Rewards transfer";
    const paragraphs = [
      "We noticed you recently started setting up your payout transfer of <strong>R3,800.00</strong>, but the final confirmation step was not completed.",
      "Your accumulated panel earnings remain safely kept in your wallet. You can resume and finish your transfer whenever you are ready.",
    ];
    const text = `Hi ${firstName},\n\nWe noticed you recently started setting up your payout transfer of R3,800.00, but the final confirmation step was not completed.\n\nYour rewards balance remains safely reserved in your account. You can easily resume and finish your transfer whenever you are ready:\n\n${recoveryUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Transfer Confirmation",
      title: "Your rewards balance is waiting for you",
      firstName,
      paragraphs,
      highlightText: "Reserved Balance: R3,800.00 (Ready to transfer)",
      buttonText: "Resume transfer setup",
      buttonUrl: recoveryUrl,
    });
    return { subject, text, html };
  }

  if (step === 2) {
    const subject = "Transfer update: Compatible bank destinations for your payout";
    const paragraphs = [
      "This is a quick follow-up regarding your reserved survey earnings of <strong>R3,800.00</strong>.",
      "Our system supports direct electronic transfers to all major South African banking institutions. Once confirmed, funds are routed directly to your account.",
    ];
    const text = `Hi ${firstName},\n\nThis is a quick follow-up regarding your reserved survey earnings of R3,800.00.\n\nOur system supports direct electronic transfers to Capitec, FNB, Standard Bank, Nedbank, Absa and TymeBank. Once confirmed, funds are routed directly to your account:\n\n${recoveryUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Bank Compatibility",
      title: "Direct transfer to your preferred South African bank",
      firstName,
      paragraphs,
      highlightText: "Supported: Capitec, FNB, Standard Bank, Nedbank, Absa & TymeBank",
      buttonText: "Confirm bank destination",
      buttonUrl: recoveryUrl,
    });
    return { subject, text, html };
  }

  if (step === 3) {
    const subject = "Quick check: Do you need assistance with your rewards payout?";
    const paragraphs = [
      "We noticed your rewards balance of <strong>R3,800.00</strong> is still pending transfer.",
      "If you encountered any questions during the verification step or need help connecting your bank account, our team is available to assist you.",
    ];
    const text = `Hi ${firstName},\n\nWe noticed your rewards balance of R3,800.00 is still pending transfer.\n\nIf you encountered any questions during the verification step or need help connecting your bank account, our team is available to assist you:\n\n${recoveryUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Member Support",
      title: "We are here to help finalize your transfer",
      firstName,
      paragraphs,
      highlightText: "Support Status: Our clearing desk is available to assist",
      buttonText: "Complete your transfer",
      buttonUrl: recoveryUrl,
    });
    return { subject, text, html };
  }

  if (step === 4) {
    const subject = "Important status update regarding your rewards transfer queue";
    const paragraphs = [
      "Your survey panel allocation of <strong>R3,800.00</strong> is currently held in our active disbursement queue.",
      "To ensure your priority spot remains active and ready for immediate settlement, please complete your one-time verification.",
    ];
    const text = `Hi ${firstName},\n\nYour survey panel allocation of R3,800.00 is currently held in our active disbursement queue.\n\nTo ensure your priority spot remains active and ready for immediate settlement, please complete your one-time verification:\n\n${recoveryUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Transfer Queue",
      title: "Your allocated withdrawal slot is active",
      firstName,
      paragraphs,
      highlightText: "Transfer Queue: Priority allocation held in your account",
      buttonText: "Release your payout",
      buttonUrl: recoveryUrl,
    });
    return { subject, text, html };
  }

  // Step 5 and beyond (recurring reminder)
  const subject = "Your accumulated survey rewards are still waiting for you";
  const paragraphs = [
    "Your rewards wallet balance of <strong>R3,800.00</strong> is still safely reserved on your panel account.",
    "Whenever you are ready, you can finalize your account setup and withdraw your accumulated earnings directly to your bank.",
  ];
  const text = `Hi ${firstName},\n\nYour rewards wallet balance of R3,800.00 is still safely reserved on your panel account.\n\nWhenever you are ready, you can finalize your account setup and withdraw your accumulated earnings directly to your bank:\n\n${recoveryUrl}\n\nBest regards,\nOpinion Rewards Team`;
  const html = createCleanTransactionalEmail({
    pretitle: "Rewards Notice",
    title: "Your R3,800 balance remains available",
    firstName,
    paragraphs,
    highlightText: "Wallet Balance: R3,800.00 (Reserved for withdrawal)",
    buttonText: "Access your rewards",
    buttonUrl: recoveryUrl,
  });
  return { subject, text, html };
}

/**
 * Builds multi-step perpetual recovery templates for verified leads (Upsell - Instant EFT R99/R149).
 */
export function buildPerpetualUpsellTemplate(step: number, name: string, upsellUrl: string) {
  const firstName = name?.trim().split(" ")[0] || "Valued Panelist";

  if (step === 1) {
    const subject = "Confirmation: Your payout delivery options are ready";
    const paragraphs = [
      "Your account has been successfully verified! Your transfer of <strong>R3,800.00</strong> is currently scheduled in the standard batch clearing queue (48-72 hours).",
      "If you bank with Capitec, FNB, Standard Bank, Nedbank, TymeBank or Absa, you can select priority Instant EFT delivery to receive funds immediately in 5 minutes.",
    ];
    const text = `Hi ${firstName},\n\nYour account has been verified successfully. Your payout transfer of R3,800.00 is currently scheduled in the standard batch clearing queue (48-72 hours).\n\nIf you prefer to receive your funds in 5 minutes via Instant EFT instead of waiting for standard batch processing, you can choose priority delivery here:\n\n${upsellUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Account Verified",
      title: "Choose your payout delivery speed",
      firstName,
      paragraphs,
      highlightText: "Delivery Option: Priority Instant EFT available (5 minutes)",
      buttonText: "Choose transfer speed",
      buttonUrl: upsellUrl,
    });
    return { subject, text, html };
  }

  if (step === 2) {
    const subject = "Transfer notice: Skip standard batch processing for your deposit";
    const paragraphs = [
      "This is an update regarding your verified payout transfer of <strong>R4,000.00</strong>.",
      "Standard interbank clearing can take up to 3 business days. By selecting Instant EFT priority dispatch, your deposit is authorized for instant credit directly to your account.",
    ];
    const text = `Hi ${firstName},\n\nThis is an update regarding your verified payout transfer of R4,000.00.\n\nStandard interbank clearing can take up to 3 business days. By selecting Instant EFT priority dispatch, your deposit is authorized for instant credit directly to your account:\n\n${upsellUrl}\n\nBest regards,\nOpinion Rewards Team`;
    const html = createCleanTransactionalEmail({
      pretitle: "Priority Dispatch",
      title: "Fast-track delivery for your R4,000 payout",
      firstName,
      paragraphs,
      highlightText: "Standard clearing: 48-72h • Priority EFT: Instant (5 mins)",
      buttonText: "Activate priority delivery",
      buttonUrl: upsellUrl,
    });
    return { subject, text, html };
  }

  // Step 3 and beyond
  const subject = "Confirmation: Your payout documentation is ready for review";
  const paragraphs = [
    "This is a confirmation update regarding your scheduled rewards payout of <strong>R4,000.00</strong>.",
    "To ensure your payout settings are documented for direct delivery to your selected account, please review and finalize your payout profile.",
  ];
  const text = `Hi ${firstName},\n\nThis is a confirmation update regarding your scheduled rewards payout of R4,000.00.\n\nTo ensure your payout settings are documented for direct delivery to your selected account, please review and finalize your payout profile:\n\n${upsellUrl}\n\nBest regards,\nOpinion Rewards Team`;
  const html = createCleanTransactionalEmail({
    pretitle: "Transfer Documentation",
    title: "Your payout documentation is ready for review",
    firstName,
    paragraphs,
    highlightText: "Payout Status: Verification documentation ready",
    buttonText: "Review payout documentation",
    buttonUrl: upsellUrl,
  });
  return { subject, text, html };
}

/**
 * Triggers an automated recovery email when a checkout is abandoned or fails.
 */
export async function triggerCheckoutRecoveryEmail(userId: string, chargeId?: string): Promise<GreenSendResult> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, mpesa_verified")
    .eq("id", userId)
    .maybeSingle();

  // If already verified or doesn't exist, skip
  if (!profile || profile.mpesa_verified) {
    return { ok: false, error: "User is already verified or profile not found." };
  }

  const email = await getUserBillingEmail(userId);
  if (!email) {
    return { ok: false, error: "No valid billing email found for this user." };
  }

  // Anti-spam check: prevent sending more than once every 20 hours to the same user
  const { data: lastSent } = await supabaseAdmin
    .from("secure_settings")
    .select("value")
    .eq("key", `last_recovery_email_${userId}`)
    .maybeSingle();

  if (lastSent?.value) {
    const elapsedMs = Date.now() - new Date(lastSent.value).getTime();
    if (elapsedMs < 20 * 60 * 60 * 1000) {
      return { ok: false, error: "Cooldown active: email already sent within the last 20 hours." };
    }
  }

  const appPublicUrl = (await getSecureSetting("app_public_url")) || "https://sa-opinion-rewards.vercel.app";
  const recoveryUrl = `${appPublicUrl.replace(/\/$/, "")}/upgrade`;

  const template = buildPerpetualFrontTemplate(1, profile.full_name || "Valued Panelist", recoveryUrl);
  const idempotencyKey = `rec_${userId}_${Date.now()}`;

  const res = await sendGreenSendEmail(
    {
      idempotency_key: idempotencyKey,
      sender_name: "Opinion Rewards",
      to: email,
      message: {
        subject: template.subject,
        text: template.text,
        html: template.html,
      },
      metadata: {
        user_id: userId,
        purpose: "checkout_recovery",
        step: "1",
        ...(chargeId ? { charge_id: chargeId } : {}),
      },
    },
    { triggeredBy: "auto_checkout_recovery" },
  );

  if (res.ok) {
    await Promise.all([
      supabaseAdmin.from("secure_settings").upsert({
        key: `last_recovery_email_${userId}`,
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      supabaseAdmin.from("secure_settings").upsert({
        key: `recovery_email_step_${userId}`,
        value: "1",
        updated_at: new Date().toISOString(),
      }),
    ]);
  }

  return res;
}

/**
 * Runs the Perpetual Multi-Step Recovery Engine across unverified leads AND verified upsell targets.
 * Enforces strict 20h cooldown between touches and stops instantly on conversion.
 */
export async function runPerpetualRecoveryScan(options?: {
  maxFrontBatch?: number;
  maxUpsellBatch?: number;
  concurrency?: number;
}): Promise<{
  ok: boolean;
  frontDispatched: number;
  upsellDispatched: number;
  totalScanned: number;
  errors: string[];
}> {
  const maxFront = options?.maxFrontBatch ?? 3000;
  const maxUpsell = options?.maxUpsellBatch ?? 3000;
  const concurrency = options?.concurrency ?? 6;

  let frontDispatched = 0;
  let upsellDispatched = 0;
  const errors: string[] = [];

  const appPublicUrl = (await getSecureSetting("app_public_url")) || "https://sa-opinion-rewards.vercel.app";
  const recoveryUrl = `${appPublicUrl.replace(/\/$/, "")}/upgrade`;
  const upsellUrl = `${appPublicUrl.replace(/\/$/, "")}/payout-setup`;

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  // 1. Coleta ultrarrápida de todos os e-mails capturados em chunks de 1000
  let allBillingRows: Array<{ key: string; value: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("secure_settings")
      .select("key, value")
      .like("key", "billing_email_%")
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    allBillingRows = allBillingRows.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 2. Fetch verification and completed payments in bulk (single batch query each)
  const [verifiedRes, completedChargesRes, cooldownRowsRes, stepsRowsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, mpesa_verified").eq("mpesa_verified", true),
    supabaseAdmin.from("charges").select("user_id, amount_kes").eq("status", "completed"),
    supabaseAdmin
      .from("secure_settings")
      .select("key, value")
      .or("key.like.last_recovery_email_%,key.like.last_upsell_recovery_email_%")
      .gt("value", twentyHoursAgo),
    supabaseAdmin
      .from("secure_settings")
      .select("key, value")
      .or("key.like.recovery_email_step_%,key.like.upsell_recovery_email_step_%"),
  ]);

  const verifiedMap = new Map((verifiedRes.data || []).map((p) => [p.id, p]));

  const frontPaidSet = new Set<string>();
  const upsellPaidSet = new Set<string>();
  for (const c of completedChargesRes.data || []) {
    if (!c.user_id) continue;
    if (c.amount_kes === 200 || !c.amount_kes) frontPaidSet.add(c.user_id);
    if ([79, 99, 129, 149].includes(c.amount_kes)) upsellPaidSet.add(c.user_id);
  }

  const activeCooldowns = new Set((cooldownRowsRes.data || []).map((r) => r.key));
  const stepsMap = new Map((stepsRowsRes.data || []).map((r) => [r.key, parseInt(r.value || "0", 10)]));

  // 3. Filtrar e segmentar alvos elegíveis
  interface Candidate {
    userId: string;
    email: string;
    fullName: string;
    segment: "front" | "upsell";
  }

  const eligibleFront: Candidate[] = [];
  const eligibleUpsell: Candidate[] = [];

  for (const row of allBillingRows) {
    const userId = row.key.replace("billing_email_", "");
    const email = row.value?.trim().toLowerCase();
    if (!email || !email.includes("@") || email.includes("@panelist.")) continue;

    if (verifiedMap.has(userId)) {
      // Upsell target
      if (upsellPaidSet.has(userId)) continue; // Já comprou o upsell!
      if (activeCooldowns.has(`last_upsell_recovery_email_${userId}`)) continue; // Cooldown 20h
      const p = verifiedMap.get(userId);
      eligibleUpsell.push({
        userId,
        email,
        fullName: p?.full_name || "Valued Panelist",
        segment: "upsell",
      });
    } else {
      // Front recovery target
      if (frontPaidSet.has(userId)) continue; // Já pagou o front!
      if (activeCooldowns.has(`last_recovery_email_${userId}`)) continue; // Cooldown 20h
      eligibleFront.push({
        userId,
        email,
        fullName: "Valued Panelist",
        segment: "front",
      });
    }
  }

  const frontTargets = eligibleFront.slice(0, maxFront);
  const upsellTargets = eligibleUpsell.slice(0, maxUpsell);
  const queue: Candidate[] = [...upsellTargets, ...frontTargets];

  console.log(`[GreenSend Mass] Disparando para ${queue.length} alvos (${upsellTargets.length} Upsell, ${frontTargets.length} Front)...`);

  // 4. Pool concorrente de disparos para throughput profissional
  let index = 0;
  async function worker() {
    while (index < queue.length) {
      const current = queue[index++];
      if (!current) break;

      try {
        if (current.segment === "front") {
          const currentStep = stepsMap.get(`recovery_email_step_${current.userId}`) || 0;
          const nextStep = currentStep + 1;
          const template = buildPerpetualFrontTemplate(nextStep, current.fullName, recoveryUrl);
          const idempotencyKey = `perpetual_front_${current.userId}_step_${nextStep}_${Date.now()}`;

          const res = await sendGreenSendEmail(
            {
              idempotency_key: idempotencyKey,
              sender_name: "Opinion Rewards",
              to: current.email,
              message: {
                subject: template.subject,
                text: template.text,
                html: template.html,
              },
              metadata: {
                user_id: current.userId,
                purpose: "perpetual_front_recovery",
                step: String(nextStep),
              },
            },
            { triggeredBy: "perpetual_front_recovery" },
          );

          if (res.ok) {
            frontDispatched++;
            await Promise.all([
              supabaseAdmin.from("secure_settings").upsert({
                key: `last_recovery_email_${current.userId}`,
                value: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }),
              supabaseAdmin.from("secure_settings").upsert({
                key: `recovery_email_step_${current.userId}`,
                value: String(nextStep),
                updated_at: new Date().toISOString(),
              }),
            ]);
          } else {
            errors.push(`Front (${current.email}): ${res.error}`);
          }
        } else {
          // Upsell
          const currentStep = stepsMap.get(`upsell_recovery_email_step_${current.userId}`) || 0;
          const nextStep = currentStep + 1;
          const template = buildPerpetualUpsellTemplate(nextStep, current.fullName, upsellUrl);
          const idempotencyKey = `perpetual_upsell_${current.userId}_step_${nextStep}_${Date.now()}`;

          const res = await sendGreenSendEmail(
            {
              idempotency_key: idempotencyKey,
              sender_name: "Opinion Rewards",
              to: current.email,
              message: {
                subject: template.subject,
                text: template.text,
                html: template.html,
              },
              metadata: {
                user_id: current.userId,
                purpose: "perpetual_upsell_recovery",
                step: String(nextStep),
              },
            },
            { triggeredBy: "perpetual_upsell_recovery" },
          );

          if (res.ok) {
            upsellDispatched++;
            await Promise.all([
              supabaseAdmin.from("secure_settings").upsert({
                key: `last_upsell_recovery_email_${current.userId}`,
                value: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }),
              supabaseAdmin.from("secure_settings").upsert({
                key: `upsell_recovery_email_step_${current.userId}`,
                value: String(nextStep),
                updated_at: new Date().toISOString(),
              }),
            ]);
          } else {
            errors.push(`Upsell (${current.email}): ${res.error}`);
          }
        }
      } catch (err) {
        errors.push(`${current.segment} (${current.email}): ${err instanceof Error ? err.message : String(err)}`);
      }

      // Pequeno descanso para manter a taxa fluida
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Executar os workers em paralelo
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return {
    ok: true,
    frontDispatched,
    upsellDispatched,
    totalScanned: frontDispatched + upsellDispatched,
    errors,
  };
}

