export type VideoTask = {
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
  {
    title: "Fast Mobile Transfers & Cash Rewards",
    caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards #BankingSA",
    creator: "@digital_wallets",
    category: "Banking",
    videoUrl: "https://stream.mux.com/RlOWn2N00KGr2dwVC7xdaVjBVHQ7ptzmY7FRGfJaLdJA.m3u8",
    soundTitle: "Digital Transfer Beat - SA Official",
    durationSeconds: 15,
    likesCount: 155000,
    commentsCount: 3120,
    sharesCount: 10350,
  },
  {
    title: "Top Commercial Banking & Savings Features",
    caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney #Capitec",
    creator: "@banking_insights",
    category: "Finance",
    videoUrl: "https://stream.mux.com/w00mC5b1hZyi82Y6OhtPz8kFMbvQbRrtkMnl021QjHTAM.m3u8",
    soundTitle: "Savings Growth Acoustic",
    durationSeconds: 15,
    likesCount: 160000,
    commentsCount: 3240,
    sharesCount: 10700,
  },
  {
    title: "Everyday Brand Deals & Online Shopping",
    caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping #SmartShopper",
    creator: "@mzansi_deals",
    category: "Business",
    videoUrl: "https://stream.mux.com/AdPmibTrZsiabXIxe6J2OcDizH4Ixjy533f01k2N7eBU.m3u8",
    soundTitle: "Retail Rhythm - Shopping SA",
    durationSeconds: 15,
    likesCount: 165000,
    commentsCount: 3360,
    sharesCount: 11050,
  },
  {
    title: "High-Speed Home Fibre & Unlimited Connectivity",
    caption: "Ultra-fast prepaid fibre for work, gaming, and family streaming at home. 🌐⚡ #HomeFibre #FastInternet",
    creator: "@connect_sa",
    category: "Technology",
    videoUrl: "https://stream.mux.com/02v8hwwj6z7kZicPOcTqrct9iFUXSVaCjIGpqJ91Yozg.m3u8",
    soundTitle: "High Speed Digital Flow",
    durationSeconds: 15,
    likesCount: 170000,
    commentsCount: 3480,
    sharesCount: 11400,
  },
  {
    title: "Digital Banking & Smart Payments App",
    caption: "Explore quick digital payments, zero monthly fees, and instant transfers on mobile. 💳📱 #Banking #Finance #SA",
    creator: "@smart_banking",
    category: "Banking",
    videoUrl: "https://stream.mux.com/dhUxok009RDorKvUPOslNbBfFNPWJ7U7cp5zqzUYb83E.m3u8",
    soundTitle: "Smart Payment Chime",
    durationSeconds: 15,
    likesCount: 175000,
    commentsCount: 3600,
    sharesCount: 11750,
  },
  {
    title: "Secure Account Security & Fraud Prevention",
    caption: "How biometric login and instant in-app card freezing keep your funds safe 24/7. 🔒🛡️ #TechSecurity #Safety",
    creator: "@security_alert",
    category: "Technology",
    videoUrl: "https://stream.mux.com/S3MrqXX601EYmELi8AnNEvQY00vaFFKy1mUmu2EtwOt028.m3u8",
    soundTitle: "Secure Vault Theme",
    durationSeconds: 15,
    likesCount: 180000,
    commentsCount: 3720,
    sharesCount: 12100,
  },
  {
    title: "Business Banking & Merchant Card Machines",
    caption: "Speed up checkout and accept tap-to-pay from Visa, Mastercard, and digital wallets. 📈💼 #BusinessSA #Fintech",
    creator: "@enterprise_hub",
    category: "Business",
    videoUrl: "https://stream.mux.com/c2n8H2Lp5TJFrVxJt2MKbZLyykIcuRhWLNnzdsDbPn4.m3u8",
    soundTitle: "Business Growth Symphony",
    durationSeconds: 15,
    likesCount: 185000,
    commentsCount: 3840,
    sharesCount: 12450,
  },
  {
    title: "Personal Loans & Flexible Repayment Guide",
    caption: "Low fixed interest rates, transparent fees, and fast online approval from leading institutions. 🤝💰 #FinancialFreedom",
    creator: "@money_guide_sa",
    category: "Finance",
    videoUrl: "https://stream.mux.com/o00qFBYgvtWzCbFLA2szvxj02lQdx7V02cdjGLqDML2xgc.m3u8",
    soundTitle: "Financial Clarity Beat",
    durationSeconds: 15,
    likesCount: 190000,
    commentsCount: 3960,
    sharesCount: 12800,
  },
  {
    title: "Family Entertainment & Live Sports Streaming",
    caption: "Catch live football matches, series, and local movies on all your connected screens. 📺⚽ #EntertainmentSA",
    creator: "@tv_africa",
    category: "Entertainment",
    videoUrl: "https://stream.mux.com/lccS6HkYiAZY02Z8yNfSsAsailYlhi28Dt33pQoMjsmE.m3u8",
    soundTitle: "Stadium Anthem Vibes",
    durationSeconds: 15,
    likesCount: 195000,
    commentsCount: 4080,
    sharesCount: 13150,
  },
  {
    title: "Refreshing Beverages & Summer Celebration Promo",
    caption: "Cool down with ice-cold classic beverages made for warm afternoons and braais. 🥤☀️ #SummerVibes #Mzansi",
    creator: "@refresh_sa",
    category: "Shopping",
    videoUrl: "https://stream.mux.com/tJR4HsDXMgAFt1ddnBGpg6L1bGBWgM302uH4CCo01bQR8.m3u8",
    soundTitle: "Mzansi Summer Beats",
    durationSeconds: 15,
    likesCount: 200000,
    commentsCount: 4200,
    sharesCount: 13500,
  },
  {
    title: "Workplace Banking & Employee Financial Benefits",
    caption: "Special corporate banking perks, lower transaction charges, and dedicated support. 👔💼 #WorkplaceBanking",
    creator: "@corporate_perks",
    category: "Business",
    videoUrl: "/videos/11_Workplace_Banking_Employee_Financial_Ben.mp4",
    soundTitle: "Professional Pulse Beat",
    durationSeconds: 15,
    likesCount: 205000,
    commentsCount: 4320,
    sharesCount: 13850,
  },
  {
    title: "Smart Budgeting & Automated Rainy Day Fund",
    caption: "Automate your daily round-ups and watch your emergency fund grow effortlessly. 📈🇿🇦 #SavingsGoals",
    creator: "@budget_mzansi",
    category: "Finance",
    videoUrl: "/videos/12_Smart_Budgeting_Automated_Rainy_Day_Fund.mp4",
    soundTitle: "Daily Savings Acoustic",
    durationSeconds: 15,
    likesCount: 210000,
    commentsCount: 4440,
    sharesCount: 14200,
  },
  {
    title: "Credit Card Perks & Travel Benefits",
    caption: "Airport lounge access, free travel insurance, and bonus reward points worldwide. ✈️💳 #TravelPerks #EliteBanking",
    creator: "@lifestyle_banking",
    category: "Finance",
    videoUrl: "/videos/13_Credit_Card_Perks_Travel_Benefits_VIP2.mp4",
    soundTitle: "Global Jetsetter Grooves",
    durationSeconds: 15,
    likesCount: 215000,
    commentsCount: 4560,
    sharesCount: 14550,
  },
  {
    title: "Mobile App Feature Spotlight & Quick Tips",
    caption: "Check statements, buy prepaid electricity, and manage debit orders in just 3 clicks. 💡📱 #AppTips",
    creator: "@smart_features",
    category: "Technology",
    videoUrl: "/videos/14_Mobile_App_Feature_Spotlight_Quick_Tips_.mp4",
    soundTitle: "Digital Quick Tips Flow",
    durationSeconds: 15,
    likesCount: 220000,
    commentsCount: 4680,
    sharesCount: 14900,
  },
  {
    title: "Loyalty Perks & Weekly Grocery Cashback",
    caption: "Earn points every time you fill up petrol or buy groceries at partner retailers. 🛒⛽ #Cashback #SmartShopper",
    creator: "@rewards_club",
    category: "Shopping",
    videoUrl: "/videos/15_Loyalty_Perks_Weekly_Grocery_Cashback_VI.mp4",
    soundTitle: "Cashback Reward Chime",
    durationSeconds: 15,
    likesCount: 225000,
    commentsCount: 4800,
    sharesCount: 15250,
  },
  {
    title: "Contactless Tap & Pay Phone Wallet",
    caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo #MobilePay",
    creator: "@pay_easy",
    category: "Banking",
    videoUrl: "/videos/16_Contactless_Tap_Pay_Phone_Wallet_VIP3.mp4",
    soundTitle: "Tap & Go Modern Rhythm",
    durationSeconds: 15,
    likesCount: 230000,
    commentsCount: 4920,
    sharesCount: 15600,
  },
  {
    title: "Life Protection & Emergency Financial Safety",
    caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection",
    creator: "@family_secure",
    category: "Finance",
    videoUrl: "/videos/17_Life_Protection_Emergency_Financial_Safe.mp4",
    soundTitle: "Peace of Mind Acoustic",
    durationSeconds: 15,
    likesCount: 235000,
    commentsCount: 5040,
    sharesCount: 15950,
  },
  {
    title: "Fast Deliveries & Digital Retail Special Deals",
    caption: "Order essentials and electronics online with same-day doorstep delivery across South Africa. 📦🚚 #FastDelivery",
    creator: "@express_retail",
    category: "Shopping",
    videoUrl: "/videos/18_Fast_Deliveries_Digital_Retail_Special_D.mp4",
    soundTitle: "Delivery Groove Beats",
    durationSeconds: 15,
    likesCount: 240000,
    commentsCount: 5160,
    sharesCount: 16300,
  },
  {
    title: "Personalized Savings Plans & Rand Growth",
    caption: "Smart goal-based accounts designed to help you reach your milestone targets faster. 💰🎯 #SmartInvest",
    creator: "@rand_growth",
    category: "Finance",
    videoUrl: "/videos/19_Personalized_Savings_Plans_Rand_Growth_V.mp4",
    soundTitle: "Financial Horizon Theme",
    durationSeconds: 15,
    likesCount: 245000,
    commentsCount: 5280,
    sharesCount: 16650,
  },
  {
    title: "Leading Brand Spotlight & Commercial Showcase",
    caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase",
    creator: "@mzansi_brands",
    category: "Business",
    videoUrl: "/videos/20_Leading_Brand_Spotlight_Commercial_Showc.mp4",
    soundTitle: "Inspiring Innovation Pulse",
    durationSeconds: 15,
    likesCount: 250000,
    commentsCount: 5400,
    sharesCount: 17000,
  },
  {
    title: "Smart Home Tech & Wireless Broadband",
    caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle",
    creator: "@broadband_za",
    category: "Technology",
    videoUrl: "/videos/21_Smart_Home_Tech_Wireless_Broadband_VIP2.mp4",
    soundTitle: "Smart Tech Connectivity",
    durationSeconds: 15,
    likesCount: 255000,
    commentsCount: 5520,
    sharesCount: 17350,
  },
  {
    title: "Cashback Swipes & Merchant Partner Savings",
    caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend",
    creator: "@swipe_and_save",
    category: "Shopping",
    videoUrl: "/videos/22_Cashback_Swipes_Merchant_Partner_Savings.mp4",
    soundTitle: "Partner Savings Harmony",
    durationSeconds: 15,
    likesCount: 260000,
    commentsCount: 5640,
    sharesCount: 17700,
  },
  {
    title: "Youth & Student Banking Perks",
    caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi",
    creator: "@student_banking",
    category: "Banking",
    videoUrl: "/videos/23_Youth_Student_Banking_Perks_VIP2.mp4",
    soundTitle: "Youth Energy Beat",
    durationSeconds: 15,
    likesCount: 265000,
    commentsCount: 5760,
    sharesCount: 18050,
  },
  {
    title: "Celebration Beats & Popular Media Commercial",
    caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats",
    creator: "@vibes_mzansi",
    category: "Entertainment",
    videoUrl: "/videos/24_Celebration_Beats_Popular_Media_Commerci.mp4",
    soundTitle: "Mzansi Beats Anthem",
    durationSeconds: 15,
    likesCount: 270000,
    commentsCount: 5880,
    sharesCount: 18400,
  },
  {
    title: "Effortless Bill Payments & Municipal Accounts",
    caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay",
    creator: "@pay_bills_easy",
    category: "Finance",
    videoUrl: "/videos/25_Effortless_Bill_Payments_Municipal_Accou.mp4",
    soundTitle: "Effortless Solutions Acoustic",
    durationSeconds: 15,
    likesCount: 275000,
    commentsCount: 6000,
    sharesCount: 18750,
  },
  {
    title: "Small Business Invoicing & Quick QR Payments",
    caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA #Fintech",
    creator: "@biz_growth",
    category: "Business",
    videoUrl: "/videos/26_Small_Business_Invoicing_Quick_QR_Paymen.mp4",
    soundTitle: "Entrepreneur Pulse Beat",
    durationSeconds: 15,
    likesCount: 280000,
    commentsCount: 6120,
    sharesCount: 19100,
  },
  {
    title: "Everyday Fuel Rewards & Partner Petrol Stations",
    caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards",
    creator: "@fuel_saver",
    category: "Shopping",
    videoUrl: "/videos/27_Everyday_Fuel_Rewards_Partner_Petrol_Sta.mp4",
    soundTitle: "Open Road Highway Theme",
    durationSeconds: 15,
    likesCount: 285000,
    commentsCount: 6240,
    sharesCount: 19450,
  },
  {
    title: "Modern Banking for Freelancers & Creators",
    caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA",
    creator: "@creator_economy",
    category: "Finance",
    videoUrl: "/videos/28_Modern_Banking_for_Freelancers_Creators_.mp4",
    soundTitle: "Creator Vibe Lounge",
    durationSeconds: 15,
    likesCount: 290000,
    commentsCount: 6360,
    sharesCount: 19800,
  },
  {
    title: "Seasonal Retail Showcase & Special Gift Guide",
    caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide",
    creator: "@seasonal_trends",
    category: "Shopping",
    videoUrl: "/videos/29_Seasonal_Retail_Showcase_Special_Gift_Gu.mp4",
    soundTitle: "Festive Joy Bells",
    durationSeconds: 15,
    likesCount: 295000,
    commentsCount: 6480,
    sharesCount: 20150,
  },
  {
    title: "High Yield Fixed Deposit Investment Guide",
    caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder",
    creator: "@invest_smart",
    category: "Finance",
    videoUrl: "/videos/31_High_Yield_Fixed_Deposit_Investment_Guid.mp4",
    soundTitle: "Prosperity Symphony",
    durationSeconds: 15,
    likesCount: 300000,
    commentsCount: 6600,
    sharesCount: 20500,
  },
];

export function cleanVideoUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) return iframeMatch[1].trim();
  return trimmed;
}

export function getMuxPlaybackId(url: string): string | null {
  if (!url) return null;
  const cleaned = cleanVideoUrl(url);
  const match = cleaned.match(/(?:stream|player|image)\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8|\/|$|\?)/i);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{15,64}$/.test(cleaned) && !cleaned.includes("http") && !cleaned.includes(".") && !cleaned.includes("/")) {
    return cleaned;
  }
  return null;
}

export function getMuxStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1&fit_mode=smartcrop&width=720&height=1280`;
}

export function isHlsStream(url: string): boolean {
  if (!url) return false;
  return url.includes(".m3u8") || url.includes("stream.mux.com") || Boolean(getMuxPlaybackId(url));
}

export function resolveVideoTask(
  survey: {
    id: string;
    title?: string | null;
    description?: string | null;
    category?: string | null;
    estimated_minutes?: number | null;
    reward?: number | null;
  },
  taskIndex?: number,
): VideoTask {
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
    } catch {}
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

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleaned = cleanVideoUrl(url);
  const match = cleaned.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
  );
  if (!match) return null;
  const videoId = match[1];
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&playsinline=1&rel=0&modestbranding=1`;
}
