const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const fns = [
    "b7684a0e88cc2557ff9ea8b837bf13cffbc0cbb47640dcbc394b352b7d589d79", // listSurveys
    "cb7242c5c125e95b56dbeb5e4984ff2078041f784620a2fc9662f0fb6cae9f16", // getSurvey
  ];

  for (const fn of fns) {
    const res = await fetch(`${base}/_serverFn/${fn}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    console.log(`FN ${fn}: status ${res.status}`);
    const text = await res.text();
    console.log(text.slice(0, 500));
  }
}

run();
