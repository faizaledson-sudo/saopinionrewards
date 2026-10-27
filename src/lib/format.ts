export const SYNTHETIC_EMAIL_DOMAIN = "panelist.tiktokrewardcoin.com";

/** Normalizes any South African phone input to the 27XXXXXXXXX form. */
export function normalizePhone(input: string): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("27")) local = local.slice(2);
  else if (local.startsWith("0")) local = local.slice(1);

  // South African numbers: 9 digits after 0 or 27 (usually 6, 7, or 8)
  if (!/^[1-9]\d{8}$/.test(local)) return null;
  return `27${local}`;
}

export function phoneToEmail(phone: string): string {
  return `${phone}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const p = phone.replace(/\D/g, "");
  if (p.length === 11 && p.startsWith("27")) {
    return `+27 ${p.slice(2, 4)} ${p.slice(4, 7)} ${p.slice(7)}`;
  }
  if (p.length === 10 && p.startsWith("0")) {
    return `+27 ${p.slice(1, 3)} ${p.slice(3, 6)} ${p.slice(6)}`;
  }
  return phone;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const p = phone.replace(/\D/g, "");
  if (p.length < 6) return "•••";
  return `${p.slice(0, 5)}•••${p.slice(-2)}`;
}

const zar = new Intl.NumberFormat("en-ZA", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatZar(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(value)) return "R 0";
  return `R ${zar.format(Math.round(value))}`;
}

export function formatZarShort(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return zar.format(Math.round(Number.isFinite(value) ? value : 0));
}

export const formatKes = formatZar;
export const formatKesShort = formatZarShort;

export const TIER_LABELS: Record<string, string> = {
  regular: "Regular",
  vip1: "VIP 1",
  vip2: "VIP 2",
  vip3: "VIP 3",
};

export const TIER_ORDER = ["regular", "vip1", "vip2", "vip3"] as const;

export function tierRank(tier: string): number {
  const index = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  return index < 0 ? 0 : index;
}

export function levelFromXp(xp: number): { level: number; current: number; needed: number } {
  const level = Math.max(1, Math.floor(xp / 100) + 1);
  const current = xp % 100;
  return { level, current, needed: 100 };
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export const SA_BANKS = [
  { name: "Capitec Bank", code: "470010" },
  { name: "First National Bank (FNB)", code: "250655" },
  { name: "Standard Bank", code: "051001" },
  { name: "ABSA Bank", code: "632005" },
  { name: "Nedbank", code: "198765" },
  { name: "TymeBank", code: "678910" },
  { name: "Discovery Bank", code: "679000" },
  { name: "African Bank", code: "430000" },
  { name: "Investec Bank", code: "580105" },
  { name: "Bidvest Bank", code: "462005" },
  { name: "Other South African Bank", code: "" },
] as const;
