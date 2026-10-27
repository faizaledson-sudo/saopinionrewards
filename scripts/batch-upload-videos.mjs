import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://conaleaks.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// 32 Generic, professional, non-specific titles & captions for banks, telecom, and popular companies
const GENERIC_TITLES = [
  {
    title: "Digital Banking & Smart Payments App",
    caption: "Explore quick digital payments, zero monthly fees, and instant transfers on mobile. 💳📱 #Banking #Finance",
    category: "Finance",
    creator: "@smart_banking",
  },
  {
    title: "Fast Mobile Transfers & Cash Rewards",
    caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards",
    category: "Banking",
    creator: "@digital_wallets",
  },
  {
    title: "Top Commercial Banking & Savings Features",
    caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney",
    category: "Finance",
    creator: "@banking_insights",
  },
  {
    title: "Everyday Brand Deals & Online Shopping",
    caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping",
    category: "Business",
    creator: "@mzansi_deals",
  },
  {
    title: "High-Speed Home Fibre & Unlimited Connectivity",
    caption: "Ultra-fast prepaid fibre for work, gaming, and family streaming at home. 🌐⚡ #HomeFibre #FastInternet",
    category: "Technology",
    creator: "@connect_sa",
  },
  {
    title: "Secure Account Security & Fraud Prevention",
    caption: "How biometric login and instant in-app card freezing keep your funds safe 24/7. 🔒🛡️ #TechSecurity #Safety",
    category: "Technology",
    creator: "@security_alert",
  },
  {
    title: "Business Banking & Merchant Card Machines",
    caption: "Speed up checkout and accept tap-to-pay from Visa, Mastercard, and digital wallets. 📈💼 #BusinessSA #Fintech",
    category: "Business",
    creator: "@enterprise_hub",
  },
  {
    title: "Personal Loans & Flexible Repayment Guide",
    caption: "Low fixed interest rates, transparent fees, and fast online approval from leading institutions. 🤝💰 #FinancialFreedom",
    category: "Finance",
    creator: "@money_guide_sa",
  },
  {
    title: "Loyalty Perks & Weekly Grocery Cashback",
    caption: "Earn points every time you fill up petrol or buy groceries at partner retailers. 🛒⛽ #Cashback #SmartShopper",
    category: "Shopping",
    creator: "@rewards_club",
  },
  {
    title: "Family Entertainment & Live Sports Streaming",
    caption: "Catch live football matches, series, and local movies on all your connected screens. 📺⚽ #EntertainmentSA",
    category: "Entertainment",
    creator: "@tv_africa",
  },
  {
    title: "Smart Budgeting & Automated Rainy Day Fund",
    caption: "Automate your daily round-ups and watch your emergency fund grow effortlessly. 📈🇿🇦 #SavingsGoals",
    category: "Finance",
    creator: "@budget_mzansi",
  },
  {
    title: "Contactless Tap & Pay Phone Wallet",
    caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo",
    category: "Banking",
    creator: "@pay_easy",
  },
  {
    title: "Refreshing Beverages & Summer Celebration Promo",
    caption: "Cool down with ice-cold classic beverages made for warm afternoons and braais. 🥤☀️ #SummerVibes #Mzansi",
    category: "Shopping",
    creator: "@refresh_sa",
  },
  {
    title: "Workplace Banking & Employee Financial Benefits",
    caption: "Special corporate banking perks, lower transaction charges, and dedicated support. 👔💼 #WorkplaceBanking",
    category: "Business",
    creator: "@corporate_perks",
  },
  {
    title: "Credit Card Perks & Travel Benefits",
    caption: "Airport lounge access, free travel insurance, and bonus reward points worldwide. ✈️💳 #TravelPerks #EliteBanking",
    category: "Finance",
    creator: "@lifestyle_banking",
  },
  {
    title: "Mobile App Feature Spotlight & Quick Tips",
    caption: "Check statements, buy prepaid electricity, and manage debit orders in just 3 clicks. 💡📱 #AppTips",
    category: "Technology",
    creator: "@smart_features",
  },
  {
    title: "Life Protection & Emergency Financial Safety",
    caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection",
    category: "Finance",
    creator: "@life_cover_sa",
  },
  {
    title: "Fast Deliveries & Digital Retail Special Deals",
    caption: "Same-day doorstep delivery on thousands of household essentials and top electronics. 📦🚀 #FastDelivery",
    category: "Shopping",
    creator: "@retail_deals",
  },
  {
    title: "Personalized Savings Plans & Rand Growth",
    caption: "Name your goal, lock in your fixed interest rate, and reach milestones faster. 🎯📊 #GoalSaver",
    category: "Finance",
    creator: "@rand_growth",
  },
  {
    title: "Leading Brand Spotlight & Commercial Showcase",
    caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase",
    category: "Business",
    creator: "@mzansi_brands",
  },
  {
    title: "Smart Home Tech & Wireless Broadband",
    caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle",
    category: "Technology",
    creator: "@broadband_za",
  },
  {
    title: "Cashback Swipes & Merchant Partner Savings",
    caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend",
    category: "Shopping",
    creator: "@swipe_and_save",
  },
  {
    title: "Youth & Student Banking Perks",
    caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi",
    category: "Banking",
    creator: "@student_banking",
  },
  {
    title: "Celebration Beats & Popular Media Commercial",
    caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats",
    category: "Entertainment",
    creator: "@vibes_mzansi",
  },
  {
    title: "Effortless Bill Payments & Municipal Accounts",
    caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay",
    category: "Finance",
    creator: "@pay_bills_easy",
  },
  {
    title: "Small Business Invoicing & Quick QR Payments",
    caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA",
    category: "Business",
    creator: "@biz_growth",
  },
  {
    title: "Everyday Fuel Rewards & Partner Petrol Stations",
    caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards",
    category: "Shopping",
    creator: "@fuel_saver",
  },
  {
    title: "Modern Banking for Freelancers & Creators",
    caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA",
    category: "Finance",
    creator: "@creator_economy",
  },
  {
    title: "Seasonal Retail Showcase & Special Gift Guide",
    caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide",
    category: "Shopping",
    creator: "@seasonal_trends",
  },
  {
    title: "Safe Instant Online Deposits & Digital Checkouts",
    caption: "Verified 3D secure payments that protect every single rand of your online orders. 🛡️💳 #SafeCheckout",
    category: "Technology",
    creator: "@secure_pay_za",
  },
  {
    title: "High Yield Fixed Deposit Investment Guide",
    caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder",
    category: "Finance",
    creator: "@invest_smart",
  },
  {
    title: "Community Growth & Entrepreneur Upliftment",
    caption: "Supporting local township businesses and youth skills development programs across SA. 🤝🇿🇦 #Ubuntu",
    category: "Business",
    creator: "@community_first",
  },
];

