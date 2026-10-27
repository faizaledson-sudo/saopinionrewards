/**
 * Synthetic social-proof data for gamification: weekly rankings and live win
 * notifications. Values are generated deterministically from a seed so the
 * server and client render the same thing, then rotated on a timer.
 */

const FIRST_NAMES = [
  "Sipho", "Lerato", "Pieter", "Thabo", "Naledi", "Bongani", "Johan", "Zanele",
  "Keanu", "Anika", "Sibusiso", "Kagiso", "Tebogo", "Nomvula", "Francois", "Jaco",
  "Dumi", "Brandon", "Lindiwe", "Bheki", "Willem", "Mandla", "Ayanda", "Tshepo",
  "Kgomotso", "Simphiwe", "Christo", "Mpho", "Precious", "Kabelo", "Themba",
  "Thandiwe", "Charmaine", "Hendrik", "Dineo", "Lethabo", "Charl", "Busisiwe",
  "Garth", "Nolwazi", "Vusi", "Melanie", "Khaya", "Refilwe", "Shaun", "Zodwa",
  "Ruan", "Sindi", "Lwandle", "Katlego", "Eben", "Sibongile", "Nico", "Nonhlanhla",
];

const LAST_INITIALS = [
  "N.", "M.", "D.", "K.", "S.", "B.", "V.", "Z.", "P.", "R.", "T.", "L.", "J.",
];

const TOWNS = [
  "Johannesburg", "Cape Town", "Durban", "Pretoria", "Soweto", "Sandton",
  "Centurion", "Gqeberha", "Bloemfontein", "Polokwane", "Nelspruit", "Kimberley",
  "East London", "Pietermaritzburg", "George", "Midrand", "Roodepoort", "Boksburg",
];

const TIERS = ["vip3", "vip3", "vip2", "vip2", "vip1", "regular"] as const;

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type RankRow = {
  rank: number;
  name: string;
  town: string;
  tier: string;
  weeklyKes: number;
  streak: number;
  surveys: number;
  isMe?: boolean;
};

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)] as T;
}

function nameFrom(random: () => number): string {
  return `${pick(FIRST_NAMES, random)} ${pick(LAST_INITIALS, random)}`;
}

/** ISO-ish week key used to keep the "week" of the ranking stable. */
export function weekKey(date = new Date()): string {
  const d = new Date(date);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * 25 panelists earning between 100,000 and 200,000 KSh this week.
 * `rotation` changes the names/values so the board feels alive.
 */
export function weeklyRanks(rotation = 0, seedKey = weekKey()): RankRow[] {
  const random = rng(hash(`${seedKey}:${rotation}`));
  const rows: RankRow[] = [];
  const used = new Set<string>();

  // Descending amounts from ~R 8,500 down to ~R 2,500 with natural jitter.
  let amount = 8_200 + Math.floor(random() * 600);

  for (let i = 0; i < 25; i += 1) {
    let name = nameFrom(random);
    let guard = 0;
    while (used.has(name) && guard < 25) {
      name = nameFrom(random);
      guard += 1;
    }
    used.add(name);

    const step = 180 + Math.floor(random() * 120);
    amount = Math.max(2_500, amount - step);
    const weeklyKes = Math.round((amount + random() * 40) / 10) * 10;

    rows.push({
      rank: i + 1,
      name,
      town: pick(TOWNS, random),
      tier: pick(TIERS, random),
      weeklyKes,
      streak: 3 + Math.floor(random() * 26),
      surveys: 18 + Math.floor(random() * 30),
    });
  }

  return rows;
}

export type WinEvent = {
  id: string;
  name: string;
  town: string;
  amountKes: number;
  kind: "survey" | "bonus" | "withdrawal" | "upgrade";
};

const KINDS: WinEvent["kind"][] = ["survey", "bonus", "withdrawal", "upgrade", "survey", "withdrawal"];

export const WIN_LABELS: Record<WinEvent["kind"], string> = {
  survey: "completed a VIP survey",
  bonus: "unlocked a streak bonus",
  withdrawal: "withdrew to Instant EFT",
  upgrade: "upgraded plan and earned",
};

/** A single high-value win between R 250 and R 2,500. */
export function makeWin(seed: number): WinEvent {
  const random = rng(seed >>> 0);
  const raw = 250 + random() * 2_250;
  return {
    id: `${seed}`,
    name: nameFrom(random),
    town: pick(TOWNS, random),
    amountKes: Math.round(raw / 10) * 10,
    kind: pick(KINDS, random),
  };
}

/** Randomised delay (ms) between win notifications, for natural pacing. */
export function nextWinDelay(): number {
  return 9_000 + Math.floor(Math.random() * 16_000);
}
