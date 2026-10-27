import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { getPublicConfig } from "@/lib/account.functions";
import { initPixels, parsePixelIds, syncMetaCookies, trackPageView } from "@/lib/fbpixel";

/** Loads every admin-configured Meta pixel and tracks page views on navigation. */
export function FacebookPixel() {
  const { data } = useQuery({
    queryKey: ["public-config"],
    queryFn: () => getPublicConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Early capture of Meta Click ID (fbc) and Browser ID (fbp) on landing and route change
  useEffect(() => {
    void syncMetaCookies();
  }, [pathname]);

  const raw = data?.settings?.facebook_pixel_ids || "896744080027646";

  useEffect(() => {
    const parsed = parsePixelIds(raw);
    const ids = parsed.length ? parsed : ["896744080027646"];
    initPixels(ids);
    trackPageView();
  }, [raw, pathname]);

  return null;
}
