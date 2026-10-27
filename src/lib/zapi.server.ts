import { getSecureSetting } from "./secure-settings.server";
import { normalizeSaPhone, isSaMobilePhone } from "./smsportal.server";

export interface ZApiStatusResult {
  configured: boolean;
  connected: boolean;
  smartphoneConnected?: boolean;
  phone?: string;
  error?: string;
}

export interface ZApiSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  destination?: string;
}

export interface ZApiQrResult {
  ok: boolean;
  qrCode?: string;
  error?: string;
}

export async function getZApiCredentials(): Promise<{
  instanceId: string | null;
  instanceToken: string | null;
  clientToken: string | null;
}> {
  const [instanceId, instanceToken, clientToken] = await Promise.all([
    getSecureSetting("zapi_instance_id"),
    getSecureSetting("zapi_instance_token"),
    getSecureSetting("zapi_client_token"),
  ]);

  return {
    instanceId: instanceId?.trim() || null,
    instanceToken: instanceToken?.trim() || null,
    clientToken: clientToken?.trim() || null,
  };
}

function getZApiBaseUrl(instanceId: string, instanceToken: string): string {
  return `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`;
}

function getZApiHeaders(clientToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (clientToken) {
    headers["Client-Token"] = clientToken;
  }
  return headers;
}

/**
 * Checks connection status of the WhatsApp instance on Z-API.
 */
export async function getZApiStatus(): Promise<ZApiStatusResult> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { configured: false, connected: false, error: "Z-API credentials not configured." };
    }

    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/status`, {
      method: "GET",
      headers: getZApiHeaders(clientToken),
    });

    if (!res.ok) {
      return {
        configured: true,
        connected: false,
        error: `Z-API returned status ${res.status}: ${res.statusText}`,
      };
    }

    const data = (await res.json()) as {
      connected?: boolean;
      smartphoneConnected?: boolean;
      phone?: string;
      error?: string;
    };

    let phone = data.phone;
    if (data.connected) {
      try {
        const devRes = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/device`, {
          method: "GET",
          headers: getZApiHeaders(clientToken),
        });
        if (devRes.ok) {
          const devData = (await devRes.json()) as { phone?: string; name?: string };
          if (devData.phone) phone = devData.phone;
        }
      } catch (_) {}
    }

    return {
      configured: true,
      connected: Boolean(data.connected),
      smartphoneConnected: Boolean(data.smartphoneConnected),
      phone,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : "Failed to connect to Z-API",
    };
  }
}

/**
 * Normalizes phone numbers for WhatsApp.
 * Supports South African local format (082... -> 2782...) and full international numbers.
 */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10 && digits.startsWith("0")) {
    return "27" + digits.slice(1);
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Retrieves the base64 QR Code image to scan on WhatsApp.
 */
export async function getZApiQrCode(): Promise<ZApiQrResult> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, error: "Z-API credentials not configured." };
    }

    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/qr-code/image`, {
      method: "GET",
      headers: getZApiHeaders(clientToken),
    });

    if (!res.ok) {
      return { ok: false, error: `Failed to fetch QR Code (${res.status})` };
    }

    const data = (await res.json()) as { value?: string; error?: string };
    if (!data.value) {
      return { ok: false, error: data.error || "No QR Code generated (instance might already be connected)." };
    }

    return { ok: true, qrCode: data.value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch QR Code" };
  }
}

/**
 * Sends a text message via Z-API WhatsApp.
 */
export async function sendZApiText(input: {
  phone: string;
  message: string;
  delayTyping?: number;
}): Promise<ZApiSendResult> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, error: "Z-API credentials not configured." };
    }

    const cleanDest = normalizeWhatsAppPhone(input.phone);
    if (!cleanDest) {
      return {
        ok: false,
        error: `Número inválido (${input.phone}). Digite um celular válido com DDI (ex: 27... ou 082...).`,
      };
    }

    const payload: Record<string, unknown> = {
      phone: cleanDest,
      message: input.message,
    };
    if (input.delayTyping && input.delayTyping > 0) {
      payload.delayTyping = input.delayTyping;
    }

    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/send-text`, {
      method: "POST",
      headers: getZApiHeaders(clientToken),
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      zaapId?: string;
      messageId?: string;
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        destination: cleanDest,
        error: data.error || data.message || `Z-API returned HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      destination: cleanDest,
      messageId: data.zaapId || data.messageId,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send WhatsApp message",
    };
  }
}

/**
 * Sends an audio file as if it was recorded live via WhatsApp (PTT mic wave).
 */
export async function sendZApiAudio(input: {
  phone: string;
  audioUrl: string;
}): Promise<ZApiSendResult> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, error: "Z-API credentials not configured." };
    }

    const cleanDest = normalizeSaPhone(input.phone);
    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/send-audio`, {
      method: "POST",
      headers: getZApiHeaders(clientToken),
      body: JSON.stringify({
        phone: cleanDest,
        audio: input.audioUrl,
      }),
    });

    const data = (await res.json()) as { zaapId?: string; messageId?: string; error?: string };
    if (!res.ok) {
      return { ok: false, destination: cleanDest, error: data.error || `HTTP ${res.status}` };
    }

    return { ok: true, destination: cleanDest, messageId: data.zaapId || data.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send WhatsApp audio" };
  }
}

/**
 * Sends a PDF document via Z-API WhatsApp.
 */
export async function sendZApiDocument(input: {
  phone: string;
  documentUrl: string;
  fileName: string;
  extension?: string;
}): Promise<ZApiSendResult> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, error: "Z-API credentials not configured." };
    }

    const cleanDest = normalizeSaPhone(input.phone);
    const ext = input.extension || "pdf";
    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/send-document/${ext}`, {
      method: "POST",
      headers: getZApiHeaders(clientToken),
      body: JSON.stringify({
        phone: cleanDest,
        document: input.documentUrl,
        fileName: input.fileName,
      }),
    });

    const data = (await res.json()) as { zaapId?: string; messageId?: string; error?: string };
    if (!res.ok) {
      return { ok: false, destination: cleanDest, error: data.error || `HTTP ${res.status}` };
    }

    return { ok: true, destination: cleanDest, messageId: data.zaapId || data.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send WhatsApp document" };
  }
}

/**
 * Restarts the WhatsApp instance connection on Z-API.
 */
export async function restartZApi(): Promise<{ ok: boolean; message?: string }> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, message: "Z-API credentials not configured." };
    }

    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/restart`, {
      method: "GET",
      headers: getZApiHeaders(clientToken),
    });

    return { ok: res.ok };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to restart Z-API" };
  }
}

/**
 * Disconnects the WhatsApp instance from Z-API (logout).
 */
export async function disconnectZApi(): Promise<{ ok: boolean; message?: string }> {
  try {
    const { instanceId, instanceToken, clientToken } = await getZApiCredentials();
    if (!instanceId || !instanceToken) {
      return { ok: false, message: "Z-API credentials not configured." };
    }

    const res = await fetch(`${getZApiBaseUrl(instanceId, instanceToken)}/disconnect`, {
      method: "GET",
      headers: getZApiHeaders(clientToken),
    });

    return { ok: res.ok };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to disconnect Z-API" };
  }
}
