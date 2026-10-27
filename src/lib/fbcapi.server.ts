import crypto from "node:crypto";
import { ParamBuilder } from "capi-param-builder-nodejs";
import { getSettings } from "./platform.server";

export type CapiUserData = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
};

export type CapiCustomData = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  num_items?: number;
  order_id?: string;
  status?: string | boolean;
  [key: string]: unknown;
};

export type CapiEventPayload = {
  event_name: string;
  event_id?: string;
  event_time?: number;
  event_source_url?: string;
  user_data?: CapiUserData;
  custom_data?: CapiCustomData;
  test_event_code?: string;
};

function sha256(val: string): string {
  return crypto.createHash("sha256").update(val.trim().toLowerCase()).digest("hex");
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 10) {
    return "27" + digits.slice(1);
  } else if (!digits.startsWith("27") && digits.length === 9) {
    return "27" + digits;
  }
  return digits;
}

export interface PixelCapiConfig {
  pixelId: string;
  token: string;
}

/**
 * Parses pixel IDs and matching CAPI tokens from settings.
 * Supports:
 * 1. Plain pixel IDs + a single global access token
 * 2. PIXEL_ID:TOKEN or PIXEL_ID|TOKEN format in either facebook_pixel_ids or facebook_access_token
 * 3. Mixed configurations where some pixels have custom tokens and others fall back to the global token
 */
export function parsePixelCapiConfigs(
  rawPixelIds: string | null | undefined,
  rawTokens: string | null | undefined,
): PixelCapiConfig[] {
  const tokenMap = new Map<string, string>();
  let defaultToken = "";

  // 1. Parse rawTokens
  if (rawTokens) {
    const lines = String(rawTokens).split(/[\r\n]+/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const items = line.split(/[,\s]+/).filter(Boolean);
      for (const item of items) {
        if (item.includes(":") || item.includes("|")) {
          const delimiter = item.includes(":") ? ":" : "|";
          const parts = item.split(delimiter);
          const pId = parts[0].trim();
          const tok = parts.slice(1).join(delimiter).trim();
          if (/^\d{6,20}$/.test(pId) && tok) {
            tokenMap.set(pId, tok);
          }
        } else if (!defaultToken) {
          defaultToken = item;
        }
      }
    }
  }

  if (!defaultToken && process.env.FACEBOOK_ACCESS_TOKEN) {
    defaultToken = process.env.FACEBOOK_ACCESS_TOKEN;
  }

  // 2. Parse rawPixelIds
  const configs: PixelCapiConfig[] = [];
  const seenPixels = new Set<string>();

  if (rawPixelIds) {
    const lines = String(rawPixelIds).split(/[\r\n]+/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const items = line.split(/[,\s]+/).filter(Boolean);
      for (const item of items) {
        let pixelId = item;
        let specificToken: string | undefined;

        if (item.includes(":") || item.includes("|")) {
          const delimiter = item.includes(":") ? ":" : "|";
          const parts = item.split(delimiter);
          pixelId = parts[0].trim();
          specificToken = parts.slice(1).join(delimiter).trim();
        }

        if (/^\d{6,20}$/.test(pixelId)) {
          if (seenPixels.has(pixelId)) continue;
          seenPixels.add(pixelId);

          const token = specificToken || tokenMap.get(pixelId) || defaultToken;
          configs.push({ pixelId, token });
        }
      }
    }
  }

  // Also include any pixels declared only in tokenMap that weren't in rawPixelIds
  for (const [pId, tok] of tokenMap.entries()) {
    if (!seenPixels.has(pId)) {
      seenPixels.add(pId);
      configs.push({ pixelId: pId, token: tok });
    }
  }

  return configs;
}

/**
 * Sends a server-side event to Meta (Facebook) Conversions API (CAPI).
 * Deduplicates with browser pixel when event_name and event_id match.
 * Enhanced with Meta Parameter Builder for optimal Event Match Quality (EMQ).
 */
