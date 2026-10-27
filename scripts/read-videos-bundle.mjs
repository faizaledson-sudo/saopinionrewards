const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/videos-DEeiPYbS.js");
  const text = await res.text();
  console.log("videos-DEeiPYbS.js content:\n", text);
}

run();
