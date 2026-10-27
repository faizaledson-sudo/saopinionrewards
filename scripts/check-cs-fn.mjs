const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  for (const name of ["/assets/createServerFn-Dhxuxmno.js", "/assets/auth-middleware-BPZiLKtI.js"]) {
    const res = await fetch(base + name);
    const text = await res.text();
    console.log(`=== ${name} ===`);
    console.log(text.slice(0, 2000));
  }
}

run();
