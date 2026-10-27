import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Clock, Crown, Lock, PartyPopper, Play, Sparkles, Timer, Wallet } from "lucide-react";
import { listSurveys } from "@/lib/surveys.functions";
import { formatKes, TIER_LABELS } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function NextDayCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // South Africa Standard Time (SAST, UTC+2)
      const sastNow = new Date(now.getTime() + (2 * 60 + now.getTimezoneOffset()) * 60000);
      const tomorrowSast = new Date(sastNow);
      tomorrowSast.setHours(24, 0, 0, 0);
      const diffMs = tomorrowSast.getTime() - sastNow.getTime();
      if (diffMs <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hours = String(Math.floor(diffMs / 3600000)).padStart(2, "0");
      const minutes = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-emerald-950/80 text-[#065F46] dark:text-emerald-300 px-3.5 py-1 text-xs font-medium border border-[#A7F3D0] dark:border-emerald-800/60 shadow-2xs">
      <Clock className="size-3.5 text-[#059669] dark:text-emerald-400" />
      <span>
        Next 5 daily tasks unlock in: <strong className="font-mono font-bold text-[#059669] dark:text-emerald-400">{timeLeft || "--:--:--"}</strong>
      </span>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/surveys/")({
  head: () => ({
    meta: [
      { title: "Watch & Earn — TikTok Reward Coin" },
      {
        name: "description",
        content: "Watch today's short videos, earn Rands instantly and preview how much the VIP plans pay.",
      },
      { property: "og:title", content: "Watch & Earn — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Watch short videos and earn Rands every day in South Africa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => listSurveys(),
    staleTime: 15_000,
  });
  const today = data?.today ?? null;
  const dailyTasks = (data as any)?.dailyTasks ?? (data?.available ?? []);
  const isAllDone = Boolean(
    data && (data.doneForToday || data.remaining === 0 || (data.completedToday ?? 0) >= (data.limit ?? 5))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold">Watch &amp; Earn</h1>
            {data?.isAdmin ? (
              <Badge className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
                👑 Super Admin: All Videos Free
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {data?.isAdmin
              ? "Super Admin profile: Unlimited and unrestricted access to all videos."
              : `Watch 5 short videos a day in sequential order — instant cash straight to your wallet for withdrawal.`}
          </p>
        </div>
        <Badge variant="secondary" className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-blue-50/80 text-primary dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
          {data?.isAdmin ? "Unlimited Access" : `${data?.completedToday ?? 0} of ${data?.limit ?? 5} completed today`}
        </Badge>
      </header>

      {isLoading ? <Skeleton className="h-48 rounded-2xl" /> : null}

      {/* Done for today notification & Direct Withdrawal Action */}
      {!isLoading && isAllDone && !data?.isAdmin ? (
        <Card className="border-[#A7F3D0] dark:border-emerald-800/40 bg-[#E8F8F0] dark:bg-emerald-950/30 shadow-soft overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto size-16 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-soft">
              <PartyPopper className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#065F46] dark:text-emerald-300">
                🎉 All 5 Daily Video Reviews Completed!
              </h2>
              <p className="text-xs sm:text-sm text-[#047857] dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
                Your earnings have been added to your wallet balance. You can request your payout now, or return in 24 hours to find your next 5 daily video tasks.
              </p>
              <div className="pt-1">
                <NextDayCountdown />
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-2.5 max-w-sm mx-auto w-full">
              <Button asChild size="lg" className="w-full h-12 text-sm sm:text-base font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-md rounded-xl flex items-center justify-center gap-2 transition-all">
                <Link to="/wallet">
                  <Wallet className="size-4 sm:size-5" />
                  <span>Go to Wallet &amp; Request Payout</span>
                  <ChevronRight className="size-4 sm:size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" className="w-full h-12 text-sm sm:text-base font-bold bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-md rounded-xl transition-all">
                <Link to="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Active Featured Video */}
      {!isAllDone && today ? (
        <Card className="shadow-soft overflow-hidden border-primary/30 bg-card">
          <CardContent className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                  Video {today.taskNumber ?? 1} of {data?.limit ?? 5}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {today.category}
                </Badge>
              </div>
              <Badge className="bg-money text-money-foreground font-bold">+{formatKes(today.reward)}</Badge>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold">{today.title}</h2>
            {today.caption ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{today.caption}</p>
            ) : null}

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Timer className="size-3.5 text-primary" /> {today.durationSeconds}s watch time
              </span>
              <span>•</span>
              <span className="text-money font-semibold">Instant wallet credit</span>
            </div>

            <Button asChild className="mt-5 w-full bg-money text-money-foreground hover:bg-money/90 h-13 text-base font-bold rounded-xl shadow-lift" size="lg">
              <Link to="/surveys/$surveyId" params={{ surveyId: today.id }}>
                <Play className="mr-2 size-5 fill-current" /> Watch Video (+{formatKes(today.reward)})
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Sequential Daily Tasks List (1 to 5) */}
      {dailyTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Today's Video Sequence ({dailyTasks.length} videos)
            </h2>
            <span className="text-xs text-muted-foreground">
              {isAllDone ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ All 5 Completed Today
                </span>
              ) : (
                "Unlocked sequentially (one by one)"
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {dailyTasks.map((task: any, index: number) => {
              const taskNum = task.taskNumber ?? index + 1;
              const isCompleted = task.status === "completed";
              const isActive = task.status === "active";
              const isLocked = task.status === "locked";

              return (
                <Card
                  key={task.id}
                  className={`transition-all shadow-xs rounded-2xl border ${
                    isActive
                      ? "border-primary/50 bg-primary/[0.03] shadow-soft ring-1 ring-primary/20"
                      : isCompleted
                      ? "border-money/30 bg-money/[0.02] opacity-80"
                      : "border-border/60 bg-muted/20 opacity-65"
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                          isCompleted
                            ? "bg-money/15 text-money"
                            : isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="size-5" />
                        ) : isLocked ? (
                          <Lock className="size-4" />
                        ) : (
                          <span>{taskNum}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{task.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isCompleted ? (
                            <span className="text-money font-semibold flex items-center gap-1">
                              ✓ Completed (+{formatKes(task.reward)})
                            </span>
                          ) : isActive ? (
                            <span className="text-primary font-semibold">
                              ● Available now (+{formatKes(task.reward)})
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              🔒 Locked (Complete Video {taskNum - 1} first)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <Badge variant="outline" className="text-xs text-money border-money/40 font-medium">
                          Paid
                        </Badge>
                      ) : isActive ? (
                        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-xs">
                          <Link to="/surveys/$surveyId" params={{ surveyId: task.id }}>
                            <Play className="mr-1.5 size-3.5 fill-current" /> Watch
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="text-xs text-muted-foreground cursor-not-allowed">
                          <Lock className="mr-1 size-3" /> Locked
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Tomorrow's Locked Video Tasks Preview */}
      {(data?.tomorrowTasks ?? []).length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Lock className="size-4 text-muted-foreground" />
              <span>Tomorrow's Video Tasks ({data?.tomorrowTasks?.length ?? 5} videos)</span>
            </h2>
            <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 text-xs font-semibold">
              🔒 Unlocks tomorrow at 00:00 SAST
            </Badge>
          </div>

          <div className="space-y-2.5">
            {(data?.tomorrowTasks ?? []).map((task: any, index: number) => {
              const taskNum = task.taskNumber ?? (data?.completedToday ?? 5) + index + 1;
              return (
                <Card
                  key={task.id}
                  className="transition-all shadow-xs rounded-2xl border border-border/70 bg-muted/20 opacity-75 hover:opacity-90"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm bg-muted text-muted-foreground">
                        <Lock className="size-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate text-foreground">{task.title}</p>
                          <Badge variant="secondary" className="text-[10px] bg-muted/60 text-muted-foreground font-mono">
                            Video {taskNum}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{formatKes(task.reward)}
                          </span>
                          <span>•</span>
                          <span>15s review</span>
                          <span>•</span>
                          <span className="text-muted-foreground">
                            🔒 Unlocks tomorrow (00:00 SAST)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button size="sm" variant="ghost" disabled className="text-xs text-muted-foreground cursor-not-allowed border border-border/40">
                        <Lock className="mr-1 size-3" /> Locked
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Locked VIP Plans - only shown after account is verified */}
      {data?.isVerified && (data?.lockedPlans ?? []).length ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Unlock Higher Paying Plans</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(data?.lockedPlans ?? []).map((plan) => (
              <Card key={plan.tier} className="border-gold/40 shadow-soft">
                <CardContent className="flex flex-col p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className="bg-gold text-gold-foreground font-semibold">
                      <Crown className="mr-1 size-3" /> {plan.name}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatKes(plan.price)} once
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      On {TIER_LABELS[plan.tier as keyof typeof TIER_LABELS] ?? plan.name} you'd earn
                    </p>
                    <p className="font-display text-xl font-bold text-gold-foreground">
                      {formatKes(plan.perDay)} / day
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatKes(plan.perSurvey)} per video · {formatKes(plan.perMonth)} per month ·
                      payout every {plan.withdrawalDays} day{plan.withdrawalDays === 1 ? "" : "s"}
                    </p>
                  </div>

                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link to="/upgrade">
                      <Lock className="mr-1 size-4" /> Unlock {plan.name}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
