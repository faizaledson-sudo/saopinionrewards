import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveVideoTask, type VideoTask } from "./videos";

/**
 * Windowing algorithm: 30 videos divided into 5 per day.
 * - Completed today: the last `completedTodayCount` items from completedList.
 * - Remaining for today: the next uncompleted surveys from uncompletedList.
 * - Exactly 5 tasks are shown for the user each day in sequential order.
 */
function computeDailySurveys<T extends { id: string }>(
  eligibleSurveys: T[],
  completedIds: Set<string>,
  completedTodayCount: number,
  limit: number,
  isUserAdmin: boolean,
): T[] {
  if (isUserAdmin) return eligibleSurveys;

  const completedList = eligibleSurveys.filter((s) => completedIds.has(s.id));
  const uncompletedList = eligibleSurveys.filter((s) => !completedIds.has(s.id));

  const completedTodaySurveys =
    completedTodayCount > 0 ? completedList.slice(-completedTodayCount) : [];

  const needed = Math.max(0, limit - completedTodaySurveys.length);
  const uncompletedTodaySurveys = uncompletedList.slice(0, needed);

  return [...completedTodaySurveys, ...uncompletedTodaySurveys];
}

let cachedSurveys: { data: any[]; expiresAt: number } | null = null;

export async function getActiveSurveys() {
  const now = Date.now();
  if (cachedSurveys && cachedSurveys.expiresAt > now) {
    return cachedSurveys.data;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("surveys")
    .select("id, title, description, category, min_tier, estimated_minutes, created_at, status")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const result = data ?? [];
  cachedSurveys = { data: result, expiresAt: now + 30_000 };
  return result;
}

export function invalidateSurveysCache() {
  cachedSurveys = null;
}

/** Today's videos for the user, plus the locked plan previews. */
export const listSurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tierRank } = await import("./format");

    const [
      profile,
      plans,
      settings,
      day,
      isUserAdmin,
      allSurveys,
      { data: done },
    ] = await Promise.all([
      p.getProfile(context.userId),
      p.getPlans(),
      p.getSettings(),
      p.dailyRow(context.userId),
      p.isAdmin(context.userId, (context as any).claims?.email),
      getActiveSurveys(),
      supabaseAdmin
        .from("responses")
        .select("survey_id, status")
        .eq("user_id", context.userId)
        .eq("status", "completed"),
    ]);

    const limit = isUserAdmin ? Math.max(allSurveys.length, 999) : Number(settings.surveys_per_day);
    if (!profile) return { today: null, available: [], remaining: 0, limit, lockedPlans: [] };

    const myRank = tierRank(profile.tier);
    const myPlan = plans.find((item) => item.tier === profile.tier);
    const reward = Number(myPlan?.reward_per_survey ?? 0);

    const completedIds = new Set((done ?? []).map((r) => r.survey_id));
    // For admin, all videos are eligible and free!
    const eligible = isUserAdmin
      ? allSurveys
      : allSurveys.filter((s) => tierRank(s.min_tier) <= myRank);
    const availableSurveys = isUserAdmin
      ? allSurveys
      : eligible.filter((s) => !completedIds.has(s.id));
    const next = availableSurveys[0] ?? null;
    const completedToday = day?.surveys_completed ?? 0;
    const remaining = isUserAdmin ? Math.max(allSurveys.length, 999) : Math.max(0, limit - completedToday);

    const isVerified = isUserAdmin ? true : Boolean(profile.mpesa_verified);

    // Locked VIP plans: none for admin since all videos are free
    const lockedPlans = isUserAdmin
      ? []
      : isVerified
      ? plans
          .filter((plan) => tierRank(plan.tier as never) > myRank)
          .map((plan) => {
            const perSurvey = Number(plan.reward_per_survey);
            return {
              tier: plan.tier,
              name: plan.name,
              price: Number(plan.price_kes),
              perSurvey,
              perDay: perSurvey * limit,
              perMonth: perSurvey * limit * 30,
              withdrawalDays: plan.withdrawal_days,
            };
          })
      : [];

    // Build the sequential 5 daily tasks in strict order (30 videos divided into 5 per day)
    const dailySurveys = computeDailySurveys(
      eligible,
      completedIds,
      completedToday,
      limit,
      isUserAdmin,
    );

    let activeFound = false;
    const dailyTasks = dailySurveys.map((s, idx) => {
      const isCompleted = completedIds.has(s.id);
      let status: "completed" | "active" | "locked" = "locked";
      if (isUserAdmin) {
        status = "active";
      } else if (isCompleted) {
        status = "completed";
      } else if (!activeFound) {
        status = "active";
        activeFound = true;
      } else {
        status = "locked";
      }

      const task = resolveVideoTask(
        {
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          estimated_minutes: s.estimated_minutes,
          reward,
        },
        idx,
      );

      return {
        ...task,
        taskNumber: idx + 1,
        status,
        isCompleted: status === "completed",
        isActive: status === "active",
        isLocked: status === "locked",
      };
    });

    const activeTask = dailyTasks.find((t) => t.isActive) ?? null;
    const todayVideo = activeTask;

    // Build tomorrow's preview (the next 5 video tasks that unlock tomorrow)
    const dailySurveyIds = new Set(dailySurveys.map((s) => s.id));
    const uncompletedAfterToday = eligible.filter(
      (s) => !completedIds.has(s.id) && !dailySurveyIds.has(s.id),
    );
    const tomorrowSurveys =
      uncompletedAfterToday.length >= limit
        ? uncompletedAfterToday.slice(0, limit)
        : uncompletedAfterToday.concat(
            eligible.filter((s) => !dailySurveyIds.has(s.id)),
          ).slice(0, limit);

    const tomorrowTasks = tomorrowSurveys.map((s, idx) => {
      const eligibleIdx = eligible.findIndex((e) => e.id === s.id);
      const overallIdx = eligibleIdx >= 0 ? eligibleIdx : dailySurveys.length + idx;
      const task = resolveVideoTask(
        {
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          estimated_minutes: s.estimated_minutes,
          reward,
        },
        overallIdx,
      );
      return {
        ...task,
        taskNumber: overallIdx + 1,
        dayTaskNumber: idx + 1,
        status: "locked" as const,
        isCompleted: false,
        isActive: false,
        isLocked: true,
        lockReason: "Unlocks tomorrow at midnight (00:00 SAST)",
      };
    });

    return {
      limit,
      remaining,
      completedToday,
      isVerified,
      lockedPlans,
      today: todayVideo,
      available: dailyTasks,
      dailyTasks,
      tomorrowTasks,
      doneForToday: isUserAdmin ? false : remaining === 0 || !activeTask,
      outOfSurveys: !todayVideo && remaining > 0,
      isAdmin: isUserAdmin,
    };
  });

