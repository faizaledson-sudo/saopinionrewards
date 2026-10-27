const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?select=key`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  });
  const data = await res.json();
  console.log("All keys:", data.map(d => d.key));
}

run();
