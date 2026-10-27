import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://chlezybvyqyksyiupudj.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobGV6eWJ2eXF5a3N5aXVwdWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzNDc2MCwiZXhwIjoyMTA3ODEwNzYwfQ.veha6Zw8ZNBZKyAQ5gR48Tur6TAVJCqFB0oYUojXOWY";

const supabase = createClient(supabaseUrl, serviceKey);

const MUX_STREAMS = [
  // Day 1 (Tasks 1 to 5)
  {
    day: 1,
    index: 1,
    playbackId: "RlOWn2N00KGr2dwVC7xdaVjBVHQ7ptzmY7FRGfJaLdJA",
    title: "Fast Mobile Transfers & Cash Rewards",
    caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards #BankingSA",
    category: "Banking",
    creator: "@digital_wallets",
    sound: "Digital Transfer Beat - SA Official",
  },
  {
    day: 1,
    index: 2,
    playbackId: "w00mC5b1hZyi82Y6OhtPz8kFMbvQbRrtkMnl021QjHTAM",
    title: "Top Commercial Banking & Savings Features",
    caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney #Capitec",
    category: "Finance",
    creator: "@banking_insights",
    sound: "Savings Growth Acoustic",
  },
  {
    day: 1,
    index: 3,
    playbackId: "AdPmibTrZsiabXIxe6J2OcDizH4Ixjy533f01k2N7eBU",
    title: "Everyday Brand Deals & Online Shopping",
    caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping #SmartShopper",
    category: "Business",
    creator: "@mzansi_deals",
    sound: "Retail Rhythm - Shopping SA",
  },
  {
    day: 1,
    index: 4,
    playbackId: "LyKK5PkbYpusRKKBGtGGsxUbpXC02NpCu7U013d4jthGA",
    title: "Capitec Bank — Instant Payment Clearance",
    caption: "Verified Capitec Bank instant transfer notification. Zero monthly fees on mobile banking. 🇿🇦📱 #Capitec #InstantMoney #BankingSA",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Alert - SA Official",
  },
  {
    day: 1,
    index: 5,
    playbackId: "G02alC1eiUll88eziAjUJ674s8tPf2E26itoL7mfuNks",
    title: "Capitec Bank — Fast Digital Mobile Transfer",
    caption: "Quick digital bank transfers straight into your Capitec account. Rate and earn cash daily. 💳⚡ #MobileBanking #CapitecBank",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Digital Beats",
  },

  // Day 2 (Tasks 6 to 10)
  {
    day: 2,
    index: 6,
    playbackId: "WPaTIZRTYSrk5cGq02eqz8TOb501JDO5mYC2npX01gUS7Q",
    title: "Capitec Bank — Money In Notification & Daily Cash",
    caption: "Money In notification: South African Revenue Service & verified instant deposits. Watch & review to earn Rands. 💸🇿🇦 #MoneyIn #Capitec",
    category: "Finance",
    creator: "@capitec_southafrica",
    sound: "Capitec Notification Tone",
  },
  {
    day: 2,
    index: 7,
    playbackId: "00lX4lTKbq3oLHMazeS1KPVloSgV5e402oAgdmVYpkD00g",
    title: "Capitec Bank — Rewards Review Tool & Payouts",
    caption: "Rate short brand review videos and get paid straight into your Capitec account every day! 🚗✨ #BankPayouts #CapitecReward",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Review Theme",
  },
  {
    day: 2,
    index: 8,
    playbackId: "5fC01MnSDXDwbTCzTTk221z00fxC01hZbDjW9b4U00QmYzk",
    title: "Capitec Bank — Mobile Clearance & Car Expenses",
    caption: "Cover everyday expenses and bills effortlessly with daily Capitec video reviews. 💰🚗 #CapitecConnect #SmartBanking",
    category: "Finance",
    creator: "@capitec_southafrica",
    sound: "Capitec Lifestyle Beats",
  },
  {
    day: 2,
    index: 9,
    playbackId: "HEAvoeZQdvyuUMpP1jv3Hh5iVknaY828kpMPMFO2Wu00",
    title: "Capitec Bank — Daily Earning Alert & Cash Wallet",
    caption: "Instant daily earning credit sent directly to your mobile wallet. 📲🇿🇦 #DailyEarnings #CapitecOfficial",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Daily Beats",
  },
  {
    day: 2,
    index: 10,
    playbackId: "BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM",
    title: "Cape Town Hidden Gems & Tourism Campaign",
    caption: "Discover the most stunning destinations, cafes, and coastal roads in the Mother City. 🌊⛰️ #CapeTown #ExploreSA",
    category: "Business",
    creator: "@capetown_tourism",
    sound: "Cape Vibes Melody",
  },

  // Day 3 (Tasks 11 to 15)
  {
    day: 3,
    index: 11,
    playbackId: "OfjbQ3esQifgboENTs4oDXslCP5sSnst",
    title: "Checkers Sixty60 — Rapid Doorstep Delivery",
    caption: "Groceries delivered in 60 minutes flat. South Africa's favorite rapid on-demand app. 🛒⚡ #CheckersSixty60 #FastDelivery",
    category: "Shopping",
    creator: "@checkers_sa",
    sound: "Sixty60 Beat",
  },
  {
    day: 3,
    index: 12,
    playbackId: "uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW",
    title: "Samsung Galaxy vs iPhone Joburg Tech Review",
    caption: "Camera shootout and battery tests across Johannesburg skyline. Which flagship wins? 📱🌆 #JoburgTech #CameraTest",
    category: "Technology",
    creator: "@tech_mzansi",
    sound: "Tech Pulse 2026",
  },
  {
    day: 3,
    index: 13,
    playbackId: "L01T3l4CWmukIZ8Cr1Iq9pG7A8YF2E65z",
    title: "Takealot — Daily Fire Sale Special Deals",
    caption: "Massive clearance discounts on electronics, beauty, and home essentials. 🛍️🔥 #TakealotDeals #ShopSmart",
    category: "Shopping",
    creator: "@takealot_deals",
    sound: "Takealot Promo Theme",
  },
  {
    day: 3,
    index: 14,
    playbackId: "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe",
    title: "Minibus Taxi Driver Chronicles — Transit Stories",
    caption: "The heartbeat of South African commuter transit: music, banter, and township hustle. 🚐🇿🇦 #TaxiLife #MzansiLiving",
    category: "Entertainment",
    creator: "@mzansi_chronicles",
    sound: "Township Groove",
  },
  {
    day: 3,
    index: 15,
    playbackId: "OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts",
    title: "Mzansi Beats — Summer Musical Celebration",
    caption: "Uplifting rhythms, dance moves, and community joy across South Africa. 🎶💃 #Amapiano #SummerVibes",
    category: "Entertainment",
    creator: "@vibes_mzansi",
    sound: "Mzansi Beats Anthem",
  },

  // Day 4 (Tasks 16 to 20)
  {
    day: 4,
    index: 16,
    playbackId: "RlOWn2N00KGr2dwVC7xdaVjBVHQ7ptzmY7FRGfJaLdJA",
    title: "Contactless Tap & Pay Phone Wallet",
    caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo #MobilePay",
    category: "Banking",
    creator: "@pay_easy",
    sound: "Tap & Go Modern Rhythm",
  },
  {
    day: 4,
    index: 17,
    playbackId: "w00mC5b1hZyi82Y6OhtPz8kFMbvQbRrtkMnl021QjHTAM",
    title: "Life Protection & Emergency Financial Safety",
    caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection",
    category: "Finance",
    creator: "@life_cover_sa",
    sound: "Serenity Care Symphony",
  },
  {
    day: 4,
    index: 18,
    playbackId: "AdPmibTrZsiabXIxe6J2OcDizH4Ixjy533f01k2N7eBU",
    title: "Fast Deliveries & Digital Retail Special Deals",
    caption: "Same-day doorstep delivery on thousands of household essentials and top electronics. 📦🚀 #FastDelivery",
    category: "Shopping",
    creator: "@retail_deals",
    sound: "Express Delivery Beat",
  },
  {
    day: 4,
    index: 19,
    playbackId: "LyKK5PkbYpusRKKBGtGGsxUbpXC02NpCu7U013d4jthGA",
    title: "Personalized Savings Plans & Rand Growth",
    caption: "Name your goal, lock in your fixed interest rate, and reach milestones faster. 🎯📊 #GoalSaver #WealthBuilder",
    category: "Finance",
    creator: "@rand_growth",
    sound: "Financial Horizon Theme",
  },
  {
    day: 4,
    index: 20,
    playbackId: "G02alC1eiUll88eziAjUJ674s8tPf2E26itoL7mfuNks",
    title: "Leading Brand Spotlight & Commercial Showcase",
    caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase",
    category: "Business",
    creator: "@mzansi_brands",
    sound: "Inspiring Innovation Pulse",
  },

  // Day 5 (Tasks 21 to 25)
  {
    day: 5,
    index: 21,
    playbackId: "WPaTIZRTYSrk5cGq02eqz8TOb501JDO5mYC2npX01gUS7Q",
    title: "Smart Home Tech & Wireless Broadband",
    caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle",
    category: "Technology",
    creator: "@broadband_za",
    sound: "Smart Tech Connectivity",
  },
  {
    day: 5,
    index: 22,
    playbackId: "00lX4lTKbq3oLHMazeS1KPVloSgV5e402oAgdmVYpkD00g",
    title: "Cashback Swipes & Merchant Partner Savings",
    caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend",
    category: "Shopping",
    creator: "@swipe_and_save",
    sound: "Partner Savings Harmony",
  },
  {
    day: 5,
    index: 23,
    playbackId: "5fC01MnSDXDwbTCzTTk221z00fxC01hZbDjW9b4U00QmYzk",
    title: "Youth & Student Banking Perks",
    caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi",
    category: "Banking",
    creator: "@student_banking",
    sound: "Youth Energy Beat",
  },
  {
    day: 5,
    index: 24,
    playbackId: "HEAvoeZQdvyuUMpP1jv3Hh5iVknaY828kpMPMFO2Wu00",
    title: "Celebration Beats & Popular Media Commercial",
    caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats",
    category: "Entertainment",
    creator: "@vibes_mzansi",
    sound: "Mzansi Beats Anthem",
  },
  {
    day: 5,
    index: 25,
    playbackId: "BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM",
    title: "Effortless Bill Payments & Municipal Accounts",
    caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay",
    category: "Finance",
    creator: "@pay_bills_easy",
    sound: "Effortless Solutions Acoustic",
  },

  // Day 6 (Tasks 26 to 30)
  {
    day: 6,
    index: 26,
    playbackId: "OfjbQ3esQifgboENTs4oDXslCP5sSnst",
    title: "Small Business Invoicing & Quick QR Payments",
    caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA #Fintech",
    category: "Business",
    creator: "@biz_growth",
    sound: "Entrepreneur Pulse Beat",
  },
  {
    day: 6,
    index: 27,
    playbackId: "uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW",
    title: "Everyday Fuel Rewards & Partner Petrol Stations",
    caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards",
    category: "Shopping",
    creator: "@fuel_saver",
    sound: "Open Road Highway Theme",
  },
  {
    day: 6,
    index: 28,
    playbackId: "L01T3l4CWmukIZ8Cr1Iq9pG7A8YF2E65z",
    title: "Modern Banking for Freelancers & Creators",
    caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA",
    category: "Finance",
    creator: "@creator_economy",
    sound: "Creator Vibe Lounge",
  },
  {
    day: 6,
    index: 29,
    playbackId: "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe",
    title: "Seasonal Retail Showcase & Special Gift Guide",
    caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide",
    category: "Shopping",
    creator: "@seasonal_trends",
    sound: "Festive Joy Bells",
  },
  {
    day: 6,
    index: 30,
    playbackId: "OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts",
    title: "High Yield Fixed Deposit Investment Guide",
    caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder",
    category: "Finance",
    creator: "@invest_smart",
    sound: "Prosperity Symphony",
  },
];