const TIERS = ["regular", "vip1", "vip2", "vip3"];

async function getMuxCredentials() {
  const { data, error } = await supabase
    .from("secure_settings")
    .select("key, value")
    .in("key", ["mux_token_id", "mux_token_secret"]);

  if (error || !data) {
    throw new Error(`Failed to read Mux settings: ${error?.message}`);
  }

  const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
  if (!map.mux_token_id || !map.mux_token_secret) {
    throw new Error("Mux API credentials not configured in secure_settings.");
  }

  return { tokenId: map.mux_token_id, tokenSecret: map.mux_token_secret };
}

async function uploadFileToMux(filePath, authHeader) {
  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  console.log(`\n📤 [1/3] Creating Mux direct upload for "${fileName}" (${(fileStats.size / (1024 * 1024)).toFixed(1)} MB)...`);

  // 1. Create Direct Upload URL
  const createRes = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_asset_settings: {
        playback_policy: ["public"],
      },
      cors_origin: "*",
    }),
  });

  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.data?.url) {
    throw new Error(`Failed to create Mux upload: ${JSON.stringify(createJson)}`);
  }

  const uploadUrl = createJson.data.url;
  const uploadId = createJson.data.id;

  // 2. Stream File to Mux
  console.log(`🚀 [2/3] Uploading file to Mux storage...`);
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: fileBuffer,
    headers: {
      "Content-Length": String(fileStats.size),
    },
  });

  if (!putRes.ok) {
    throw new Error(`Mux upload HTTP failed: ${putRes.status} ${putRes.statusText}`);
  }

  // 3. Poll Mux until asset is encoded and Playback ID is ready
  console.log(`⚙️  [3/3] Encoding video and generating HLS stream on Mux...`);
  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    await new Promise((r) => setTimeout(r, 2000));

    const checkRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });
    const checkJson = await checkRes.json();
    const assetId = checkJson.data?.asset_id;

    if (assetId) {
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      const assetJson = await assetRes.json();
      const asset = assetJson.data;

      if (asset?.status === "ready" && asset.playback_ids?.[0]?.id) {
        const playbackId = asset.playback_ids[0].id;
        console.log(`✅ Ready! Playback ID: ${playbackId}`);
        return playbackId;
      } else if (asset?.status === "errored") {
        throw new Error(`Mux asset encoding failed: ${JSON.stringify(asset.errors)}`);
      }
    }
  }

  throw new Error("Timed out waiting for Mux asset processing.");
}

