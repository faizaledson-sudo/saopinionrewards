import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/fbpixel";
import { buildTargetUrl, detectInAppBrowser, triggerAndroidChromeIntent } from "@/lib/browser";
import { IosBrowserGuide } from "@/components/IosBrowserGuide";

export const Route = createFileRoute("/age-verification")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Age Verification — South Africa" },
      {
        name: "description",
        content: "Please confirm that you are 18 years of age or older to continue.",
      },
    ],
  }),
  component: AgeVerificationPage,
});

function AgeVerificationPage() {
  const [underAge, setUnderAge] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const handleConfirmAge = () => {
    sessionStorage.setItem("age_verified", "true");
    localStorage.setItem("age_verified", "true");
    trackEvent("AgeVerified", { status: true });

    const targetUrl = buildTargetUrl("/");
    const { isAndroid, isIOS, isIAB } = detectInAppBrowser();

    // 1. Android In-App Browser (Facebook/Instagram) -> Force open in Chrome
    if (isAndroid && isIAB) {
      triggerAndroidChromeIntent("/");
      return;
    }

    // 2. iOS In-App Browser (Facebook/Instagram) -> Show Safari/Chrome breakout guide
    if (isIOS && isIAB) {
      setShowIosGuide(true);
      return;
    }

    // 3. Regular browser -> Navigate directly preserving all parameters (fbclid, UTMs)
    window.location.href = targetUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-700 relative">
      {/* iOS In-App Browser Breakout Guide */}
      {showIosGuide && (
        <IosBrowserGuide
          targetUrl={buildTargetUrl("/")}
          onContinueAnyway={() => {
            window.location.href = buildTargetUrl("/");
          }}
        />
      )}
      {/* Clean Neutral Header */}
      <header className="w-full border-b border-slate-200/60 bg-white py-4 px-4 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5 font-display font-bold text-slate-800 text-sm sm:text-base tracking-tight">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="size-5" />
            </div>
            <span>Verification Portal</span>
          </div>
          <Badge className="border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1">
            🇿🇦 South Africa • 18+
          </Badge>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-9 shadow-xl">
          {underAge ? (
            /* Under 18 State - Completely Neutral */
            <div className="py-4 text-center space-y-4 animate-in fade-in duration-200">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/60">
                <AlertTriangle className="size-8" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Access Restricted
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Under South African digital regulations and terms of service, you must be at least 18 years old to access this service.
              </p>
              <div className="pt-3">
                <Button
                  variant="outline"
                  onClick={() => setUnderAge(false)}
                  className="w-full rounded-xl border-slate-200 py-3 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  I made a mistake, I am 18 or older
                </Button>
              </div>
            </div>
          ) : (
            /* Clean Age Verification Form - Neutral & Compliant */
            <div className="space-y-6">
              <div className="text-center space-y-2.5">
                <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 shadow-xs">
                  <ShieldCheck className="size-9" />
                </div>
                <Badge className="border-blue-200/80 bg-blue-50/80 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5">
                  <Sparkles className="size-3 mr-1 text-blue-600" /> Identity &amp; Age Gate
                </Badge>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Age Verification
                </h1>
                <p className="text-base font-bold text-blue-600">
                  Are you 18 years of age or older?
                </p>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Please confirm that you are at least 18 years old to continue to the website.
                </p>
              </div>

              {/* Neutral Checkpoints */}
              <div className="space-y-2.5 rounded-2xl bg-slate-50/90 border border-slate-100 p-4 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Official digital age verification</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Compliant with South African online standards</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Secure, private and verified access</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleConfirmAge}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-base rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <span>YES, I AM 18 OR OLDER</span>
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setUnderAge(true)}
                  className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs sm:text-sm font-medium py-2.5 rounded-xl"
                >
                  NO, I AM UNDER 18
                </Button>
              </div>

              {/* Security Footer */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="size-3 text-slate-400" />
                <span>South Africa • Age Verification Gateway</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Verification Gateway South Africa. All rights reserved.</p>
      </footer>
    </div>
  );
}
