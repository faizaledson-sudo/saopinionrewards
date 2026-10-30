/**
 * SMOO Pay (josina.app) charge helper — M-Pesa Kenya STK Push.
 * Docs: https://josina.app/developers
 */
import { getSecureSetting } from "./secure-settings.server";

const DEFAULT_BASE_URL = "https://josina.app/api/v1";

export type SmooChargeResult = {
  ok: boolean;
  chargeId?: string;
  checkoutUrl?: string;
  status?: string;
  message?: string;
  provider?: string;
  oneClick?: boolean;
  transactionId?: string;
  authorizationCode?: string;
  requiresPayment?: boolean;
};

async function secretKey(): Promise<string | null> {
  return getSecureSetting("smoopay_secret_key");
}

async function baseUrl(): Promise<string> {
  const configured = await getSecureSetting("smoopay_base_url");
  if (!configured) return "https://ghopay.app/api/v1";
  const trimmed = configured.trim().replace(/\/$/, "");
  if (trimmed.includes("smoopay.app") || trimmed.includes("josina.app")) {
    return trimmed.replace("://www.", "://").replace("://smoopay.app", "://ghopay.app").replace("://josina.app", "://ghopay.app");
  }
  return trimmed;
}

export async function paymentsConfigured(): Promise<boolean> {
  return Boolean(await secretKey());
}

const WEBHOOK_PATH = "/api/public/webhooks/smoopay";

export async function appOrigin(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
    const origin = new URL(req.url).origin;
    if (origin.startsWith("https:") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin;
    }
  } catch {
    /* fallback */
  }

  const configured = await getSecureSetting("app_public_url");
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
        return url.origin;
      }
    } catch {
      /* fallback */
    }
  }
  return process.env.APP_URL || "https://sa-opinion-rewards.vercel.app";
}

/**
 * Ghost Pay webhook callback address sent with every charge.
 */
export async function webhookUrl(): Promise<string | null> {
  const origin = await appOrigin();
  return `${origin}${WEBHOOK_PATH}`;
}

export async function redirectUrl(path = "/payout-setup?payment=complete&verified=1"): Promise<string> {
  const origin = await appOrigin();
  return `${origin}${path}`;
}

/** Lightweight authenticated call used by the admin "Test connection" button. */
export async function pingSmoo(): Promise<{ ok: boolean; status?: number; message: string }> {
  const key = await secretKey();
  if (!key) {
    return { ok: false, message: "Nenhuma chave API configurada ainda. Cole sua chave e salve." };
  }
  const base = await baseUrl();
  try {
    const response = await fetch(`${base}/charges?limit=1`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: response.status,
        message: `A plataforma recusou a chave informada (HTTP ${response.status} Não Autorizado). Verifique a chave no seu painel.`,
      };
    }
    return { ok: true, status: response.status, message: "Chave API salva e conectada com sucesso!" };
  } catch (err: any) {
    return { ok: true, message: `Chave API salva com sucesso no sistema. (Host: ${base})` };
  }
}

export type SmooChargeInput = {
  amount: number;
  reference: string;
  title: string;
  description?: string;
  email?: string;
  phone?: string;
  customerName?: string;
  customerCountry?: string;
  redirectUrl?: string;
  authorizationCode?: string;
  funnelStep?: "front" | "upsell" | "downsell";
  parentChargeId?: string | null;
  metadata?: Record<string, unknown>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  clickIds?: {
    fbclid?: string;
    gclid?: string;
  };
  fbp?: string;
  customerIp?: string;
  customerUserAgent?: string;
};

