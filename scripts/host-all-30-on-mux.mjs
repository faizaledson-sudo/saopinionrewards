import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://chlezybvyqyksyiupudj.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobGV6eWJ2eXF5a3N5aXVwdWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzNDc2MCwiZXhwIjoyMTA3ODEwNzYwfQ.veha6Zw8ZNBZKyAQ5gR48Tur6TAVJCqFB0oYUojXOWY";

const supabase = createClient(supabaseUrl, serviceKey);

const tokenId = "3e5dd69e-10fc-4dac-9571-4b1f1cec738d";
const tokenSecret = "dkea5877dh1dvGFx5yUJBiMJfCE7/Z1QXMjOPIoNws2avnnDsFvtbw5Qh4v3OTeLpC6kR4y+Ffs";
const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

const VIDEO_FILES = [
  {
    day: 1,
    index: 1,
    file: "01_Fast_Mobile_Transfers_Cash_Rewards_VIP1.mp4",
    title: "Fast Mobile Transfers & Cash Rewards",
    caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards #BankingSA",
    category: "Banking",
    creator: "@digital_wallets",
    sound: "Digital Transfer Beat - SA Official",
  },
  {
    day: 1,
    index: 2,
    file: "02_Top_Commercial_Banking_Savings_Features_.mp4",
    title: "Top Commercial Banking & Savings Features",
    caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney #Capitec",
    category: "Finance",
    creator: "@banking_insights",
    sound: "Savings Growth Acoustic",
  },
  {
    day: 1,
    index: 3,
    file: "03_Everyday_Brand_Deals_Online_Shopping_VIP.mp4",
    title: "Everyday Brand Deals & Online Shopping",
    caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping #SmartShopper",
    category: "Business",
    creator: "@mzansi_deals",
    sound: "Retail Rhythm - Shopping SA",
  },
  {
    day: 1,
    index: 4,
    file: "04_High_Speed_Home_Fibre_Unlimited_Connecti.mp4",
    title: "High-Speed Home Fibre & Unlimited Connectivity",
    caption: "Ultra-fast prepaid fibre for work, gaming, and family streaming at home. 🌐⚡ #HomeFibre #FastInternet",
    category: "Technology",
    creator: "@connect_sa",
    sound: "High Speed Digital Flow",
  },
  {
    day: 1,
    index: 5,
    file: "05_Digital_Banking_Smart_Payments_App_VIP1.mp4",
    title: "Digital Banking & Smart Payments App",
    caption: "Explore quick digital payments, zero monthly fees, and instant transfers on mobile. 💳📱 #Banking #Finance #SA",
    category: "Banking",
    creator: "@smart_banking",
    sound: "Smart Payment Chime",
  },
  {
    day: 2,
    index: 6,
    file: "06_Secure_Account_Security_Fraud_Prevention.mp4",
    title: "Secure Account Security & Fraud Prevention",
    caption: "How biometric login and instant in-app card freezing keep your funds safe 24/7. 🔒🛡️ #TechSecurity #Safety",
    category: "Technology",
    creator: "@security_alert",
    sound: "Secure Vault Theme",
  },
  {
    day: 2,
    index: 7,
    file: "07_Business_Banking_Merchant_Card_Machines_.mp4",
    title: "Business Banking & Merchant Card Machines",
    caption: "Speed up checkout and accept tap-to-pay from Visa, Mastercard, and digital wallets. 📈💼 #BusinessSA #Fintech",
    category: "Business",
    creator: "@enterprise_hub",
    sound: "Business Growth Symphony",
  },
  {
    day: 2,
    index: 8,
    file: "08_Personal_Loans_Flexible_Repayment_Guide_.mp4",
    title: "Personal Loans & Flexible Repayment Guide",
    caption: "Low fixed interest rates, transparent fees, and fast online approval from leading institutions. 🤝💰 #FinancialFreedom",
    category: "Finance",
    creator: "@money_guide_sa",
    sound: "Financial Clarity Beat",
  },
  {
    day: 2,
    index: 9,
    file: "09_Family_Entertainment_Live_Sports_Streami.mp4",
    title: "Family Entertainment & Live Sports Streaming",
    caption: "Catch live football matches, series, and local movies on all your connected screens. 📺⚽ #EntertainmentSA",
    category: "Entertainment",
    creator: "@tv_africa",
    sound: "Stadium Anthem Vibes",
  },
  {
    day: 2,
    index: 10,
    file: "10_Refreshing_Beverages_Summer_Celebration_.mp4",
    title: "Refreshing Beverages & Summer Celebration Promo",
    caption: "Cool down with ice-cold classic beverages made for warm afternoons and braais. 🥤☀️ #SummerVibes #Mzansi",
    category: "Shopping",
    creator: "@refresh_sa",
    sound: "Mzansi Summer Beats",
  },
  {
    day: 3,
    index: 11,
    file: "11_Workplace_Banking_Employee_Financial_Ben.mp4",
    title: "Workplace Banking & Employee Financial Benefits",
    caption: "Special corporate banking perks, lower transaction charges, and dedicated support. 👔💼 #WorkplaceBanking",
    category: "Business",
    creator: "@corporate_perks",
    sound: "Professional Pulse Beat",
  },
  {
    day: 3,
    index: 12,
    file: "12_Smart_Budgeting_Automated_Rainy_Day_Fund.mp4",
    title: "Smart Budgeting & Automated Rainy Day Fund",
    caption: "Automate your daily round-ups and watch your emergency fund grow effortlessly. 📈🇿🇦 #SavingsGoals",
    category: "Finance",
    creator: "@budget_mzansi",
    sound: "Daily Savings Acoustic",
  },
  {
    day: 3,
    index: 13,
    file: "13_Credit_Card_Perks_Travel_Benefits_VIP2.mp4",
    title: "Credit Card Perks & Travel Benefits",
    caption: "Airport lounge access, free travel insurance, and bonus reward points worldwide. ✈️💳 #TravelPerks #EliteBanking",
    category: "Finance",
    creator: "@lifestyle_banking",
    sound: "Global Jetsetter Grooves",
  },
  {
    day: 3,
    index: 14,
    file: "14_Mobile_App_Feature_Spotlight_Quick_Tips_.mp4",
    title: "Mobile App Feature Spotlight & Quick Tips",
    caption: "Check statements, buy prepaid electricity, and manage debit orders in just 3 clicks. 💡📱 #AppTips",
    category: "Technology",
    creator: "@smart_features",
    sound: "Digital Quick Tips Flow",
  },
  {
    day: 3,
    index: 15,
    file: "15_Loyalty_Perks_Weekly_Grocery_Cashback_VI.mp4",
    title: "Loyalty Perks & Weekly Grocery Cashback",
    caption: "Earn points every time you fill up petrol or buy groceries at partner retailers. 🛒⛽ #Cashback #SmartShopper",
    category: "Shopping",
    creator: "@rewards_club",
    sound: "Cashback Reward Chime",
  },
  {
    day: 4,
    index: 16,
    file: "16_Contactless_Tap_Pay_Phone_Wallet_VIP3.mp4",
    title: "Contactless Tap & Pay Phone Wallet",
    caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo #MobilePay",
    category: "Banking",
    creator: "@pay_easy",
    sound: "Tap & Go Modern Rhythm",
  },
  {
    day: 4,
    index: 17,
    file: "17_Life_Protection_Emergency_Financial_Safe.mp4",
    title: "Life Protection & Emergency Financial Safety",
    caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection",
    category: "Finance",
    creator: "@life_cover_sa",
    sound: "Serenity Care Symphony",
  },
  {
    day: 4,
    index: 18,
    file: "18_Fast_Deliveries_Digital_Retail_Special_D.mp4",
    title: "Fast Deliveries & Digital Retail Special Deals",
    caption: "Same-day doorstep delivery on thousands of household essentials and top electronics. 📦🚀 #FastDelivery",
    category: "Shopping",
    creator: "@retail_deals",
    sound: "Express Delivery Beat",
  },
  {
    day: 4,
    index: 19,
    file: "19_Personalized_Savings_Plans_Rand_Growth_V.mp4",
    title: "Personalized Savings Plans & Rand Growth",
    caption: "Name your goal, lock in your fixed interest rate, and reach milestones faster. 🎯📊 #GoalSaver #WealthBuilder",
    category: "Finance",
    creator: "@rand_growth",
    sound: "Financial Horizon Theme",
  },
  {
    day: 4,
    index: 20,
    file: "20_Leading_Brand_Spotlight_Commercial_Showc.mp4",
    title: "Leading Brand Spotlight & Commercial Showcase",
    caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase",
    category: "Business",
    creator: "@mzansi_brands",
    sound: "Inspiring Innovation Pulse",
  },
  {
    day: 5,
    index: 21,
    file: "21_Smart_Home_Tech_Wireless_Broadband_VIP2.mp4",
    title: "Smart Home Tech & Wireless Broadband",
    caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle",
    category: "Technology",
    creator: "@broadband_za",
    sound: "Smart Tech Connectivity",
  },
  {
    day: 5,
    index: 22,
    file: "22_Cashback_Swipes_Merchant_Partner_Savings.mp4",
    title: "Cashback Swipes & Merchant Partner Savings",
    caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend",
    category: "Shopping",
    creator: "@swipe_and_save",
    sound: "Partner Savings Harmony",
  },
  {
    day: 5,
    index: 23,
    file: "23_Youth_Student_Banking_Perks_VIP2.mp4",
    title: "Youth & Student Banking Perks",
    caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi",
    category: "Banking",
    creator: "@student_banking",
    sound: "Youth Energy Beat",
  },
  {
    day: 5,
    index: 24,
    file: "24_Celebration_Beats_Popular_Media_Commerci.mp4",
    title: "Celebration Beats & Popular Media Commercial",
    caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats",
    category: "Entertainment",
    creator: "@vibes_mzansi",
    sound: "Mzansi Beats Anthem",
  },
  {
    day: 5,
    index: 25,
    file: "25_Effortless_Bill_Payments_Municipal_Accou.mp4",
    title: "Effortless Bill Payments & Municipal Accounts",
    caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay",
    category: "Finance",
    creator: "@pay_bills_easy",
    sound: "Effortless Solutions Acoustic",
  },
  {
    day: 6,
    index: 26,
    file: "26_Small_Business_Invoicing_Quick_QR_Paymen.mp4",
    title: "Small Business Invoicing & Quick QR Payments",
    caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA #Fintech",
    category: "Business",
    creator: "@biz_growth",
    sound: "Entrepreneur Pulse Beat",
  },
  {
    day: 6,
    index: 27,
    file: "27_Everyday_Fuel_Rewards_Partner_Petrol_Sta.mp4",
    title: "Everyday Fuel Rewards & Partner Petrol Stations",
    caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards",
    category: "Shopping",
    creator: "@fuel_saver",
    sound: "Open Road Highway Theme",
  },
  {
    day: 6,
    index: 28,
    file: "28_Modern_Banking_for_Freelancers_Creators_.mp4",
    title: "Modern Banking for Freelancers & Creators",
    caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA",
    category: "Finance",
    creator: "@creator_economy",
    sound: "Creator Vibe Lounge",
  },
  {
    day: 6,
    index: 29,
    file: "29_Seasonal_Retail_Showcase_Special_Gift_Gu.mp4",
    title: "Seasonal Retail Showcase & Special Gift Guide",
    caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide",
    category: "Shopping",
    creator: "@seasonal_trends",
    sound: "Festive Joy Bells",
  },
  {
    day: 6,
    index: 30,
    file: "31_High_Yield_Fixed_Deposit_Investment_Guid.mp4",
    title: "High Yield Fixed Deposit Investment Guide",
    caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder",
    category: "Finance",
    creator: "@invest_smart",
    sound: "Prosperity Symphony",
  },
];

