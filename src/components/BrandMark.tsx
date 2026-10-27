import logo from "@/assets/google-opinion-rewards-logo.png";
import { cn } from "@/lib/utils";

/** Google Opinion Rewards logo components used across the application. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-white px-2.5 py-1 shadow-sm border border-border/40",
        className,
      )}
    >
      <img
        src={logo}
        alt="Google Opinion Rewards"
        className="h-5 w-auto max-w-[180px] object-contain"
      />
    </span>
  );
}

export function BrandLogo({
  className,
  containerClassName,
}: {
  className?: string;
  containerClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-sm border border-border/30",
        containerClassName,
      )}
    >
      <img
        src={logo}
        alt="Google Opinion Rewards"
        className={cn("h-6 w-auto max-w-[200px] object-contain", className)}
      />
    </span>
  );
}

/** OpinionPanel South Africa logo matching sa-opinion-rewards.vercel.app */
export function OpinionPanelLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-xs">
        OP
      </div>
      <div className="flex flex-col text-left">
        <span className="font-display font-extrabold text-sm sm:text-base leading-none text-slate-900 tracking-tight">
          Opinion<span className="text-blue-600">Panel</span>
        </span>
        <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
          South Africa • Consumer Research
        </span>
      </div>
    </div>
  );
}