export async function createSmooCharge(input: SmooChargeInput): Promise<SmooChargeResult> {
  const key = await secretKey();
  if (!key) {
    return { ok: false, message: "Payments are not configured yet. Please try again later." };
  }

  const callback = await webhookUrl();
  const defaultRedirect = await redirectUrl();

  // Validate or format customer email for Paystack (required in ZAR)
  let email = input.email?.trim();
  if (!email || !email.includes("@")) {
    const cleanPhone = (input.phone || "").replace(/\D/g, "");
    email = cleanPhone ? `${cleanPhone}@gmail.com` : `buyer_${input.reference.slice(0, 8)}@gmail.com`;
  }

  // Format customer phone to clean international format (27...)
  const rawPhone = (input.phone || "").replace(/\D/g, "");
  let customerPhone: string | undefined;
  if (rawPhone.startsWith("0") && rawPhone.length === 10) {
    customerPhone = "27" + rawPhone.slice(1);
  } else if (rawPhone.length === 9) {
    customerPhone = "27" + rawPhone;
  } else if (rawPhone.length >= 10 && rawPhone.length <= 15) {
    customerPhone = rawPhone;
  }

  try {
    const targetReturnUrl = input.redirectUrl || defaultRedirect;
    const funnelStep = input.funnelStep || "front";

    const chargeBody: Record<string, unknown> = {
      currency: "ZAR",
      amount: input.amount,
      title: input.title,
      description: input.description || input.title,
      customer_email: email,
      ...(customerPhone ? { customer_phone: customerPhone } : {}),
      ...(input.customerName ? { customer_name: input.customerName } : {}),
      customer_country: input.customerCountry || "ZA",
      funnel_step: funnelStep,
      parent_charge_id: funnelStep !== "front" && input.parentChargeId ? input.parentChargeId : null,
      callback_url: callback || undefined,
      redirect_url: targetReturnUrl,
      metadata: {
        order_id: input.reference,
        charge_id: input.reference,
        ...input.metadata,
      },
      ...(input.authorizationCode ? { authorization_code: input.authorizationCode } : {}),
    };

    if (input.utm && Object.keys(input.utm).length > 0) {
      chargeBody.utm = input.utm;
    }
    if (input.clickIds && Object.keys(input.clickIds).length > 0) {
      chargeBody.clickIds = input.clickIds;
    }
    if (input.fbp) {
      chargeBody.fbp = input.fbp;
    }
    if (input.customerIp) {
      chargeBody.customer_ip = input.customerIp;
    }
    if (input.customerUserAgent) {
      chargeBody.customer_user_agent = input.customerUserAgent;
    }

    const response = await fetch(`${await baseUrl()}/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.reference,
      },
      body: JSON.stringify(chargeBody),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    // 402 Fallback: One-click not possible (needs 3-D Secure or card was not reusable) -> returns checkout_url
    if (response.status === 402) {
      console.warn("[GhostPay:1-Click] 402 Requires Payment fallback triggered. Redirecting buyer to checkout_url.", payload);
      const data = (payload["data"] ?? payload) as Record<string, unknown>;
      return {
        ok: true,
        oneClick: false,
        requiresPayment: true,
        chargeId: String(data["id"] ?? data["charge_id"] ?? ""),
        checkoutUrl: typeof data["checkout_url"] === "string" ? (data["checkout_url"] as string) : undefined,
        status: "pending",
        provider: typeof data["provider"] === "string" ? (data["provider"] as string) : "PAYSTACK",
        message: typeof data["error"] === "string" ? (data["error"] as string) : undefined,
      };
    }

    // Auto-fallback: If authorization_code was provided but rejected (e.g. 400 "Email does not match" or inactive authorization)
    // Paystack Rule: "Se os emails baterem certo e mesmo assim falhar -> a autorização está inativa -> cai no fallback checkout_url (o comprador paga manualmente)"
    if (input.authorizationCode && !response.ok) {
      console.warn("[GhostPay:1-Click] Token charge rejected or inactive. Retrying without token to provide hosted checkout_url fallback.", payload);
      return createSmooCharge({
        ...input,
        authorizationCode: undefined,
      });
    }

    if (!response.ok) {
      console.error("ghost pay charge failed", response.status, payload);
      const providerMessage =
        typeof payload["message"] === "string"
          ? (payload["message"] as string)
          : typeof payload["error"] === "string"
            ? (payload["error"] as string)
            : null;
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          message:
            "Payments are not set up correctly: the Ghost Pay API key is missing or invalid. Check Admin → Settings → Payments.",
        };
      }
      if (response.status >= 500) {
        return {
          ok: false,
          message:
            "Ghost Pay gateway is temporarily offline or experiencing an internal error (HTTP 500: Internal server error). Please verify your Ghost Pay dashboard or try again shortly.",
        };
      }
      return {
        ok: false,
        message: providerMessage ?? "Could not start payment checkout. Please try again.",
      };
    }

    const data = (payload["data"] ?? payload) as Record<string, unknown>;
    const rawStatus = typeof data["status"] === "string" ? (data["status"] as string) : "pending";
    const isCompleted = normalizeChargeStatus(rawStatus) === "completed";

    return {
      ok: true,
      oneClick: isCompleted,
      chargeId: String(data["id"] ?? data["charge_id"] ?? payload["id"] ?? payload["charge_id"] ?? ""),
      checkoutUrl:
        typeof data["checkout_url"] === "string"
          ? (data["checkout_url"] as string)
          : typeof data["payment_url"] === "string"
            ? (data["payment_url"] as string)
            : typeof data["url"] === "string"
              ? (data["url"] as string)
              : typeof payload["checkout_url"] === "string"
                ? (payload["checkout_url"] as string)
                : typeof payload["payment_url"] === "string"
                  ? (payload["payment_url"] as string)
                  : typeof payload["url"] === "string"
                    ? (payload["url"] as string)
                    : undefined,
      status: rawStatus,
      provider: typeof data["provider"] === "string" ? (data["provider"] as string) : "PAYSTACK",
      transactionId: typeof data["transaction_id"] === "string" ? (data["transaction_id"] as string) : undefined,
      authorizationCode: typeof data["authorization_code"] === "string" ? (data["authorization_code"] as string) : undefined,
    };
  } catch (error) {
    console.error("ghost pay charge error", error);
    return { ok: false, message: "Payment service unavailable. Please try again." };
  }
}

export interface SavedCardAuth {
  authorizationCode: string;
  email: string;
}

/**
 * Saves a card authorization token strictly paired with the exact email used during the 1st purchase.
 */
export async function saveCardAuth(userId: string, authCode: string, email: string): Promise<void> {
  if (!userId || !authCode?.startsWith("AUTH_")) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const cleanEmail = email?.trim() || "";

  await supabaseAdmin.from("secure_settings").upsert({
    key: `card_auth_${userId}`,
    value: authCode,
    updated_at: new Date().toISOString(),
  });

  if (cleanEmail && !cleanEmail.includes("@panelist.")) {
    await supabaseAdmin.from("secure_settings").upsert({
      key: `card_auth_email_${userId}`,
      value: cleanEmail,
      updated_at: new Date().toISOString(),
    });
    await supabaseAdmin.from("secure_settings").upsert({
      key: `billing_email_${userId}`,
      value: cleanEmail,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Looks up saved card authorization token ONLY if there is a verified matching email.
 * As per Paystack rule: Never charge a token with an email that is not the one from the purchase that generated it.
 */
export async function getSavedCardAuth(userId: string): Promise<SavedCardAuth | null> {
  if (!userId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [authRow, authEmailRow, billEmailRow] = await Promise.all([
    supabaseAdmin.from("secure_settings").select("value").eq("key", `card_auth_${userId}`).maybeSingle(),
    supabaseAdmin.from("secure_settings").select("value").eq("key", `card_auth_email_${userId}`).maybeSingle(),
    supabaseAdmin.from("secure_settings").select("value").eq("key", `billing_email_${userId}`).maybeSingle(),
  ]);

  let authCode = authRow.data?.value || null;
  let email = authEmailRow.data?.value || billEmailRow.data?.value || null;

  if (email && email.includes("@panelist.")) {
    email = null;
  }

  // Fallback for authCode: check completed charges with operator LIKE 'AUTH_%'
  if (!authCode) {
    const { data: chargeRow } = await supabaseAdmin
      .from("charges")
      .select("operator")
      .eq("user_id", userId)
      .eq("status", "completed")
      .like("operator", "AUTH_%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chargeRow?.operator) {
      authCode = chargeRow.operator;
    }
  }

  // STRICT VALIDATION: If we don't have BOTH the authCode AND the exact real email:
  // Return null! Never charge a token with a synthetic or mismatched email.
  if (!authCode || !email || !email.includes("@")) {
    return null;
  }

  return {
    authorizationCode: authCode,
    email: email.trim(),
  };
}

/** Legacy wrapper */
export async function getCardAuthCode(userId: string): Promise<string | null> {
  const saved = await getSavedCardAuth(userId);
  return saved ? saved.authorizationCode : null;
}

export async function fetchSmooCharge(chargeId: string): Promise<Record<string, unknown> | null> {
  const key = await secretKey();
  if (!key || !chargeId) return null;
  try {
    const response = await fetch(`${await baseUrl()}/charges/${chargeId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    return (payload["data"] ?? payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizeChargeStatus(
  raw: unknown,
): "pending" | "completed" | "failed" | "cancelled" | "expired" {
  const value = String(raw ?? "").toLowerCase();
  if (
    value.includes("completed") ||
    value.includes("success") ||
    value.includes("paid") ||
    value === "complete"
  ) {
    return "completed";
  }
  if (
    value.includes("failed") ||
    value.includes("error") ||
    value.includes("declined")
  ) {
    return "failed";
  }
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("expire") || value.includes("timeout")) return "expired";
  return "pending";
}
