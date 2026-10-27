export type InAppBrowserInfo = {
  isIAB: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isFB: boolean;
  isIG: boolean;
};

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === "undefined") {
    return { isIAB: false, isAndroid: false, isIOS: false, isFB: false, isIG: false };
  }
  const ua = navigator.userAgent || navigator.vendor || "";
  const isFB = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isIG = /Instagram/i.test(ua);
  const isIAB = isFB || isIG;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return { isIAB, isAndroid, isIOS, isFB, isIG };
}

/**
 * Builds the target landing page URL while preserving 100% of the query parameters
 * (e.g. fbclid, utms, etc.) and adding age_ok=1 for seamless cross-browser verification.
 */
export function buildTargetUrl(path = "/"): string {
  if (typeof window === "undefined") return path;
  const url = new URL(window.location.href);
  url.pathname = path;
  url.searchParams.set("age_ok", "1");
  return url.toString();
}

/**
 * Attempts to escape the in-app browser on Android via Chrome Intent.
 * Returns true if an intent launch was triggered, or false otherwise.
 */
export function triggerAndroidChromeIntent(path = "/"): boolean {
  if (typeof window === "undefined") return false;
  const { isAndroid, isIAB } = detectInAppBrowser();
  if (!isAndroid || !isIAB) return false;

  const target = buildTargetUrl(path);
  const cleanUrl = target.replace(/^https?:\/\//, "");
  const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target)};end`;

  window.location.href = intentUrl;

  // Fallback in case Chrome intent is not handled
  setTimeout(() => {
    window.location.href = target;
  }, 2000);

  return true;
}
