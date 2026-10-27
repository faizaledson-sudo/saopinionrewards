const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?select=key,value,updated_at`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  });
  const data = await res.json();
  for (const item of data) {
    if (item.key === "sms_logs") {
      console.log(`app_settings: sms_logs (${item.value.length} chars)`);
    } else {
      console.log(`app_settings: ${item.key} =`, item.value);
    }
  }
}

run();
