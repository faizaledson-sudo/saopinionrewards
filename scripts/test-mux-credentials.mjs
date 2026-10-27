async function testMux() {
  const tokenId = "3e5dd69e-10fc-4dac-9571-4b1f1cec738d";
  const tokenSecret = "dkea5877dh1dvGFx5yUJBiMJfCE7/Z1QXMjOPIoNws2avnnDsFvtbw5Qh4v3OTeLpC6kR4y+Ffs";
  const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");
  const res = await fetch("https://api.mux.com/video/v1/assets?limit=50", {
    headers: { Authorization: `Basic ${auth}` }
  });
  console.log("Mux API Status:", res.status);
  const data = await res.json();
  console.log("Mux Assets Count:", data.data?.length);
  if (data.data) {
    for (const a of data.data) {
      console.log(`Asset ${a.id}, status: ${a.status}, playback_ids:`, a.playback_ids?.map(p => p.id));
    }
  }
}
testMux();
