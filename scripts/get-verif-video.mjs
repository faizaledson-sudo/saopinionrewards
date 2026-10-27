const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.verification_video_url`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  });
  const data = await res.json();
  console.log("verification_video_url:", data);
}

run();
