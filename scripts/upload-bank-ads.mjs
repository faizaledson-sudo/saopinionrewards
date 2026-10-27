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

const BANK_META = [
  {
    title: "Capitec Bank — Instant Payment Clearance",
    caption: "Verified Capitec Bank instant transfer notification. Earn cash for watching short South African sponsor videos. 🇿🇦📱 #Capitec #InstantMoney #BankingSA",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Alert - SA Official",
  },
  {
    title: "Capitec Bank — Fast Digital Mobile Transfer",
    caption: "Quick digital bank transfers straight into your Capitec main account. Zero monthly fees on mobile banking. 💳⚡ #MobileBanking #CapitecBank",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Digital Beats",
  },
  {
    title: "Capitec Bank — Money In Notification & Daily Cash",
    caption: "Money In notification: South African Revenue Service & verified instant deposits. Watch & review to earn Rands. 💸🇿🇦 #MoneyIn #Capitec",
    category: "Finance",
    creator: "@capitec_southafrica",
    sound: "Capitec Notification Tone",
  },
  {
    title: "Capitec Bank — Rewards Review Tool & Payouts",
    caption: "Rate short 30-second brand review videos and get paid straight into your Capitec account every day! 🚗✨ #BankPayouts #CapitecReward",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Review Theme",
  },
  {
    title: "Capitec Bank — Mobile Clearance & Car Expenses",
    caption: "Cover everyday car expenses and bills effortlessly with daily Capitec video reviews. 💰🚗 #CapitecConnect #SmartBanking",
    category: "Finance",
    creator: "@capitec_southafrica",
    sound: "Capitec Lifestyle Beats",
  },
  {
    title: "Capitec Bank — Daily Earning Alert & Easy Pay",
    caption: "Instant alert on account deposit and fast withdrawals. Verified banking platform for South African consumers. 📈🏦 #CapitecSA #Banking",
    category: "Banking",
    creator: "@capitec_southafrica",
    sound: "Capitec Anthem 2026",
  },
];

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
  console.log(`\n📤 [1/3] Creating Mux direct upload for "${fileName}" (${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)...`);

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
  const dir = path.resolve("videos-to-upload/bank-ads");
  console.log(`====================================================`);
  console.log(`🏦 Uploading Real Bank Adverts from: ${dir}`);
  console.log(`====================================================`);

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.mp4$/i.test(f))
    .sort();

  console.log(`Found ${files.length} bank ad files:\n` + files.map((f, i) => `  ${i + 1}. ${f}`).join("\n"));

  const { tokenId, tokenSecret } = await getMuxCredentials();
  const authHeader = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  const alreadyUploaded = {
    "1-Capitec-Bank-Instant-Payout.mp4": "LyKK5PkbYpusRKKBGtGGsxUbpXC02NpCu7U013d4jthGA",
    "2-Capitec-Bank-Digital-Transfers.mp4": "G02alC1eiUll88eziAjUJ674s8tPf2E26itoL7mfuNks",
    "3-Capitec-Bank-Money-In-Notification.mp4": "WPaTIZRTYSrk5cGq02eqz8TOb501JDO5mYC2npX01gUS7Q",
    "4-Capitec-Bank-Rewards-Review-Tool.mp4": "00lX4lTKbq3oLHMazeS1KPVloSgV5e402oAgdmVYpkD00g",
  };

  const uploadedPlaybackIds = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    let playbackId = alreadyUploaded[file];

    if (playbackId) {
      console.log(`\n---------------------------------------------`);
      console.log(`[${i + 1}/${files.length}] Already uploaded: ${file} -> Playback ID: ${playbackId}`);
    } else {
      console.log(`\n---------------------------------------------`);
      console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);
      playbackId = await uploadFileToMux(fullPath, authHeader);
    }

    uploadedPlaybackIds.push({
      file,
      playbackId,
      meta: BANK_META[i % BANK_META.length],
    });
  }

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${uploadedPlaybackIds.length} BANK VIDEOS ENCODED ON MUX!`);
  console.log(JSON.stringify(uploadedPlaybackIds, null, 2));
  console.log(`====================================================`);

  // Now update the regular tier surveys in Supabase
  const { data: regularSurveys } = await supabase
    .from("surveys")
    .select("id, title, min_tier")
    .eq("min_tier", "regular")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  console.log(`Found ${regularSurveys?.length ?? 0} regular tier surveys in Supabase.`);

  for (let i = 0; i < (regularSurveys ?? []).length; i++) {
    const survey = regularSurveys[i];
    const bankItem = uploadedPlaybackIds[i % uploadedPlaybackIds.length];

    const descriptionJson = JSON.stringify({
      video_url: bankItem.playbackId,
      creator: bankItem.meta.creator,
      caption: bankItem.meta.caption,
      sound: bankItem.meta.sound,
      duration: 15,
    });

    const { error: updErr } = await supabase
      .from("surveys")
      .update({
        title: bankItem.meta.title,
        description: descriptionJson,
        category: bankItem.meta.category,
        estimated_minutes: 1,
        status: "active",
      })
      .eq("id", survey.id);

    if (updErr) {
      console.error(`❌ Failed to update survey ${survey.id}:`, updErr.message);
    } else {
      console.log(`✅ Updated Survey ${i + 1} (${survey.id}) -> "${bankItem.meta.title}" (Mux: ${bankItem.playbackId})`);
    }
  }

  // Also update all VIP tier surveys with the bank ads
  const { data: otherSurveys } = await supabase
    .from("surveys")
    .select("id, title, min_tier")
    .neq("min_tier", "regular")
    .order("created_at", { ascending: true });

  for (let i = 0; i < (otherSurveys ?? []).length; i++) {
    const survey = otherSurveys[i];
    const bankItem = uploadedPlaybackIds[i % uploadedPlaybackIds.length];

    const descriptionJson = JSON.stringify({
      video_url: bankItem.playbackId,
      creator: bankItem.meta.creator,
      caption: bankItem.meta.caption,
      sound: bankItem.meta.sound,
      duration: 15,
    });

    await supabase
      .from("surveys")
      .update({
        title: `${bankItem.meta.title} — ${survey.min_tier.toUpperCase()}`,
        description: descriptionJson,
        category: bankItem.meta.category,
        status: "active",
      })
      .eq("id", survey.id);
  }

  console.log(`\n🚀 All regular and VIP surveys updated to Bank Advertisements!`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
