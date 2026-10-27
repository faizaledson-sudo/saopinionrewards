const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  // Try querying common table names
  const candidateTables = [
    "surveys", "survey", "videos", "video", "questions", "question", 
    "tasks", "task", "missions", "mission", "campaigns", "campaign",
    "app_settings", "settings", "media", "assets", "public_surveys",
    "system_surveys", "default_surveys", "content", "posts"
  ];

  for (const t of candidateTables) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    });
    if (res.status !== 404) {
      console.log(`Table '${t}': status ${res.status}`);
      const text = await res.text();
      console.log(`  -> ${text.slice(0, 200)}`);
    }
  }
}

run();
