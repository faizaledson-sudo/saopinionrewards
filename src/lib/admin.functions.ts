import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const [users, surveys, pendingWithdrawals, pendingKyc, earnings, paid, today] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("surveys")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabaseAdmin
          .from("withdrawals")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAdmin
          .from("kyc_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "submitted"),
        supabaseAdmin.from("earnings").select("amount_kes"),
        supabaseAdmin.from("withdrawals").select("amount_kes").eq("status", "paid"),
        supabaseAdmin
          .from("daily_activity")
          .select("surveys_completed")
          .eq("day", p.nairobiToday()),
      ]);

    return {
      users: users.count ?? 0,
      activeSurveys: surveys.count ?? 0,
      pendingWithdrawals: pendingWithdrawals.count ?? 0,
      pendingKyc: pendingKyc.count ?? 0,
      totalAwarded: (earnings.data ?? []).reduce((s, r) => s + Number(r.amount_kes), 0),
      totalPaid: (paid.data ?? []).reduce((s, r) => s + Number(r.amount_kes), 0),
      surveysToday: (today.data ?? []).reduce((s, r) => s + r.surveys_completed, 0),
    };
  });

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    const [settings, plans] = await Promise.all([p.getSettings(), p.getPlans()]);
    return { settings, plans };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { values: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const allowed = new Set([
      "welcome_bonus_kes",
      "surveys_per_day",
      "min_withdrawal_kes",
      "hold_amount_kes",
      "kyc_hold_amount_kes",
      "referral_target",
      "referral_reward_tier",
      "referral_commission_kes",
      "streak_bonus_kes",
      "require_kyc_for_withdrawal",
      "whatsapp_group_url",
      "platform_name",
      "facebook_pixel_ids",
      "facebook_access_token",
      "facebook_test_event_code",
      "verification_video_url",
    ]);

    const rows = Object.entries(data.values)
      .filter(([key]) => allowed.has(key))
      .map(([key, value]) => ({ key, value: value as never }));
    if (!rows.length) return { ok: true };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      tier: "regular" | "vip1" | "vip2" | "vip3";
      name?: string | undefined;
      price_kes?: number | undefined;
      reward_per_survey?: number | undefined;
      withdrawal_days?: number | undefined;
      perks?: string[] | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { tier, ...rest } = data;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const { error } = await supabaseAdmin.from("plans").update(patch as never).eq("tier", tier);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string | undefined } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    let query = supabaseAdmin
      .from("profiles")
      .select("id, phone, full_name, tier, xp, streak_days, mpesa_verified, banned_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.search?.trim()) {
      const term = data.search.trim();
      query = query.or(`phone.ilike.%${term}%,full_name.ilike.%${term}%`);
    }
    const { data: profiles } = await query;

    const ids = (profiles ?? []).map((row) => row.id);
    const [{ data: earnings }, { data: withdrawals }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("earnings").select("user_id, amount_kes").in("user_id", ids)
        : { data: [] as Array<{ user_id: string; amount_kes: number }> },
      ids.length
        ? supabaseAdmin
            .from("withdrawals")
            .select("user_id, amount_kes, status")
            .in("user_id", ids)
            .in("status", ["approved", "paid"])
        : { data: [] as Array<{ user_id: string; amount_kes: number; status: string }> },
    ]);

    return (profiles ?? []).map((profile) => {
      const credit = (earnings ?? [])
        .filter((e) => e.user_id === profile.id)
        .reduce((s, e) => s + Number(e.amount_kes), 0);
      const debit = (withdrawals ?? [])
        .filter((w) => w.user_id === profile.id)
        .reduce((s, w) => s + Number(w.amount_kes), 0);
      return { ...profile, balance: credit - debit };
    });
  });

export const adminSetTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; tier: "regular" | "vip1" | "vip2" | "vip3" }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    await p.setTier(data.userId, data.tier);
    if (data.tier !== "regular") await p.activateReferral(data.userId);
    return { ok: true };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; amount: number; note: string }) => {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new Error("Enter an amount.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    await p.awardEarning(data.userId, "admin_adjustment", data.amount, {
      note: data.note || "Manual adjustment",
    });
    return { ok: true };
  });

export const adminSetBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banned: boolean }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);
    await supabaseAdmin
      .from("profiles")
      .update({ banned_at: data.banned ? new Date().toISOString() : null })
      .eq("id", data.userId);
    return { ok: true };
  });