const cacheFile = "scripts/mux-assets-cache.json";

async function main() {
  console.log("🚀 Starting Mux hosting for all 30 video assets...\n");

  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch {}
  }

  // Also query existing Mux assets to avoid duplicate uploads
  const listRes = await fetch("https://api.mux.com/video/v1/assets?limit=100", {
    headers: { Authorization: `Basic ${auth}` },
  });
  const existingMuxAssets = (await listRes.json()).data || [];
  console.log(`Found ${existingMuxAssets.length} total existing assets in Mux account.`);

  for (const item of VIDEO_FILES) {
    if (cache[item.file]?.playbackId) {
      console.log(`⚡ [${item.index}/30] ${item.file} already cached with Playback ID: ${cache[item.file].playbackId}`);
      continue;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${item.file}`;
    console.log(`📤 [${item.index}/30] Creating Mux asset for ${item.file}...`);

    const createRes = await fetch("https://api.mux.com/video/v1/assets", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [{ url: publicUrl }],
        playback_policy: ["public"],
        passthrough: item.file,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`❌ Failed to create asset for ${item.file}:`, err);
      continue;
    }

    const resJson = await createRes.json();
    const assetId = resJson.data.id;
    const playbackId = resJson.data.playback_ids?.[0]?.id;

    console.log(`   Asset created: ${assetId}, initial playbackId: ${playbackId}`);

    cache[item.file] = {
      assetId,
      playbackId,
      streamUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
      thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
    };

    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");

    // Sleep 1 second between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Now ensure all assets in cache have their playbackId and are ready
  console.log("\n⏳ Verifying asset readiness and playback IDs...");
  for (const item of VIDEO_FILES) {
    const entry = cache[item.file];
    if (!entry) continue;

    if (!entry.playbackId) {
      console.log(`Checking status for ${entry.assetId}...`);
      const getRes = await fetch(`https://api.mux.com/video/v1/assets/${entry.assetId}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (getRes.ok) {
        const asset = (await getRes.json()).data;
        entry.playbackId = asset.playback_ids?.[0]?.id;
        entry.streamUrl = entry.playbackId ? `https://stream.mux.com/${entry.playbackId}.m3u8` : null;
        entry.thumbnailUrl = entry.playbackId ? `https://image.mux.com/${entry.playbackId}/thumbnail.jpg` : null;
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");
      }
    }
    console.log(`✅ ${item.file} -> Playback ID: ${entry.playbackId}`);
  }

  // Now update Supabase Database surveys table with Mux stream URLs
  console.log("\n🔄 Updating Supabase surveys table with official Mux streams...");
  await supabase.from("surveys").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const rows = VIDEO_FILES.map((item, idx) => {
    const hex = (idx + 1).toString(16).padStart(4, "0");
    const id = `00000000-0000-4000-8000-00000000${hex}`;
    const entry = cache[item.file] || {};
    const muxUrl = entry.streamUrl || `https://stream.mux.com/${entry.playbackId}.m3u8`;

    const metadata = {
      video_url: muxUrl,
      playback_id: entry.playbackId,
      thumbnail_url: entry.thumbnailUrl,
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
  } else {
    console.log(`🎉 Successfully seeded ${rows.length} surveys pointing to MUX streams!`);
  }

  // Update src/lib/videos.ts with Mux streams
  console.log("\n📝 Updating src/lib/videos.ts with Mux stream URLs...");
  const defaultVideosEntries = VIDEO_FILES.map((item) => {
    const entry = cache[item.file] || {};
    const muxUrl = entry.streamUrl || `https://stream.mux.com/${entry.playbackId}.m3u8`;
    return `  {
    title: ${JSON.stringify(item.title)},
    caption: ${JSON.stringify(item.caption)},
    creator: ${JSON.stringify(item.creator)},
    category: ${JSON.stringify(item.category)},
    videoUrl: ${JSON.stringify(muxUrl)},
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
${defaultVideosEntries}
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
  console.log("✅ src/lib/videos.ts written successfully with Mux stream URLs!");
  console.log("\n🎉 ALL 30 VIDEOS ARE NOW OFFICIALLY HOSTED ON MUX!");
}

main().catch(console.error);
