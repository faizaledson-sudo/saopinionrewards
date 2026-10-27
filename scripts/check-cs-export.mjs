const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const res = await fetch(base + "/assets/createServerFn-Dhxuxmno.js");
  const text = await res.text();
  console.log("End of file export statement:");
  console.log(text.slice(-500));
}

run();