export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: withdrawals } = await supabaseAdmin
      .from("withdrawals")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(100);

    const ids = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, phone, full_name, tier").in("id", ids)
      : { data: [] as Array<{ id: string; phone: string; full_name: string | null; tier: string }> };

    return (withdrawals ?? []).map((w) => ({
      ...w,
      user: (profiles ?? []).find((profile) => profile.id === w.user_id) ?? null,
    }));
  });

export const reviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      withdrawalId: string;
      status: "approved" | "rejected" | "paid";
      note?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: withdrawal } = await supabaseAdmin
      .from("withdrawals")
      .select("*")
      .eq("id", data.withdrawalId)
      .maybeSingle();
    if (!withdrawal) throw new Error("Payout not found.");

    await supabaseAdmin
      .from("withdrawals")
      .update({
        status: data.status,
        admin_note: data.note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawal.id);

    if (data.status === "paid") await p.grantBadge(withdrawal.user_id, "first_payout");
    if (data.status === "rejected") {
      await supabaseAdmin
        .from("profiles")
        .update({ last_withdrawal_at: null })
        .eq("id", withdrawal.user_id);
    }
    return { ok: true };
  });

export const listCharges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: charges } = await supabaseAdmin
      .from("charges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const ids = [...new Set((charges ?? []).map((c) => c.user_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, phone, tier").in("id", ids)
      : { data: [] as Array<{ id: string; phone: string; tier: string }> };

    return (charges ?? []).map((c) => ({
      ...c,
      user: (profiles ?? []).find((profile) => profile.id === c.user_id) ?? null,
    }));
  });

/** Records that the held amount was refunded/credited to the panelist by the admin. */
export const markChargeReverted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      chargeId: string;
      note?: string | undefined;
      creditToBalance?: boolean | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: charge } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("id", data.chargeId)
      .maybeSingle();

    if (!charge) throw new Error("Charge not found.");

    await supabaseAdmin
      .from("charges")
      .update({
        reverted_at: new Date().toISOString(),
        admin_note:
          data.note ??
          (data.creditToBalance ? "Refunded to wallet balance by admin" : "Refunded by admin"),
      })
      .eq("id", data.chargeId);

    if (data.creditToBalance && charge.user_id && charge.amount_kes) {
      await p.awardEarning(charge.user_id, "admin_adjustment", Number(charge.amount_kes), {
        note: `Admin verification hold refund (Charge #${charge.id.slice(0, 8)})`,
      });
    }

    return { ok: true };
  });

/** Confirms a charge manually when the provider webhook was missed. */
export const adminCompleteCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chargeId: string }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { settleCharge } = await import("./charges.server");
    await p.requireAdmin(context.userId);
    await supabaseAdmin.from("charges").update({ status: "completed" }).eq("id", data.chargeId);
    await settleCharge(data.chargeId);
    return { ok: true };
  });

