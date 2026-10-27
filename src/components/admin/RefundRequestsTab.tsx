import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeAlert,
  Search,
  RefreshCw,
  Calendar,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getAdminRefundRequests,
  updateRefundStatus,
  type RefundRequest,
  type RefundStatus,
} from "@/lib/refund.functions";
import { formatKes } from "@/lib/format";

export function RefundRequestsTab() {
  const queryClient = useQueryClient();
  const getRefundsFn = useServerFn(getAdminRefundRequests);
  const updateStatusFn = useServerFn(updateRefundStatus);

  const { data: refunds, isLoading, refetch } = useQuery({
    queryKey: ["admin-refund-requests"],
    queryFn: () => getRefundsFn(),
    staleTime: 10_000,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ status }: { status: RefundStatus }) => {
      if (!selectedRefund) throw new Error("No refund selected");
      return updateStatusFn({
        data: {
          requestId: selectedRefund.id,
          status,
          adminNotes: adminNotes || undefined,
        },
      });
    },
    onSuccess: (updated) => {
      toast.success(`Refund status updated to ${updated.status}`);
      setSelectedRefund(updated);
      void queryClient.invalidateQueries({ queryKey: ["admin-refund-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update refund status");
    },
  });

  const filtered = (refunds ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.bank_name?.toLowerCase().includes(q) ||
        r.account_number?.includes(q) ||
        String(r.protocol_number).includes(q)
      );
    }
    return true;
  });

  const pendingCount = (refunds ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <BadgeAlert className="size-5 text-amber-600" />
            Banking Refund Applications (7-Day Clearing)
          </h2>
          <p className="text-sm text-muted-foreground">
            Formal settlement requests for package cancellations, billing reversals, and deposit refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white font-bold px-3 py-1">
              {pendingCount} Pending Clearance
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-1.5 rounded-xl">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 7-Day Protocol Info Bar */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-3">
        <Calendar className="size-5 text-amber-600 shrink-0" />
        <span>
          <strong>Banking Protocol:</strong> All approved refunds are legally scheduled for clearance within <strong>7 business days</strong>. When you transfer funds via banking app / EFT, mark as &quot;Approved / Settled&quot;.
        </span>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, bank, account number or #REF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-10"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["all", "pending", "in_review", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs h-9 rounded-xl capitalize"
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: List on Left, Detail & Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Refund Requests */}
        <div className="lg:col-span-5 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading refund requests...</div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
              No refund requests found matching filter.
            </Card>
          ) : (
            filtered.map((r) => {
              const isSelected = selectedRefund?.id === r.id;
              const statusColors: Record<RefundStatus, string> = {
                pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
              };

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRefund(r);
                    setAdminNotes(r.admin_notes || "");
                  }}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
                      : "border-border/70 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      #REF-{String(r.protocol_number).padStart(5, "0")}
                    </span>
                    <Badge variant="outline" className={`text-xs capitalize font-semibold ${statusColors[r.status]}`}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground text-sm">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.phone} • {r.bank_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatKes(r.amount_cents)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-ZA")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail & Action Inspector */}
        <div className="lg:col-span-7">
          {selectedRefund ? (
            <Card className="rounded-2xl border shadow-soft p-6 space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      #REF-{String(selectedRefund.protocol_number).padStart(5, "0")}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize font-bold">
                      {selectedRefund.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-1">{selectedRefund.full_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Applied on {new Date(selectedRefund.created_at).toLocaleString("en-ZA")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Refund Amount</span>
                  <span className="text-2xl font-black text-foreground">
                    {formatKes(selectedRefund.amount_cents)}
                  </span>
                </div>
              </div>

              {/* Bank Details Table */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  Banking Settlement Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Bank Name:</span>
                    <strong className="text-foreground text-sm font-semibold">{selectedRefund.bank_name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Account Number:</span>
                    <strong className="text-foreground text-sm font-mono font-bold select-all">{selectedRefund.account_number}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Account Holder:</span>
                    <strong className="text-foreground font-semibold">{selectedRefund.account_holder}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Branch Code:</span>
                    <strong className="text-foreground font-mono font-semibold">{selectedRefund.branch_code}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Account Type:</span>
                    <strong className="text-foreground font-medium capitalize">{selectedRefund.account_type}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Transaction Ref:</span>
                    <strong className="text-foreground font-mono">{selectedRefund.transaction_ref || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Member's Stated Reason */}
              <div className="rounded-xl border bg-card p-4 space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground">Reason for Refund Request:</span>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedRefund.reason}</p>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Clearing Audit Notes (Visible to Member):
                </label>
                <Textarea
                  placeholder="e.g. Scheduled in EFT batch #891. Funds will clear within 7 business days..."
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "in_review" })}
                    className="rounded-xl text-xs h-9 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                  >
                    Mark In Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "rejected" })}
                    className="rounded-xl text-xs h-9 border-rose-500/30 text-rose-600 hover:bg-rose-50"
                  >
                    Reject Application
                  </Button>
                </div>

                <Button
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ status: "approved" })}
                  className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-4"
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve &amp; Mark Settled
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border p-12 text-center text-sm text-muted-foreground space-y-2">
              <BadgeAlert className="size-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">Select a refund request from the list</p>
              <p className="text-xs">Click on any application to view bank details and process the settlement.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
