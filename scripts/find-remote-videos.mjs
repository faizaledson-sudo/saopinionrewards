const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  // Let's create an anonymous session or sign up
  const testEmail = `test_${Date.now()}@gmail.com`;
  const testPass = "TestPassword123!";

  console.log("Signing up test user on remote supabase...");
  const signResp = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPass,
      data: { full_name: "Test User" },
    }),
  });

  console.log("Signup status:", signResp.status);
  const signData = await signResp.json();
  const token = signData.access_token;
  console.log("Access token obtained:", token ? "YES" : "NO");

  const authHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
  };

  const surveyResp = await fetch(`${supabaseUrl}/rest/v1/surveys?select=*`, {
    headers: authHeaders,
  });
  console.log("Surveys status with auth:", surveyResp.status);
  if (surveyResp.ok) {
    const surveys = await surveyResp.json();
    console.log(`Found ${surveys.length} surveys!`);
    console.log(JSON.stringify(surveys, null, 2));
  } else {
    console.log("Error fetching surveys:", await surveyResp.text());
  }
}

run();
