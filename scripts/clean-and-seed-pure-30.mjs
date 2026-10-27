import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const supabaseUrl = "https://chlezybvyqyksyiupudj.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobGV6eWJ2eXF5a3N5aXVwdWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzNDc2MCwiZXhwIjoyMTA3ODEwNzYwfQ.veha6Zw8ZNBZKyAQ5gR48Tur6TAVJCqFB0oYUojXOWY";
const supabase = createClient(supabaseUrl, serviceKey);

// THE EXACT 30 DOWNLOADED VIDEOS FROM videos-baixados-sa-opinion-rewards
const PURE_30 = [
  { index: 1, file: "01_Fast_Mobile_Transfers_Cash_Rewards_VIP1.mp4", title: "Fast Mobile Transfers & Cash Rewards", caption: "Send money instantly to anyone, earn cashback rewards on everyday card swipes! 💸✨ #MobileMoney #Rewards #BankingSA", category: "Banking", creator: "@digital_wallets", sound: "Digital Transfer Beat - SA Official", stream: "https://stream.mux.com/RlOWn2N00KGr2dwVC7xdaVjBVHQ7ptzmY7FRGfJaLdJA.m3u8" },
  { index: 2, file: "02_Top_Commercial_Banking_Savings_Features_.mp4", title: "Top Commercial Banking & Savings Features", caption: "High-interest savings, automated budgeting, and seamless cardless withdrawals. 🏦📊 #Savings #SmartMoney #Capitec", category: "Finance", creator: "@banking_insights", sound: "Savings Growth Acoustic", stream: "https://stream.mux.com/w00mC5b1hZyi82Y6OhtPz8kFMbvQbRrtkMnl021QjHTAM.m3u8" },
  { index: 3, file: "03_Everyday_Brand_Deals_Online_Shopping_VIP.mp4", title: "Everyday Brand Deals & Online Shopping", caption: "Special offers and discounts when paying with your verified digital card. 🛍️🔥 #Deals #Shopping #SmartShopper", category: "Business", creator: "@mzansi_deals", sound: "Retail Rhythm - Shopping SA", stream: "https://stream.mux.com/AdPmibTrZsiabXIxe6J2OcDizH4Ixjy533f01k2N7eBU.m3u8" },
  { index: 4, file: "04_High_Speed_Home_Fibre_Unlimited_Connecti.mp4", title: "High-Speed Home Fibre & Unlimited Connectivity", caption: "Ultra-fast prepaid fibre for work, gaming, and family streaming at home. 🌐⚡ #HomeFibre #FastInternet", category: "Technology", creator: "@connect_sa", sound: "High Speed Digital Flow", stream: "https://stream.mux.com/02v8hwwj6z7kZicPOcTqrct9iFUXSVaCjIGpqJ91Yozg.m3u8" },
  { index: 5, file: "05_Digital_Banking_Smart_Payments_App_VIP1.mp4", title: "Digital Banking & Smart Payments App", caption: "Explore quick digital payments, zero monthly fees, and instant transfers on mobile. 💳📱 #Banking #Finance #SA", category: "Banking", creator: "@smart_banking", sound: "Smart Payment Chime", stream: "https://stream.mux.com/dhUxok009RDorKvUPOslNbBfFNPWJ7U7cp5zqzUYb83E.m3u8" },
  { index: 6, file: "06_Secure_Account_Security_Fraud_Prevention.mp4", title: "Secure Account Security & Fraud Prevention", caption: "How biometric login and instant in-app card freezing keep your funds safe 24/7. 🔒🛡️ #TechSecurity #Safety", category: "Technology", creator: "@security_alert", sound: "Secure Vault Theme", stream: "https://stream.mux.com/S3MrqXX601EYmELi8AnNEvQY00vaFFKy1mUmu2EtwOt028.m3u8" },
  { index: 7, file: "07_Business_Banking_Merchant_Card_Machines_.mp4", title: "Business Banking & Merchant Card Machines", caption: "Speed up checkout and accept tap-to-pay from Visa, Mastercard, and digital wallets. 📈💼 #BusinessSA #Fintech", category: "Business", creator: "@enterprise_hub", sound: "Business Growth Symphony", stream: "https://stream.mux.com/c2n8H2Lp5TJFrVxJt2MKbZLyykIcuRhWLNnzdsDbPn4.m3u8" },
  { index: 8, file: "08_Personal_Loans_Flexible_Repayment_Guide_.mp4", title: "Personal Loans & Flexible Repayment Guide", caption: "Low fixed interest rates, transparent fees, and fast online approval from leading institutions. 🤝💰 #FinancialFreedom", category: "Finance", creator: "@money_guide_sa", sound: "Financial Clarity Beat", stream: "https://stream.mux.com/o00qFBYgvtWzCbFLA2szvxj02lQdx7V02cdjGLqDML2xgc.m3u8" },
  { index: 9, file: "09_Family_Entertainment_Live_Sports_Streami.mp4", title: "Family Entertainment & Live Sports Streaming", caption: "Catch live football matches, series, and local movies on all your connected screens. 📺⚽ #EntertainmentSA", category: "Entertainment", creator: "@tv_africa", sound: "Stadium Anthem Vibes", stream: "https://stream.mux.com/lccS6HkYiAZY02Z8yNfSsAsailYlhi28Dt33pQoMjsmE.m3u8" },
  { index: 10, file: "10_Refreshing_Beverages_Summer_Celebration_.mp4", title: "Refreshing Beverages & Summer Celebration Promo", caption: "Cool down with ice-cold classic beverages made for warm afternoons and braais. 🥤☀️ #SummerVibes #Mzansi", category: "Shopping", creator: "@refresh_sa", sound: "Mzansi Summer Beats", stream: "https://stream.mux.com/tJR4HsDXMgAFt1ddnBGpg6L1bGBWgM302uH4CCo01bQR8.m3u8" },
  { index: 11, file: "11_Workplace_Banking_Employee_Financial_Ben.mp4", title: "Workplace Banking & Employee Financial Benefits", caption: "Special corporate banking perks, lower transaction charges, and dedicated support. 👔💼 #WorkplaceBanking", category: "Business", creator: "@corporate_perks", sound: "Professional Pulse Beat", stream: `${supabaseUrl}/storage/v1/object/public/videos/11_Workplace_Banking_Employee_Financial_Ben.mp4` },
  { index: 12, file: "12_Smart_Budgeting_Automated_Rainy_Day_Fund.mp4", title: "Smart Budgeting & Automated Rainy Day Fund", caption: "Automate your daily round-ups and watch your emergency fund grow effortlessly. 📈🇿🇦 #SavingsGoals", category: "Finance", creator: "@budget_mzansi", sound: "Daily Savings Acoustic", stream: `${supabaseUrl}/storage/v1/object/public/videos/12_Smart_Budgeting_Automated_Rainy_Day_Fund.mp4` },
  { index: 13, file: "13_Credit_Card_Perks_Travel_Benefits_VIP2.mp4", title: "Credit Card Perks & Travel Benefits", caption: "Airport lounge access, free travel insurance, and bonus reward points worldwide. ✈️💳 #TravelPerks #EliteBanking", category: "Finance", creator: "@lifestyle_banking", sound: "Global Jetsetter Grooves", stream: `${supabaseUrl}/storage/v1/object/public/videos/13_Credit_Card_Perks_Travel_Benefits_VIP2.mp4` },
  { index: 14, file: "14_Mobile_App_Feature_Spotlight_Quick_Tips_.mp4", title: "Mobile App Feature Spotlight & Quick Tips", caption: "Check statements, buy prepaid electricity, and manage debit orders in just 3 clicks. 💡📱 #AppTips", category: "Technology", creator: "@smart_features", sound: "Digital Quick Tips Flow", stream: `${supabaseUrl}/storage/v1/object/public/videos/14_Mobile_App_Feature_Spotlight_Quick_Tips_.mp4` },
  { index: 15, file: "15_Loyalty_Perks_Weekly_Grocery_Cashback_VI.mp4", title: "Loyalty Perks & Weekly Grocery Cashback", caption: "Earn points every time you fill up petrol or buy groceries at partner retailers. 🛒⛽ #Cashback #SmartShopper", category: "Shopping", creator: "@rewards_club", sound: "Cashback Reward Chime", stream: `${supabaseUrl}/storage/v1/object/public/videos/15_Loyalty_Perks_Weekly_Grocery_Cashback_VI.mp4` },
  { index: 16, file: "16_Contactless_Tap_Pay_Phone_Wallet_VIP3.mp4", title: "Contactless Tap & Pay Phone Wallet", caption: "No card needed! Just tap your smartphone at checkout for instant, touchless payments. 📲✨ #TapAndGo #MobilePay", category: "Banking", creator: "@pay_easy", sound: "Tap & Go Modern Rhythm", stream: `${supabaseUrl}/storage/v1/object/public/videos/16_Contactless_Tap_Pay_Phone_Wallet_VIP3.mp4` },
  { index: 17, file: "17_Life_Protection_Emergency_Financial_Safe.mp4", title: "Life Protection & Emergency Financial Safety", caption: "Affordable family cover with instant online policy setup and zero medical paperwork. 🛡️👨‍👩‍👧‍👦 #FamilyProtection", category: "Finance", creator: "@family_secure", sound: "Peace of Mind Acoustic", stream: `${supabaseUrl}/storage/v1/object/public/videos/17_Life_Protection_Emergency_Financial_Safe.mp4` },
  { index: 18, file: "18_Fast_Deliveries_Digital_Retail_Special_D.mp4", title: "Fast Deliveries & Digital Retail Special Deals", caption: "Order essentials and electronics online with same-day doorstep delivery across South Africa. 📦🚚 #FastDelivery", category: "Shopping", creator: "@express_retail", sound: "Delivery Groove Beats", stream: `${supabaseUrl}/storage/v1/object/public/videos/18_Fast_Deliveries_Digital_Retail_Special_D.mp4` },
  { index: 19, file: "19_Personalized_Savings_Plans_Rand_Growth_V.mp4", title: "Personalized Savings Plans & Rand Growth", caption: "Smart goal-based accounts designed to help you reach your milestone targets faster. 💰🎯 #SmartInvest", category: "Finance", creator: "@rand_growth", sound: "Financial Horizon Theme", stream: `${supabaseUrl}/storage/v1/object/public/videos/19_Personalized_Savings_Plans_Rand_Growth_V.mp4` },
  { index: 20, file: "20_Leading_Brand_Spotlight_Commercial_Showc.mp4", title: "Leading Brand Spotlight & Commercial Showcase", caption: "Behind the scenes with some of the most trusted brands across Southern Africa. 🌟🇿🇦 #BrandShowcase", category: "Business", creator: "@mzansi_brands", sound: "Inspiring Innovation Pulse", stream: `${supabaseUrl}/storage/v1/object/public/videos/20_Leading_Brand_Spotlight_Commercial_Showc.mp4` },
  { index: 21, file: "21_Smart_Home_Tech_Wireless_Broadband_VIP2.mp4", title: "Smart Home Tech & Wireless Broadband", caption: "Reliable plug-and-play LTE & 5G connectivity keeping your whole household connected. 📡⚡ #TechLifestyle", category: "Technology", creator: "@broadband_za", sound: "Smart Tech Connectivity", stream: `${supabaseUrl}/storage/v1/object/public/videos/21_Smart_Home_Tech_Wireless_Broadband_VIP2.mp4` },
  { index: 22, file: "22_Cashback_Swipes_Merchant_Partner_Savings.mp4", title: "Cashback Swipes & Merchant Partner Savings", caption: "Get up to 15% cashback automatically credited to your wallet at partner stores. 💳🎉 #SaveWhileYouSpend", category: "Shopping", creator: "@swipe_and_save", sound: "Partner Savings Harmony", stream: `${supabaseUrl}/storage/v1/object/public/videos/22_Cashback_Swipes_Merchant_Partner_Savings.mp4` },
  { index: 23, file: "23_Youth_Student_Banking_Perks_VIP2.mp4", title: "Youth & Student Banking Perks", caption: "Zero account fees, free digital statements, and student discounts everywhere. 🎓🎒 #StudentLife #YoungMzansi", category: "Banking", creator: "@student_banking", sound: "Youth Energy Beat", stream: `${supabaseUrl}/storage/v1/object/public/videos/23_Youth_Student_Banking_Perks_VIP2.mp4` },
  { index: 24, file: "24_Celebration_Beats_Popular_Media_Commerci.mp4", title: "Celebration Beats & Popular Media Commercial", caption: "Energetic rhythms, dance moves, and uplifting community moments across SA. 🎶💃 #AfricanMusic #Beats", category: "Entertainment", creator: "@vibes_mzansi", sound: "Mzansi Beats Anthem", stream: `${supabaseUrl}/storage/v1/object/public/videos/24_Celebration_Beats_Popular_Media_Commerci.mp4` },
  { index: 25, file: "25_Effortless_Bill_Payments_Municipal_Accou.mp4", title: "Effortless Bill Payments & Municipal Accounts", caption: "Pay water, electricity, traffic fines, and rates directly from your banking dashboard. 🧾✅ #EasyPay", category: "Finance", creator: "@pay_bills_easy", sound: "Effortless Solutions Acoustic", stream: `${supabaseUrl}/storage/v1/object/public/videos/25_Effortless_Bill_Payments_Municipal_Accou.mp4` },
  { index: 26, file: "26_Small_Business_Invoicing_Quick_QR_Paymen.mp4", title: "Small Business Invoicing & Quick QR Payments", caption: "Generate dynamic QR codes and get paid directly by customers on their phones. 📲🏢 #SME_SA #Fintech", category: "Business", creator: "@biz_growth", sound: "Entrepreneur Pulse Beat", stream: `${supabaseUrl}/storage/v1/object/public/videos/26_Small_Business_Invoicing_Quick_QR_Paymen.mp4` },
  { index: 27, file: "27_Everyday_Fuel_Rewards_Partner_Petrol_Sta.mp4", title: "Everyday Fuel Rewards & Partner Petrol Stations", caption: "Swipe your loyalty card at the pump and earn Rands back every single litre. ⛽🚗 #FuelRewards", category: "Shopping", creator: "@fuel_saver", sound: "Open Road Highway Theme", stream: `${supabaseUrl}/storage/v1/object/public/videos/27_Everyday_Fuel_Rewards_Partner_Petrol_Sta.mp4` },
  { index: 28, file: "28_Modern_Banking_for_Freelancers_Creators_.mp4", title: "Modern Banking for Freelancers & Creators", caption: "Receive payments from local and international clients with transparent conversion. 💻🌍 #FreelanceSA", category: "Finance", creator: "@creator_economy", sound: "Creator Vibe Lounge", stream: `${supabaseUrl}/storage/v1/object/public/videos/28_Modern_Banking_for_Freelancers_Creators_.mp4` },
  { index: 29, file: "29_Seasonal_Retail_Showcase_Special_Gift_Gu.mp4", title: "Seasonal Retail Showcase & Special Gift Guide", caption: "The most trending gifts, home decor, and fashion picks for every family celebration. 🎁✨ #GiftGuide", category: "Shopping", creator: "@seasonal_trends", sound: "Festive Joy Bells", stream: `${supabaseUrl}/storage/v1/object/public/videos/29_Seasonal_Retail_Showcase_Special_Gift_Gu.mp4` },
  { index: 30, file: "31_High_Yield_Fixed_Deposit_Investment_Guid.mp4", title: "High Yield Fixed Deposit Investment Guide", caption: "Lock away surplus funds for 3, 6, or 12 months with guaranteed competitive returns. 📈🏦 #WealthBuilder", category: "Finance", creator: "@invest_smart", sound: "Prosperity Symphony", stream: `${supabaseUrl}/storage/v1/object/public/videos/31_High_Yield_Fixed_Deposit_Investment_Guid.mp4` },
];

