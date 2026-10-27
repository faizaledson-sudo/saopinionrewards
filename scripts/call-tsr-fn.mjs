const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const fn = "b7684a0e88cc2557ff9ea8b837bf13cffbc0cbb47640dcbc394b352b7d589d79";
  const res = await fetch(`${base}/_serverFn/${fn}`, {
    method: "GET",
    headers: {
      "x-tsr-serverFn": "true",
      "accept": "application/x-tss-framed, application/x-ndjson, application/json",
    },
  });
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log("Body:", text);
}

run();
