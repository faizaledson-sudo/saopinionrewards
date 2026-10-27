const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  console.log("OpenAPI status:", res.status);
  const spec = await res.json();
  console.log("Definitions:", Object.keys(spec.definitions || {}));
  console.log("Paths:", Object.keys(spec.paths || {}));
}

run();
