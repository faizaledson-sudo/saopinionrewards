const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/index-fg1Od_-2.js");
  const text = await res.text();
  const idx = text.indexOf("_serverFn");
  if (idx !== -1) {
    console.log(text.slice(Math.max(0, idx - 200), idx + 800));
  }
}

run();
