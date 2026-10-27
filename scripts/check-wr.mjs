const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/createServerFn-Dhxuxmno.js");
  const text = await res.text();
  const idx = text.indexOf("function Wr(");
  console.log(text.slice(idx, idx + 1000));
}

run();
