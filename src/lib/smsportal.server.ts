import { getSecureSetting } from "./secure-settings.server";

export interface SmsSendResult {
  ok: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  destination?: string;
}

export interface SmsBalanceResult {
  ok: boolean;
  balance?: number;
  error?: string;
}

/**
 * Normalizes any South African cell number to international E.164 without '+'
 * e.g. 082 123 4567 -> 27821234567
 * e.g. +27 82 123 4567 -> 27821234567
 */
export function normalizeSaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `27${digits.slice(1)}`;
  }
  if (digits.startsWith("27") && digits.length === 11) {
    return digits;
  }
  return digits;
}

/**
 * Checks if a phone number is a valid South African mobile number (Vodacom, MTN, Cell C, Telkom Mobile).
 * Landlines (01x, 02x, 03x, 04x, 05x) and foreign numbers cannot receive SMS and will fail with UNDELIV.
 */
export function isSaMobilePhone(phone: string): boolean {
  if (!phone) return false;
  const norm = normalizeSaPhone(phone);
  // SA mobile numbers always start with 27 followed by 6, 7, or 8 and 8 digits (11 digits total)
  return /^27[678][0-9]{8}$/.test(norm);
}

async function getAuthHeader(): Promise<string | null> {
  const clientId = await getSecureSetting("smsportal_client_id");
  const secret = await getSecureSetting("smsportal_api_secret");
  if (!clientId || !secret) return null;
  const token = Buffer.from(`${clientId.trim()}:${secret.trim()}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Fetches remaining SMSPortal balance (credit count).
 */
export async function getSmsBalance(): Promise<SmsBalanceResult> {
  try {
    const auth = await getAuthHeader();
    if (!auth) {
      return { ok: false, error: "SMSPortal credentials not configured." };
    }

    const res = await fetch("https://rest.smsportal.com/v3/Balance", {
      headers: {
        accept: "application/json",
        Authorization: auth,
      },
    });

    if (!res.ok) {
      return { ok: false, error: `SMSPortal returned status ${res.status}` };
    }

    const json = (await res.json()) as { balance?: number; errors?: unknown };
    return { ok: true, balance: Number(json.balance ?? 0) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch balance" };
  }
}

/**
 * Dispatches an SMS via SMSPortal REST v3 API.
 */
export async function sendSms(input: {
  destination: string;
  content: string;
  testMode?: boolean;
}): Promise<SmsSendResult> {
  try {
    const auth = await getAuthHeader();
    if (!auth) {
      return { ok: false, error: "SMSPortal credentials not configured." };
    }

    const cleanDest = normalizeSaPhone(input.destination);
    if (!cleanDest || !isSaMobilePhone(cleanDest)) {
      return {
        ok: false,
        error: `Skipping non-mobile number (${input.destination}). Landlines (01x-05x) and foreign numbers cannot receive SMS.`,
      };
    }

    const body = {
      messages: [
        {
          content: input.content,
          destination: cleanDest,
        },
      ],
      ...(input.testMode ? { sendOptions: { testMode: true } } : {}),
    };

    const res = await fetch("https://rest.smsportal.com/v3/BulkMessages", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      console.error("SMSPortal send failed:", res.status, json);
      const errMsg = Array.isArray(json.errors) && json.errors.length
        ? String(json.errors[0])
        : typeof json.message === "string"
        ? json.message
        : `SMSPortal error HTTP ${res.status}`;
      return { ok: false, error: errMsg, destination: cleanDest };
    }

    const eventId = typeof json.eventId === "string" ? json.eventId : undefined;
    const cost = typeof json.cost === "number" ? json.cost : undefined;

    return {
      ok: true,
      messageId: eventId,
      cost,
      destination: cleanDest,
    };
  } catch (err) {
    console.error("SMS dispatch error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to dispatch SMS",
    };
  }
}
