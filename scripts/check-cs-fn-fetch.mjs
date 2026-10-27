const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/createServerFn-Dhxuxmno.js");
  const text = await res.text();
  const fetchIdx = text.indexOf("fetch(");
  if (fetchIdx !== -1) {
    console.log(text.slice(Math.max(0, fetchIdx - 300), fetchIdx + 500));
  } else {
    console.log("No fetch( found");
  }
}

run();
