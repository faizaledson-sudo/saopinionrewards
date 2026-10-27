import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TicketCategory =
  | "payout_withdrawal"
  | "verification_fica"
  | "daily_tasks"
  | "account_upgrade"
  | "general";

export type TicketStatus = "open" | "in_review" | "answered" | "resolved";

export type SupportTicket = {
  id: string;
  ticket_number: number;
  user_id: string;
  category: TicketCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  user_phone?: string;
  user_name?: string;
  user_tier?: string;
};

/** Get current user's tickets */
export const getMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getMyTickets error (table might not exist yet):", error.message);
      return [];
    }

    return (data ?? []) as SupportTicket[];
  });

/** Submit a new ticket */
export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      category: TicketCategory;
      subject: string;
      message: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.subject?.trim()) throw new Error("Please enter a subject.");
    if (!data.message?.trim() || data.message.trim().length < 10) {
      throw new Error("Please describe your question or issue in detail (at least 10 characters).");
    }

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: context.userId,
        category: data.category,
        subject: data.subject.trim(),
        message: data.message.trim(),
        status: "open",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return ticket as SupportTicket;
  });

/** Admin: list all tickets */
export const getAdminTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);

    const { data: tickets, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("getAdminTickets error:", error.message);
      return [];
    }

    const userIds = Array.from(new Set((tickets ?? []).map((t) => t.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, phone, full_name, tier").in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (tickets ?? []).map((t) => {
      const p = profileMap.get(t.user_id);
      return {
        ...t,
        user_phone: p?.phone || "Unknown",
        user_name: p?.full_name || "Member",
        user_tier: p?.tier || "regular",
      };
    }) as SupportTicket[];
  });

/** Admin: reply to ticket */
export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { ticketId: string; reply: string; status?: TicketStatus }) => input)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./platform.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);

    if (!data.reply?.trim()) throw new Error("Reply message cannot be empty.");

    const { data: updated, error } = await supabaseAdmin
      .from("support_tickets")
      .update({
        admin_reply: data.reply.trim(),
        replied_at: new Date().toISOString(),
        replied_by: context.userId,
        status: data.status || "answered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.ticketId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return updated as SupportTicket;
  });
