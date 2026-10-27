const tokenId = "3e5dd69e-10fc-4dac-9571-4b1f1cec738d";
const tokenSecret = "dkea5877dh1dvGFx5yUJBiMJfCE7/Z1QXMjOPIoNws2avnnDsFvtbw5Qh4v3OTeLpC6kR4y+Ffs";
const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

async function run() {
  const listRes = await fetch("https://api.mux.com/video/v1/assets?limit=50", {
    headers: { Authorization: `Basic ${auth}` },
  });
  const assets = (await listRes.json()).data || [];
  console.log(`Current assets in Mux: ${assets.length}`);
  for (const a of assets) {
    console.log(`ID: ${a.id}, passthrough: ${a.passthrough}, playbackId: ${a.playback_ids?.[0]?.id}`);
  }

  // Find any duplicates or test assets
  const testAsset = assets.find((a) => a.id === "h7H4ebcyEaQDT101t5VWLxMGlE01C5z4Nn91lAngucH4Y");
  if (testAsset) {
    console.log("Deleting duplicate test asset...");
    const delRes = await fetch(`https://api.mux.com/video/v1/assets/${testAsset.id}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log("Deleted test asset:", delRes.status);
  }
}

run().catch(console.error);
