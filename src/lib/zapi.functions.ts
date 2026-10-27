import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface WhatsAppDispatchEntry {
  phone: string;
  name?: string;
  message: string;
  status: "SENT" | "FAILED";
  messageId?: string;
  error?: string;
  created_at: string;
}

export interface RecoveryTarget {
  charge_id: string;
  user_id: string;
  phone: string;
  full_name?: string | null;
  amount_kes: number;
  created_at: string;
  plan_tier?: string | null;
}

/** Disabled stub */
export const getZApiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      instanceId: "",
      instanceTokenPreview: "",
      clientTokenPreview: "",
      configured: false,
      status: { connected: false, message: "Disabled" },
      recentDispatches: [],
    };
  });

export const updateZApiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { instanceId: string; instanceToken: string; clientToken?: string }) => input)
  .handler(async () => {
    return { ok: true, message: "Settings saved (disabled)" };
  });

export const getZApiQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { ok: false, error: "WhatsApp Z-API temporarily disabled" };
  });

export const sendZApiTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; message: string }) => input)
  .handler(async () => {
    return { ok: false, error: "WhatsApp integration disabled" };
  });

export const getPendingRecoveryTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { targets: [], totalPending: 0 };
  });

export const sendZApiSingleRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chargeId: string; phone: string; customerName?: string; amountKes: number }) => input)
  .handler(async () => {
    return { ok: false, error: "WhatsApp recovery disabled" };
  });

export const runZApiRecoveryScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => input)
  .handler(async () => {
    return { scanned: 0, sent: 0, failed: 0, skipped: 0 };
  });
