import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Crown,
  Flame,
  Gift,
  PlaySquare,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
  Zap,
  RefreshCw,
} from "lucide-react";
import { claimMission, getMissions, getPublicConfig } from "@/lib/account.functions";
import { formatKes, levelFromXp, TIER_LABELS } from "@/lib/format";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — TikTok Reward Coin" },
      {
        name: "description",
        content:
          "Track today's surveys, your streak, missions and wallet balance in one place on TikTok Reward Coin.",
      },
      { property: "og:title", content: "Your dashboard — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Today's progress, missions and earnings for your TikTok Reward Coin account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: me, isLoading, isError, error, refetch } = useMe();
  const queryClient = useQueryClient();
  const missionsQuery = useQuery({
    queryKey: ["missions"],
    queryFn: () => getMissions(),
    staleTime: 30_000,
  });
  const configQuery = useQuery({
    queryKey: ["public-config"],
    queryFn: () => getPublicConfig(),
    staleTime: 60_000,
  });
  const claim = useServerFn(claimMission);

  const [showWelcomeBonusModal, setShowWelcomeBonusModal] = useState(false);

  useEffect(() => {
    if (me) {
      const claimedKey = `welcome_bonus_claimed_${me.profile.id}`;
      const isClaimed = localStorage.getItem(claimedKey);
      if (!isClaimed) {
        setShowWelcomeBonusModal(true);
      }
    }
  }, [me]);

  const handleCollectWelcomeBonus = () => {
    if (!me) return;
    const claimedKey = `welcome_bonus_claimed_${me.profile.id}`;
    localStorage.setItem(claimedKey, "true");
    setShowWelcomeBonusModal(false);
    toast.success(`🎉 ${formatKes(me.settings.welcome_bonus_kes)} Welcome Bonus collected! Now complete your 5 video reviews.`);
    void navigate({ to: "/surveys" });
  };

  const claimMutation = useMutation({
    mutationFn: (missionId: string) => claim({ data: { missionId } }),
    onSuccess: (result) => {
      toast.success(`Mission reward of ${formatKes(result.reward)} added to your wallet!`);
      void queryClient.invalidateQueries({ queryKey: ["missions"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="mx-auto max-w-lg py-12 px-4 text-center space-y-4">
        <Card className="p-6 sm:p-8 space-y-4 shadow-lift border border-border/60">
          <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <RefreshCw className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Preparing your dashboard</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Your account details took longer than expected to load. Click below to refresh."}
            </p>
          </div>
          <Button
            onClick={() => {
              void refetch();
              void queryClient.invalidateQueries({ queryKey: ["me"] });
            }}
            className="w-full sm:w-auto gap-2"
          >
            <RefreshCw className="size-4" />
            <span>Refresh Dashboard</span>
          </Button>
        </Card>
      </div>
    );
  }

  const level = levelFromXp(me.profile.xp);
  const remaining = Math.max(0, me.today.limit - me.today.completed);
  const dayProgress = me.today.limit ? (me.today.completed / me.today.limit) * 100 : 0;
  const missions = (missionsQuery.data ?? []).filter(
    (m) =>
      !m.title.toLowerCase().includes("friend") &&
      !m.description.toLowerCase().includes("invite") &&
      m.id !== "7d29d7a4-f6d1-4419-a738-53559d0b140d"
  );
  const firstName = me.profile.full_name?.split(" ")[0] ?? "there";

  const tierOrder = ["regular", "vip1", "vip2", "vip3"] as const;
  const plans = configQuery.data?.plans ?? [];
  const nextTier = tierOrder[tierOrder.indexOf(me.profile.tier) + 1];
  const nextPlan = nextTier ? plans.find((plan) => plan.tier === nextTier) : undefined;
  const nextDaily = Number(nextPlan?.reward_per_survey ?? 0) * (me.today.limit || 1);

  const hasKycActionNeeded = Boolean(
    (me as any).activeKycRequest && (me as any).activeKycRequest.status !== "approved"
  );

  const topNudge = hasKycActionNeeded
    ? {
        title: "⚠️ FICA Identity Verification Required",
        text: "Our compliance team has requested your official FICA documents to authorize and clear your bank transfers.",
        cta: "Verify Identity Now",
        to: "/kyc",
        isAlert: true,
      }
    : !me.profile.mpesa_verified && me.hasAttemptedPayout
    ? {
        title: "Verify your account to release your payout",
        text: "Authenticate your bank account to unlock and process your pending payout.",
        cta: "Verify now",
        to: "/upgrade",
        isAlert: false,
      }
    : me.profile.mpesa_verified
      ? {
          title: "⚡ Payout Clearance Active — Setup Instant Delivery",
          text: "Your bank account is verified! Review your priority delivery speed and fee clearance to expedite your payout transfers.",
          cta: "Configure Clearance",
          to: "/payout-setup",
          isAlert: false,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="bg-hero overflow-hidden border-0 text-white shadow-lift">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">Welcome back, {firstName} 👋</p>
              <p className="font-display text-4xl font-extrabold text-money">
                {formatKes(me.balance)}
              </p>
              <p className="mt-1 text-sm text-white/70">Available balance</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="border-0 bg-gold text-gold-foreground">
                <Crown className="mr-1 size-3.5" />
                {TIER_LABELS[me.profile.tier]}
              </Badge>
              <span className="text-xs text-white/70">Level {level.level}</span>
              <Progress value={level.current} className="h-1.5 w-28" />
            </div>
          </div>

          {topNudge ? (
            <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-md ${
              topNudge.isAlert
                ? "bg-gradient-to-r from-red-600/40 via-amber-600/30 to-red-600/40 border-2 border-red-400 text-white"
                : me.profile.mpesa_verified
                ? "bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-primary/30 border-2 border-gold/60 text-white"
                : "bg-white/15 text-white"
            }`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base">{topNudge.title}</p>
                  {topNudge.isAlert ? (
                    <Badge className="bg-red-500 text-white text-[10px] font-black animate-pulse">ACTION REQUIRED</Badge>
                  ) : me.profile.mpesa_verified ? (
                    <Badge className="bg-gold text-gold-foreground text-[10px] font-black animate-pulse">ACTION REQUIRED</Badge>
                  ) : null}
                </div>
                {topNudge.text ? <p className="text-xs text-white/85 mt-0.5">{topNudge.text}</p> : null}
              </div>
              <Button
                asChild
                size="sm"
                className="bg-gold text-gold-foreground hover:bg-gold/90 shrink-0 font-bold shadow-lift"
              >
                <Link to={topNudge.to}>{topNudge.cta}</Link>
              </Button>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Today's videos</span>
              <span>
                {me.today.completed} / {me.today.limit}
              </span>
            </div>
            <Progress value={dayProgress} className="mt-2 h-2" />
            <p className="mt-2 text-xs text-white/70">
              {remaining > 0
                ? `${remaining} video${remaining === 1 ? "" : "s"} left today — ${formatKes(
                    Number(me.plan?.reward_per_survey ?? 0),
                  )} each.`
                : "All 5 videos completed today! Your balance of R 3,800 is ready for withdrawal, or return in 24 hours to watch 5 more videos and continue accumulating."}
            </p>
            {remaining === 0 ? (
              <div className="mt-2.5">
                <NextDayCountdown />
              </div>
            ) : null}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              {remaining > 0 ? (
                <Button
                  asChild
                  className="w-full bg-money text-money-foreground hover:bg-money/90 font-bold rounded-xl shadow-lift"
                >
                  <Link to="/surveys">
                    Watch Video ({me.today.completed + 1}/{me.today.limit})
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              ) : (
                <div className="flex flex-col gap-2.5 w-full">
                  <Button
                    asChild
                    size="lg"
                    className="w-full h-12 text-sm sm:text-base font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-md rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Link to="/wallet">
                      <Wallet className="size-4 sm:size-5" />
                      <span>Go to Wallet &amp; Request Payout</span>
                      <ChevronRight className="size-4 sm:size-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl font-semibold"
                  >
                    <Link to="/surveys">
                      View Daily Tasks
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Flame}
          label="Daily streak"
          value={`${me.profile.streak_days} day${me.profile.streak_days === 1 ? "" : "s"}`}
          hint={`7 days in a row = ${formatKes(me.settings.streak_bonus_kes)} bonus`}
        />
        <StatCard
          icon={Banknote}
          label="Earned today"
          value={formatKes(me.today.earned)}
          hint={`${formatKes(Number(me.plan?.reward_per_survey ?? 0))} per video on ${
            me.plan?.name ?? "Regular"
          }`}
        />
        <StatCard
          icon={Zap}
          label="Experience"
          value={`${me.profile.xp} XP`}
          hint={`${level.needed - level.current} XP to level ${level.level + 1}`}
        />
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 font-display">
            <Target className="size-5 text-primary" /> Missions
          </CardTitle>
          <Badge variant="secondary">Extra cash</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {missionsQuery.isLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : null}
          {missions.map((mission) => {
            const done = mission.progress >= mission.goal;
            return (
              <div
                key={`${mission.id}-${mission.periodStart}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{mission.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {mission.period}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{mission.description}</p>
                  <Progress
                    value={(mission.progress / mission.goal) * 100}
                    className="mt-2 h-1.5 max-w-xs"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mission.progress} / {mission.goal}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-primary">
                    +{formatKes(mission.reward)}
                  </p>
                  <Button
                    size="sm"
                    className="mt-1"
                    disabled={!done || mission.claimed || claimMutation.isPending}
                    onClick={() => claimMutation.mutate(mission.id)}
                  >
                    {mission.claimed ? "Claimed" : done ? "Claim" : "In progress"}
                  </Button>
                </div>
              </div>
            );
          })}
          {!missionsQuery.isLoading && missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No missions right now — check back soon.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Award className="size-5 text-gold" /> Your badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {me.badges.length ? (
              <div className="flex flex-wrap gap-2">
                {me.badges.map((badge) => (
                  <Badge key={badge.badge_code} className="bg-gold text-gold-foreground">
                    {badge.badge_code.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete your first survey to unlock your first badge.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {me.profile.mpesa_verified ? (
            <QuickLink
              to="/upgrade"
              icon={Crown}
              title="Earn more per survey"
              text="Compare VIP plans and payout speeds"
            />
          ) : me.hasAttemptedPayout ? (
            <QuickLink
              to="/upgrade"
              icon={ShieldCheck}
              title="Verify your account"
              text="Authenticate your bank account for payouts"
            />
          ) : (
            <QuickLink
              to="/wallet"
              icon={Wallet}
              title="Request Bank Payout"
              text="Direct electronic funds transfer"
            />
          )}
          <QuickLink
            to="/leaderboard"
            icon={Trophy}
            title="Leaderboard"
            text="See South Africa's top panelists"
          />
          <QuickLink
            to="/surveys"
            icon={ClipboardList}
            title="Survey list"
            text="Fresh surveys every day"
          />
        </div>

        {/* Welcome Bonus Dialog */}
        <Dialog open={showWelcomeBonusModal} onOpenChange={setShowWelcomeBonusModal}>
          <DialogContent className="sm:max-w-md text-center p-6 space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-money/20 text-money ring-8 ring-money/10">
              <Gift className="size-8" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                🎉 Welcome Bonus Ready!
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                You received a starting bonus credited directly to your wallet.
              </p>
            </div>

            <div className="rounded-2xl border border-money/40 bg-money/10 p-4 text-center">
              <span className="text-xs uppercase font-bold text-money-foreground tracking-wider">
                Bonus Balance
              </span>
              <p className="font-display text-4xl font-extrabold text-foreground mt-1">
                +{formatKes(me.settings.welcome_bonus_kes)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Credited to your account upon registration
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-left space-y-2 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> How to withdraw your earnings:
              </p>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-money/20 text-[11px] font-bold text-money">
                    1
                  </span>
                  <span>Collect your {formatKes(me.settings.welcome_bonus_kes)} welcome bonus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                    2
                  </span>
                  <span>Watch 5 videos and leave a review for each</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                    3
                  </span>
                  <span>Rewards go to your wallet — withdraw whenever you want</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCollectWelcomeBonus}
            >
              Collect Bonus & Start Tasks
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </span>
        <p className="mt-2 font-display text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string;
  icon: typeof Gift;
  title: string;
  text: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-shadow hover:shadow-lift">
        <CardContent className="p-5">
          <Icon className="size-5 text-primary" />
          <p className="mt-3 font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{text}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
