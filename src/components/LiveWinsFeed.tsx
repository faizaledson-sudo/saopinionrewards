import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { formatKes } from "@/lib/format";
import { makeWin, nextWinDelay, WIN_LABELS, type WinEvent } from "@/lib/social-proof";

/**
 * Floating "user X just earned Y" notifications. Client-only so SSR never
 * renders a value that differs after hydration.
 */
export function LiveWinsFeed() {
  const [items, setItems] = useState<WinEvent[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const push = () => {
      if (cancelled) return;
      const win = makeWin(Date.now() + Math.floor(Math.random() * 100000));
      setItems((prev) => [win, ...prev].slice(0, 3));
      setTimeout(() => {
        if (!cancelled) setItems((prev) => prev.filter((item) => item.id !== win.id));
      }, 7000);
      timer = setTimeout(push, nextWinDelay());
    };

    timer = setTimeout(push, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 left-3 z-40 flex w-[16.5rem] flex-col gap-2 sm:w-72 lg:bottom-6 lg:left-6">
      {items.map((win) => (
        <div
          key={win.id}
          className="animate-in slide-in-from-left-4 fade-in flex items-start gap-2.5 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur"
        >
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-money/15 text-money">
            <TrendingUp className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {win.name} <span className="font-normal text-muted-foreground">· {win.town}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {WIN_LABELS[win.kind]}{" "}
              <span className="font-display font-bold text-money">
                {formatKes(win.amountKes)}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