/** Full video task ready to watch. */
export const getSurvey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { surveyId: string }) => input)
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tierRank } = await import("./format");

    const [
      profile,
      settings,
      day,
      isUserAdmin,
      allSurveys,
      { data: done },
    ] = await Promise.all([
      p.getProfile(context.userId),
      p.getSettings(),
      p.dailyRow(context.userId),
      p.isAdmin(context.userId, (context as any).claims?.email),
      getActiveSurveys(),
      supabaseAdmin
        .from("responses")
        .select("survey_id, status")
        .eq("user_id", context.userId)
        .eq("status", "completed"),
    ]);

    const survey = allSurveys.find((s) => s.id === data.surveyId);

    if (!profile) throw new Error("Profile not found.");
    if (!survey) throw new Error("This video task is not available.");

    if (!isUserAdmin && tierRank(profile.tier) < tierRank(survey.min_tier)) {
      throw new Error("Upgrade your plan to unlock this video task.");
    }

    const plan = await p.getPlan(profile.tier);
    const limit = Number(settings.surveys_per_day);
    const reward = Number(plan?.reward_per_survey ?? 0);

    const completedIds = new Set((done ?? []).map((r) => r.survey_id));
    const isAlreadyCompleted = isUserAdmin ? false : completedIds.has(survey.id);

    const eligible = isUserAdmin
      ? (allSurveys ?? [])
      : (allSurveys ?? []).filter((s) => tierRank(s.min_tier) <= tierRank(profile.tier));
    const dailySurveys = computeDailySurveys(
      eligible,
      completedIds,
      day?.surveys_completed ?? 0,
      limit,
      isUserAdmin,
    );

    const targetIndex = dailySurveys.findIndex((s) => s.id === survey.id);
    const firstUncompleted = dailySurveys.find((s) => !completedIds.has(s.id));
    const isLocked = !isUserAdmin && !isAlreadyCompleted && Boolean(firstUncompleted && firstUncompleted.id !== survey.id);
    const activeSurveyId = firstUncompleted?.id;
    const activeTaskNumber = firstUncompleted ? dailySurveys.findIndex((s) => s.id === firstUncompleted.id) + 1 : 1;

    const videoTask = resolveVideoTask(
      {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        category: survey.category,
        estimated_minutes: survey.estimated_minutes,
        reward,
      },
      targetIndex >= 0 ? targetIndex : 0,
    );

    const completedToday = day?.surveys_completed ?? 0;
    const remaining = isUserAdmin ? 999 : Math.max(0, limit - completedToday);
    const doneForToday = !isUserAdmin && remaining === 0;

    return {
      survey,
      videoTask,
      questions: [],
      alreadyCompleted: isAlreadyCompleted,
      isLocked,
      activeSurveyId: (isLocked || isAlreadyCompleted) ? activeSurveyId : undefined,
      activeTaskNumber: (isLocked || isAlreadyCompleted) ? activeTaskNumber : undefined,
      taskNumber: targetIndex >= 0 ? targetIndex + 1 : 1,
      totalDailyTasks: dailySurveys.length,
      reward,
      isVerified: Boolean(profile.mpesa_verified) || isUserAdmin,
      remaining,
      completedToday,
      limit,
      doneForToday,
      isAdmin: isUserAdmin,
    };
  });

