/**
 * Private credential store (public.secure_settings). RLS has no policies, so only
 * service-role server code can read or write these values.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SecureKey =
  | "smoopay_secret_key"
  | "smoopay_webhook_secret"
  | "smoopay_base_url"
  | "app_public_url"
  | "mux_token_id"
  | "mux_token_secret"
  | "smsportal_client_id"
  | "smsportal_api_secret"
  | "zapi_instance_id"
  | "zapi_instance_token"
  | "zapi_client_token"
  | "green_send_api_key";

const FALLBACK_ENV: Record<SecureKey, string[]> = {
  // STRIPE_LIVE_API_KEY holds the Smoo Pay secret key on this project.
  smoopay_secret_key: ["SMOOPAY_SECRET_KEY", "SMOO_API_KEY", "STRIPE_LIVE_API_KEY"],
  smoopay_webhook_secret: ["SMOOPAY_WEBHOOK_SECRET"],
  smoopay_base_url: ["SMOOPAY_BASE_URL"],
  app_public_url: ["APP_PUBLIC_URL"],
  mux_token_id: ["MUX_TOKEN_ID"],
  mux_token_secret: ["MUX_TOKEN_SECRET"],
  smsportal_client_id: ["SMSPORTAL_CLIENT_ID"],
  smsportal_api_secret: ["SMSPORTAL_API_SECRET"],
  zapi_instance_id: ["ZAPI_INSTANCE_ID"],
  zapi_instance_token: ["ZAPI_INSTANCE_TOKEN"],
  zapi_client_token: ["ZAPI_CLIENT_TOKEN"],
  green_send_api_key: ["GREEN_SEND_API_KEY"],
};

export async function getSecureSetting(key: SecureKey): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("secure_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const stored = typeof data?.value === "string" ? data.value.trim() : "";
  if (stored) return stored;
  for (const name of FALLBACK_ENV[key]) {
    const env = process.env[name];
    if (env?.trim()) return env.trim();
  }
  return null;
}

export async function setSecureSetting(key: SecureKey, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await supabaseAdmin.from("secure_settings").delete().eq("key", key);
    return;
  }
  await supabaseAdmin
    .from("secure_settings")
    .upsert({ key, value: trimmed, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/** Safe preview for the admin UI — never returns the full secret. */
export function maskSecret(value: string | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 6)}••••${value.slice(-4)}`;
}
