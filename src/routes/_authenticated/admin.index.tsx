import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Activity,
  BadgeAlert,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Film,
  HelpCircle,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
  Zap,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";
import JSZip from "jszip";
import { VeriflowKycDialog, type VeriflowReceiptData } from "@/components/VeriflowKycDialog";
import { RefundRequestsTab } from "@/components/admin/RefundRequestsTab";
import { getMuxIntegrationStatus, updateMuxCredentials } from "@/lib/mux.functions";
import {
  getSmsAdminOverview,
  sendAdminTestSms,
  sendAdminBroadcastSms,
  adminRunAutopilotScan,
  adminRunPerpetualEmailScan,
} from "@/lib/sms.functions";
import { getAdminTickets, replyTicket, type SupportTicket } from "@/lib/support.functions";
import {
  adminAdjustBalance,
  adminCompleteCharge,
  adminSetBanned,
  adminSetTier,
  deleteSurvey,
  getAdminOverview,
  getAdminSettings,
  getAdminUpsellAnalytics,
  getIntegrationSettings,
  updateIntegrationSettings,
  testPaymentsConnection,
  syncPendingCharges,
  listAdminMissions,
  listAdminSurveys,
  listCharges,
  listKyc,
  listUsers,
  listWithdrawals,
  markChargeReverted,
  markKycUnderReview,
  requestKyc,
  requestKycCorrection,
  reviewKyc,
  reviewWithdrawal,
  updatePlan,
  updateMission,
  updateSettings,
} from "@/lib/admin.functions";
import { formatKes, formatPhone, relativeDate, TIER_LABELS } from "@/lib/format";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Tier = "regular" | "vip1" | "vip2" | "vip3";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — TikTok Reward Coin" },
      {
        name: "description",
        content:
          "Manage panelists, surveys, payouts, charges, identity checks and platform settings.",
      },
      { property: "og:title", content: "Admin console — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Operations console for the TikTok Reward Coin panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && me && !me.isAdmin) void navigate({ to: "/dashboard" });
  }, [isLoading, me, navigate]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (me && !me.isAdmin) {
    return (
      <div className="py-16 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <p className="mt-3 font-semibold">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Admin console</h1>
        <p className="text-muted-foreground">Run the panel: payouts, users, surveys and settings.</p>
      </header>

      <Overview />

      <Tabs defaultValue="withdrawals">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="withdrawals">Payouts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="surveys">Videos &amp; Tasks</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="upsell-funnel" className="gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <Zap className="size-3.5 fill-amber-500 text-amber-500" />
            Upsell Funnel &amp; Metrics
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 font-bold text-sky-600 dark:text-sky-400">
            <MessageSquare className="size-3.5" />
            SMS &amp; Recovery
          </TabsTrigger>
          <TabsTrigger value="kyc">Identity checks</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <HelpCircle className="size-3.5" />
            Support Tickets
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <BadgeAlert className="size-3.5" />
            Refund Requests (7-Day)
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="mt-4">
          <WithdrawalsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="surveys" className="mt-4">
          <SurveysTab />
        </TabsContent>
        <TabsContent value="charges" className="mt-4">
          <ChargesTab />
        </TabsContent>
        <TabsContent value="upsell-funnel" className="mt-4">
          <UpsellFunnelTab />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <SmsMarketingTab />
        </TabsContent>
        <TabsContent value="kyc" className="mt-4">
          <KycTab />
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          <SupportTicketsTab />
        </TabsContent>
        <TabsContent value="refunds" className="mt-4">
          <RefundRequestsTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const stats = [
    { icon: Users, label: "Panelists", value: String(data?.users ?? 0) },
    { icon: ClipboardList, label: "Active surveys", value: String(data?.activeSurveys ?? 0) },
    { icon: Banknote, label: "Payouts pending", value: String(data?.pendingWithdrawals ?? 0) },
    { icon: FileCheck2, label: "KYC to review", value: String(data?.pendingKyc ?? 0) },
    { icon: Coins, label: "Awarded", value: formatKes(data?.totalAwarded ?? 0) },
    { icon: CreditCard, label: "Paid out", value: formatKes(data?.totalPaid ?? 0) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="shadow-soft">
          <CardContent className="p-4">
            <stat.icon className="size-4 text-primary" />
            <p className="mt-2 font-display text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WithdrawalsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => listWithdrawals(),
  });
  const review = useServerFn(reviewWithdrawal);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: (input: { withdrawalId: string; status: "approved" | "rejected" | "paid" }) =>
      review({ data: { ...input, note: note || undefined } }),
    onSuccess: () => {
      toast.success("Payout updated.");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="font-display">Payout requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Optional note added to the next action"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {(data ?? []).map((row) => (
          <div key={row.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{formatKes(row.amount_kes)}</p>
                <div className="flex items-center gap-1.5 text-sm font-medium mt-0.5">
                  {row.phone.includes("•") || row.phone.toLowerCase().includes("bank") ? (
                    <Building2 className="size-4 text-primary shrink-0" />
                  ) : (
                    <Smartphone className="size-4 text-primary shrink-0" />
                  )}
                  <span>{row.phone}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  User: {row.user?.full_name ?? "Panelist"} • Plan: {TIER_LABELS[row.user?.tier ?? "regular"]} • Requested {relativeDate(row.requested_at)}
                  {row.admin_note ? ` • ${row.admin_note}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.status === "pending" ? "secondary" : "default"}>
                  {row.status}
                </Badge>
                {row.status !== "paid" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ withdrawalId: row.id, status: "paid" })}
                    >
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ withdrawalId: row.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ withdrawalId: row.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payout requests yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listUsers({ data: { search } }),
  });
  const setTier = useServerFn(adminSetTier);
  const setBanned = useServerFn(adminSetBanned);
  const adjust = useServerFn(adminAdjustBalance);
  const askKyc = useServerFn(requestKyc);

  const [adjustUser, setAdjustUser] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [kycUser, setKycUser] = useState<string | null>(null);
  const [kycKind, setKycKind] = useState<"documents" | "mpesa" | "both">("documents");
  const [instructions, setInstructions] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const tierMutation = useMutation({
    mutationFn: (input: { userId: string; tier: Tier }) => setTier({ data: input }),
    onSuccess: () => {
      toast.success("Plan updated.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const banMutation = useMutation({
    mutationFn: (input: { userId: string; banned: boolean }) => setBanned({ data: input }),
    onSuccess: () => {
      toast.success("Account updated.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjust({
        data: { userId: adjustUser as string, amount: Number(amount), note: adjustNote },
      }),
    onSuccess: () => {
      toast.success("Balance adjusted.");
      setAdjustUser(null);
      setAmount("");
      setAdjustNote("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const kycMutation = useMutation({
    mutationFn: () =>
      askKyc({
        data: {
          userId: kycUser as string,
          kind: kycKind,
          instructions: instructions || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Identity check requested.");
      setKycUser(null);
      setInstructions("");
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display">Panelists</CardTitle>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search phone or name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {(data ?? []).map((user) => (
          <div key={user.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {user.full_name ?? "Panelist"} • {formatPhone(user.phone)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Balance {formatKes(user.balance)} • {user.xp} XP • {user.streak_days} day streak •
                  joined {relativeDate(user.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{TIER_LABELS[user.tier]}</Badge>
                  {user.mpesa_verified ? (
                    <Badge className="bg-money text-money-foreground">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Not verified</Badge>
                  )}
                  {user.banned_at ? <Badge variant="destructive">Suspended</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={user.tier}
                  onValueChange={(value) =>
                    tierMutation.mutate({ userId: user.id, tier: value as Tier })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["regular", "vip1", "vip2", "vip3"] as Tier[]).map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {TIER_LABELS[tier]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setAdjustUser(user.id)}>
                  Adjust balance
                </Button>
                <Button size="sm" variant="outline" onClick={() => setKycUser(user.id)}>
                  Request KYC
                </Button>
                <Button
                  size="sm"
                  variant={user.banned_at ? "outline" : "destructive"}
                  onClick={() =>
                    banMutation.mutate({ userId: user.id, banned: !user.banned_at })
                  }
                >
                  {user.banned_at ? "Unsuspend" : "Suspend"}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No panelists found.</p>
        ) : null}
      </CardContent>

      <Dialog open={adjustUser !== null} onOpenChange={(open) => !open && setAdjustUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Adjust balance</DialogTitle>
            <DialogDescription>
              Use a negative amount to remove funds. This is recorded in the panelist's history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-amount">Amount (Rands)</Label>
              <Input
                id="adjust-amount"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-note">Note</Label>
              <Input
                id="adjust-note"
                value={adjustNote}
                onChange={(event) => setAdjustNote(event.target.value)}
                placeholder="Reason for the adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustUser(null)}>
              Cancel
            </Button>
            <Button disabled={adjustMutation.isPending} onClick={() => adjustMutation.mutate()}>
              Save adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kycUser !== null} onOpenChange={(open) => !open && setKycUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Request identity check</DialogTitle>
            <DialogDescription>
              The panelist sees this on their identity check page and in the daily reminder popup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type of check</Label>
              <Select
                value={kycKind}
                onValueChange={(value) => setKycKind(value as typeof kycKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">ID documents</SelectItem>
                  <SelectItem value="mpesa">Payout account check</SelectItem>
                  <SelectItem value="both">Documents + Account check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kyc-instructions">Instructions (optional)</Label>
              <Textarea
                id="kyc-instructions"
                rows={3}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="e.g. Upload a clear photo of your national ID, front and back."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKycUser(null)}>
              Cancel
            </Button>
            <Button disabled={kycMutation.isPending} onClick={() => kycMutation.mutate()}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SurveysTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-surveys"],
    queryFn: () => listAdminSurveys(),
  });
  const remove = useServerFn(deleteSurvey);

  const mutation = useMutation({
    mutationFn: (surveyId: string) => remove({ data: { surveyId } }),
    onSuccess: () => {
      toast.success("Survey deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display">Video tasks</CardTitle>
        <Button asChild size="sm">
          <Link to="/admin/surveys/$surveyId" params={{ surveyId: "new" }}>
            <Plus className="mr-1 size-4" /> New video task
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {(data ?? []).map((survey) => (
          <div
            key={survey.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div>
              <p className="font-semibold">{survey.title}</p>
              <p className="text-xs text-muted-foreground">
                {survey.category} • {TIER_LABELS[survey.min_tier]}+ • {survey.questionCount}{" "}
                questions • {survey.responseCount} responses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={survey.status === "active" ? "default" : "secondary"}>
                {survey.status}
              </Badge>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/surveys/$surveyId" params={{ surveyId: survey.id }}>
                  Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(survey.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No surveys yet — create your first one to get panelists earning.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChargesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-charges"],
    queryFn: () => listCharges(),
  });
  const complete = useServerFn(adminCompleteCharge);
  const revert = useServerFn(markChargeReverted);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-charges"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const completeMutation = useMutation({
    mutationFn: (chargeId: string) => complete({ data: { chargeId } }),
    onSuccess: () => {
      toast.success("Charge confirmed and applied.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revertMutation = useMutation({
    mutationFn: (input: { chargeId: string; creditToBalance?: boolean }) =>
      revert({
        data: {
          chargeId: input.chargeId,
          creditToBalance: input.creditToBalance,
          note: input.creditToBalance
            ? "Refunded to wallet balance by admin"
            : "Refunded manually by admin",
        },
      }),
    onSuccess: () => {
      toast.success("Refund processed successfully.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPendingCharges(),
    onSuccess: (res) => {
      toast.success(
        `Synced with Ghost Pay! Checked: ${res.checked}, Settled: ${res.settledCount}, Updated failed: ${res.failedCount}`,
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="font-display">Charges (ZAR)</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verification holds and upgrades. Use Sync with Ghost Pay to immediately verify any pending payments.
          </p>
        </div>
        <Button
          size="sm"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm shrink-0"
        >
          {syncMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Sync with Ghost Pay
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Verification holds can be refunded directly to the panelist's in-app balance or marked as refunded here.
        </p>
        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {(data ?? []).map((charge) => (
          <div
            key={charge.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div>
              <p className="font-semibold">
                {formatKes(charge.amount_kes)} • {charge.purpose.replace(/_/g, " ")}
                {charge.target_tier ? ` → ${TIER_LABELS[charge.target_tier]}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPhone(charge.phone)} • {relativeDate(charge.created_at)}
                {charge.failure_reason ? ` • ${charge.failure_reason}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={charge.status === "completed" ? "default" : "secondary"}>
                {charge.status}
              </Badge>
              {charge.reverted_at ? (
                <Badge className="bg-money text-money-foreground">refunded</Badge>
              ) : null}
              {charge.status === "pending" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(charge.id)}
                >
                  Confirm manually
                </Button>
              ) : null}
              {charge.status === "completed" &&
              !charge.reverted_at &&
              charge.purpose !== "plan_upgrade" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="bg-money text-money-foreground hover:bg-money/90 text-xs"
                    disabled={revertMutation.isPending}
                    onClick={() => revertMutation.mutate({ chargeId: charge.id, creditToBalance: true })}
                  >
                    Refund to Balance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={revertMutation.isPending}
                    onClick={() => revertMutation.mutate({ chargeId: charge.id, creditToBalance: false })}
                  >
                    Mark refunded
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No charges yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UpsellFunnelTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-upsell-analytics"],
    queryFn: () => getAdminUpsellAnalytics(),
  });

  const completeChargeMutation = useMutation({
    mutationFn: (chargeId: string) => adminCompleteCharge({ data: { chargeId } }),
    onSuccess: () => {
      toast.success("Charge approved and settled.");
      void queryClient.invalidateQueries({ queryKey: ["admin-upsell-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-charges"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPendingCharges(),
    onSuccess: (res) => {
      toast.success(
        `Synced with Ghost Pay! Checked: ${res.checked}, Settled: ${res.settledCount}, Updated failed: ${res.failedCount}`,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-upsell-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-charges"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading upsell metrics...</p>
      </div>
    );
  }

  const { overview, funnelCounts, offerStats, recentUpsellCharges } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="size-5 text-amber-500 fill-amber-500" />
            Upsell Funnel &amp; Conversion Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time tracking of panelist progression through payout clearance, speed upgrades &amp; FICA intercept.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
          >
            {syncMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Sync &amp; Settle Ghost Pay
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refetch()} className="text-xs">
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="shadow-soft border-primary/20 bg-primary/5">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Verified (R200)</span>
            <p className="text-lg font-bold text-foreground">{overview.verifiedUsersCount}</p>
            <p className="text-[10px] text-muted-foreground">{formatKes(overview.totalVerificationHoldCollected)} held</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Upsell Attempts</span>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{overview.totalUpsellAttempts}</p>
            <p className="text-[10px] text-muted-foreground">{overview.uniqueUsersAttempted} unique panelists</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Completed Upsells</span>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{overview.totalUpsellCompleted}</p>
            <p className="text-[10px] text-muted-foreground">{overview.uniqueUsersConverted} converted users</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-money/20 bg-money/5">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Upsell Revenue</span>
            <p className="text-lg font-bold text-money">{formatKes(overview.totalUpsellRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">Extra gross revenue</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Take Rate</span>
            <p className="text-lg font-bold text-foreground">{overview.overallTakeRate}%</p>
            <p className="text-[10px] text-muted-foreground">Verified to upsell conversion</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">KYC Submitted</span>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{overview.totalKycSubmitted}</p>
            <p className="text-[10px] text-muted-foreground">FICA dossiers received</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Step-by-Step Funnel Flow */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Visual Funnel Drop-off Flow</span>
            <Badge variant="outline" className="text-[10px]">Real-time Event Tracker</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/20">
              <div className="flex justify-between items-center font-bold">
                <span className="text-amber-500">Step 1: Speed Clearance</span>
                <Badge variant="secondary" className="text-[10px]">{funnelCounts.step_1_views ?? 0} Views</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Instant EFT R89 vs R49</p>
              <div className="flex justify-between text-[11px] pt-1 border-t border-border/60">
                <span>Downsell Popups:</span>
                <span className="font-semibold">{funnelCounts.downsell_1_opened ?? 0}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/20">
              <div className="flex justify-between items-center font-bold">
                <span className="text-emerald-500">Step 2: Tax &amp; Fee Shield</span>
                <Badge variant="secondary" className="text-[10px]">{funnelCounts.step_2_views ?? 0} Views</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Zero-fee protection R49 vs R29</p>
              <div className="flex justify-between text-[11px] pt-1 border-t border-border/60">
                <span>Downsell Popups:</span>
                <span className="font-semibold">{funnelCounts.downsell_2_opened ?? 0}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/20">
              <div className="flex justify-between items-center font-bold">
                <span className="text-blue-500">Step 3: VIP Vault Upgrade</span>
                <Badge variant="secondary" className="text-[10px]">{funnelCounts.step_3_views ?? 0} Views</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Corporate access R79 vs R39</p>
              <div className="flex justify-between text-[11px] pt-1 border-t border-border/60">
                <span>Downsell Popups:</span>
                <span className="font-semibold">{funnelCounts.downsell_3_opened ?? 0}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/20">
              <div className="flex justify-between items-center font-bold">
                <span className="text-destructive">Step 4: Liquidation &amp; KYC</span>
                <Badge variant="secondary" className="text-[10px]">{funnelCounts.step_4_views ?? 0} Views</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">15-Min Timer / FICA Intercept</p>
              <div className="flex justify-between text-[11px] pt-1 border-t border-border/60">
                <span>KYC Dossiers Lodged:</span>
                <span className="font-bold text-emerald-600">{funnelCounts.kyc_submitted ?? 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Performance Breakdown Table */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Offer Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-secondary/40 text-muted-foreground font-semibold">
              <tr>
                <th className="p-3">Offer Name</th>
                <th className="p-3">Step</th>
                <th className="p-3">Type</th>
                <th className="p-3">Price</th>
                <th className="p-3">Checkout Attempts</th>
                <th className="p-3">Paid / Settled</th>
                <th className="p-3">Pending</th>
                <th className="p-3">Revenue (ZAR)</th>
                <th className="p-3">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {offerStats.map((offer) => (
                <tr key={offer.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{offer.title}</td>
                  <td className="p-3">Step {offer.step}</td>
                  <td className="p-3">
                    <Badge variant={offer.type === "Upsell" ? "default" : "outline"} className="text-[10px]">
                      {offer.type}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono font-bold text-money">{formatKes(offer.baseAmount)}</td>
                  <td className="p-3 font-semibold">{offer.attempts}</td>
                  <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{offer.completedCount}</td>
                  <td className="p-3 text-amber-600 dark:text-amber-400">{offer.pendingCount}</td>
                  <td className="p-3 font-mono font-bold text-money">{formatKes(offer.revenue)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Progress value={offer.conversionRate} className="w-14 h-1.5" />
                      <span className="font-semibold text-[11px]">{offer.conversionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Live Recent Upsell Attempts Feed */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Upsell Transactions &amp; Attempts</CardTitle>
          <Badge variant="outline" className="text-[10px]">Latest records</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {recentUpsellCharges.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No live user upsell attempts recorded yet. As users enter and click offers, transactions will appear here in real time.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-secondary/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Panelist / Phone</th>
                  <th className="p-3">Offer ID / Note</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentUpsellCharges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-mono text-[11px]">{formatPhone(charge.phone)}</td>
                    <td className="p-3 font-medium text-foreground">{charge.admin_note || "Standard Upsell"}</td>
                    <td className="p-3 font-mono font-bold text-money">{formatKes(charge.amount_kes)}</td>
                    <td className="p-3">
                      <Badge
                        variant={charge.status === "completed" ? "default" : charge.status === "pending" ? "outline" : "destructive"}
                        className={
                          charge.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                            : charge.status === "pending"
                            ? "border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {charge.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-[11px]">{relativeDate(charge.created_at)}</td>
                    <td className="p-3 text-right">
                      {charge.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          disabled={completeChargeMutation.isPending}
                          onClick={() => completeChargeMutation.mutate(charge.id)}
                        >
                          Manual Confirm
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SmsMarketingTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-sms-overview"],
    queryFn: () => getSmsAdminOverview(),
  });

  const sendTest = useServerFn(sendAdminTestSms);
  const sendBroadcast = useServerFn(sendAdminBroadcastSms);
  const runAutopilot = useServerFn(adminRunAutopilotScan);
  const runEmailScan = useServerFn(adminRunPerpetualEmailScan);

  const [isAutopilotPending, setIsAutopilotPending] = useState(false);
  const [isEmailScanPending, setIsEmailScanPending] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Google Opinion Rewards: Your payout of R 3,800 is ready for clearance. Complete the 2-min verification to release your deposit: https://sa-opinion-rewards.vercel.app/upgrade"
  );
  const [isTestPending, setIsTestPending] = useState(false);

  const [selectedSegment, setSelectedSegment] = useState<"all" | "unverified" | "verified">("unverified");
  const [broadcastTemplate, setBroadcastTemplate] = useState(
    "Google Opinion Rewards: Hi {Name}, your payout is waiting for clearance. Complete the 2-min verification to release your deposit: https://sa-opinion-rewards.vercel.app/upgrade"
  );
  const [isBroadcastPending, setIsBroadcastPending] = useState(false);

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }
    setIsTestPending(true);
    try {
      const res = await sendTest({ data: { phone: testPhone, message: testMessage } });
      if (res.ok) {
        toast.success(`Test SMS delivered to ${res.destination}!`);
        void refetch();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch SMS.");
    } finally {
      setIsTestPending(false);
    }
  };

  const handleBroadcast = async () => {
    const targetCount =
      selectedSegment === "unverified"
        ? data?.counts.unverifiedCount
        : selectedSegment === "verified"
        ? data?.counts.verifiedCount
        : data?.counts.totalPanelists;

    if (!confirm(`Are you sure you want to send this SMS to ${targetCount} panelists in '${selectedSegment}'?`)) {
      return;
    }

    setIsBroadcastPending(true);
    try {
      const res = await sendBroadcast({
        data: {
          segment: selectedSegment,
          template: broadcastTemplate,
        },
      });
      if (res.ok) {
        toast.success(`Broadcast finished: ${res.sentCount} sent (${res.failedCount} failed).`);
        void refetch();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute broadcast.");
    } finally {
      setIsBroadcastPending(false);
    }
  };

  const handleRunAutopilot = async () => {
    setIsAutopilotPending(true);
    try {
      const res = await runAutopilot();
      if (res.ok) {
        toast.success(
          `Autopilot Scan Complete: ${res.totalDispatched} SMS dispatched (${res.recoveredCheckout} checkouts, ${res.recoveredPayout} payouts).`
        );
        void refetch();
      } else {
        toast.error(res.error || "Autopilot completed with no sends.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run autopilot recovery.");
    } finally {
      setIsAutopilotPending(false);
    }
  };

  const handleRunEmailScan = async () => {
    setIsEmailScanPending(true);
    try {
      const res = await runEmailScan();
      if (res?.ok) {
        toast.success(
          `Varredura de Email Concluída: ${res.frontDispatched} Front (R200) + ${res.upsellDispatched} Upsell (EFT Instantâneo) disparados!`
        );
        void refetch();
      } else {
        toast.error((res as any)?.errors?.join(", ") || "Erro ao executar varredura de emails.");
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao disparar varredura de emails.");
    } finally {
      setIsEmailScanPending(false);
    }
  };

  const setTemplate = (title: string, text: string, segment: "all" | "unverified" | "verified") => {
    setBroadcastTemplate(text);
    setSelectedSegment(segment);
    toast.info(`Loaded template: ${title}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="size-5 text-sky-500" />
            SMSPortal Direct Messaging &amp; Funnel Recovery
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct-to-carrier SMS delivery for South Africa (Vodacom, MTN, Telkom, Cell C).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs py-1 px-2.5 font-bold flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            SMSPortal Active
          </Badge>
          <Button size="sm" variant="outline" onClick={() => void refetch()} className="text-xs">
            Refresh Balance
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="shadow-soft border-sky-500/30 bg-sky-500/5">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">SMS Credits Balance</span>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {data?.balanceOk ? `${data.balance} Credits` : "Check Error"}
            </p>
            <p className="text-[11px] text-muted-foreground">Direct SMSPortal account</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Total Panelists</span>
            <p className="text-2xl font-bold text-foreground">{data?.counts.totalPanelists ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Registered phone numbers</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Unverified Panelists</span>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data?.counts.unverifiedCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Target for R200 recovery</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Verified Panelists</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data?.counts.verifiedCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Target for upsell speed clearance</p>
          </CardContent>
        </Card>
      </div>

      {/* 24/7 Autopilot Recovery Engine */}
      <Card className="border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-background to-emerald-500/10 shadow-soft">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="size-4 text-amber-500 fill-amber-500" />
                Funnel Recovery Autopilot (100% Automated)
              </h3>
              <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] py-0 px-2 font-bold">
                ACTIVE 24/7
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              <strong>1. Abandoned Checkout (R 200):</strong> Triggered in real time if customer closes checkout or payment fails.<br />
              <strong>2. Pending Payout Setup (Upsell):</strong> Triggered automatically once account is verified, and followed up after 30 min if Instant EFT is not purchased.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm whitespace-nowrap"
              disabled={isAutopilotPending}
              onClick={handleRunAutopilot}
            >
              {isAutopilotPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 fill-current" />
              )}
              Trigger Automated Scan Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 24/7 Perpetual Email Recovery Engine (GreenSend Multi-Step) */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-background to-purple-500/10 shadow-soft">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail className="size-4 text-indigo-500" />
                Email Recovery Autopilot (24/7 Automated Delivery)
              </h3>
              <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] py-0 px-2 font-bold">
                MULTI-STEP 24/7
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              <strong>1. Unpaid Front (R 200):</strong> Rotating messages every 20h with high-converting angles (reserved spot, balance release, dedicated support, priority queue).<br />
              <strong>2. Upsell Targets (470 confirmed buyers):</strong> Rotating notifications for expedited payout clearance (Instant EFT / Same-day settlement).<br />
              <em>*Active anti-spam: 1 email/day per user, clean transactional format, automatic stop on conversion.</em>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm whitespace-nowrap"
              disabled={isEmailScanPending}
              onClick={handleRunEmailScan}
            >
              {isEmailScanPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Mail className="mr-1.5 size-3.5" />
              )}
              Trigger Email Workflow Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Quick Single Send & 1-Click Broadcast Campaign */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Quick Test / Single Send */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="size-4 text-primary" />
              Direct SMS / Test Send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone" className="text-xs font-medium">South African Mobile Number</Label>
              <Input
                id="test-phone"
                placeholder="0821234567 or +27821234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Supports any SA number format (Vodacom, MTN, Telkom, Cell C).</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="test-msg" className="text-xs font-medium">Message Body</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {testMessage.length} chars ({Math.ceil(testMessage.length / 160) || 1} SMS)
                </span>
              </div>
              <Textarea
                id="test-msg"
                rows={4}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            <Button
              className="w-full font-bold"
              disabled={isTestPending || !testPhone.trim()}
              onClick={handleSendTestSms}
            >
              {isTestPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send SMS Now (Live)
            </Button>
          </CardContent>
        </Card>

        {/* Box 2: 1-Click Funnel Recovery Broadcast */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500 fill-amber-500" />
                Automated Recovery Broadcast
              </span>
              <Badge variant="outline" className="text-[10px]">1-Click Campaign</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quick Recovery Templates</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-left hover:bg-amber-500/10 transition-colors"
                  onClick={() =>
                    setTemplate(
                      "R200 Recovery",
                      "Google Opinion Rewards: Hi {Name}, your payout is ready for clearance. Complete the 2-min verification to release your deposit: https://sa-opinion-rewards.vercel.app/upgrade",
                      "unverified"
                    )
                  }
                >
                  <p className="font-bold text-amber-600 dark:text-amber-400">1. R 200 Recovery</p>
                  <p className="text-[10px] text-muted-foreground">For unverified users</p>
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-left hover:bg-emerald-500/10 transition-colors"
                  onClick={() =>
                    setTemplate(
                      "Upsell Instant EFT",
                      "Google Opinion Rewards: Hi {Name}, your bank account is verified! Configure your payout delivery speed to release your funds: https://sa-opinion-rewards.vercel.app/payout-setup",
                      "verified"
                    )
                  }
                >
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">2. Clearance &amp; Upsell</p>
                  <p className="text-[10px] text-muted-foreground">For users who completed R 200 verification</p>
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-left hover:bg-destructive/10 transition-colors"
                  onClick={() =>
                    setTemplate(
                      "SARB FICA Alert",
                      "URGENT SARB/FICA Alert: Your Instant EFT of R 4,000.00 is held in interbank escrow (Ref: #ZA-I6JGA). Complete Veriflow compliance now to authorize payout: https://sa-opinion-rewards.vercel.app/payout-setup?step=4",
                      "verified"
                    )
                  }
                >
                  <p className="font-bold text-destructive">3. SARB/FICA Alert</p>
                  <p className="text-[10px] text-muted-foreground">Veriflow KYC Reminder</p>
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-border p-2 text-left hover:bg-secondary/60 transition-colors"
                  onClick={() =>
                    setTemplate(
                      "General Reactivation",
                      "Google Opinion Rewards: Hi {Name}, new high-paying sponsored videos of R 45.00 each are available today. Complete your reviews and withdraw: https://sa-opinion-rewards.vercel.app/dashboard",
                      "all"
                    )
                  }
                >
                  <p className="font-bold text-foreground">4. General Reactivation</p>
                  <p className="text-[10px] text-muted-foreground">New videos and bonuses</p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target Segment</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant={selectedSegment === "unverified" ? "default" : "outline"}
                  className="text-xs flex-1"
                  onClick={() => setSelectedSegment("unverified")}
                >
                  Unverified ({data?.counts.unverifiedCount ?? 0})
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={selectedSegment === "verified" ? "default" : "outline"}
                  className="text-xs flex-1"
                  onClick={() => setSelectedSegment("verified")}
                >
                  Verified ({data?.counts.verifiedCount ?? 0})
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={selectedSegment === "all" ? "default" : "outline"}
                  className="text-xs flex-1"
                  onClick={() => setSelectedSegment("all")}
                >
                  All ({data?.counts.totalPanelists ?? 0})
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="broadcast-msg" className="text-xs font-medium">Template Text (supports &#123;Name&#125;)</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {broadcastTemplate.length} chars
                </span>
              </div>
              <Textarea
                id="broadcast-msg"
                rows={3}
                value={broadcastTemplate}
                onChange={(e) => setBroadcastTemplate(e.target.value)}
              />
            </div>

            <Button
              variant="default"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold"
              disabled={isBroadcastPending}
              onClick={handleBroadcast}
            >
              {isBroadcastPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Broadcast to {selectedSegment} (
              {selectedSegment === "unverified"
                ? data?.counts.unverifiedCount
                : selectedSegment === "verified"
                ? data?.counts.verifiedCount
                : data?.counts.totalPanelists}{" "}
              panelists)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Dispatches Log */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">SMS Delivery History</CardTitle>
          <Badge variant="outline" className="text-[10px]">Real-time audit log</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {(data?.recentDispatches ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No messages dispatched yet. Use the test sender above or trigger a recovery broadcast to start.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-secondary/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Message Content</th>
                  <th className="p-3">Trigger</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.recentDispatches ?? []).map((sms: any, idx: number) => (
                  <tr key={sms.id || idx} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-mono text-[11px] font-semibold">{formatPhone(sms.destination)}</td>
                    <td className="p-3 max-w-xs truncate text-muted-foreground">{sms.content}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {sms.triggered_by || "manual"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                        {sms.status || "SENT"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-[11px]">{relativeDate(sms.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KycTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-kyc"], queryFn: () => listKyc() });
  const review = useServerFn(reviewKyc);
  const correct = useServerFn(requestKycCorrection);
  const markReview = useServerFn(markKycUnderReview);
  const [note, setNote] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [inspectReceipt, setInspectReceipt] = useState<VeriflowReceiptData | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "submitted" | "under_review" | "requested" | "approved" | "rejected" | "all"
  >("submitted");

  // Document correction modal state
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [selectedCorrectionReasons, setSelectedCorrectionReasons] = useState<string[]>([]);
  const [customCorrectionNote, setCustomCorrectionNote] = useState("");

  const correctionOptions = [
    {
      id: "bank_letter",
      label: "Bank Confirmation Letter / Statement unreadable or missing",
      description: "Request official bank confirmation letter, statement PDF, or readable banking app screenshot",
    },
    {
      id: "id_photo",
      label: "Identity Document (ID) photo cropped or out of focus",
      description: "Front or back of Smart ID / ID Book is unreadable or corners were cropped",
    },
    {
      id: "selfie",
      label: "Selfie holding document does not match",
      description: "Photo of face or ID document held in hand is blurry or does not match account details",
    },
    {
      id: "proof_address",
      label: "Proof of address expired or missing",
      description: "Proof of residence is older than 3 months or unreadable",
    },
  ];

  const isUnderReview = (r: any) => {
    let meta = r.veriflowMeta;
    if (!meta && r.instructions) {
      try {
        meta = JSON.parse(r.instructions);
      } catch {}
    }
    return Boolean(meta?.under_review);
  };

  const getSafeName = (rawName?: string | null) => {
    return (rawName || "Panelist")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");
  };

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      submitted: list.filter((r) => r.status === "submitted" && !isUnderReview(r)).length,
      under_review: list.filter((r) => r.status === "submitted" && isUnderReview(r)).length,
      requested: list.filter((r) => r.status === "requested").length,
      approved: list.filter((r) => r.status === "approved").length,
      rejected: list.filter((r) => r.status === "rejected").length,
      all: list.length,
    };
  }, [data]);

  const filteredRequests = useMemo(() => {
    const list = [...(data ?? [])];
    const getSubmittedTime = (r: any) => (r.submitted_at ? new Date(r.submitted_at).getTime() : 0);
    const getRequestedTime = (r: any) =>
      new Date(r.requested_at || r.created_at || 0).getTime();

    return list
      .filter((r) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "submitted") return r.status === "submitted" && !isUnderReview(r);
        if (statusFilter === "under_review") return r.status === "submitted" && isUnderReview(r);
        return r.status === statusFilter;
      })
      .sort((a, b) => {
        // In "all" view, submitted/under_review requests are pinned to the very top
        if (statusFilter === "all") {
          const aSubmitted = a.status === "submitted" ? 1 : 0;
          const bSubmitted = b.status === "submitted" ? 1 : 0;
          if (aSubmitted !== bSubmitted) return bSubmitted - aSubmitted;
        }

        // For submitted requests, newest submitted_at comes first
        if (a.status === "submitted" && b.status === "submitted") {
          return getSubmittedTime(b) - getSubmittedTime(a);
        }

        // For everything else, newest requested_at comes first
        return getRequestedTime(b) - getRequestedTime(a);
      });
  }, [data, statusFilter]);

  const mutation = useMutation({
    mutationFn: (input: { requestId: string; status: "approved" | "rejected" }) =>
      review({ data: { ...input, note: note || undefined } }),
    onSuccess: () => {
      toast.success("Status de verificação KYC atualizado!");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markUnderReviewMutation = useMutation({
    mutationFn: (input: { requestId: string; underReview?: boolean }) =>
      markReview({ data: input }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      if (variables.underReview === false) {
        toast.success("Documento movido de volta para Novos (Aguardando Revisão).");
      } else {
        toast.success("Documento movido para Em Análise.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const correctionMutation = useMutation({
    mutationFn: (input: {
      requestId: string;
      reason: string;
      reasonsList: string[];
      sendSms?: boolean;
    }) => correct({ data: input }),
    onSuccess: () => {
      toast.success("Solicitação de correção enviada! O formulário do cliente foi reaberto.");
      setCorrectionTarget(null);
      setSelectedCorrectionReasons([]);
      setCustomCorrectionNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleDownloadDossierZip = async (request: any, veriflowMeta: any) => {
    try {
      setDownloadingId(request.id);
      const zip = new JSZip();

      let meta = veriflowMeta || request.veriflowMeta;
      if (!meta && request.instructions) {
        try {
          meta = JSON.parse(request.instructions);
        } catch {}
      }

      const ref = meta?.reference || request.veriflowMeta?.reference || request.id.slice(0, 8).toUpperCase();
      const rawName = meta?.fullName || request.veriflowMeta?.fullName || request.user?.full_name || "Panelist";
      const safeName = getSafeName(rawName);
      const name = rawName;
      const saId = meta?.saIdNumber || request.veriflowMeta?.saIdNumber || "13-digit Verified (On Document)";
      const email = meta?.email || request.veriflowMeta?.email || request.user?.email || "verified@panelist.co.za";
      const phone = meta?.phone || request.veriflowMeta?.phone || request.user?.phone || request.user?.mpesa_phone || "N/A";
      const occupation = meta?.occupation || request.veriflowMeta?.occupation || "Verified Applicant";
      const address = meta?.residentialAddress || request.veriflowMeta?.residentialAddress || "Residential Address Lodged with Compliance Desk";
      const bank = meta?.bank || request.veriflowMeta?.bank || "Capitec Bank";
      const accountType = meta?.accountType || request.veriflowMeta?.accountType || "Savings";
      const accountNumber = meta?.accountNumber || request.veriflowMeta?.accountNumber || "Verified Settlement Account";
      const branchCode = meta?.branchCode || request.veriflowMeta?.branchCode || "470010";

      const idFrontName =
        meta?.attachments?.idFrontName ||
        request.veriflowMeta?.attachments?.idFrontName ||
        meta?.storagePaths?.idFrontPath?.split("/").pop() ||
        request.id_front_path?.split("/").pop() ||
        "ID Front Attached";
      const idBackName =
        meta?.attachments?.idBackName ||
        request.veriflowMeta?.attachments?.idBackName ||
        meta?.storagePaths?.idBackPath?.split("/").pop() ||
        request.id_back_path?.split("/").pop() ||
        "ID Back Attached";
      const selfieName =
        meta?.attachments?.selfieName ||
        request.veriflowMeta?.attachments?.selfieName ||
        meta?.storagePaths?.selfiePath?.split("/").pop() ||
        request.selfie_path?.split("/").pop() ||
        "Biometric Selfie Attached";
      const proofAddressName =
        meta?.attachments?.proofAddressName ||
        request.veriflowMeta?.attachments?.proofAddressName ||
        meta?.storagePaths?.proofAddressPath?.split("/").pop() ||
        meta?.proofAddressPath?.split("/").pop() ||
        "Proof of Address Attached";
      const bankLetterName =
        meta?.attachments?.bankLetterName ||
        request.veriflowMeta?.attachments?.bankLetterName ||
        meta?.storagePaths?.bankLetterPath?.split("/").pop() ||
        meta?.bankLetterPath?.split("/").pop() ||
        "Bank Confirmation Letter Attached";

      // 1. Dossier summary report with person name
      const summaryText = `=====================================================
VERIFLOW COMPLIANCE - FICA AUDIT DOSSIER
Reference: ${ref}
Status: ${request.status.toUpperCase()}
Submitted At: ${request.submitted_at || new Date().toISOString()}
=====================================================

APPLICANT DETAILS:
- Full Legal Name: ${name}
- South African ID Number: ${saId}
- Email: ${email}
- Phone: ${phone}
- Occupation: ${occupation}
- Residential Address: ${address}

SETTLEMENT BANKING DETAILS:
- Bank: ${bank}
- Account Type: ${accountType}
- Account Number: ${accountNumber}
- Universal Branch Code: ${branchCode}

ATTACHMENTS RECORD:
1. ID Front: ${idFrontName}
2. ID Back: ${idBackName}
3. Biometric Selfie: ${selfieName}
4. Proof of Address: ${proofAddressName}
5. Bank Confirmation Letter: ${bankLetterName}

COMPLIANCE & LEGAL NOTICE:
Verified under South African Financial Intelligence Centre Act 38 of 2001 (FICA)
and Protection of Personal Information Act 4 of 2013 (POPIA).
Audit Reference Flag: #SARB-9921-AUDIT
`;
      zip.file(`${safeName}_Dossier_Summary_${ref}.txt`, summaryText);

      // 2. Fetch and add document files with safe person name in each filename
      if (request.documentEntries && request.documentEntries.length > 0) {
        for (const entry of request.documentEntries) {
          try {
            const resp = await fetch(entry.url);
            if (resp.ok) {
              const blob = await resp.blob();
              const ext = blob.type.includes("pdf") ? "pdf" : "jpg";
              zip.file(`${safeName}_${entry.label}.${ext}`, blob);
            }
          } catch (e) {
            console.error("Failed to fetch doc", e);
          }
        }
      } else if (request.documents && request.documents.length > 0) {
        const defaultLabels = [
          "1_ID_Front",
          "2_ID_Back",
          "3_Biometric_Selfie",
          "4_Proof_of_Address",
          "5_Bank_Confirmation_Letter",
        ];
        for (let i = 0; i < request.documents.length; i++) {
          try {
            const docUrl = request.documents[i];
            const resp = await fetch(docUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const ext = blob.type.includes("pdf") ? "pdf" : "jpg";
              const label = defaultLabels[i] || `attachment_${i + 1}`;
              zip.file(`${safeName}_${label}.${ext}`, blob);
            }
          } catch (e) {
            console.error("Failed to fetch doc", e);
          }
        }
      }

      // 3. Include official receipt PDF if available
      try {
        const samplePdfResp = await fetch("/veriflow-kyc-ZA-I6JGA-receipt.pdf");
        if (samplePdfResp.ok) {
          const pdfBlob = await samplePdfResp.blob();
          zip.file(`${safeName}_Veriflow_Official_Receipt_${ref}.pdf`, pdfBlob);
        }
      } catch {}

      // 4. Generate and trigger download with Person's name first in file name
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${safeName}_KYC_Dossier_${ref}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      // 5. Automatically mark this KYC document as Under Review and move to the "Em Análise" tab
      try {
        await markReview({ data: { requestId: request.id, underReview: true } });
        void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      } catch (err) {
        console.warn("Could not auto-mark under review:", err);
      }

      toast.success(`Dossiê de ${name} (${ref}) baixado com sucesso e movido para "Em Análise"!`);
    } catch (err: any) {
      toast.error(`Erro ao gerar ZIP: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display">Identity &amp; FICA Checks</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              South African beneficial owner verification and compliance dossiers
            </p>
          </div>
          <Badge className="bg-[#0c382e] text-emerald-300 border-[#134e4a] text-xs font-bold py-1 px-2.5">
            Veriflow Portal
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "submitted" ? "default" : "outline"}
            className={
              statusFilter === "submitted"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs gap-1.5 shadow-xs"
                : "h-8 text-xs font-semibold gap-1.5"
            }
            onClick={() => setStatusFilter("submitted")}
          >
            <CheckCircle2 className="size-3.5" />
            Aguardando Revisão ({counts.submitted})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={statusFilter === "under_review" ? "default" : "outline"}
            className={
              statusFilter === "under_review"
                ? "bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold h-8 text-xs gap-1.5 shadow-xs"
                : "h-8 text-xs font-semibold gap-1.5 text-amber-700 dark:text-amber-400 border-amber-500/30"
            }
            onClick={() => setStatusFilter("under_review")}
          >
            <FileText className="size-3.5" />
            Em Análise / Baixados ({counts.under_review})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={statusFilter === "requested" ? "default" : "outline"}
            className={
              statusFilter === "requested"
                ? "bg-zinc-700 hover:bg-zinc-800 text-white font-bold h-8 text-xs gap-1.5 shadow-xs"
                : "h-8 text-xs font-semibold gap-1.5"
            }
            onClick={() => setStatusFilter("requested")}
          >
            <Clock className="size-3.5" />
            Aguardando Envio ({counts.requested})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={statusFilter === "approved" ? "default" : "outline"}
            className={
              statusFilter === "approved"
                ? "bg-primary text-primary-foreground font-bold h-8 text-xs gap-1.5"
                : "h-8 text-xs font-semibold gap-1.5"
            }
            onClick={() => setStatusFilter("approved")}
          >
            Aprovados ({counts.approved})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={statusFilter === "rejected" ? "default" : "outline"}
            className={
              statusFilter === "rejected"
                ? "bg-destructive text-destructive-foreground font-bold h-8 text-xs gap-1.5"
                : "h-8 text-xs font-semibold gap-1.5"
            }
            onClick={() => setStatusFilter("rejected")}
          >
            Rejeitados ({counts.rejected})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground ml-auto"
            onClick={() => setStatusFilter("all")}
          >
            Todos ({counts.all})
          </Button>
        </div>

        <Input
          placeholder="Nota interna opcional (enviada com a próxima aprovação ou rejeição)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}

        {filteredRequests.map((request) => {
          const veriflowMeta = (() => {
            if (request.veriflowMeta) return request.veriflowMeta;
            if (request.instructions) {
              try {
                const parsed = JSON.parse(request.instructions);
                if (parsed.reference || parsed.fullName || parsed.saIdNumber || parsed.attachments) {
                  return parsed;
                }
              } catch {}
            }
            return null;
          })();

          const isSubmitted = request.status === "submitted";
          const underReview = isSubmitted && isUnderReview(request);
          const isNewSubmission = isSubmitted && !underReview;
          const isRequested = request.status === "requested";
          const isApproved = request.status === "approved";
          const isRejected = request.status === "rejected";

          const applicantName = veriflowMeta?.fullName || request.user?.full_name || "Panelist";
          const safeName = getSafeName(applicantName);

          return (
            <div
              key={request.id}
              className={`rounded-xl p-4 space-y-3 transition-all ${
                underReview
                  ? "border-2 border-amber-500/50 bg-amber-500/5 shadow-xs"
                  : isNewSubmission
                    ? "border-2 border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                    : isRequested
                      ? "border border-zinc-500/30 bg-muted/20"
                      : isApproved
                        ? "border border-emerald-500/20 bg-card"
                        : "border border-destructive/20 bg-destructive/5"
              }`}
            >
              {/* Header with clear Status Alert */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {underReview ? (
                      <Badge className="bg-amber-500 text-amber-950 font-black text-xs gap-1 py-0.5 shadow-xs border-amber-600/30">
                        <FileText className="size-3.5" />
                        EM ANÁLISE — DOSSIÊ JÁ BAIXADO
                      </Badge>
                    ) : isNewSubmission ? (
                      <Badge className="bg-emerald-600 text-white font-black text-xs gap-1 py-0.5 shadow-xs">
                        <CheckCircle2 className="size-3.5" />
                        NOVO — AGUARDANDO SUA REVISÃO
                      </Badge>
                    ) : isRequested ? (
                      <Badge variant="outline" className="border-zinc-500/50 bg-zinc-500/10 text-muted-foreground font-bold text-xs gap-1 py-0.5">
                        <Clock className="size-3.5" />
                        AGUARDANDO ENVIO DO USUÁRIO
                      </Badge>
                    ) : isApproved ? (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-xs">
                        ✓ APROVADO
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-bold text-xs">
                        ✗ REJEITADO
                      </Badge>
                    )}

                    <p className="font-bold text-sm text-foreground">
                      {applicantName}
                    </p>
                    {request.user?.phone ? (
                      <span className="text-xs text-muted-foreground font-mono">• {formatPhone(request.user.phone)}</span>
                    ) : null}
                    {veriflowMeta ? (
                      <Badge className="bg-[#0c382e] text-emerald-300 border-[#134e4a] text-[10px] py-0">
                        Veriflow FICA ({veriflowMeta.reference})
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {underReview ? (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        📂 Under Review • Downloaded {veriflowMeta?.downloaded_at ? relativeDate(veriflowMeta.downloaded_at) : "recently"} • Submitted {relativeDate(request.submitted_at)}
                      </span>
                    ) : isNewSubmission ? (
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        ✓ New submission • {relativeDate(request.submitted_at)} {request.requested_at ? `(Requested ${relativeDate(request.requested_at)})` : ""}
                      </span>
                    ) : isRequested ? (
                      <span className="text-muted-foreground font-medium">
                        ⏳ Requested {relativeDate(request.requested_at)} • Panelist has NOT submitted documents yet
                      </span>
                    ) : (
                      <span>
                        Requested {relativeDate(request.requested_at)} {request.submitted_at ? `• Submitted ${relativeDate(request.submitted_at)}` : ""}
                      </span>
                    )}
                  </p>
                </div>

                {/* Review Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isApproved ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs shadow-xs"
                      disabled={mutation.isPending || isRequested}
                      title={isRequested ? "Wait for user to submit documents to approve" : "Approve FICA verification"}
                      onClick={() => mutation.mutate({ requestId: request.id, status: "approved" })}
                    >
                      ✓ Approve KYC
                    </Button>
                  ) : null}

                  {/* Button to request document correction / re-upload */}
                  {isSubmitted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 shadow-xs"
                      onClick={() => {
                        setCorrectionTarget(request);
                        setSelectedCorrectionReasons(["Bank Confirmation Letter / Statement unreadable or missing"]);
                        setCustomCorrectionNote("");
                        setSendCorrectionSms(true);
                      }}
                    >
                      <AlertTriangle className="size-3.5 mr-1 text-amber-600" />
                      Request Correction
                    </Button>
                  ) : null}

                  {!isRejected ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs font-semibold"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ requestId: request.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Applicant Metadata (When submitted / Veriflow) */}
              {veriflowMeta ? (
                <div className="rounded-lg border border-border/80 bg-background/80 p-3 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">SA ID Number: </span>
                      <strong className="font-mono text-foreground">{veriflowMeta.saIdNumber}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Settlement Bank: </span>
                      <strong className="text-foreground">{veriflowMeta.bank} ({veriflowMeta.accountType})</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account Number: </span>
                      <strong className="font-mono text-foreground">{veriflowMeta.accountNumber}</strong> (Branch: {veriflowMeta.branchCode})
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupation: </span>
                      <span className="text-foreground">{veriflowMeta.occupation}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Residential Address: </span>
                      <span className="text-foreground">{veriflowMeta.residentialAddress}</span>
                    </div>
                  </div>

                  {veriflowMeta.attachments ? (
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
                        Documents Attached by Panelist:
                      </p>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border text-foreground font-mono">
                          🪪 ID Front: {veriflowMeta.attachments.idFrontName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border text-foreground font-mono">
                          🪪 ID Back: {veriflowMeta.attachments.idBackName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border text-foreground font-mono">
                          🤳 Selfie: {veriflowMeta.attachments.selfieName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border text-foreground font-mono">
                          📄 Address: {veriflowMeta.attachments.proofAddressName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border text-foreground font-mono">
                          🏦 Bank Letter: {veriflowMeta.attachments.bankLetterName}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : request.instructions && !isSubmitted ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Instructions sent to user: </span>
                  {request.instructions}
                </div>
              ) : null}

              {/* Direct links to view individual documents with applicant name in download */}
              {((request.documentEntries && request.documentEntries.length > 0) || (request.documents && request.documents.length > 0)) ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(request.documentEntries && request.documentEntries.length > 0
                    ? request.documentEntries
                    : (request.documents ?? []).map((url: string, i: number) => ({
                        label: `Attachment ${i + 1}`,
                        url,
                        fileName: undefined,
                      }))
                  ).map((entry: { label: string; url: string; fileName?: string }, index: number) => (
                    <a
                      key={entry.url || index}
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      download={`${safeName}_${entry.label}`}
                      title={`Download ${safeName}_${entry.label}`}
                      className="text-xs font-semibold text-primary underline flex items-center gap-1.5 hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 transition-colors"
                    >
                      <span>📄</span>
                      <span>{safeName} — {entry.label.replace(/^\d+_/, "").replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground">↗</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {/* 1-Click Download Dossier ZIP & Status Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  {isSubmitted || (request.documents && request.documents.length > 0) ? (
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                      disabled={downloadingId === request.id}
                      onClick={() => handleDownloadDossierZip(request, veriflowMeta)}
                    >
                      {downloadingId === request.id ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          Downloading Files...
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5 mr-1.5" />
                          Download Dossier ({safeName}.zip)
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="h-8 text-xs font-medium text-muted-foreground border-dashed bg-background/50"
                    >
                      <Clock className="size-3.5 mr-1.5" />
                      No Documents Submitted Yet
                    </Button>
                  )}

                  {/* Manual Under Review toggle buttons */}
                  {isSubmitted ? (
                    underReview ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground border-border"
                        disabled={markUnderReviewMutation.isPending}
                        onClick={() =>
                          markUnderReviewMutation.mutate({ requestId: request.id, underReview: false })
                        }
                        title="Move back to new submissions tab (Awaiting Review)"
                      >
                        ↩ Return to New
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                        disabled={markUnderReviewMutation.isPending}
                        onClick={() =>
                          markUnderReviewMutation.mutate({ requestId: request.id, underReview: true })
                        }
                        title="Move to Under Review tab without downloading immediately"
                      >
                        <FileText className="size-3.5 mr-1 text-amber-600" />
                        Move to Under Review
                      </Button>
                    )
                  ) : null}

                  {veriflowMeta ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold text-foreground hover:bg-secondary"
                      onClick={() => setInspectReceipt(veriflowMeta)}
                    >
                      <Eye className="size-3.5 mr-1.5 text-emerald-600" />
                      View / Print Receipt
                    </Button>
                  ) : null}
                </div>

                <span className="text-[11px] text-muted-foreground">
                  Ref: <strong className="font-mono text-foreground">{veriflowMeta?.reference || request.id.slice(0, 8)}</strong>
                </span>
              </div>
            </div>
          );
        })}

        {!isLoading && filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
            <p className="font-semibold text-sm text-foreground">
              {statusFilter === "under_review"
                ? "No documents currently under review."
                : `No verification requests found with status "${statusFilter}".`}
            </p>
            <p className="text-xs text-muted-foreground">
              {statusFilter === "under_review"
                ? 'Clicking "Download Dossier" on any verification in "Awaiting Review" will automatically move it here.'
                : 'Click "All" to view full verification history.'}
            </p>
          </div>
        ) : null}
      </CardContent>

      {/* Inspect Veriflow Receipt Modal */}
      {inspectReceipt ? (
        <VeriflowKycDialog
          open={inspectReceipt !== null}
          onOpenChange={(open) => !open && setInspectReceipt(null)}
          receiptData={inspectReceipt}
          onComplete={() => {}}
        />
      ) : null}

      {/* Modal: Solicitar Correção / Reenvio de Documento */}
      <Dialog
        open={Boolean(correctionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCorrectionTarget(null);
            setSelectedCorrectionReasons([]);
            setCustomCorrectionNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle className="text-base font-bold">
                Request Document Correction / Re-upload
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the reason for re-upload. The panelist status will return to &quot;Awaiting Submission&quot;, the form at /kyc will be reopened with a prominent banner, and previously filled data will be preserved.
            </DialogDescription>
          </DialogHeader>

          {correctionTarget ? (
            <div className="space-y-4 py-2">
              {/* User preview header */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Panelist:</span>
                  <span className="font-bold text-foreground">
                    {correctionTarget.veriflowMeta?.fullName || correctionTarget.user?.full_name || "Panelist"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Phone:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {formatPhone(correctionTarget.user?.phone || correctionTarget.veriflowMeta?.phone || "")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Reported Bank:</span>
                  <span className="text-foreground font-semibold">
                    {correctionTarget.veriflowMeta?.bank || "Capitec Bank"} ({correctionTarget.veriflowMeta?.accountNumber || "Reported Account"})
                  </span>
                </div>
              </div>

              {/* 1-Click Checkbox presets */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">
                  Reason for Request (1 click):
                </Label>
                <div className="space-y-2">
                  {correctionOptions.map((opt) => {
                    const isChecked = selectedCorrectionReasons.includes(opt.label);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setSelectedCorrectionReasons((prev) =>
                            isChecked
                              ? prev.filter((r) => r !== opt.label)
                              : [...prev, opt.label]
                          );
                        }}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "border-amber-500/70 bg-amber-500/10 text-foreground"
                            : "border-border/70 hover:bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 size-4 rounded accent-amber-600 shrink-0 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground leading-tight">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional custom note */}
              <div className="space-y-1.5">
                <Label htmlFor="custom-correction-note" className="text-xs font-bold text-foreground">
                  Custom message or instruction (optional):
                </Label>
                <Textarea
                  id="custom-correction-note"
                  placeholder="E.g.: Please attach a clear copy of your bank confirmation letter or statement showing your full name."
                  rows={2}
                  className="text-xs resize-none"
                  value={customCorrectionNote}
                  onChange={(e) => setCustomCorrectionNote(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCorrectionTarget(null)}
              disabled={correctionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
              disabled={
                correctionMutation.isPending ||
                (selectedCorrectionReasons.length === 0 && !customCorrectionNote.trim())
              }
              onClick={() => {
                if (!correctionTarget) return;
                const finalReason = customCorrectionNote.trim()
                  ? customCorrectionNote.trim()
                  : selectedCorrectionReasons.join(". ");

                correctionMutation.mutate({
                  requestId: correctionTarget.id,
                  reason: finalReason,
                  reasonsList: selectedCorrectionReasons,
                });
              }}
            >
              {correctionMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3.5" />
                  Send Request to Panelist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getAdminSettings(),
  });
  const save = useServerFn(updateSettings);
  const savePlan = useServerFn(updatePlan);

  const [values, setValues] = useState<Record<string, string>>({});
  const [planDraft, setPlanDraft] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!data) return;
    setValues(
      Object.fromEntries(
        Object.entries(data.settings).map(([key, value]) => [key, String(value ?? "")]),
      ),
    );
    setPlanDraft(
      Object.fromEntries(
        data.plans.map((plan) => [
          plan.tier,
          {
            name: plan.name,
            price_kes: String(plan.price_kes),
            reward_per_survey: String(plan.reward_per_survey),
            withdrawal_days: String(plan.withdrawal_days),
            perks: plan.perks.join("\n"),
          },
        ]),
      ),
    );
  }, [data]);

  const settingsMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          values: {
            welcome_bonus_kes: Number(values["welcome_bonus_kes"] ?? 0),
            surveys_per_day: Number(values["surveys_per_day"] ?? 5),
            min_withdrawal_kes: Number(values["min_withdrawal_kes"] ?? 0),
            hold_amount_kes: Number(values["hold_amount_kes"] ?? 0),
            referral_target: Number(values["referral_target"] ?? 5),
            referral_reward_tier: values["referral_reward_tier"] ?? "vip1",
            referral_commission_kes: Number(values["referral_commission_kes"] ?? 0),
            streak_bonus_kes: Number(values["streak_bonus_kes"] ?? 0),
            require_kyc_for_withdrawal: values["require_kyc_for_withdrawal"] === "true",
            whatsapp_group_url: values["whatsapp_group_url"] ?? "",
            platform_name: values["platform_name"] ?? "SurveyPesa",
            facebook_pixel_ids: values["facebook_pixel_ids"] ?? "",
            facebook_access_token: values["facebook_access_token"] ?? "",
            facebook_test_event_code: values["facebook_test_event_code"] ?? "",
            verification_video_url: values["verification_video_url"] ?? "",
          },
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["public-config"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const planMutation = useMutation({
    mutationFn: (tier: Tier) => {
      const draft = planDraft[tier] ?? {};
      return savePlan({
        data: {
          tier,
          name: draft["name"],
          price_kes: Number(draft["price_kes"] ?? 0),
          reward_per_survey: Number(draft["reward_per_survey"] ?? 0),
          withdrawal_days: Number(draft["withdrawal_days"] ?? 7),
          perks: (draft["perks"] ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      });
    },
    onSuccess: () => {
      toast.success("Plan saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["public-config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const fields: Array<{ key: string; label: string; hint?: string; type?: string }> = [
    { key: "platform_name", label: "Platform name" },
    {
      key: "verification_video_url",
      label: "Account verification video (Mux Playback ID / URL)",
      hint: "Video shown on the verification page. Supports Mux Playback ID, Mux HLS stream, or YouTube.",
    },
    { key: "welcome_bonus_kes", label: "Welcome bonus (R)", type: "number" },
    { key: "surveys_per_day", label: "Surveys per day", type: "number" },
    { key: "min_withdrawal_kes", label: "Minimum payout (R)", type: "number" },
    {
      key: "hold_amount_kes",
      label: "Payout verification hold (R)",
      type: "number",
      hint: "Amount charged to verify a panelist's account for withdrawals — refunded after verification.",
    },
    {
      key: "kyc_hold_amount_kes",
      label: "KYC verification hold (R)",
      type: "number",
      hint: "Retention charged for identity checks — refunded after review.",
    },
    { key: "referral_target", label: "Invites needed for free upgrade", type: "number" },
    { key: "referral_commission_kes", label: "Referral bonus (R)", type: "number" },
    { key: "streak_bonus_kes", label: "7-day streak bonus (R)", type: "number" },
  ];

  return (
    <div className="space-y-5">
      <Card className="border-money/40 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <MessageCircle className="size-5 text-money" /> WhatsApp community button
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_group_url">WhatsApp group link</Label>
            <Input
              id="whatsapp_group_url"
              placeholder="https://chat.whatsapp.com/..."
              value={values["whatsapp_group_url"] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, whatsapp_group_url: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Paste your group or channel invite link. The official WhatsApp community button appears inside Support &amp; Help Desk as soon as this is saved.
            </p>
          </div>
          <Button
            disabled={settingsMutation.isPending}
            onClick={() => settingsMutation.mutate()}
            className="bg-money text-money-foreground hover:bg-money/90"
          >
            Save WhatsApp link
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display">
              <Activity className="size-5 text-primary" /> Meta (Facebook) Pixel &amp; Conversions API (CAPI)
            </CardTitle>
            {values["facebook_access_token"] || values["facebook_pixel_ids"]?.includes(":") ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> CAPI Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Pixel Only (CAPI Inactive)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="facebook_pixel_ids">Pixel IDs / Contingency (Meta Dataset)</Label>
            <Textarea
              id="facebook_pixel_ids"
              rows={3}
              placeholder={"1086304687177230\nor with individual token:\n1086304687177230:EAABsbCS..."}
              value={values["facebook_pixel_ids"] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, facebook_pixel_ids: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Enter one or more Pixel IDs (one per line or comma-separated). For different BMs in contingency, you can enter directly in the format <code className="text-primary font-mono font-semibold">PIXEL_ID:TOKEN</code>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="facebook_access_token">Conversions API (CAPI) Access Token</Label>
            <Textarea
              id="facebook_access_token"
              rows={3}
              placeholder="EAABsbCS... (Standard global token or PIXEL_ID:TOKEN list per line)"
              value={values["facebook_access_token"] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, facebook_access_token: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Global CAPI token for pixels under the same BM, or mapping list per line (<code className="text-primary font-mono font-semibold">PIXEL_ID:TOKEN</code>). Bypasses ad blockers and iOS tracking restrictions.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="facebook_test_event_code">Test Event Code (Optional for live testing in Meta)</Label>
            <Input
              id="facebook_test_event_code"
              placeholder="TEST12345 (Leave empty in production)"
              value={values["facebook_test_event_code"] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, facebook_test_event_code: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Enter the test event code from Meta Events Manager &gt; &quot;Test events&quot; tab to inspect payloads in real time.
            </p>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Dual-Tracking &amp; Deduplication (Pixel + CAPI)</p>
            <p>
              PageView · CompleteRegistration (sign up) · Login · SurveyCompleted · InitiateCheckout
              (Verification &amp; plan upgrade) · Purchase (every completed payment,
              value in ZAR) · WithdrawalRequested
            </p>
          </div>
          <Button disabled={settingsMutation.isPending} onClick={() => settingsMutation.mutate()}>
            Save tracking settings
          </Button>
        </CardContent>
      </Card>


      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Settings className="size-5 text-primary" /> Platform settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type ?? "text"}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
                {field.hint ? (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                ) : null}
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Free upgrade reward tier</Label>
              <Select
                value={values["referral_reward_tier"] ?? "vip1"}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, referral_reward_tier: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["vip1", "vip2", "vip3"] as Tier[]).map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {TIER_LABELS[tier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Require identity check before payout</Label>
              <Select
                value={values["require_kyc_for_withdrawal"] ?? "false"}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, require_kyc_for_withdrawal: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={settingsMutation.isPending} onClick={() => settingsMutation.mutate()}>
            Save settings
          </Button>
        </CardContent>
      </Card>

      <IntegrationsCard />

      <MuxIntegrationCard />

      <MissionsCard />


      <div className="grid gap-4 sm:grid-cols-2">
        {data.plans.map((plan) => {
          const draft = planDraft[plan.tier] ?? {};
          return (
            <Card key={plan.tier} className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-base">
                  {TIER_LABELS[plan.tier]} plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "name", label: "Display name", type: "text" },
                  {
                    key: "price_kes",
                    label:
                      plan.tier === "regular"
                        ? "Upgrade price charged (R) — 0 = free"
                        : "Upgrade price charged (R)",
                    type: "number",
                    hint:
                      plan.tier === "regular"
                        ? "Regular is the default plan, keep 0."
                        : "Amount charged when a user upgrades to this plan.",
                  },
                  {
                    key: "reward_per_survey",
                    label: "Reward per survey (R)",
                    type: "number",
                    hint: "Paid to the user for each completed survey on this plan.",
                  },
                  {
                    key: "withdrawal_days",
                    label: "Payout cooldown (days)",
                    type: "number",
                    hint: "Days a user must wait between withdrawals.",
                  },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${plan.tier}-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`${plan.tier}-${field.key}`}
                      type={field.type}
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        setPlanDraft((prev) => ({
                          ...prev,
                          [plan.tier]: { ...prev[plan.tier], [field.key]: event.target.value },
                        }))
                      }
                    />
                    {field.hint ? (
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    ) : null}
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label htmlFor={`${plan.tier}-perks`}>Perks (one per line)</Label>
                  <Textarea
                    id={`${plan.tier}-perks`}
                    rows={4}
                    value={draft["perks"] ?? ""}
                    onChange={(event) =>
                      setPlanDraft((prev) => ({
                        ...prev,
                        [plan.tier]: { ...prev[plan.tier], perks: event.target.value },
                      }))
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={planMutation.isPending}
                  onClick={() => planMutation.mutate(plan.tier as Tier)}
                >
                  Save {TIER_LABELS[plan.tier]}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: () => getIntegrationSettings(),
  });
  const save = useServerFn(updateIntegrationSettings);
  const test = useServerFn(testPaymentsConnection);

  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [appPublicUrl, setAppPublicUrl] = useState("");

  useEffect(() => {
    if (data) {
      setBaseUrl(data.baseUrl);
      setAppPublicUrl(data.appPublicUrl);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(secretKey.trim() ? { secretKey: secretKey.trim() } : {}),
          ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
          baseUrl: baseUrl.trim(),
          appPublicUrl: appPublicUrl.trim(),
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSecretKey("");
      setWebhookSecret("");
      void queryClient.invalidateQueries({ queryKey: ["admin-integrations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (result) =>
      result.ok ? toast.success(result.message) : toast.error(result.message),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const callbackUrl =
    data.callbackUrl ||
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/smoopay`;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-display">
          <CreditCard className="size-5 text-primary" /> Gateway de Pagamento
          <Badge variant={data.configured ? "secondary" : "destructive"}>
            {data.configured ? "Chave API Ativa" : "Não configurado"}
          </Badge>
          <Badge variant={data.webhookConfigured ? "secondary" : "outline"}>
            {data.webhookConfigured ? "Webhook ativo" : "Webhook não configurado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <h4 className="text-sm font-semibold">Credenciais da Plataforma de Pagamentos</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="smoo-secret">Secret API Key (Chave Secreta)</Label>
              <Input
                id="smoo-secret"
                type="password"
                autoComplete="off"
                placeholder={data.secretKeyPreview || "pv_live_... / sk_live_..."}
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Chave de API da sua plataforma (aceita qualquer gateway: Ghost Pay, Payvibe, Paystack, Smoo, etc.). Deixe vazio
                para manter a chave atual{data.secretKeyPreview ? ` (${data.secretKeyPreview})` : ""}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smoo-base">API Base URL (URL da API)</Label>
              <Input
                id="smoo-base"
                value={baseUrl}
                placeholder="https://ghopay.app/api/v1"
                onChange={(event) => setBaseUrl(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL base para criação de cobranças da sua plataforma (ex: https://ghopay.app/api/v1 ou a URL da sua API).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-sm font-semibold">Webhook & Notificações</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="smoo-webhook">Webhook Secret / Chave do Webhook</Label>
              <Input
                id="smoo-webhook"
                type="password"
                autoComplete="off"
                placeholder={data.webhookSecretPreview || "Cole o segredo do webhook"}
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Código secreto ou token de webhook da sua plataforma para validação de pagamentos.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smoo-app-url">App public URL</Label>
              <Input
                id="smoo-app-url"
                placeholder="https://your-app.lovable.app"
                value={appPublicUrl}
                onChange={(event) => setAppPublicUrl(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used to build the callback address sent with each payment. Leave empty to use the
                current site address.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-secondary/60 p-3 text-xs">
            <p className="font-semibold">Callback address sent with every charge</p>
            <code className="block break-all">{callbackUrl}</code>
            <p className="text-muted-foreground">
              Smoo Pay has no webhook URL field — the app sends this address automatically with each
              payment, so you do not need to paste it anywhere.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(callbackUrl);
                toast.success("Callback address copied.");
              }}
            >
              Copy address
            </Button>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Save payment settings
          </Button>
          <Button
            variant="secondary"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? "Testing…" : "Test connection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MuxIntegrationCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-mux-status"],
    queryFn: () => getMuxIntegrationStatus(),
  });
  const save = useServerFn(updateMuxCredentials);

  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(tokenId.trim() ? { tokenId: tokenId.trim() } : {}),
          ...(tokenSecret.trim() ? { tokenSecret: tokenSecret.trim() } : {}),
        },
      }),
    onSuccess: (result) => {
      toast.success(result.message);
      setTokenId("");
      setTokenSecret("");
      void queryClient.invalidateQueries({ queryKey: ["admin-mux-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) return <Skeleton className="h-44 w-full rounded-2xl" />;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-display">
          <Film className="size-5 text-primary" /> Mux Video (Direct Uploads & Streaming)
          <Badge variant={data.configured ? "secondary" : "destructive"}>
            {data.configured ? "Mux configured" : "Not configured"}
          </Badge>
          {data.tokenIdPreview ? (
            <Badge variant="outline">Token ID: {data.tokenIdPreview}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Allows you to upload videos directly from the admin interface without needing to visit Mux
          or copy Playback IDs. Get your API Access Token from{" "}
          <a
            href="https://dashboard.mux.com/settings/access-tokens"
            target="_blank"
            rel="noreferrer"
            className="underline text-primary font-medium"
          >
            Mux Dashboard → Settings → API Access Tokens
          </a>{" "}
          (with <strong>Mux Video - Full Access</strong> permission).
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mux-token-id">MUX Token ID</Label>
            <Input
              id="mux-token-id"
              placeholder={data.tokenIdPreview || "e.g. 5d71c4c9-..."}
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {data.tokenIdPreview
                ? `Currently set to ${data.tokenIdPreview}. Leave empty to keep.`
                : "Paste your Mux Token ID here."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mux-token-secret">MUX Token Secret</Label>
            <Input
              id="mux-token-secret"
              type="password"
              autoComplete="off"
              placeholder={data.hasSecret ? "••••••••••••••••" : "Paste your Mux Token Secret"}
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {data.hasSecret
                ? "Secret key is securely stored. Leave empty to keep."
                : "Paste your Mux Token Secret here."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={mutation.isPending || (!tokenId.trim() && !tokenSecret.trim())}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving Mux keys..." : "Save Mux API keys"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MissionsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-missions"],
    queryFn: () => listAdminMissions(),
  });
  const saveMission = useServerFn(updateMission);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (!data) return;
    setDraft(
      Object.fromEntries(
        data.map((mission) => [
          mission.id,
          {
            title: mission.title,
            goal: String(mission.goal),
            reward_kes: String(mission.reward_kes),
            active: mission.active ? "true" : "false",
          },
        ]),
      ),
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: (id: string) => {
      const row = draft[id] ?? {};
      return saveMission({
        data: {
          id,
          title: row["title"],
          goal: Number(row["goal"] ?? 1),
          reward_kes: Number(row["reward_kes"] ?? 0),
          active: row["active"] === "true",
        },
      });
    },
    onSuccess: () => {
      toast.success("Mission saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-missions"] });
      void queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Coins className="size-5 text-gold" /> Missions & extra cash
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set the extra cash reward panelists get for each mission, the goal they must reach and
          whether the mission is live.
        </p>
        {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}
        {(data ?? []).map((mission) => {
          const row = draft[mission.id] ?? {};
          return (
            <div key={mission.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">{mission.period}</Badge>
                <span className="text-xs text-muted-foreground">{mission.description}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`${mission.id}-title`}>Title</Label>
                  <Input
                    id={`${mission.id}-title`}
                    value={row["title"] ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], title: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${mission.id}-goal`}>Goal</Label>
                  <Input
                    id={`${mission.id}-goal`}
                    type="number"
                    value={row["goal"] ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], goal: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${mission.id}-reward`}>Extra cash (KSh)</Label>
                  <Input
                    id={`${mission.id}-reward`}
                    type="number"
                    value={row["reward_kes"] ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], reward_kes: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={row["active"] ?? "true"}
                    onValueChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], active: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Live</SelectItem>
                      <SelectItem value="false">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(mission.id)}
                >
                  Save mission
                </Button>
              </div>
            </div>
          );
        })}
        {!isLoading && (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No missions created yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SupportTicketsTab() {
  const queryClient = useQueryClient();
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => getAdminTickets(),
    staleTime: 30_000,
  });

  const replyFn = useServerFn(replyTicket);
  const askKyc = useServerFn(requestKyc);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const kycMutation = useMutation({
    mutationFn: (userId: string) =>
      askKyc({
        data: {
          userId,
          kind: "both",
          instructions:
            "South African SARB & FICA Regulations require standard identity and payout banking validation before release of funds.",
        },
      }),
    onSuccess: () => {
      toast.success("KYC check officially requested for this user!");
      setReplyText(
        "Hello! In compliance with South African SARB and FICA anti-fraud regulations, your withdrawal requires 1-time identity & account verification. We have triggered the official verification prompt on your dashboard. Please complete it to clear and release your payout.",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to trigger KYC request.");
    },
  });

  const replyMutation = useMutation({
    mutationFn: () =>
      replyFn({
        data: {
          ticketId: selectedTicket!.id,
          reply: replyText.trim(),
          status: "answered",
        },
      }),
    onSuccess: (updated) => {
      toast.success("Reply sent to member!");
      setSelectedTicket((prev) => (prev ? { ...prev, admin_reply: updated.admin_reply, status: updated.status } : null));
      setReplyText("");
      void queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send reply.");
    },
  });

  const filteredTickets = useMemo(() => {
    let list = tickets ?? [];
    if (filterStatus !== "all") {
      list = list.filter((t) => t.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q) ||
          (t.user_phone && t.user_phone.toLowerCase().includes(q)) ||
          String(t.ticket_number).includes(q),
      );
    }
    return list;
  }, [tickets, filterStatus, searchQuery]);

  const openCount = (tickets ?? []).filter((t) => t.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            Support Desk &amp; Member Tickets
            {openCount > 0 ? (
              <Badge className="bg-amber-500 text-white font-bold">{openCount} New</Badge>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            Review inquiries from panel members, answer questions, and resolve payout tickets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-2">
          <RefreshCw className="size-4" />
          Refresh Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="p-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by ticket #, phone or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All" },
                  { id: "open", label: "Open" },
                  { id: "answered", label: "Answered" },
                  { id: "resolved", label: "Resolved" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFilterStatus(st.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      filterStatus === st.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-2 divide-y max-h-[620px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin mb-2" />
                  Loading tickets...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No tickets found.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicket(t);
                        setReplyText(t.admin_reply || "");
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-colors text-left space-y-1.5 ${
                        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-foreground">
                          #{String(t.ticket_number).padStart(4, "0")} · {t.user_phone}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            t.status === "open"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : t.status === "answered"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-foreground line-clamp-1">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{t.message}</p>
                      <div className="text-[10px] text-muted-foreground pt-0.5">
                        {new Date(t.created_at).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ticket Inspection & Reply Desk */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <Card className="rounded-2xl border shadow-xs space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      #{String(selectedTicket.ticket_number).padStart(4, "0")}
                    </span>
                    <h3 className="font-display text-lg font-bold">{selectedTicket.subject}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    User: <strong>{selectedTicket.user_phone}</strong> ({selectedTicket.user_name}) · Tier: <strong>{selectedTicket.user_tier}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs uppercase font-bold">
                    {selectedTicket.category.replace("_", " ")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={kycMutation.isPending}
                    onClick={() => kycMutation.mutate(selectedTicket.user_id)}
                    className="h-8 gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-xs font-bold"
                  >
                    <FileCheck2 className="size-3.5" />
                    {kycMutation.isPending ? "Requesting..." : "Request KYC Check"}
                  </Button>
                </div>
              </div>

              {/* User Inquiry Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Member Inquiry:
                </label>
                <div className="rounded-2xl bg-muted/40 p-4 text-sm whitespace-pre-wrap border border-border/40 font-medium">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Quick Preset Buttons for Rapid Admin Replies */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Quick Reply Templates:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: "Payout In Clearing",
                      text: "Hello! Your withdrawal is currently queued for automated settlement via Instant EFT. Please ensure you have completed today's 5 video reviews to avoid clearing delays.",
                    },
                    {
                      label: "FICA Verification Info",
                      text: "Hello! In accordance with South African SARB and FICA guidelines, your first payout requires identity validation. Once completed, your payout reflects automatically.",
                    },
                    {
                      label: "Daily Tasks Complete",
                      text: "Hello! Great job completing your daily reviews. Your rewards have been safely credited to your wallet balance.",
                    },
                    {
                      label: "Send 7-Day Refund Portal Link",
                      text: "Hello! If you wish to formally request a banking refund, please submit your verified South African bank details through our formal clearance portal: https://sa-opinion-rewards.vercel.app/refund-request . In accordance with SARB interbank regulations, refunds take exactly 7 business days to clear into your bank account.",
                    },
                  ].map((tpl, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 rounded-lg"
                      onClick={() => setReplyText(tpl.text)}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Admin Reply Input */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Official Agent Reply:
                </label>
                <Textarea
                  placeholder="Type official response here. The member will immediately see this on their support page..."
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="rounded-2xl resize-none text-sm p-3.5"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    className="gap-2 font-bold h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft"
                    disabled={replyMutation.isPending || !replyText.trim()}
                    onClick={() => replyMutation.mutate()}
                  >
                    {replyMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="size-4" />
                        Send Reply to Member
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border p-12 text-center text-sm text-muted-foreground space-y-2">
              <HelpCircle className="size-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">Select a ticket from the list</p>
              <p className="text-xs">Click on any member ticket on the left to read their inquiry and send an official response.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

