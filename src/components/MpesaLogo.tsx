/** South Africa Instant Payment Badge (Instant EFT, Capitec, Voucher). */
export function MpesaLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 select-none ${className}`}
      title="Instant EFT / Capitec / Card"
    >
      <span className="flex size-1.5 rounded-full bg-emerald-500" />
      <span className="tracking-tight font-bold">Instant EFT • Capitec</span>
    </span>
  );
}

export const SaPaymentBadge = MpesaLogo;