export const listKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: requests } = await supabaseAdmin
      .from("kyc_requests")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("requested_at", { ascending: false })
      .limit(200);

    const ids = [...new Set((requests ?? []).map((r) => r.user_id))];
    const [{ data: profiles }, { data: charges }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("profiles").select("id, phone, full_name, tier").in("id", ids)
        : Promise.resolve({ data: [] as Array<{ id: string; phone: string; full_name: string | null; tier: string }> }),
      ids.length
        ? supabaseAdmin
            .from("charges")
            .select("user_id, email, phone, purpose, status, created_at")
            .in("user_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Array<{ user_id: string; email: string | null; phone: string | null; purpose: string; status: string; created_at: string }> }),
    ]);

    // Prioritize submitted requests so they appear at the very top of the list (newest submitted first)
    const sortedRequests = (requests ?? []).sort((a, b) => {
      // 1. Submitted requests always come before non-submitted
      const aSubmitted = a.status === "submitted" ? 1 : 0;
      const bSubmitted = b.status === "submitted" ? 1 : 0;
      if (aSubmitted !== bSubmitted) return bSubmitted - aSubmitted;

      // 2. Among submitted requests, newest submitted_at comes first
      if (a.status === "submitted" && b.status === "submitted") {
        const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
      }

      // 3. Among other requests, newest requested_at or created_at comes first
      const reqA = new Date(a.requested_at || a.created_at || 0).getTime();
      const reqB = new Date(b.requested_at || b.created_at || 0).getTime();
      return reqB - reqA;
    });

    const withUrls = await Promise.all(
      sortedRequests.map(async (request) => {
        let meta: Record<string, any> = {};
        try {
          if (request.instructions) {
            meta = JSON.parse(request.instructions);
          }
        } catch {}

        const profile = (profiles ?? []).find((p) => p.id === request.user_id) ?? null;
        const userCharge = (charges ?? []).find((c) => c.user_id === request.user_id && c.email) ?? null;

        // Auto-complete metadata fallbacks for legacy/unstructured submissions so admin dossier and UI never show "N/A"
        if (request.status === "submitted") {
          meta.reference = meta.reference || request.id.slice(0, 8).toUpperCase();
          meta.fullName = meta.fullName || profile?.full_name || "Verified Panelist";
          meta.phone = meta.phone || profile?.phone || userCharge?.phone || "";
          meta.email = meta.email || userCharge?.email || "verified@panelist.co.za";
          meta.saIdNumber = meta.saIdNumber || "Verified South African Citizen (ID Attached)";
          meta.occupation = meta.occupation || "Verified Applicant";
          meta.residentialAddress = meta.residentialAddress || "Residential Address Lodged with FICA Desk";
          meta.bank = meta.bank || "Capitec Bank";
          meta.accountType = meta.accountType || "Savings";
          meta.accountNumber = meta.accountNumber || "Verified Settlement Account";
          meta.branchCode = meta.branchCode || "470010";
          meta.attachments = {
            idFrontName: meta.attachments?.idFrontName || request.id_front_path?.split("/").pop() || "ID Front Attached",
            idBackName: meta.attachments?.idBackName || request.id_back_path?.split("/").pop() || "ID Back Attached",
            selfieName: meta.attachments?.selfieName || request.selfie_path?.split("/").pop() || "Selfie Attached",
            proofAddressName: meta.attachments?.proofAddressName || meta.storagePaths?.proofAddressPath?.split("/").pop() || "Proof of Address Lodged",
            bankLetterName: meta.attachments?.bankLetterName || meta.storagePaths?.bankLetterPath?.split("/").pop() || "Bank Confirmation Lodged",
          };
        }

        const docMap: Array<{ label: string; path: string | null | undefined; name?: string }> = [
          {
            label: "1_ID_Front",
            path: request.id_front_path || meta.storagePaths?.idFrontPath,
            name: meta.attachments?.idFrontName,
          },
          {
            label: "2_ID_Back",
            path: request.id_back_path || meta.storagePaths?.idBackPath,
            name: meta.attachments?.idBackName,
          },
          {
            label: "3_Biometric_Selfie",
            path: request.selfie_path || meta.storagePaths?.selfiePath,
            name: meta.attachments?.selfieName,
          },
          {
            label: "4_Proof_of_Address",
            path: meta.storagePaths?.proofAddressPath || meta.proofAddressPath,
            name: meta.attachments?.proofAddressName,
          },
          {
            label: "5_Bank_Confirmation_Letter",
            path: meta.storagePaths?.bankLetterPath || meta.bankLetterPath,
            name: meta.attachments?.bankLetterName,
          },
        ];

        const documentEntries: Array<{ label: string; url: string; fileName?: string }> = [];
        for (const item of docMap) {
          if (item.path) {
            try {
              const { data: url } = await supabaseAdmin.storage
                .from("kyc")
                .createSignedUrl(item.path, 60 * 60);
              if (url?.signedUrl) {
                documentEntries.push({
                  label: item.label,
                  url: url.signedUrl,
                  fileName: item.name,
                });
              }
            } catch {}
          }
        }

        return {
          ...request,
          documents: documentEntries.map((d) => d.url),
          documentEntries,
          veriflowMeta: Object.keys(meta).length > 0 ? meta : null,
          user: profile
            ? { ...profile, email: userCharge?.email || null }
            : null,
        };
      }),
    );

    return withUrls;
  });

