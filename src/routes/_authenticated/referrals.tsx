import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Gift, Share2, Users } from "lucide-react";
import { getReferralOverview } from "@/lib/account.functions";
import { TIER_LABELS, relativeDate } from "@/lib/format";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "Invite friends & get upgraded — TikTok Reward Coin" },
      {
        name: "description",
        content:
          "Share your TikTok Reward Coin invite link. When your friends activate their accounts you get a free plan upgrade.",
      },
      { property: "og:title", content: "Invite friends & get upgraded — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Your invite link, referral progress and free upgrade tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: isMeLoading } = useMe();
  const isVerified = Boolean(me?.profile.mpesa_verified);

  const { data, isLoading } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => getReferralOverview(),
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isMeLoading && !isVerified) {
      void navigate({ to: "/dashboard" });
    }
  }, [isMeLoading, isVerified, navigate]);

  if (isMeLoading || !isVerified) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const link =
    typeof window !== "undefined" && data?.code
      ? `${window.location.origin}/auth?mode=signup&ref=${data.code}`
      : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!link) return;
    const text = `Get paid for short surveys in South Africa 🇿🇦 Join with my link and claim your welcome bonus: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "TikTok Reward Coin", text, url: link });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  const progress = data.target ? Math.min(100, (data.activated / data.target) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="bg-hero border-0 text-white shadow-lift">
        <CardContent className="p-6">
          <Gift className="size-7 text-money" />
          <h1 className="mt-3 font-display text-2xl font-bold">
            Invite {data.target} friends, get {TIER_LABELS[data.rewardTier] ?? "VIP"} free
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Your upgrade unlocks as soon as {data.target} of your invites activate their accounts or
            upgrade.
          </p>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Activated invites</span>
              <span className="font-semibold">
                {data.activated} / {data.target}
              </span>
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <code className="rounded-xl bg-white/15 px-4 py-2 font-display text-lg font-bold tracking-widest">
              {data.code}
            </code>
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => void copy()}
            >
              {copied ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
              Copy link
            </Button>
            <Button
              className="bg-money text-money-foreground hover:bg-money/90"
              onClick={() => void share()}
            >
              <Share2 className="mr-1 size-4" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Users className="size-5 text-primary" /> Your invites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invites yet. Share your link in your WhatsApp groups to get started.
            </p>
          ) : null}
          {data.referrals.map((referral) => (
            <div
              key={referral.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div>
                <p className="font-medium">{referral.phone}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {relativeDate(referral.joinedAt)} • {TIER_LABELS[referral.tier] ?? "Regular"}
                </p>
              </div>
              <Badge variant={referral.activated ? "default" : "secondary"}>
                {referral.activated ? "Activated" : "Pending"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