export async function sendCapiEvent(payload: CapiEventPayload): Promise<{
  ok: boolean;
  eventsReceived?: number;
  error?: string;
}> {
  try {
    const settings = await getSettings();
    const pixelConfigs = parsePixelCapiConfigs(
      settings.facebook_pixel_ids,
      settings.facebook_access_token,
    );

    if (!pixelConfigs.length) {
      return { ok: false, error: "No valid Meta Pixel ID configured." };
    }

    const configsWithToken = pixelConfigs.filter((c) => Boolean(c.token));
    if (!configsWithToken.length) {
      return { ok: false, error: "Meta Conversions API Access Token not configured for any pixel." };
    }

    // Process parameters through Meta Parameter Builder SDK
    const pb = new ParamBuilder();
    const cookies: Record<string, string> = {};
    if (payload.user_data?.fbp) cookies._fbp = payload.user_data.fbp;
    if (payload.user_data?.fbc) cookies._fbc = payload.user_data.fbc;

    let host = "kenya-survey-rewards.vercel.app";
    const queries: Record<string, string> = {};
    if (payload.event_source_url) {
      try {
        const u = new URL(payload.event_source_url);
        host = u.hostname || host;
        u.searchParams.forEach((v, k) => {
          queries[k] = v;
        });
      } catch {}
    }

    try {
      pb.processRequest(
        host,
        Object.keys(queries).length ? queries : null,
        Object.keys(cookies).length ? cookies : null,
        null,
        payload.user_data?.clientIp || null,
        null,
      );
    } catch {}

    const effectiveFbc = pb.getFbc() || payload.user_data?.fbc || null;
    const effectiveFbp = pb.getFbp() || payload.user_data?.fbp || null;
    const effectiveClientIp = pb.getClientIpAddress() || payload.user_data?.clientIp || null;

    const user_data: Record<string, unknown> = {};

    if (payload.user_data?.email) {
      const val = payload.user_data.email.trim();
      const hashed = pb.getNormalizedAndHashedPII(val, "email") || sha256(val);
      user_data.em = [hashed];
    }
    if (payload.user_data?.phone) {
      const e164 = toE164(payload.user_data.phone);
      if (e164) {
        const hashed = pb.getNormalizedAndHashedPII(e164, "phone") || sha256(e164);
        user_data.ph = [hashed];
      }
    }
    if (payload.user_data?.firstName) {
      const val = payload.user_data.firstName.trim();
      const hashed = pb.getNormalizedAndHashedPII(val, "first_name") || sha256(val);
      user_data.fn = [hashed];
    }
    if (payload.user_data?.lastName) {
      const val = payload.user_data.lastName.trim();
      const hashed = pb.getNormalizedAndHashedPII(val, "last_name") || sha256(val);
      user_data.ln = [hashed];
    }
    if (payload.user_data?.externalId) {
      const val = String(payload.user_data.externalId).trim();
      const hashed = pb.getNormalizedAndHashedPII(val, "external_id") || sha256(val);
      user_data.external_id = [hashed];
    }
    if (effectiveClientIp) {
      user_data.client_ip_address = effectiveClientIp;
    }
    if (payload.user_data?.clientUserAgent) {
      user_data.client_user_agent = payload.user_data.clientUserAgent;
    }
    if (effectiveFbp) {
      user_data.fbp = effectiveFbp;
    }
    if (effectiveFbc) {
      user_data.fbc = effectiveFbc;
    }

    const eventTime = payload.event_time ?? Math.floor(Date.now() / 1000);
    const eventSourceUrl =
      payload.event_source_url ?? (process.env.APP_URL || "https://sa-opinion-rewards.vercel.app");

    const custom_data: Record<string, unknown> = {
      currency: "ZAR",
      ...(payload.custom_data ?? {}),
    };

    const eventPayload: Record<string, unknown> = {
      event_name: payload.event_name,
      event_time: eventTime,
      action_source: "website",
      event_source_url: eventSourceUrl,
      user_data,
      custom_data,
    };

    if (payload.event_id) {
      eventPayload.event_id = payload.event_id;
    }

    const testEventCode =
      payload.test_event_code || settings.facebook_test_event_code || undefined;

    // Send to each configured pixel ID with its corresponding token
    let totalReceived = 0;
    for (const { pixelId, token } of configsWithToken) {
      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
      const requestBody: Record<string, unknown> = {
        data: [eventPayload],
      };
      if (testEventCode) {
        requestBody.test_event_code = testEventCode;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as {
        events_received?: number;
        error?: { message: string; fbtrace_id?: string };
      };

      if (data.error) {
        console.error(`[Meta CAPI] Error for pixel ${pixelId}:`, data.error.message);
      } else {
        totalReceived += data.events_received ?? 1;
        console.log(`[Meta CAPI] Event "${payload.event_name}" delivered to pixel ${pixelId} (event_id: ${payload.event_id ?? "none"})`);
      }
    }

    return { ok: totalReceived > 0, eventsReceived: totalReceived };
  } catch (error) {
    console.error("[Meta CAPI] Network error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