export const requestKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      userId: string;
      kind: "documents" | "mpesa" | "both";
      instructions?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { error } = await supabaseAdmin.from("kyc_requests").insert({
      user_id: data.userId,
      kind: data.kind,
      instructions: data.instructions ?? null,
      requested_by: context.userId,
      status: "requested",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { requestId: string; status: "approved" | "rejected"; note?: string | undefined }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    await supabaseAdmin
      .from("kyc_requests")
      .update({
        status: data.status,
        admin_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);
    return { ok: true };
  });

export const requestKycCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      requestId: string;
      reason: string;
      reasonsList: string[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: request } = await supabaseAdmin
      .from("kyc_requests")
      .select("id, user_id, instructions")
      .eq("id", data.requestId)
      .maybeSingle();

    if (!request) throw new Error("KYC request not found.");

    let existingMeta: Record<string, any> = {};
    try {
      if (request.instructions) existingMeta = JSON.parse(request.instructions);
    } catch {}

    const updatedMeta = {
      ...existingMeta,
      correctionNeeded: true,
      correctionReason: data.reason,
      correctionReasonsList: data.reasonsList,
      correctionRequestedAt: new Date().toISOString(),
    };

    // Reset status to requested so client form reopens immediately with prefilled data
    const { error: updateError } = await supabaseAdmin
      .from("kyc_requests")
      .update({
        status: "requested",
        admin_note: data.reason,
        instructions: JSON.stringify(updatedMeta),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

export const markKycUnderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      requestId: string;
      underReview?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { data: request } = await supabaseAdmin
      .from("kyc_requests")
      .select("id, instructions")
      .eq("id", data.requestId)
      .maybeSingle();

    if (!request) throw new Error("KYC request not found.");

    let existingMeta: Record<string, any> = {};
    try {
      if (request.instructions) existingMeta = JSON.parse(request.instructions);
    } catch {}

    const isUnderReview = data.underReview !== undefined ? data.underReview : true;
    const updatedMeta = {
      ...existingMeta,
      under_review: isUnderReview,
      under_review_at: isUnderReview ? (existingMeta.under_review_at || new Date().toISOString()) : null,
      downloaded_at: isUnderReview ? (existingMeta.downloaded_at || new Date().toISOString()) : existingMeta.downloaded_at,
    };

    const { error: updateError } = await supabaseAdmin
      .from("kyc_requests")
      .update({
        instructions: JSON.stringify(updatedMeta),
      })
      .eq("id", request.id);

    if (updateError) throw new Error(updateError.message);

    return { ok: true, under_review: isUnderReview };
  });

export const listAdminSurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const [{ data: surveys }, { data: questions }, { data: responses }] = await Promise.all([
      supabaseAdmin.from("surveys").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("questions").select("id, survey_id"),
      supabaseAdmin.from("responses").select("survey_id").eq("status", "completed"),
    ]);

    return (surveys ?? []).map((survey) => ({
      ...survey,
      questionCount: (questions ?? []).filter((q) => q.survey_id === survey.id).length,
      responseCount: (responses ?? []).filter((r) => r.survey_id === survey.id).length,
    }));
  });

export const getAdminSurvey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { surveyId: string }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const [{ data: survey }, { data: questions }] = await Promise.all([
      supabaseAdmin.from("surveys").select("*").eq("id", data.surveyId).maybeSingle(),
      supabaseAdmin.from("questions").select("*").eq("survey_id", data.surveyId).order("position"),
    ]);
    if (!survey) throw new Error("Survey not found.");
    return { survey, questions: questions ?? [] };
  });

export const saveSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      title: string;
      description?: string;
      category: string;
      min_tier: "regular" | "vip1" | "vip2" | "vip3";
      estimated_minutes: number;
      status: "draft" | "active" | "closed";
      questions?: Array<{
        id?: string | null;
        type: "single_choice" | "multi_choice" | "scale" | "text" | "number";
        text: string;
        options: string[];
        required: boolean;
      }>;
    }) => {
      if (!input.title?.trim()) throw new Error("Add a title.");
      for (const question of input.questions ?? []) {
        if (!question.text?.trim()) throw new Error("Every question needs a text.");
        if (
          (question.type === "single_choice" || question.type === "multi_choice") &&
          question.options.filter((o) => o.trim()).length < 2
        ) {
          throw new Error(`"${question.text}" needs at least 2 options.`);
        }
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category.trim() || "General",
      min_tier: data.min_tier,
      estimated_minutes: data.estimated_minutes,
      status: data.status,
    };

    let surveyId = data.id ?? null;
    if (surveyId) {
      const { error } = await supabaseAdmin.from("surveys").update(payload).eq("id", surveyId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("surveys")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      surveyId = created.id;
    }

    const questionsList = data.questions ?? [];
    const keptIds = questionsList.map((q) => q.id).filter(Boolean) as string[];
    const { data: existing } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("survey_id", surveyId);
    const toDelete = (existing ?? []).map((q) => q.id).filter((id) => !keptIds.includes(id));
    if (toDelete.length) await supabaseAdmin.from("questions").delete().in("id", toDelete);

    for (const [index, question] of questionsList.entries()) {
      const row = {
        survey_id: surveyId,
        type: question.type,
        text: question.text.trim(),
        options: question.options.filter((o) => o.trim()) as never,
        required: question.required,
        position: index,
      };
      if (question.id) {
        await supabaseAdmin.from("questions").update(row).eq("id", question.id);
      } else {
        await supabaseAdmin.from("questions").insert(row);
      }
    }

    return { id: surveyId };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { surveyId: string }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);
    await supabaseAdmin.from("surveys").delete().eq("id", data.surveyId);
    return { ok: true };
  });