async function main() {
  const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : "/Users/green/Downloads/MUX";

  console.log(`====================================================`);
  console.log(`📁 Scanning folder for videos: ${targetDir}`);
  console.log(`====================================================`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Folder not found: ${targetDir}`);
    return;
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((f) => /\.(mp4|mov|webm|m4v|mkv)$/i.test(f) && !f.startsWith("."))
    .sort();

  if (files.length === 0) {
    console.log(`⚠️  No video files found in ${targetDir}.`);
    return;
  }

  console.log(`🎬 Found ${files.length} video(s) to upload:\n` + files.map((f, i) => `   ${i + 1}. ${f}`).join("\n"));

  const { tokenId, tokenSecret } = await getMuxCredentials();
  const authHeader = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  // Fetch current active surveys to update them, or insert new ones
  const { data: existingSurveys } = await supabase
    .from("surveys")
    .select("id, min_tier")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const activeSurveysList = existingSurveys || [];
  console.log(`\n📋 Found ${activeSurveysList.length} existing active surveys in DB to update/enrich.`);

  let uploadedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const fullPath = path.join(targetDir, fileName);
    const meta = GENERIC_TITLES[i % GENERIC_TITLES.length];
    const tier = TIERS[i % TIERS.length];

    console.log(`\n----------------------------------------------------`);
    console.log(`[${i + 1}/${files.length}] Processing "${fileName}"`);
    console.log(`Title: "${meta.title} — ${tier.toUpperCase()}"`);

    try {
      const playbackId = await uploadFileToMux(fullPath, authHeader);

      const descriptionPayload = JSON.stringify({
        video_url: playbackId,
        creator: meta.creator,
        caption: meta.caption,
        duration: 15,
      });

      // If we have an existing survey slot, update it; otherwise insert a new one
      if (i < activeSurveysList.length) {
        const surveyId = activeSurveysList[i].id;
        const surveyTier = activeSurveysList[i].min_tier || tier;
        const { error: updateError } = await supabase
          .from("surveys")
          .update({
            title: `${meta.title} — ${surveyTier.toUpperCase()}`,
            description: descriptionPayload,
            category: meta.category,
            min_tier: surveyTier,
            estimated_minutes: 1,
            status: "active",
          })
          .eq("id", surveyId);

        if (updateError) {
          console.error(`❌ Failed to update survey ${surveyId}:`, updateError.message);
        } else {
          console.log(`🎉 Updated existing survey ${surveyId}! [${surveyTier.toUpperCase()}] "${meta.title}"`);
          uploadedCount++;
        }
      } else {
        const { data: newSurvey, error: insertError } = await supabase
          .from("surveys")
          .insert({
            title: `${meta.title} — ${tier.toUpperCase()}`,
            description: descriptionPayload,
            category: meta.category,
            min_tier: tier,
            estimated_minutes: 1,
            status: "active",
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to insert new survey:`, insertError.message);
        } else {
          console.log(`🎉 Inserted new survey ${newSurvey.id}! [${tier.toUpperCase()}] "${newSurvey.title}"`);
          uploadedCount++;
        }
      }
    } catch (err) {
      console.error(`❌ Error uploading "${fileName}":`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n====================================================`);
  console.log(`✨ ALL DONE! Successfully uploaded and published ${uploadedCount}/${files.length} videos to Mux & Supabase!`);
  console.log(`====================================================`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
