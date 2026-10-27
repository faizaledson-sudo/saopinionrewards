import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  getRequestIP,
} from "@tanstack/react-start/server";

export type ClientCapiInput = {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  user_data?: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fbp?: string | null;
    fbc?: string | null;
  };
  custom_data?: Record<string, unknown>;
};

/**
 * Endpoint for client-side events to also be sent via Conversions API (CAPI)
 * with automatic extraction of client IP, User-Agent, and cookies from the request.
 */
export const sendClientCapiEvent = createServerFn({ method: "POST" })
  .validator((input: ClientCapiInput) => input)
  .handler(async ({ data }) => {
    try {
      const { sendCapiEvent } = await import("./fbcapi.server");

      // Extract client IP and user-agent from server request
      let clientIp: string | null = null;
      try {
        clientIp = getRequestIP({ xForwardedFor: true }) || null;
      } catch {
        // Fallback if IP helper not available
      }

      let clientUserAgent: string | null = null;
      try {
        clientUserAgent = getRequestHeader("user-agent") || null;
      } catch {
        // Fallback
      }

      // Extract fbp and fbc cookies if available
      let fbp = data.user_data?.fbp || null;
      let fbc = data.user_data?.fbc || null;
      try {
        if (!fbp) fbp = getCookie("_fbp") || null;
        if (!fbc) fbc = getCookie("_fbc") || null;
      } catch {
        // Fallback
      }

      return await sendCapiEvent({
        event_name: data.event_name,
        event_id: data.event_id,
        event_source_url: data.event_source_url,
        user_data: {
          ...data.user_data,
          clientIp,
          clientUserAgent,
          fbp,
          fbc,
        },
        custom_data: data.custom_data,
      });
    } catch (err) {
      console.error("[CAPI] sendClientCapiEvent error:", err);
      return { ok: false, error: err instanceof Error ? err.message : "CAPI error" };
    }
  });