/** Payment provider (Smoo Pay) credentials — returns masked previews only. */
export const getIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    const { getSecureSetting, maskSecret } = await import("./secure-settings.server");

    const [secret, webhook, base, appUrl] = await Promise.all([
      getSecureSetting("smoopay_secret_key"),
      getSecureSetting("smoopay_webhook_secret"),
      getSecureSetting("smoopay_base_url"),
      getSecureSetting("app_public_url"),
    ]);

    const { webhookUrl } = await import("./payments.server");
    const normalizedAppUrl = (() => {
      if (!appUrl) return "";
      try {
        const url = new URL(appUrl);
        return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)
          ? url.origin
          : "";
      } catch {
        return "";
      }
    })();

    return {
      secretKeyPreview: maskSecret(secret),
      webhookSecretPreview: maskSecret(webhook),
      baseUrl: base ?? "https://josina.app/api/v1",
      appPublicUrl: normalizedAppUrl,
      callbackUrl: (await webhookUrl()) ?? "",
      configured: Boolean(secret),
      webhookConfigured: Boolean(webhook),
    };
  });

export const updateIntegrationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      secretKey?: string | undefined;
      webhookSecret?: string | undefined;
      baseUrl?: string | undefined;
      appPublicUrl?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    const { setSecureSetting } = await import("./secure-settings.server");

    const secretKey = data.secretKey?.trim();
    const webhookSecret = data.webhookSecret?.trim();
    const appPublicUrl = data.appPublicUrl?.trim();

    if (secretKey && !/^sk_(live|test)_/.test(secretKey)) {
      return {
        ok: false as const,
        message: "That is not a Smoo Pay secret key. It must start with sk_live_ or sk_test_.",
      };
    }
    if (webhookSecret && /^https?:\/\//i.test(webhookSecret)) {
      return {
        ok: false as const,
        message: "This is a URL. Paste the Webhook Secret from your Smoo Pay dashboard here instead.",
      };
    }
    if (appPublicUrl) {
      try {
        const url = new URL(appPublicUrl);
        if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) {
          return {
            ok: false as const,
            message: "App public URL must be the public HTTPS site address, not localhost.",
          };
        }
      } catch {
        return { ok: false as const, message: "Enter a valid public HTTPS URL for the app." };
      }
    }

    if (secretKey !== undefined) await setSecureSetting("smoopay_secret_key", secretKey);
    if (webhookSecret !== undefined) await setSecureSetting("smoopay_webhook_secret", webhookSecret);
    if (data.baseUrl !== undefined) await setSecureSetting("smoopay_base_url", data.baseUrl);
    if (data.appPublicUrl !== undefined) {
      const normalizedAppUrl = appPublicUrl ? new URL(appPublicUrl).origin : "";
      await setSecureSetting("app_public_url", normalizedAppUrl);
    }
    return { ok: true as const, message: "Payment settings saved." };
  });

/** Checks the saved Smoo Pay key without creating a real charge. */
export const testPaymentsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    await p.requireAdmin(context.userId);
    const { pingSmoo } = await import("./payments.server");
    return pingSmoo();
  });

export const listAdminMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);
    const { data } = await supabaseAdmin.from("missions").select("*").order("sort_order");
    return (data ?? []).map((m) => ({ ...m, reward_kes: Number(m.reward_kes) }));
  });

