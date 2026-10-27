import { useState } from "react";
import { Copy, Check, Compass, MoreHorizontal, ArrowUpRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

type IosBrowserGuideProps = {
  targetUrl: string;
  onContinueAnyway: () => void;
};

export function IosBrowserGuide({ targetUrl, onContinueAnyway }: IosBrowserGuideProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success("Link copied! Paste into Safari or Chrome.");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.info("Please copy the URL from your address bar.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/85 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Floating Pointer Arrow pointing to the top-right `···` menu */}
      <div className="flex justify-end pr-2 pt-2 animate-bounce">
        <div className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-white shadow-xl">
          <span className="text-xs font-bold uppercase tracking-wider">Tap here</span>
          <MoreHorizontal className="size-5" />
          <ArrowUpRight className="size-5" />
        </div>
      </div>

      {/* Centered Guide Card */}
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 ring-8 ring-blue-500/10">
            <Compass className="size-8" />
          </div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            Open in Safari or Chrome
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            For security, full compatibility, and seamless access, please open this link in your standard browser.
          </p>
        </div>

        {/* 2-Step Instructions */}
        <div className="space-y-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-xs">
          <div className="flex items-start gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              1
            </span>
            <div className="text-slate-200">
              Tap the <strong className="text-white font-semibold">···</strong> (or <Share2 className="inline size-3.5 mx-0.5 text-blue-400" /> Share) icon at the top corner of your screen.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              2
            </span>
            <div className="text-slate-200">
              Select <strong className="text-white font-semibold">&quot;Open in Safari&quot;</strong> or <strong className="text-white font-semibold">&quot;Open in Default Browser&quot;</strong>.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2"
          >
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            <span>{copied ? "Link Copied!" : "Copy Link to Open in Browser"}</span>
          </Button>

          <Button
            onClick={onContinueAnyway}
            variant="ghost"
            className="w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-xl py-2 text-xs font-normal"
          >
            Continue inside this app anyway
          </Button>
        </div>
      </div>

      {/* Bottom spacer for centering */}
      <div className="h-6" />
    </div>
  );
}
