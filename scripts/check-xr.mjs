const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/createServerFn-Dhxuxmno.js");
  const text = await res.text();
  const idx = text.indexOf("function Xr(");
  if (idx !== -1) {
    console.log(text.slice(idx, idx + 1000));
  } else {
    const idx2 = text.indexOf("Xr=");
    console.log(text.slice(idx2, idx2 + 1000));
  }
}

run();