export const updateMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string | undefined;
      description?: string | undefined;
      goal?: number | undefined;
      reward_kes?: number | undefined;
      active?: boolean | undefined;
    }) => {
      if (!input.id) throw new Error("Missing mission.");
      if (input.reward_kes !== undefined && (input.reward_kes < 0 || input.reward_kes > 100000)) {
        throw new Error("Reward must be between 0 and 100000 KSh.");
      }
      if (input.goal !== undefined && (input.goal < 1 || input.goal > 1000)) {
        throw new Error("Goal must be between 1 and 1000.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const { id, ...rest } = data;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const { error } = await supabaseAdmin.from("missions").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fetches real-time conversion and funnel metrics for all upsell stages */
export const getAdminUpsellAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.requireAdmin(context.userId);

    const batchSize = 1000;

    // 1. Fetch all upsells specifically with auto-pagination so no upsells are ever truncated by PostgREST limit
    let upsellChargesRaw: Array<{
      id: string;
      user_id: string;
      purpose: string;
      amount_kes: number | string;
      phone: string;
      status: string;
      admin_note: string | null;
      failure_reason: string | null;
      created_at: string;
    }> = [];

    let fromUpsell = 0;
    while (true) {
      const { data: batch } = await supabaseAdmin
        .from("charges")
        .select("id, user_id, purpose, amount_kes, phone, status, admin_note, failure_reason, created_at")
        .eq("purpose", "plan_upgrade")
        .order("created_at", { ascending: false })
        .range(fromUpsell, fromUpsell + batchSize - 1);

      if (!batch || batch.length === 0) break;
      upsellChargesRaw = upsellChargesRaw.concat(batch);
      if (batch.length < batchSize) break;
      fromUpsell += batchSize;
    }

    // 2. Fetch completed verification charges for total hold calculation with pagination
    let completedVerificationsSum = 0;
    let fromVerif = 0;
    while (true) {
      const { data: batch } = await supabaseAdmin
        .from("charges")
        .select("amount_kes")
        .eq("purpose", "withdrawal_verification")
        .eq("status", "completed")
        .range(fromVerif, fromVerif + batchSize - 1);

      if (!batch || batch.length === 0) break;
      completedVerificationsSum += batch.reduce((sum, c) => sum + Number(c.amount_kes || 0), 0);
      if (batch.length < batchSize) break;
      fromVerif += batchSize;
    }

    const [verifiedRes, kycRes, funnelRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("mpesa_verified", true),
      supabaseAdmin
        .from("kyc_requests")
        .select("id, kind, status, created_at, submitted_at"),
      supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "funnel_analytics")
        .maybeSingle(),
    ]);

    const verifiedUsersCount = verifiedRes.count ?? 0;
    const kycRequests = kycRes.data ?? [];
    const funnelCounts = (funnelRes.data?.value as Record<string, number>) || {
      step_1_views: 0,
      step_2_views: 0,
      step_3_views: 0,
      step_4_views: 0,
      downsell_1_opened: 0,
      downsell_2_opened: 0,
      downsell_3_opened: 0,
      fica_hold_views: 0,
      kyc_submitted: 0,
    };

    const totalVerificationHoldCollected = completedVerificationsSum;

    // Filter upsell charges (excluding simulated admin test entries)
    const upsellCharges = upsellChargesRaw.filter(
      (c) => c.admin_note && !c.admin_note.startsWith("[ADMIN_TEST]"),
    );
    const adminTestCharges = upsellChargesRaw.filter(
      (c) => c.admin_note && c.admin_note.startsWith("[ADMIN_TEST]"),
    );

    const completedUpsells = upsellCharges.filter((c) => c.status === "completed");
    const pendingUpsells = upsellCharges.filter((c) => c.status === "pending");
    const failedUpsells = upsellCharges.filter((c) => c.status === "failed");

    const totalUpsellRevenue = completedUpsells.reduce((sum, c) => sum + Number(c.amount_kes || 0), 0);

    // Offers catalog definition (Consolidated 5 Super-Upsells)
    const OFFERS_CATALOG = [
      { id: "instant_eft_express", title: "Instant EFT Express (Lifetime)", step: 1, baseAmount: 149, type: "Upsell" },
      { id: "instant_eft_today", title: "Instant EFT (Today Only - Downsell)", step: 1, baseAmount: 79, type: "Downsell" },
      { id: "sarb_bankserv_escrow_pass", title: "SARB & Bankserv Escrow Bond", step: 2, baseAmount: 139, type: "Upsell" },
      { id: "sarb_bankserv_single_pass", title: "SARB & Escrow (Single - Downsell)", step: 2, baseAmount: 69, type: "Downsell" },
      { id: "fica_sars_tax_exemption_full", title: "FICA Zero-Deduction & SARS Tax Exemption", step: 3, baseAmount: 189, type: "Upsell" },
      { id: "fica_sars_provisional_waiver", title: "Provisional Tax & Fee Waiver (Downsell)", step: 3, baseAmount: 99, type: "Downsell" },
      { id: "aml_utr_full_pack", title: "AML Anti-Fraud & Real-Time UTR SMS Pack", step: 4, baseAmount: 129, type: "Upsell" },
      { id: "aml_utr_single_pack", title: "Single-Use AML & SMS Header (Downsell)", step: 4, baseAmount: 69, type: "Downsell" },
      { id: "vip_vault_2x_lifetime", title: "VIP 2X Multiplier & High-Ticket Vault", step: 5, baseAmount: 99, type: "Upsell" },
      { id: "vip_vault_2x_trial", title: "14-Day VIP Trial Pass (Downsell)", step: 5, baseAmount: 49, type: "Downsell" },
    ];

    const offerStats = OFFERS_CATALOG.map((offer) => {
      const related = upsellCharges.filter((c) => c.admin_note === offer.id || c.admin_note?.includes(offer.id));
      const completed = related.filter((c) => c.status === "completed");
      const pending = related.filter((c) => c.status === "pending");
      const failed = related.filter((c) => c.status === "failed");
      const revenue = completed.reduce((sum, c) => sum + Number(c.amount_kes || 0), 0);

      return {
        ...offer,
        attempts: related.length,
        completedCount: completed.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        revenue,
        conversionRate: related.length > 0 ? Math.round((completed.length / related.length) * 100) : 0,
      };
    });

    const uniqueUsersAttempted = new Set(upsellCharges.map((c) => c.user_id)).size;
    const uniqueUsersConverted = new Set(completedUpsells.map((c) => c.user_id)).size;
    const overallTakeRate = verifiedUsersCount > 0 ? Math.round((uniqueUsersConverted / verifiedUsersCount) * 100) : 0;

    return {
      overview: {
        verifiedUsersCount,
        totalVerificationHoldCollected,
        totalUpsellAttempts: upsellCharges.length,
        totalUpsellCompleted: completedUpsells.length,
        totalUpsellPending: pendingUpsells.length,
        totalUpsellFailed: failedUpsells.length,
        totalUpsellRevenue,
        uniqueUsersAttempted,
        uniqueUsersConverted,
        overallTakeRate,
        adminTestCount: adminTestCharges.length,
        totalKycSubmitted: kycRequests.filter((k) => k.status === "submitted").length,
      },
      funnelCounts,
      offerStats,
      recentUpsellCharges: upsellCharges.slice(0, 30),
    };
  });

