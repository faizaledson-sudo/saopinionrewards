const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  for (const name of ["/assets/surveys.functions-CMUQyMMj.js", "/assets/surveys.index-CO5VNTrF.js"]) {
    const res = await fetch(base + name);
    const text = await res.text();
    console.log(`=== ${name} (${text.length} chars) ===`);
    console.log(text.slice(0, 3000));
  }
}

run();