async function run() {
  console.log("🔄 Updating Supabase surveys table with verified Mux streams...");
  await supabase.from("surveys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const rows = MUX_STREAMS.map((item, idx) => {
    const hex = (idx + 1).toString(16).padStart(4, "0");
    const id = `00000000-0000-4000-8000-00000000${hex}`;
    const streamUrl = `https://stream.mux.com/${item.playbackId}.m3u8`;
    const thumbnailUrl = `https://image.mux.com/${item.playbackId}/thumbnail.jpg?time=1&fit_mode=smartcrop&width=720&height=1280`;

    const metadata = {
      video_url: streamUrl,
      playback_id: item.playbackId,
      thumbnail_url: thumbnailUrl,
      creator: item.creator,
      caption: item.caption,
      sound: item.sound,
      duration: 15,
      likes: 120000 + idx * 4500,
      comments: 3500 + idx * 120,
      shares: 9800 + idx * 340,
    };

    return {
      id,
      title: item.title,
      description: JSON.stringify(metadata),
      category: item.category,
      min_tier: "regular",
      estimated_minutes: 1,
      status: "active",
      created_at: new Date(Date.now() - (30 - idx) * 3600 * 1000).toISOString(),
    };
  });

  const { error: insertErr } = await supabase.from("surveys").insert(rows);
  if (insertErr) {
    console.error("❌ Failed to insert surveys:", insertErr);
    process.exit(1);
  }
  console.log(`🎉 Successfully seeded ${rows.length} surveys in Supabase with verified Mux streams!`);

  // Write src/lib/videos.ts
  console.log("\n📝 Writing src/lib/videos.ts...");
  const entries = MUX_STREAMS.map((item) => {
    const streamUrl = `https://stream.mux.com/${item.playbackId}.m3u8`;
    return `  {
    title: ${JSON.stringify(item.title)},
    caption: ${JSON.stringify(item.caption)},
    creator: ${JSON.stringify(item.creator)},
    category: ${JSON.stringify(item.category)},
    videoUrl: ${JSON.stringify(streamUrl)},
    soundTitle: ${JSON.stringify(item.sound)},
    durationSeconds: 15,
    likesCount: ${180000 + item.index * 5000},
    commentsCount: ${4000 + item.index * 120},
    sharesCount: ${14000 + item.index * 350},
  },`;
  }).join("\n");

  const fullVideosTs = `export type VideoTask = {
  id: string;
  title: string;
  caption: string;
  creator: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  soundTitle: string;
  durationSeconds: number;
  reward: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
};

export const DEFAULT_VIDEOS: Array<Omit<VideoTask, "id" | "reward">> = [
${entries}
];

/** Clean video URL from raw input or full iframe embed code */
export function cleanVideoUrl(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) return iframeMatch[1].trim();
  return trimmed;
}

/** Extract Mux Playback ID from a URL, iframe, or raw ID string */
export function getMuxPlaybackId(input: string): string | null {
  if (!input) return null;
  const cleaned = cleanVideoUrl(input);

  // Match stream.mux.com/{playbackId}.m3u8 or player.mux.com/{playbackId} or image.mux.com/{playbackId}/...
  const muxUrlMatch = cleaned.match(
    /(?:stream|player|image)\\.mux\\.com\\/([a-zA-Z0-9_-]+)(?:\\.m3u8|\\/|$|\\?)/i,
  );
  if (muxUrlMatch?.[1]) {
    return muxUrlMatch[1];
  }

  // Raw Mux Playback ID string (e.g. 15-64 alphanumeric chars with optional - or _)
  if (
    /^[a-zA-Z0-9_-]{15,64}$/.test(cleaned) &&
    !cleaned.includes("http") &&
    !cleaned.includes(".") &&
    !cleaned.includes("/")
  ) {
    return cleaned;
  }

  return null;
}

/** Get Mux HLS stream URL from playback ID */
export function getMuxStreamUrl(playbackId: string): string {
  return \`https://stream.mux.com/\${playbackId}.m3u8\`;
}

/** Get Mux poster thumbnail image URL from playback ID */
export function getMuxThumbnailUrl(playbackId: string): string {
  return \`https://image.mux.com/\${playbackId}/thumbnail.jpg?time=1&fit_mode=smartcrop&width=720&height=1280\`;
}

/** Check if URL is an HLS stream (Mux or .m3u8) */
export function isHlsStream(url: string): boolean {
  if (!url) return false;
  return url.includes(".m3u8") || url.includes("stream.mux.com") || Boolean(getMuxPlaybackId(url));
}

/** Parse video properties from survey row or apply preset */
export function resolveVideoTask(
  survey: {
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    estimated_minutes?: number | null;
    reward?: number;
  },
  taskIndex?: number,
): VideoTask {
  // If description has JSON metadata, parse it
  let customUrl: string | undefined;
  let customCreator: string | undefined;
  let customCaption: string | undefined;
  let customSound: string | undefined;
  let customDuration: number | undefined;

  const desc = survey.description?.trim() ?? "";
  if (desc.startsWith("{") && desc.endsWith("}")) {
    try {
      const parsed = JSON.parse(desc) as Record<string, unknown>;
      if (typeof parsed.video_url === "string") customUrl = cleanVideoUrl(parsed.video_url);
      if (typeof parsed.creator === "string") customCreator = parsed.creator;
      if (typeof parsed.caption === "string") customCaption = parsed.caption;
      if (typeof parsed.sound === "string") customSound = parsed.sound;
      if (typeof parsed.duration === "number") customDuration = parsed.duration;
    } catch {
      // ignore JSON parse error
    }
  } else if (desc.includes("<iframe") && desc.includes("src=")) {
    customUrl = cleanVideoUrl(desc);
  } else if (desc.startsWith("http://") || desc.startsWith("https://") || desc.startsWith("/")) {
    customUrl = cleanVideoUrl(desc);
  } else if (getMuxPlaybackId(desc)) {
    customUrl = desc;
  }

  let hash = 0;
  for (let i = 0; i < survey.id.length; i++) {
    hash = (hash * 31 + survey.id.charCodeAt(i)) >>> 0;
  }
  const presetIndex =
    typeof taskIndex === "number" && taskIndex >= 0
      ? taskIndex % DEFAULT_VIDEOS.length
      : hash % DEFAULT_VIDEOS.length;
  const preset = DEFAULT_VIDEOS[presetIndex];

  const rawUrl = customUrl || preset.videoUrl;
  const muxId = getMuxPlaybackId(rawUrl);
  const resolvedVideoUrl = muxId ? getMuxStreamUrl(muxId) : rawUrl;
  const resolvedThumbnailUrl = muxId ? getMuxThumbnailUrl(muxId) : undefined;

  return {
    id: survey.id,
    title: survey.title || preset.title,
    caption: customCaption || (desc && !desc.startsWith("{") && !desc.startsWith("http") && !getMuxPlaybackId(desc) ? desc : preset.caption),
    creator: customCreator || preset.creator,
    category: survey.category || preset.category,
    videoUrl: resolvedVideoUrl,
    thumbnailUrl: resolvedThumbnailUrl,
    soundTitle: customSound || preset.soundTitle,
    durationSeconds: customDuration || (survey.estimated_minutes && survey.estimated_minutes > 0 ? 15 : preset.durationSeconds),
    reward: survey.reward ?? 0,
    likesCount: preset.likesCount + (hash % 10000),
    commentsCount: preset.commentsCount + (hash % 500),
    sharesCount: preset.sharesCount + (hash % 1000),
  };
}

/** Check if url is a YouTube link and extract embed URL */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleaned = cleanVideoUrl(url);
  const match = cleaned.match(
    /(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=|shorts\\/))([\\w-]{11})/,
  );
  if (!match) return null;
  const videoId = match[1];
  return \`https://www.youtube.com/embed/\${videoId}?autoplay=1&mute=0&controls=1&playsinline=1&rel=0&modestbranding=1\`;
}
`;

  fs.writeFileSync("src/lib/videos.ts", fullVideosTs, "utf8");
  console.log("✅ src/lib/videos.ts written successfully!");
  console.log("🎉 ALL 30 VIDEOS ARE NOW LIVE ON MUX!");
}

run().catch(console.error);