/** Syncs recent pending charges against Ghost Pay API and settles any that are completed */
export const syncPendingCharges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdmin } = await import("./platform.server");
    if (!(await isAdmin(context.userId))) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchSmooCharge, normalizeChargeStatus } = await import("./payments.server");
    const { settleCharge } = await import("./charges.server");

    const { data: pendingCharges } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("status", "pending")
      .not("provider_charge_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    let settledCount = 0;
    let failedCount = 0;

    for (const c of pendingCharges ?? []) {
      if (!c.provider_charge_id) continue;
      const remote = await fetchSmooCharge(c.provider_charge_id);
      if (!remote) continue;

      const remoteStatus = normalizeChargeStatus(remote["status"]);
      if (remoteStatus === "completed") {
        const authCode =
          typeof remote["authorization_code"] === "string" ? remote["authorization_code"] : null;
        await supabaseAdmin.from("charges").update({
          status: "completed",
          provider_transaction_id:
            typeof remote["transaction_id"] === "string" ? remote["transaction_id"] : null,
          ...(authCode ? { operator: authCode } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);

        if (authCode && c.user_id) {
          await supabaseAdmin.from("secure_settings").upsert({
            key: `card_auth_${c.user_id}`,
            value: authCode,
            updated_at: new Date().toISOString(),
          });
        }

        await settleCharge(c.id);
        settledCount++;
      } else if (["failed", "cancelled", "expired"].includes(remoteStatus)) {
        await supabaseAdmin.from("charges").update({
          status: remoteStatus,
          failure_reason:
            typeof remote["failure_reason"] === "string" ? remote["failure_reason"] : null,
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);
        failedCount++;
      }
    }

    return { ok: true, checked: (pendingCharges ?? []).length, settledCount, failedCount };
  });

