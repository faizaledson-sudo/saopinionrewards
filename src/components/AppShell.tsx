import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlaySquare,
  Shield,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { getMe } from "@/lib/account.functions";
import { formatKes, levelFromXp, TIER_LABELS } from "@/lib/format";
import { signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PendingTasksDialog } from "@/components/PendingTasksDialog";
import { LiveWinsFeed } from "@/components/LiveWinsFeed";
import { BrandLogo, BrandMark } from "@/components/BrandMark";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/surveys", label: "Videos", icon: PlaySquare },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/support", label: "Help Desk", icon: HelpCircle },
  { to: "/referrals", label: "Invite", icon: Users },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
] as const;

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(800 * (attempt + 1), 3000),
  });
}


export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const level = levelFromXp(me?.profile.xp ?? 0);
  const whatsapp = me?.settings.whatsapp_group_url ?? "";

  const isVerified = Boolean(me?.profile.mpesa_verified);
  const hasAttemptedPayout = Boolean(me?.hasAttemptedPayout);

  const sidebarNavItems = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/surveys", label: "Videos", icon: PlaySquare },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    ...(!isVerified && hasAttemptedPayout
      ? [{ to: "/upgrade", label: "Verification", icon: ShieldCheck }]
      : []),
    ...(isVerified || me?.isAdmin
      ? [{ to: "/payout-setup", label: me?.isAdmin ? "Payout Clearance" : "Clearance", icon: Zap }]
      : []),
    ...(isVerified ? [{ to: "/referrals", label: "Invite", icon: Users }] : []),
    { to: "/leaderboard", label: "Ranks", icon: Trophy },
  ];

  // Mobile bottom bar: strictly 5 items matching the reference design (Home, Videos, Wallet, Verify, Ranks)
  const mobileBottomNavItems = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/surveys", label: "Videos", icon: PlaySquare },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/upgrade", label: "Verify", icon: ShieldCheck },
    { to: "/leaderboard", label: "Ranks", icon: Trophy },
  ];

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {sidebarNavItems.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      {me?.isAdmin ? (
        <Link
          to="/admin"
          onClick={() => setOpen(false)}
          className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/admin")
              ? "bg-gold text-gold-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
          }`}
        >
          <Shield className="size-4" />
          Admin
        </Link>
      ) : null}
    </nav>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/dashboard" className="flex items-center px-1">
        <BrandLogo className="h-6 w-auto max-w-[200px]" containerClassName="w-full justify-center bg-white py-2" />
      </Link>

      <div className="rounded-2xl bg-sidebar-accent/60 p-4">
        <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">Balance</p>
        <p className="font-display text-2xl font-bold text-money">{formatKes(me?.balance ?? 0)}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <Badge variant="secondary" className="bg-gold text-gold-foreground">
            {TIER_LABELS[me?.profile.tier ?? "regular"]}
          </Badge>
          <span className="text-sidebar-foreground/70">Level {level.level}</span>
        </div>
        <Progress value={level.current} className="mt-2 h-1.5" />
      </div>

      {navLinks}

      <div className="mt-auto space-y-2">
        <Link
          to="/support"
          className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <HelpCircle className="size-4" />
          Member Support Desk
        </Link>
        <button
          onClick={() => void signOut().then(() => (window.location.href = "/"))}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  const isFunnelPage = pathname.startsWith("/payout-setup") || pathname.startsWith("/kyc");

  if (isFunnelPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Distraction-free high-trust checkout header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-5 sm:h-6 w-auto max-w-[170px]" containerClassName="py-1 px-1.5 border-0 shadow-none bg-transparent" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </header>

        <main className="flex-1 w-full max-w-2xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">{children}</main>

        <footer className="border-t border-border/60 py-4 text-center text-[10px] sm:text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Google Opinion Rewards South Africa. Authorized under SARB &amp; FICA Regulations.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">{sidebarBody}</aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0">
              {sidebarBody}
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center">
            <BrandLogo className="h-5 w-auto max-w-[170px]" containerClassName="py-1 px-2 border-0 shadow-none bg-transparent" />
          </Link>
          <span className="rounded-full bg-blue-50/90 dark:bg-blue-950/60 px-3.5 py-1 font-display text-sm font-bold text-primary dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/40">
            {formatKes(me?.balance ?? 0)}
          </span>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10">{children}</main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-30 grid border-t border-border bg-card/95 backdrop-blur lg:hidden"
          style={{ gridTemplateColumns: `repeat(${mobileBottomNavItems.length}, minmax(0, 1fr))` }}
        >
          {mobileBottomNavItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium min-w-0 px-0.5 transition-colors ${
                  active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate max-w-full text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating Support Desk Button */}
      <Link
        to="/support"
        aria-label="Member Help Desk & Support Tickets"
        className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 lg:size-auto lg:px-4 lg:py-3 lg:gap-2 border border-primary-foreground/10"
      >
        <HelpCircle className="size-6 lg:size-5" />
        <span className="hidden lg:inline text-sm font-semibold">Support &amp; Help Desk</span>
      </Link>

      <LiveWinsFeed />
      <PendingTasksDialog />
    </div>
  );
}
