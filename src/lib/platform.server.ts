import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TIER_ORDER, tierRank } from "./format";

export type Tier = "regular" | "vip1" | "vip2" | "vip3";

export type PlatformSettings = {
  welcome_bonus_kes: number;
  surveys_per_day: number;
  min_withdrawal_kes: number;
  hold_amount_kes: number;
  kyc_hold_amount_kes: number;
  referral_target: number;
  referral_reward_tier: Tier;
  referral_commission_kes: number;
  streak_bonus_kes: number;
  require_kyc_for_withdrawal: boolean;
  whatsapp_group_url: string;
  platform_name: string;
  facebook_pixel_ids: string;
  facebook_access_token: string;
  facebook_test_event_code: string;
  verification_video_url: string;
};

const DEFAULTS: PlatformSettings = {
  welcome_bonus_kes: 300,
  surveys_per_day: 5,
  min_withdrawal_kes: 100,
  hold_amount_kes: 200,
  kyc_hold_amount_kes: 200,
  referral_target: 5,
  referral_reward_tier: "vip1",
  referral_commission_kes: 0,
  streak_bonus_kes: 5,
  require_kyc_for_withdrawal: true,
  whatsapp_group_url: "",
  platform_name: "Google Opinion Rewards",
  facebook_pixel_ids: "896744080027646",
  facebook_access_token: process.env.FACEBOOK_ACCESS_TOKEN ?? "",
  facebook_test_event_code: "",
  verification_video_url: "https://stream.mux.com/OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts.m3u8",
};

let cachedSettings: { data: PlatformSettings; expiresAt: number } | null = null;
let cachedPlans: { data: any[]; expiresAt: number } | null = null;

export function invalidatePlatformCache() {
  cachedSettings = null;
  cachedPlans = null;
}

export async function getSettings(): Promise<PlatformSettings> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.data;
  }

  try {
    const { data } = await supabaseAdmin.from("app_settings").select("key, value");
    const merged: Record<string, unknown> = { ...DEFAULTS };
    for (const row of data ?? []) merged[row.key] = row.value;
    const result = merged as PlatformSettings;
    cachedSettings = { data: result, expiresAt: now + 60_000 };
    return result;
  } catch (err) {
    if (cachedSettings) return cachedSettings.data;
    return DEFAULTS;
  }
}

export async function getPlans() {
  const now = Date.now();
  if (cachedPlans && cachedPlans.expiresAt > now) {
    return cachedPlans.data;
  }

  try {
    const { data } = await supabaseAdmin.from("plans").select("*").order("sort_order");
    const result = data ?? [];
    cachedPlans = { data: result, expiresAt: now + 60_000 };
    return result;
  } catch (err) {
    if (cachedPlans) return cachedPlans.data;
    return [];
  }
}

export async function getPlan(tier: Tier) {
  const plans = await getPlans();
  return plans.find((p) => p.tier === tier) ?? null;
}

/** Today's date in South Africa (SAST), as YYYY-MM-DD. */
export function nairobiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(day: string, amount: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

/** Transient auth/clock errors ("JWT issued at future") happen right after a token
 *  refresh; one short retry is enough instead of blanking the page. */
function isTransientAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("jwt") || m.includes("token") || m.includes("issued at");
}

export async function getProfile(userId: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error) return data;
    if (attempt === 1 || !isTransientAuthError(error.message)) throw new Error(error.message);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return null;
}


export async function getBalance(userId: string): Promise<number> {
  const [{ data: earnings }, { data: withdrawals }] = await Promise.all([
    supabaseAdmin.from("earnings").select("amount_kes").eq("user_id", userId),
    supabaseAdmin
      .from("withdrawals")
      .select("amount_kes, status")
      .eq("user_id", userId)
      .in("status", ["approved", "paid"]),
  ]);
  const credit = (earnings ?? []).reduce((sum, e) => sum + Number(e.amount_kes), 0);
  const debit = (withdrawals ?? []).reduce((sum, w) => sum + Number(w.amount_kes), 0);
  return Math.round((credit - debit) * 100) / 100;
}

