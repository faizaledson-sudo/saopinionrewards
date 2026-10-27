import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  Send,
  HelpCircle,
  FileText,
  BadgeAlert,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitRefundRequest,
  getMyRefundRequests,
  type RefundRequest,
} from "@/lib/refund.functions";
import { useMe } from "@/components/AppShell";
import { formatKes } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/refund-request")({
  head: () => ({
    meta: [
      { title: "Official Refund Request Portal — Google Opinion Rewards South Africa" },
      {
        name: "description",
        content:
          "Official banking refund submission portal. Strict 7-day clearing protocol for verified account holders.",
      },
    ],
  }),
  component: RefundRequestPage,
});

const SA_BANKS = [
  { name: "Standard Bank", code: "051001" },
  { name: "Capitec Bank", code: "470010" },
  { name: "First National Bank (FNB)", code: "250655" },
  { name: "Nedbank", code: "198765" },
  { name: "ABSA Bank", code: "632005" },
  { name: "TymeBank", code: "678910" },
  { name: "African Bank", code: "430000" },
  { name: "Discovery Bank", code: "679000" },
  { name: "Investec Bank", code: "580105" },
];

function RefundRequestPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(me?.phone || "");
  const [email, setEmail] = useState("");
  const [amountZar, setAmountZar] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [reason, setReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountType, setAccountType] = useState("cheque");
  const [policyAgreed, setPolicyAgreed] = useState(false);

  // Queries
  const getRequestsFn = useServerFn(getMyRefundRequests);
  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-refund-requests"],
    queryFn: () => getRequestsFn(),
  });

  // Mutation
  const submitFn = useServerFn(submitRefundRequest);
  const submitMutation = useMutation({
    mutationFn: () => {
      const parsedAmount = parseFloat(amountZar);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid amount in Rands.");
      }
      return submitFn({
        data: {
          fullName,
          phone,
          email: email || undefined,
          amountCents: Math.round(parsedAmount * 100),
          transactionRef: transactionRef || undefined,
          reason,
          bankName,
          accountNumber,
          accountHolder: accountHolder || fullName,
          branchCode,
          accountType,
        },
      });
    },
    onSuccess: () => {
      toast.success("Refund request successfully registered under 7-day banking protocol.");
      void queryClient.invalidateQueries({ queryKey: ["my-refund-requests"] });
      // Reset form
      setFullName("");
      setAmountZar("");
      setTransactionRef("");
      setReason("");
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
      setBranchCode("");
      setPolicyAgreed(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit refund request.");
    },
  });

  const handleBankSelect = (selectedName: string) => {
    setBankName(selectedName);
    const bank = SA_BANKS.find((b) => b.name === selectedName);
    if (bank && !branchCode) {
      setBranchCode(bank.code);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/support" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Support &amp; Help Desk
        </Link>
      </div>

      {/* Official Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
          <BadgeAlert className="size-3.5" />
          Official Banking Refund Portal
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Request a Payment Refund
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Formal clearance portal for billing disputes, upgrade reversals, and deposit refunds.
        </p>
      </div>

      {/* 7-Day Guarantee Banner */}
      <Card className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-transparent shadow-soft overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Calendar className="size-7" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                7 Business Days Clearing Protocol
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs">
                  SARB Standard
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                By submitting this request, your case is sent to our compliance clearing division.
                All refunds take exactly <strong className="text-foreground font-semibold">7 business days</strong> to clear and reflect into your verified South African bank account via EFT / Bank Transfer.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-amber-500/20 pt-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4 text-amber-600 shrink-0" />
              <span>Step 1: Verification &amp; audit review</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4 text-amber-600 shrink-0" />
              <span>Step 2: 7 business days banking batch</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4 text-amber-600 shrink-0" />
              <span>Step 3: Direct deposit into your bank</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Form */}
      <Card className="rounded-3xl border shadow-soft overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <FileText className="size-4" />
            Formal Settlement Application
          </div>
          <CardTitle className="font-display text-xl">Banking &amp; Transaction Details</CardTitle>
          <CardDescription>
            Please provide exact bank details. Incorrect account or branch details may delay the 7-day clearing timeframe.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!policyAgreed) {
                toast.error("You must acknowledge the 7 business days processing timeframe.");
                return;
              }
              submitMutation.mutate();
            }}
            className="space-y-6"
          >
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Member Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Full Legal Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Sipho Ndlovu"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Registered Cellphone Number <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="071 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Email Address (Optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Refund Amount (ZAR / Rands) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                      R
                    </span>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="e.g. 150.00"
                      value={amountZar}
                      onChange={(e) => setAmountZar(e.target.value)}
                      className="rounded-xl h-11 pl-8 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Transaction / Payment Reference ID (If available)
                </label>
                <Input
                  placeholder="e.g. PF_109283 or Voucher Reference"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Reason for Refund Request <span className="text-destructive">*</span>
                </label>
                <Textarea
                  required
                  placeholder="Briefly explain the reason for your refund request (e.g. purchased duplicate tier upgrade, incorrect banking selection, etc.)..."
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl p-3 text-sm resize-none"
                />
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                2. South African Bank Settlement Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Bank Institution <span className="text-destructive">*</span>
                  </label>
                  <Select value={bankName} onValueChange={handleBankSelect}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {SA_BANKS.map((b) => (
                        <SelectItem key={b.name} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Account Type <span className="text-destructive">*</span>
                  </label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="cheque">Cheque / Current Account</SelectItem>
                      <SelectItem value="transmission">Transmission Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Account Number <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Enter bank account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="rounded-xl h-11 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Branch Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. 250655"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="rounded-xl h-11 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Account Holder Name (as appears on bank statement)
                </label>
                <Input
                  placeholder="Leave empty if same as full legal name"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={policyAgreed}
                  onChange={(e) => setPolicyAgreed(e.target.checked)}
                  className="mt-1 size-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs text-foreground font-medium leading-relaxed">
                  I understand and explicitly agree that this refund requires banking clearance and will take exactly <strong>7 business days</strong> to reflect in my South African bank account. I acknowledge that any associated VIP upgrades or active trial perks will be deactivated upon settlement.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={submitMutation.isPending || !policyAgreed}
              className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow-soft gap-2 transition-transform active:scale-[0.99]"
            >
              {submitMutation.isPending ? (
                "Submitting to Clearing Dept..."
              ) : (
                <>
                  <Send className="size-4" />
                  Submit Formal Refund Request (7-Day Protocol)
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History of Refund Requests */}
      <div className="space-y-4 pt-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          My Submitted Refund Requests
        </h2>

        {isLoading ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground animate-pulse">
            Loading your refund records...
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground bg-muted/20">
            No active refund requests found for your account.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const statusColors = {
                pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
              };

              const statusLabels = {
                pending: "Pending 7-Day Clearing",
                in_review: "Under Banking Audit",
                approved: "Settled / Paid to Bank",
                rejected: "Declined",
              };

              // Calculate expected clearing date (7 business days roughly 9-10 calendar days)
              const createdDate = new Date(req.created_at);
              const targetDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);

              return (
                <Card key={req.id} className="rounded-2xl border shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #REF-{String(req.protocol_number).padStart(5, "0")}
                        </span>
                        <Badge variant="outline" className={`text-xs font-semibold ${statusColors[req.status]}`}>
                          {statusLabels[req.status]}
                        </Badge>
                      </div>
                      <p className="font-display text-base font-bold text-foreground">
                        {formatKes(req.amount_cents)} — {req.bank_name} ({req.account_number.slice(-4).padStart(req.account_number.length, "•")})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted on {createdDate.toLocaleDateString("en-ZA")} • Reason: {req.reason}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-3 sm:text-right text-xs space-y-0.5 border">
                      <span className="text-muted-foreground block">Clearing Window:</span>
                      <strong className="text-foreground font-semibold flex items-center gap-1 sm:justify-end">
                        <Calendar className="size-3 text-amber-600" />
                        Within 7 business days
                      </strong>
                    </div>
                  </div>

                  {req.admin_notes && (
                    <div className="bg-muted/40 border-t px-4 py-3 text-xs text-muted-foreground">
                      <strong className="text-foreground">Official Audit Note: </strong>
                      {req.admin_notes}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