/** Confirms video watched, pays the user and updates streak, XP, missions and badges. */
export const submitSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      surveyId: string;
      answers?: Array<{ questionId: string; value: unknown }>;
      watchDurationSeconds?: number;
      rating?: number;
      review?: string;
      tags?: string[];
    }) => {
      if (!input.surveyId) throw new Error("Missing video task.");
      return {
        ...input,
        review: input.review?.trim() || "Great video! Verified ad review.",
      };
    },
  )
  .handler(async ({ data, context }) => {
    const p = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tierRank } = await import("./format");

    const [
      profile,
      isUserAdmin,
      settings,
      day,
      allSurveys,
      { data: done },
      currentBalance,
    ] = await Promise.all([
      p.getProfile(context.userId),
      p.isAdmin(context.userId, (context as any).claims?.email),
      p.getSettings(),
      p.dailyRow(context.userId),
      getActiveSurveys(),
      supabaseAdmin
        .from("responses")
        .select("survey_id, status")
        .eq("user_id", context.userId)
        .eq("status", "completed"),
      p.getBalance(context.userId),
    ]);

    const survey = allSurveys.find((s) => s.id === data.surveyId);

    if (!profile) throw new Error("Profile not found.");
    if (profile.banned_at) throw new Error("This account is suspended.");
    if (!survey || survey.status !== "active") throw new Error("This video task is closed.");
    if (!isUserAdmin && tierRank(profile.tier) < tierRank(survey.min_tier)) {
      throw new Error("Upgrade your plan to watch this video.");
    }

    const limit = Number(settings.surveys_per_day);
    if (!isUserAdmin && (day?.surveys_completed ?? 0) >= limit) {
      throw new Error(`Daily video limit reached (${limit}/${limit}). Come back tomorrow after midnight (SAST) to watch 5 more videos.`);
    }

    const completedIds = new Set((done ?? []).map((r) => r.survey_id));
    if (!isUserAdmin && completedIds.has(survey.id)) {
      throw new Error("You already watched this video.");
    }

    const eligible = isUserAdmin
      ? (allSurveys ?? [])
      : (allSurveys ?? []).filter((s) => tierRank(s.min_tier) <= tierRank(profile.tier));
    const dailySurveys = computeDailySurveys(
      eligible,
      completedIds,
      day?.surveys_completed ?? 0,
      limit,
      isUserAdmin,
    );

    if (!isUserAdmin) {
      // Must not submit video out of sequential order
      const firstUncompleted = dailySurveys.find((s) => !completedIds.has(s.id));
      if (firstUncompleted && firstUncompleted.id !== data.surveyId) {
        throw new Error("Please complete the videos in sequence.");
      }

      // Check 15-second minimum watch time
      if ((data.watchDurationSeconds ?? 0) < 15) {
        throw new Error("Please watch the full 15 seconds before submitting your review.");
      }
    }

    const plan = await p.getPlan(profile.tier);
    const reward = Number(plan?.reward_per_survey ?? 0);
    const completedToday = (day?.surveys_completed ?? 0) + 1;
    const balance = Math.round((Number(currentBalance) + reward) * 100) / 100;

    // Fast parallel execution: atomic upsert response, bump daily, award earning
    await Promise.all([
      supabaseAdmin.from("responses").upsert(
        {
          survey_id: survey.id,
          user_id: context.userId,
          status: "completed",
          reward_kes: reward,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "survey_id,user_id" },
      ),
      p.bumpDaily(context.userId, reward, day),
      p.awardEarning(context.userId, "survey", reward, {
        surveyId: survey.id,
        note: "Video watched & reward credited",
      }),
    ]);

    // Background asynchronous tasks (do not hold up client response)
    void (async () => {
      try {
        await supabaseAdmin
          .from("profiles")
          .update({ xp: (profile?.xp ?? 0) + 20 })
          .eq("id", context.userId);
        if (completedToday >= limit) await p.grantBadge(context.userId, "daily_five");
        await p.syncMissions(context.userId);
      } catch (err) {
        console.error("Background sync error:", err);
      }
    })();

    const currentIdx = dailySurveys.findIndex((s) => s.id === survey.id);
    const nextInDaily =
      currentIdx >= 0 && currentIdx + 1 < dailySurveys.length
        ? dailySurveys[currentIdx + 1]
        : null;

    const fallbackNext = eligible.find(
      (s) => !completedIds.has(s.id) && s.id !== survey.id,
    );

    const nextSurveyId =
      completedToday >= limit
        ? null
        : (nextInDaily?.id ?? fallbackNext?.id ?? null);

    return {
      reward,
      completedToday,
      limit,
      balance,
      nextSurveyId,
    };
  });
