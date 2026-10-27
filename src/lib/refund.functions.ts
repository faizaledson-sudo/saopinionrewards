import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RefundStatus = "pending" | "in_review" | "approved" | "rejected";

export type RefundRequest = {
  id: string;
  protocol_number: number;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  amount_cents: number;
  transaction_ref: string | null;
  reason: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_code: string;
  account_type: string;
  status: RefundStatus;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  user_tier?: string;
};

/** Get current user's refund requests */
export const getMyRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getMyRefundRequests error:", error.message);
      return [];
    }

    return (data ?? []) as RefundRequest[];
  });

/** Submit a refund request (isolated formal form) */
export const submitRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      fullName: string;
      phone: string;
      email?: string;
      amountCents: number;
      transactionRef?: string;
      reason: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      branchCode: string;
      accountType: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.fullName?.trim()) throw new Error("Please enter your full legal name.");
    if (!data.phone?.trim()) throw new Error("Please enter your registered phone number.");
    if (!data.amountCents || data.amountCents <= 0) throw new Error("Please specify the refund amount.");
    if (!data.bankName?.trim()) throw new Error("Please select your bank name.");
    if (!data.accountNumber?.trim()) throw new Error("Please enter your bank account number.");
    if (!data.branchCode?.trim()) throw new Error("Please enter your branch code.");
    if (!data.reason?.trim() || data.reason.trim().length < 5) {
      throw new Error("Please provide a brief reason for the refund request.");
    }

    const { data: request, error } = await supabaseAdmin
      .from("refund_requests")
      .insert({
        user_id: context.userId,
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        amount_cents: Math.round(data.amountCents),
        transaction_ref: data.transactionRef?.trim() || null,
        reason: data.reason.trim(),
        bank_name: data.bankName.trim(),
        account_number: data.accountNumber.trim(),
        account_holder: data.accountHolder.trim() || data.fullName.trim(),
        branch_code: data.branchCode.trim(),
        account_type: data.accountType.trim() || "cheque",
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return request as RefundRequest;
  });

/** Admin: list all refund requests */
export const getAdminRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);

    const { data: requests, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("getAdminRefundRequests error:", error.message);
      return [];
    }

    const userIds = Array.from(new Set((requests ?? []).map((r) => r.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, tier").in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (requests ?? []).map((r) => {
      const p = profileMap.get(r.user_id);
      return {
        ...r,
        user_tier: p?.tier || "regular",
      };
    }) as RefundRequest[];
  });

/** Admin: update refund request status & settlement notes */
export const updateRefundStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      requestId: string;
      status: RefundStatus;
      adminNotes?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);

    const { data: updated, error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: data.status,
        admin_notes: data.adminNotes?.trim() || null,
        processed_at: new Date().toISOString(),
        processed_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return updated as RefundRequest;
  });
