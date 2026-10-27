import fs from "node:fs";

const videosTs = `export type VideoTask = {
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
  // DAY 1: Tasks 1 to 5
  {
    title: "Fast Mobile Transfers & Cash Rewards",
    caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards #BankingSA",
    creator: "@digital_wallets",
    category: "Banking",
    videoUrl: "/videos/01_Fast_Mobile_Transfers_Cash_Rewards_VIP1.mp4",
    soundTitle: "Digital Transfer Beat - SA Official",
    durationSeconds: 15,
    likesCount: 182000,
    commentsCount: 4210,
    sharesCount: 14300,
  },
  {
    title: "Top Commercial Banking & Savings Features",
    caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney #Capitec",
    creator: "@banking_insights",
    category: "Finance",
    videoUrl: "/videos/02_Top_Commercial_Banking_Savings_Features_.mp4",
    soundTitle: "Savings Growth Acoustic",
    durationSeconds: 15,
    likesCount: 195000,
    commentsCount: 3980,
    sharesCount: 16100,
  },
  {
    title: "Everyday Brand Deals & Online Shopping",
    caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping #SmartShopper",
    category: "Business",
    videoUrl: "/videos/03_Everyday_Brand_Deals_Online_Shopping_VIP.mp4",
    soundTitle: "Retail Rhythm - Shopping SA",
    durationSeconds: 15,
    likesCount: 245000,
    commentsCount: 5120,
    sharesCount: 18900,
  },
  {
    title: "High-Speed Home Fibre & Unlimited Connectivity",
    caption: "Ultra-fast prepaid fibre for work, gaming, and family streaming at home. 🌐⚡ #HomeFibre #FastInternet",
    creator: "@connect_sa",
    category: "Technology",
    videoUrl: "/videos/04_High_Speed_Home_Fibre_Unlimited_Connecti.mp4",
    soundTitle: "High Speed Digital Flow",
    durationSeconds: 15,
    likesCount: 167000,
    commentsCount: 3450,
    sharesCount: 12400,
  },
  {
    title: "Digital Banking & Smart Payments App",
    caption: "Explore quick digital payments, zero monthly fees, and instant transfers on mobile. 💳📱 #Banking #Finance #SA",
    creator: "@smart_banking",
    category: "Banking",
    videoUrl: "/videos/05_Digital_Banking_Smart_Payments_App_VIP1.mp4",
    soundTitle: "Smart Payment Chime",
    durationSeconds: 15,
    likesCount: 310000,
    commentsCount: 7890,
    sharesCount: 25400,
  },

  // DAY 2: Tasks 6 to 10
  {
    title: "Secure Account Security & Fraud Prevention",
    caption: "How biometric login and instant in-app card freezing keep your funds safe 24/7. 🔒🛡️ #TechSecurity #Safety",
    creator: "@security_alert",
    category: "Technology",
    videoUrl: "/videos/06_Secure_Account_Security_Fraud_Prevention.mp4",
    soundTitle: "Secure Vault Theme",
    durationSeconds: 15,
    likesCount: 198000,
    commentsCount: 4620,
    sharesCount: 15700,
  },
  {
    title: "Business Banking & Merchant Card Machines",
    caption: "Speed up checkout and accept tap-to-pay from Visa, Mastercard, and digital wallets. 📈💼 #BusinessSA #Fintech",
    creator: "@enterprise_hub",
    category: "Business",
    videoUrl: "/videos/07_Business_Banking_Merchant_Card_Machines_.mp4",
    soundTitle: "Business Growth Symphony",
    durationSeconds: 15,
    likesCount: 224000,
    commentsCount: 5310,
    sharesCount: 17800,
  },
  {
    title: "Personal Loans & Flexible Repayment Guide",
    caption: "Low fixed interest rates, transparent fees, and fast online approval from leading institutions. 🤝💰 #FinancialFreedom",
    creator: "@money_guide_sa",
    category: "Finance",
    videoUrl: "/videos/08_Personal_Loans_Flexible_Repayment_Guide_.mp4",
    soundTitle: "Financial Clarity Beat",
    durationSeconds: 15,
    likesCount: 289000,
    commentsCount: 6450,
    sharesCount: 23100,
  },
  {
    title: "Family Entertainment & Live Sports Streaming",
    caption: "Catch live football matches, series, and local movies on all your connected screens. 📺⚽ #EntertainmentSA",
    creator: "@tv_africa",
    category: "Entertainment",
    videoUrl: "/videos/09_Family_Entertainment_Live_Sports_Streami.mp4",
    soundTitle: "Stadium Anthem Vibes",
    durationSeconds: 15,
    likesCount: 350000,
    commentsCount: 8900,
    sharesCount: 31200,
  },
  {
    title: "Refreshing Beverages & Summer Celebration Promo",
    caption: "Cool down with ice-cold classic beverages made for warm afternoons and braais. 🥤☀️ #SummerVibes #Mzansi",
    creator: "@refresh_sa",
    category: "Shopping",
    videoUrl: "/videos/10_Refreshing_Beverages_Summer_Celebration_.mp4",
    soundTitle: "Mzansi Summer Beats",
    durationSeconds: 15,
    likesCount: 275000,
    commentsCount: 6100,
    sharesCount: 20400,
  },

  // DAY 3: Tasks 11 to 15
  {
    title: "Workplace Banking & Employee Financial Benefits",
    caption: "Special corporate banking perks, lower transaction charges, and dedicated support. 👔💼 #WorkplaceBanking",
    creator: "@corporate_perks",
    category: "Business",
    videoUrl: "/videos/11_Workplace_Banking_Employee_Financial_Ben.mp4",
    soundTitle: "Professional Pulse Beat",
    durationSeconds: 15,
    likesCount: 164000,
    commentsCount: 3720,
    sharesCount: 11900,
  },
  {
    title: "Smart Budgeting & Automated Rainy Day Fund",
    caption: "Automate your daily round-ups and watch your emergency fund grow effortlessly. 📈🇿🇦 #SavingsGoals",
    creator: "@budget_mzansi",
    category: "Finance",
    videoUrl: "/videos/12_Smart_Budgeting_Automated_Rainy_Day_Fund.mp4",
    soundTitle: "Daily Savings Acoustic",
    durationSeconds: 15,
    likesCount: 242000,
    commentsCount: 5670,
    sharesCount: 19300,
  },
  {
    title: "Credit Card Perks & Travel Benefits",
    caption: "Airport lounge access, free travel insurance, and bonus reward points worldwide. ✈️💳 #TravelPerks #EliteBanking",
    creator: "@lifestyle_banking",
    category: "Finance",
    videoUrl: "/videos/13_Credit_Card_Perks_Travel_Benefits_VIP2.mp4",
    soundTitle: "Global Jetsetter Grooves",
    durationSeconds: 15,
    likesCount: 318000,
    commentsCount: 7420,
    sharesCount: 26500,
  },
  {
    title: "Mobile App Feature Spotlight & Quick Tips",
    caption: "Check statements, buy prepaid electricity, and manage debit orders in just 3 clicks. 💡📱 #AppTips",
    creator: "@smart_features",
    category: "Technology",
    videoUrl: "/videos/14_Mobile_App_Feature_Spotlight_Quick_Tips_.mp4",
    soundTitle: "Digital Quick Tips Flow",
    durationSeconds: 15,
    likesCount: 189000,
    commentsCount: 4120,
    sharesCount: 14700,
  },
  {
    title: "Loyalty Perks & Weekly Grocery Cashback",
    caption: "Earn points every time you fill up petrol or buy groceries at partner retailers. 🛒⛽ #Cashback #SmartShopper",
    creator: "@rewards_club",
    category: "Shopping",
    videoUrl: "/videos/15_Loyalty_Perks_Weekly_Grocery_Cashback_VI.mp4",
    soundTitle: "Cashback Reward Chime",
    durationSeconds: 15,
    likesCount: 256000,
    commentsCount: 5980,
    sharesCount: 21100,
  },

  // DAY 4: Tasks 16 to 20
  {
    title: "Contactless Tap & Pay Phone Wallet",
    caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo #MobilePay",
    creator: "@pay_easy",
    category: "Banking",
    videoUrl: "/videos/16_Contactless_Tap_Pay_Phone_Wallet_VIP3.mp4",
    soundTitle: "Tap & Go Modern Rhythm",
    durationSeconds: 15,
    likesCount: 305000,
    commentsCount: 7120,
    sharesCount: 24800,
  },
  {
    title: "Life Protection & Emergency Financial Safety",
    caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection",
    creator: "@life_cover_sa",
    category: "Finance",
    videoUrl: "/videos/17_Life_Protection_Emergency_Financial_Safe.mp4",
    soundTitle: "Serenity Care Symphony",
    durationSeconds: 15,
    likesCount: 176000,
    commentsCount: 3940,
    sharesCount: 13200,
  },
  {
    title: "Fast Deliveries & Digital Retail Special Deals",
    caption: "Same-day doorstep delivery on thousands of household essentials and top electronics. 📦🚀 #FastDelivery",
    creator: "@retail_deals",
    category: "Shopping",
    videoUrl: "/videos/18_Fast_Deliveries_Digital_Retail_Special_D.mp4",
    soundTitle: "Express Delivery Beat",
    durationSeconds: 15,
    likesCount: 268000,
    commentsCount: 6240,
    sharesCount: 21800,
  },
  {
    title: "Personalized Savings Plans & Rand Growth",
    caption: "Name your goal, lock in your fixed interest rate, and reach milestones faster. 🎯📊 #GoalSaver #WealthBuilder",
    creator: "@rand_growth",
    category: "Finance",
    videoUrl: "/videos/19_Personalized_Savings_Plans_Rand_Growth_V.mp4",
    soundTitle: "Financial Horizon Theme",
    durationSeconds: 15,
    likesCount: 294000,
    commentsCount: 6890,
    sharesCount: 23900,
  },
  {
    title: "Leading Brand Spotlight & Commercial Showcase",
    caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase",
    creator: "@mzansi_brands",
    category: "Business",
    videoUrl: "/videos/20_Leading_Brand_Spotlight_Commercial_Showc.mp4",
    soundTitle: "Inspiring Innovation Pulse",
    durationSeconds: 15,
    likesCount: 212000,
    commentsCount: 4890,
    sharesCount: 16700,
  },

  // DAY 5: Tasks 21 to 25
  {
    title: "Smart Home Tech & Wireless Broadband",
    caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle",
    creator: "@broadband_za",
    category: "Technology",
    videoUrl: "/videos/21_Smart_Home_Tech_Wireless_Broadband_VIP2.mp4",
    soundTitle: "Smart Tech Connectivity",
    durationSeconds: 15,
    likesCount: 228000,
    commentsCount: 5190,
    sharesCount: 18200,
  },
  {
    title: "Cashback Swipes & Merchant Partner Savings",
    caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend",
    creator: "@swipe_and_save",
    category: "Shopping",
    videoUrl: "/videos/22_Cashback_Swipes_Merchant_Partner_Savings.mp4",
    soundTitle: "Partner Savings Harmony",
    durationSeconds: 15,
    likesCount: 279000,
    commentsCount: 6410,
    sharesCount: 22400,
  },
  {
    title: "Youth & Student Banking Perks",
    caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi",
    creator: "@student_banking",
    category: "Banking",
    videoUrl: "/videos/23_Youth_Student_Banking_Perks_VIP2.mp4",
    soundTitle: "Youth Energy Beat",
    durationSeconds: 15,
    likesCount: 341000,
    commentsCount: 8250,
    sharesCount: 28900,
  },
  {
    title: "Celebration Beats & Popular Media Commercial",
    caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats",
    creator: "@vibes_mzansi",
    category: "Entertainment",
    videoUrl: "/videos/24_Celebration_Beats_Popular_Media_Commerci.mp4",
    soundTitle: "Mzansi Beats Anthem",
    durationSeconds: 15,
    likesCount: 388000,
    commentsCount: 9410,
    sharesCount: 33200,
  },
  {
    title: "Effortless Bill Payments & Municipal Accounts",
    caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay",
    creator: "@pay_bills_easy",
    category: "Finance",
    videoUrl: "/videos/25_Effortless_Bill_Payments_Municipal_Accou.mp4",
    soundTitle: "Effortless Solutions Acoustic",
    durationSeconds: 15,
    likesCount: 197000,
    commentsCount: 4320,
    sharesCount: 15400,
  },

  // DAY 6: Tasks 26 to 30
  {
    title: "Small Business Invoicing & Quick QR Payments",
    caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA #Fintech",
    creator: "@biz_growth",
    category: "Business",
    videoUrl: "/videos/26_Small_Business_Invoicing_Quick_QR_Paymen.mp4",
    soundTitle: "Entrepreneur Pulse Beat",
    durationSeconds: 15,
    likesCount: 236000,
    commentsCount: 5410,
    sharesCount: 18900,
  },
  {
    title: "Everyday Fuel Rewards & Partner Petrol Stations",
    caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards",
    creator: "@fuel_saver",
    category: "Shopping",
    videoUrl: "/videos/27_Everyday_Fuel_Rewards_Partner_Petrol_Sta.mp4",
    soundTitle: "Open Road Highway Theme",
    durationSeconds: 15,
    likesCount: 284000,
    commentsCount: 6520,
    sharesCount: 22800,
  },
  {
    title: "Modern Banking for Freelancers & Creators",
    caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA",
    creator: "@creator_economy",
    category: "Finance",
    videoUrl: "/videos/28_Modern_Banking_for_Freelancers_Creators_.mp4",
    soundTitle: "Creator Vibe Lounge",
    durationSeconds: 15,
    likesCount: 312000,
    commentsCount: 7280,
    sharesCount: 25100,
  },
  {
    title: "Seasonal Retail Showcase & Special Gift Guide",
    caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide",
    creator: "@seasonal_trends",
    category: "Shopping",
    videoUrl: "/videos/29_Seasonal_Retail_Showcase_Special_Gift_Gu.mp4",
    soundTitle: "Festive Joy Bells",
    durationSeconds: 15,
    likesCount: 261000,
    commentsCount: 5930,
    sharesCount: 20700,
  },
  {
    title: "High Yield Fixed Deposit Investment Guide",
    caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder",
    creator: "@invest_smart",
    category: "Finance",
    videoUrl: "/videos/31_High_Yield_Fixed_Deposit_Investment_Guid.mp4",
    soundTitle: "Prosperity Symphony",
    durationSeconds: 15,
    likesCount: 367000,
    commentsCount: 8710,
    sharesCount: 30500,
  },
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
    /(?:stream|player|image)\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8|\/|$|\?)/i,
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

fs.writeFileSync("src/lib/videos.ts", videosTs, "utf8");
console.log("Successfully wrote updated src/lib/videos.ts with all 30 downloaded videos!");