async function main() {
  console.log("🧹 Purging all old/mixed surveys and seeding EXACTLY the 30 downloaded videos...");

  // 1. Get all current survey IDs in Supabase
  const { data: currentSurveys } = await supabase.from("surveys").select("id");
  const validIds = new Set(
    PURE_30.map((v) => `00000000-0000-4000-8000-${String(v.index).padStart(12, "0")}`)
  );

  // Delete any old surveys not in validIds
  for (const s of currentSurveys || []) {
    if (!validIds.has(s.id)) {
      console.log(`Deleting mixed/old survey: ${s.id}`);
      await supabase.from("surveys").delete().eq("id", s.id);
    }
  }

  // 2. Upsert the EXACT 30 PURE downloaded videos
  for (const item of PURE_30) {
    const surveyId = `00000000-0000-4000-8000-${String(item.index).padStart(12, "0")}`;
    const { error } = await supabase.from("surveys").upsert({
      id: surveyId,
      title: item.title,
      description: item.stream,
      category: item.category,
      min_tier: "regular",
      estimated_minutes: 1,
      status: "active",
      created_at: new Date(Date.now() - (31 - item.index) * 60000).toISOString(),
    }, { onConflict: "id" });

    if (error) {
      console.error(`Error inserting ${surveyId}:`, error);
    } else {
      console.log(`✓ Task ${item.index}: ${item.title}`);
    }
  }

  // 3. Clear responses for fresh sequence testing
  console.log("\nResetting responses table for fresh 5-daily sequence...");
  await supabase.from("responses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("daily_activity").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Verify survey count
  const { count } = await supabase.from("surveys").select("id", { count: "exact" });
  console.log(`\n🎉 Total surveys in database: ${count} (MUST BE EXACTLY 30)`);
}

main().catch(console.error);
