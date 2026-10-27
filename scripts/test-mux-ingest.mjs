async function testIngest() {
  const tokenId = "3e5dd69e-10fc-4dac-9571-4b1f1cec738d";
  const tokenSecret = "dkea5877dh1dvGFx5yUJBiMJfCE7/Z1QXMjOPIoNws2avnnDsFvtbw5Qh4v3OTeLpC6kR4y+Ffs";
  const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  const testUrl = "https://chlezybvyqyksyiupudj.supabase.co/storage/v1/object/public/videos/01_Fast_Mobile_Transfers_Cash_Rewards_VIP1.mp4";

  const res = await fetch("https://api.mux.com/video/v1/assets", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [{ url: testUrl }],
      playback_policy: ["public"],
    }),
  });

  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Result:", JSON.stringify(data, null, 2));
}

testIngest().catch(console.error);
