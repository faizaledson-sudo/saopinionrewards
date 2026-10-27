/**
 * Facebook (Meta) Pixel helper — supports multiple pixel IDs configured by the admin.
 * All calls are safe on the server and no-ops until at least one pixel is configured.
 */

import { sendClientCapiEvent } from "./capi.functions";

type FbqFn = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  callMethod?: (...args: unknown[]) => void;
  push?: unknown;
};

const STANDARD_EVENTS = new Set([
  "PageView",
  "Purchase",
  "Lead",
  "CompleteRegistration",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Subscribe",
  "StartTrial",
  "Contact",
  "SubmitApplication",
  "ViewContent",
  "Search",
]);

export const DEFAULT_PIXEL_ID = "896744080027646";
const initialized = new Set<string>([DEFAULT_PIXEL_ID]);

/** Accepts comma / space / newline separated pixel IDs, or PIXEL_ID:TOKEN pairs. */
export function parsePixelIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      String(raw)
        .split(/[\r\n]+/)
        .flatMap((line) => line.trim().split(/[\s,;]+/))
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) return "";
          const delimiter = trimmed.includes(":") ? ":" : trimmed.includes("|") ? "|" : null;
          const id = delimiter ? trimmed.split(delimiter)[0].trim() : trimmed;
          return id;
        })
        .filter((value) => /^\d{6,20}$/.test(value)),
    ),
  );
}

function getFbq(): FbqFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { fbq?: FbqFn; _fbq?: FbqFn };
  if (w.fbq) return w.fbq;

  const fbq: FbqFn = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else (fbq.queue ??= []).push(args);
  } as FbqFn;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  w.fbq = fbq;
  w._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  return fbq;
}

const eventQueue: Array<{ name: string; params?: Record<string, unknown> }> = [];

/** Initialises every configured pixel exactly once. */
export function initPixels(ids: string[]): void {
  const fbq = getFbq();
  if (!fbq) return;
  for (const id of ids) {
    if (initialized.has(id)) continue;
    initialized.add(id);
    fbq("init", id);
  }

  // Flush queued events once pixels are initialized
  while (eventQueue.length > 0) {
    const item = eventQueue.shift();
    if (item) {
      const method = STANDARD_EVENTS.has(item.name) ? "track" : "trackCustom";
      if (item.params) fbq(method, item.name, item.params);
      else fbq(method, item.name);
    }
  }
}

export function hasPixels(): boolean {
  return initialized.size > 0;
}