function randomCode(length = 7): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function uniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode();
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return `${randomCode(4)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export async function awardEarning(
  userId: string,
  type: "survey" | "welcome_bonus" | "streak_bonus" | "referral" | "mission" | "admin_adjustment",
  amount: number,
  extra: { surveyId?: string | null; note?: string | null } = {},
) {
  if (!amount) return;
  await supabaseAdmin.from("earnings").insert({
    user_id: userId,
    type,
    amount_kes: amount,
    survey_id: extra.surveyId ?? null,
    note: extra.note ?? null,
  });
}

export async function grantBadge(userId: string, code: string) {
  await supabaseAdmin
    .from("user_badges")
    .upsert({ user_id: userId, badge_code: code }, { onConflict: "user_id,badge_code" });
}

/** Creates the profile, welcome bonus and referral link for a brand new panelist. */
export async function bootstrapAccount(
  userId: string,
  phone: string,
  referralCode: string | null,
  fullName: string | null,
) {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const settings = await getSettings();
  let referrerId: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode.trim().toUpperCase())
      .maybeSingle();
    referrerId = referrer?.id ?? null;
  }

  const code = await uniqueReferralCode();
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      phone,
      full_name: fullName,
      referral_code: code,
      referred_by: referrerId,
      tier: "regular",
      streak_days: 1,
      last_activity_day: nairobiToday(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (referrerId) {
    await supabaseAdmin
      .from("referrals")
      .upsert(
        { referrer_id: referrerId, referred_id: userId, activated: false },
        { onConflict: "referred_id" },
      );
  }

  if (Number(settings.welcome_bonus_kes) > 0) {
    await awardEarning(userId, "welcome_bonus", Number(settings.welcome_bonus_kes), {
      note: "Welcome bonus",
    });
  }

  return profile;
}

/** Updates streak + XP for an active day and pays the streak bonus on milestones. */
export async function touchDailyStreak(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) return;
  const today = nairobiToday();
  if (profile.last_activity_day === today) return;

  const yesterday = addDays(today, -1);
  const streak = profile.last_activity_day === yesterday ? profile.streak_days + 1 : 1;

  await supabaseAdmin
    .from("profiles")
    .update({ last_activity_day: today, streak_days: streak, xp: profile.xp + 5 })
    .eq("id", userId);

  if (streak >= 7) await grantBadge(userId, "streak_7");
  if (streak > 0 && streak % 7 === 0) {
    const settings = await getSettings();
    if (Number(settings.streak_bonus_kes) > 0) {
      await awardEarning(userId, "streak_bonus", Number(settings.streak_bonus_kes), {
        note: `${streak}-day streak bonus`,
      });
    }
  }
}

export async function dailyRow(userId: string, day = nairobiToday()) {
  const { data } = await supabaseAdmin
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  return data;
}

export async function bumpDaily(userId: string, earned: number, existingRow?: any) {
  const day = nairobiToday();
  const row = existingRow !== undefined ? existingRow : await dailyRow(userId, day);
  if (row) {
    await supabaseAdmin
      .from("daily_activity")
      .update({
        surveys_completed: (row.surveys_completed ?? 0) + 1,
        earned_kes: Number(row.earned_kes ?? 0) + earned,
      })
      .eq("id", row.id);
    return (row.surveys_completed ?? 0) + 1;
  }
  await supabaseAdmin
    .from("daily_activity")
    .insert({ user_id: userId, day, surveys_completed: 1, earned_kes: earned });
  return 1;
}

/** Recomputes mission progress for the current daily/weekly windows. */
export async function syncMissions(userId: string) {
  const today = nairobiToday();
  const week = weekStart(today);
  const { data: missions } = await supabaseAdmin.from("missions").select("*").eq("active", true);
  if (!missions?.length) return;

  const [{ data: todayRow }, { data: weekRows }, { data: refs }] = await Promise.all([
    supabaseAdmin
      .from("daily_activity")
      .select("surveys_completed")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle(),
    supabaseAdmin
      .from("daily_activity")
      .select("surveys_completed")
      .eq("user_id", userId)
      .gte("day", week),
    supabaseAdmin
      .from("referrals")
      .select("activated_at")
      .eq("referrer_id", userId)
      .eq("activated", true),
  ]);

  const dailySurveys = todayRow?.surveys_completed ?? 0;
  const weeklySurveys = (weekRows ?? []).reduce((s, r) => s + r.surveys_completed, 0);
  const weeklyRefs = (refs ?? []).filter((r) => (r.activated_at ?? "") >= week).length;

  const rowsToUpsert = missions.map((mission) => {
    const periodStart = mission.period === "weekly" ? week : today;
    let progress = 0;
    if (mission.metric === "referrals_activated") progress = weeklyRefs;
    else progress = mission.period === "weekly" ? weeklySurveys : dailySurveys;

    return { user_id: userId, mission_id: mission.id, period_start: periodStart, progress };
  });

  if (rowsToUpsert.length > 0) {
    await supabaseAdmin.from("user_missions").upsert(rowsToUpsert, {
      onConflict: "user_id,mission_id,period_start",
    });
  }
}

/** Marks a referral as activated and upgrades the referrer once the target is hit. */
export async function activateReferral(userId: string) {
  const { data: referral } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .eq("referred_id", userId)
    .maybeSingle();
  if (!referral || referral.activated) return;

  await supabaseAdmin
    .from("referrals")
    .update({ activated: true, activated_at: new Date().toISOString() })
    .eq("id", referral.id);

  const settings = await getSettings();
  if (Number(settings.referral_commission_kes) > 0) {
    await awardEarning(
      referral.referrer_id,
      "referral",
      Number(settings.referral_commission_kes),
      { note: "Referral activation commission" },
    );
  }

  const { data: activeRefs } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referrer_id", referral.referrer_id)
    .eq("activated", true);

  const total = activeRefs?.length ?? 0;
  if (total >= Number(settings.referral_target)) {
    await grantBadge(referral.referrer_id, "recruiter");
    const referrer = await getProfile(referral.referrer_id);
    const rewardTier = (settings.referral_reward_tier ?? "vip1") as Tier;
    if (referrer && tierRank(referrer.tier) < tierRank(rewardTier)) {
      await setTier(referral.referrer_id, rewardTier, "Referral reward upgrade");
    }
  }
}

export async function setTier(userId: string, tier: Tier, note?: string) {
  await supabaseAdmin.from("profiles").update({ tier }).eq("id", userId);
  if (tier !== "regular") await grantBadge(userId, "vip_member");
  if (note) {
    await supabaseAdmin.from("earnings").insert({
      user_id: userId,
      type: "admin_adjustment",
      amount_kes: 0,
      note: `${note}: ${TIER_ORDER.includes(tier) ? tier : "regular"}`,
    });
  }
}

/** Everything the "welcome back" popup needs to nag the user about (never shown to new accounts). */
export async function pendingTasks(userId: string) {
  const profile = await getProfile(userId);
  if (!profile) return { items: [], popupSeen: true, streak: 0 };

  // Never show "Welcome back!" popup to new accounts (less than 7 days old or streak <= 1)
  const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0;
  const isNewAccount = !createdAt || (Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000) || profile.streak_days <= 1;
  if (isNewAccount) {
    return { items: [], popupSeen: true, streak: profile.streak_days };
  }

  const [kyc, charges, day] = await Promise.all([
    supabaseAdmin
      .from("kyc_requests")
      .select("id, status, kind")
      .eq("user_id", userId)
      .in("status", ["requested", "rejected"])
      .order("requested_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("charges")
      .select("id, purpose, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(5),
    dailyRow(userId),
  ]);

  const items: Array<{ kind: string; title: string; description: string; href: string }> = [];

  if (kyc?.data?.length) {
    items.push({
      kind: "kyc",
      title: "Identity check required",
      description: "Our team asked you to verify your identity to keep earning.",
      href: "/kyc",
    });
  }
  const { data: userWithdrawals } = await supabaseAdmin
    .from("withdrawals")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  const hasAttemptedPayout = (userWithdrawals ?? []).length > 0 || !!profile.mpesa_phone;

  if (!profile.mpesa_verified) {
    items.push({
      kind: "mpesa",
      title: "Verify your payout account",
      description: "Verify once so we can send your payouts without delays.",
      href: "/wallet",
    });
  }
  if (profile.tier === "regular") {
    items.push({
      kind: "upgrade",
      title: "Activate a VIP plan",
      description: "Earn more per survey and withdraw faster.",
      href: "/upgrade",
    });
  }
  if (charges?.data?.length) {
    items.push({
      kind: "charge",
      title: "Payment waiting for confirmation",
      description: "Approve the payment prompt on your phone to finish.",
      href: "/wallet",
    });
  }

  return {
    items,
    popupSeen: day?.popup_seen ?? false,
    streak: profile.streak_days,
  };
}

export async function markPopupSeen(userId: string) {
  const day = nairobiToday();
  const row = await dailyRow(userId, day);
  if (row) {
    await supabaseAdmin.from("daily_activity").update({ popup_seen: true }).eq("id", row.id);
  } else {
    await supabaseAdmin
      .from("daily_activity")
      .insert({ user_id: userId, day, popup_seen: true });
  }
}

const adminCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();

export const ADMIN_EMAILS = ["faiza.edson@gmail.com", "egaleno.tt@gmail.com"];

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(normalized);
}

export function cacheAdminUser(userId: string) {
  adminCache.set(userId, { isAdmin: true, expiresAt: Date.now() + 60 * 60_000 });
}

export async function isAdmin(userId: string, userEmail?: string): Promise<boolean> {
  if (userEmail && isPlatformAdminEmail(userEmail)) {
    cacheAdminUser(userId);
    return true;
  }

  const now = Date.now();
  const cached = adminCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.isAdmin;
  }

  try {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleRow) {
      cacheAdminUser(userId);
      return true;
    }

    // Fallback to admin.getUserById if email was not supplied in context
    if (!userEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = authUser?.user?.email?.toLowerCase() ?? "";
      if (isPlatformAdminEmail(email)) {
        cacheAdminUser(userId);
        return true;
      }
    }

    adminCache.set(userId, { isAdmin: false, expiresAt: now + 5 * 60_000 });
    return false;
  } catch {
    return false;
  }
}

export async function requireAdmin(userId: string, userEmail?: string) {
  const ok = await isAdmin(userId, userEmail);
  if (!ok) throw new Error("Forbidden: admin only");
}
