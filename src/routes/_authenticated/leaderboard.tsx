import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Crown, Flame, Trophy } from "lucide-react";
import { formatKes, TIER_LABELS } from "@/lib/format";
import { weeklyRanks, weekKey } from "@/lib/social-proof";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "National leaderboard — TikTok Reward Coin" },
      {
        name: "description",
        content:
          "See South Africa's top TikTok Reward Coin panelists ranked by experience points and daily streaks.",
      },
      { property: "og:title", content: "National leaderboard — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Top panelists ranked by XP and streaks. Climb the ranks by answering daily.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const [rotation, setRotation] = useState(0);
  const seed = useMemo(() => weekKey(), []);
  const rows = useMemo(() => weeklyRanks(rotation, seed), [rotation, seed]);

  // Names and amounts shuffle periodically so the board feels live.
  useEffect(() => {
    const timer = setInterval(() => setRotation((value) => value + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold">
          <Trophy className="size-7 text-gold" /> Weekly ranks
        </h1>
        <p className="text-muted-foreground">
          Top 25 earners of this week (week of {seed}). Answer your daily survey and upgrade your
          plan to climb.
        </p>
      </header>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display text-base">This week's top earners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div
              key={`${row.rank}-${row.name}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-8 shrink-0 text-center font-display font-bold">
                  {MEDALS[row.rank - 1] ?? row.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {row.name}
                    <span className="font-normal text-muted-foreground"> · {row.town}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Flame className="size-3.5 text-warning" /> {row.streak} day streak ·{" "}
                    {row.surveys} surveys
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {row.tier !== "regular" ? (
                  <Badge className="bg-gold text-gold-foreground">
                    <Crown className="mr-1 size-3" />
                    {TIER_LABELS[row.tier]}
                  </Badge>
                ) : null}
                <span className="font-display font-bold text-money">
                  {formatKes(row.weeklyKes)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