function setCookieFallback(name: string, value: string, days = 90): void {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
    const hostname = window.location.hostname;
    const isIp = /^[\d.]+$|^[0-9a-fA-F:]+$/.test(hostname);
    const domainPart = !isIp && hostname.includes(".") ? `; domain=.${hostname.replace(/^www\./, "")}` : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${domainPart}`;
  } catch {}
}

/** Synchronizes and persists Meta fbc (Click ID) and fbp (Browser ID) early using Meta Parameter Builder */
export async function syncMetaCookies(url?: string): Promise<{ fbp?: string; fbc?: string }> {
  if (typeof window === "undefined") return {};

  const currentUrl = url || window.location.href;
  let fbc: string | undefined;
  let fbp: string | undefined;

  // 1. Try official Meta Client Parameter Builder SDK
  try {
    const { processAndCollectParams, getFbc, getFbp } = await import("meta-capi-param-builder-clientjs");
    const params = processAndCollectParams(currentUrl);
    fbc = params?._fbc || getFbc() || undefined;
    fbp = params?._fbp || getFbp() || undefined;
  } catch {
    // Parameter builder client fallback
  }

  // 2. Fallback: Parse fbclid directly if fbc not generated
  if (!fbc) {
    try {
      const urlObj = new URL(currentUrl, window.location.origin);
      const fbclid = urlObj.searchParams.get("fbclid");
      if (fbclid) {
        // Standard Meta Click ID format: fb.${subdomainIndex}.${creationTime}.${fbclid}
        fbc = `fb.1.${Date.now()}.${fbclid}`;
        setCookieFallback("_fbc", fbc);
      }
    } catch {}
  }

  // 3. Fallback: Generate fbp if missing
  if (!fbp) {
    const existingCookie = document.cookie.match(/(^|;\s*)_fbp=([^;]+)/)?.[2];
    if (existingCookie) {
      fbp = decodeURIComponent(existingCookie);
    } else {
      const randomId = Math.floor(Math.random() * 8999999999 + 1000000000);
      fbp = `fb.1.${Date.now()}.${randomId}`;
      setCookieFallback("_fbp", fbp);
    }
  }

  // Backup to localStorage to survive redirects and cross-subdomain hops
  try {
    if (fbc) window.localStorage.setItem("fb_fbc", fbc);
    if (fbp) window.localStorage.setItem("fb_fbp", fbp);
  } catch {}

  // 4. Capture and persist UTMs & Click IDs matching Ghost Pay / Paystack ZAR API specification
  try {
    const urlObj = new URL(currentUrl, window.location.origin);
    const search = urlObj.searchParams;

    const utmSource = search.get("utm_source") || search.get("source");
    const utmMedium = search.get("utm_medium") || search.get("medium");
    const utmCampaign = search.get("utm_campaign") || search.get("campaign");
    const utmContent = search.get("utm_content") || search.get("content");
    const utmTerm = search.get("utm_term") || search.get("term");

    const fbclid = search.get("fbclid");
    const gclid = search.get("gclid");

    let existingAttribution: {
      utm?: Record<string, string>;
      clickIds?: Record<string, string>;
      fbp?: string;
      fbc?: string;
    } = {};

    try {
      const stored = window.localStorage.getItem("app_attribution");
      if (stored) existingAttribution = JSON.parse(stored);
    } catch {}

    const newUtm = {
      ...(existingAttribution.utm || {}),
      ...(utmSource ? { source: utmSource } : {}),
      ...(utmMedium ? { medium: utmMedium } : {}),
      ...(utmCampaign ? { campaign: utmCampaign } : {}),
      ...(utmContent ? { content: utmContent } : {}),
      ...(utmTerm ? { term: utmTerm } : {}),
    };

    const newClickIds = {
      ...(existingAttribution.clickIds || {}),
      ...(fbclid ? { fbclid } : {}),
      ...(gclid ? { gclid } : {}),
    };

    const mergedAttribution = {
      utm: Object.keys(newUtm).length ? newUtm : undefined,
      clickIds: Object.keys(newClickIds).length ? newClickIds : undefined,
      fbp: fbp || existingAttribution.fbp,
      fbc: fbc || existingAttribution.fbc,
    };

    window.localStorage.setItem("app_attribution", JSON.stringify(mergedAttribution));
    if (mergedAttribution.utm) {
      setCookieFallback("app_utm", encodeURIComponent(JSON.stringify(mergedAttribution.utm)));
    }
    if (mergedAttribution.clickIds) {
      setCookieFallback("app_click_ids", encodeURIComponent(JSON.stringify(mergedAttribution.clickIds)));
    }
  } catch {}

  return { fbp, fbc };
}

export function getStoredAttribution(): {
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  clickIds?: { fbclid?: string; gclid?: string };
  fbp?: string;
  fbc?: string;
} {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("app_attribution");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function getBrowserCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};

  let fbp = document.cookie.match(/(^|;\s*)_fbp=([^;]+)/)?.[2];
  let fbc = document.cookie.match(/(^|;\s*)_fbc=([^;]+)/)?.[2];

  // Fallback to localStorage if cookie was cleared
  if (!fbc) {
    try {
      const storedFbc = window.localStorage.getItem("fb_fbc");
      if (storedFbc) {
        fbc = storedFbc;
        setCookieFallback("_fbc", storedFbc);
      }
    } catch {}
  }

  if (!fbp) {
    try {
      const storedFbp = window.localStorage.getItem("fb_fbp");
      if (storedFbp) {
        fbp = storedFbp;
        setCookieFallback("_fbp", storedFbp);
      }
    } catch {}
  }

  // If still missing fbc, check current search params
  if (!fbc && typeof window !== "undefined") {
    try {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) {
        const newFbc = `fb.1.${Date.now()}.${fbclid}`;
        setCookieFallback("_fbc", newFbc);
        try { window.localStorage.setItem("fb_fbc", newFbc); } catch {}
        fbc = newFbc;
      }
    } catch {}
  }

  // If still missing fbp, generate now
  if (!fbp && typeof window !== "undefined") {
    const randomId = Math.floor(Math.random() * 8999999999 + 1000000000);
    const newFbp = `fb.1.${Date.now()}.${randomId}`;
    setCookieFallback("_fbp", newFbp);
    try { window.localStorage.setItem("fb_fbp", newFbp); } catch {}
    fbp = newFbp;
  }

  return {
    fbp: fbp ? decodeURIComponent(fbp) : undefined,
    fbc: fbc ? decodeURIComponent(fbc) : undefined,
  };
}

/** Tracks a standard or custom event across all initialised pixels and sends to CAPI. */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const eventId =
    (params?.eventID as string) ||
    (params?.event_id as string) ||
    `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Forward event to server-side Conversions API (CAPI) asynchronously
  // Note: Purchase CAPI is handled strictly and authoritatively on the backend by settleCharge to prevent duplicate conversions
  if (name !== "Purchase") {
    try {
      const { fbp, fbc } = getBrowserCookies();
      void sendClientCapiEvent({
        data: {
          event_name: name,
          event_id: eventId,
          event_source_url: window.location.href,
          user_data: { fbp, fbc },
          custom_data: params,
        },
      }).catch(() => {});
    } catch {
      /* ignore client CAPI failure */
    }
  }

  if (!initialized.size) {
    // Buffer events triggered before pixels are fully initialized
    eventQueue.push({ name, params: { ...params, eventID: eventId } });
    return;
  }

  const fbq = getFbq();
  if (!fbq) return;

  const method = STANDARD_EVENTS.has(name) ? "track" : "trackCustom";
  const eventOptions = { eventID: eventId };

  if (params) fbq(method, name, params, eventOptions);
  else fbq(method, name, {}, eventOptions);
}

export function trackPageView(): void {
  trackEvent("PageView");
}

const DEDUPE_KEY = "sp_fb_tracked";

function readDeduped(): string[] {
  try {
    const raw = window.localStorage.getItem(DEDUPE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Fires an event only once per key (e.g. a charge id), surviving reloads. */
export function trackOnce(key: string, name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const seen = readDeduped();
  if (seen.includes(key)) return;
  try {
    window.localStorage.setItem(DEDUPE_KEY, JSON.stringify([...seen.slice(-200), key]));
  } catch {
    /* storage unavailable — still track */
  }
  trackEvent(name, params);
}

export function trackPurchase(
  _key: string,
  _value: number,
  _params?: Record<string, unknown>,
): void {
  // Ghost Pay Specification (Section 6):
  // "The simplest approach is to let the Ghost Pay platform emit events and not add another Purchase on the integrator page. Do not fire Purchase on upsells/downsells."
  // Purchase conversions are handled 100% by Ghost Pay (ghopay.app) checkout.
}
