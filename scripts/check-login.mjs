const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/login");
  const html = await res.text();
  console.log("Login HTML:\n", html);
}

run();
