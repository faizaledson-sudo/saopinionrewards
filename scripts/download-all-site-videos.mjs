import fs from "node:fs";
import path from "node:path";

async function downloadHlsToMp4(m3u8MasterUrl, outputPath) {
  console.log(`\nFetching master playlist: ${m3u8MasterUrl}`);
  const masterRes = await fetch(m3u8MasterUrl);
  if (!masterRes.ok) {
    throw new Error(`Failed to fetch master playlist: ${masterRes.status}`);
  }
  const masterText = await masterRes.text();

  const lines = masterText.split("\n").map(l => l.trim());
  let renditionUrl = null;
  // prefer 720p or 480p or the first one
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
      if (lines[i].includes("RESOLUTION=1280x720") || !renditionUrl) {
        renditionUrl = lines[i + 1];
        if (lines[i].includes("RESOLUTION=1280x720")) break;
      }
    }
  }

  if (!renditionUrl) {
    throw new Error("No rendition URL found in master playlist");
  }

  console.log(`Fetching rendition playlist...`);
  const rendRes = await fetch(renditionUrl);
  const rendText = await rendRes.text();
  const rendLines = rendText.split("\n").map(l => l.trim());

  let initUrl = null;
  const chunkUrls = [];

  for (const line of rendLines) {
    if (line.startsWith("#EXT-X-MAP:URI=")) {
      initUrl = line.match(/URI="([^"]+)"/)?.[1];
    } else if (line.startsWith("http") && (line.includes(".m4s") || line.includes(".ts"))) {
      chunkUrls.push(line);
    }
  }

  console.log(`Init segment: ${initUrl ? "YES" : "NO"}, Chunks: ${chunkUrls.length}`);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileStream = fs.createWriteStream(outputPath);

  if (initUrl) {
    const initRes = await fetch(initUrl);
    const initBuf = Buffer.from(await initRes.arrayBuffer());
    fileStream.write(initBuf);
  }

  for (let idx = 0; idx < chunkUrls.length; idx++) {
    const cUrl = chunkUrls[idx];
    const cRes = await fetch(cUrl);
    const cBuf = Buffer.from(await cRes.arrayBuffer());
    fileStream.write(cBuf);
  }

  fileStream.end();
  await new Promise(res => fileStream.on("finish", res));
  const stats = fs.statSync(outputPath);
  console.log(`✅ Saved: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function run() {
  const targetDir = "videos-baixados-sa-opinion-rewards";
  
  const videos = [
    { name: "1-Cape-Town-Hidden-Gems.mp4", id: "BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM" },
    { name: "2-Checkers-Sixty60-Taste-Test.mp4", id: "OfjbQ3esQifgboENTs4oDXslCP5sSnst" },
    { name: "3-Samsung-Galaxy-vs-iPhone-Joburg.mp4", id: "uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW" },
    { name: "4-Shop-Takealot-Fire-Sale.mp4", id: "L01T3l4CWmukIZ8Cr1Iq9pG7A8YF2E65z" },
    { name: "5-Minibus-Taxi-Driver-Chronicles.mp4", id: "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe" },
    { name: "6-Mzansi-Beats-Summer-Celebration.mp4", id: "OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts" },
  ];

  for (const v of videos) {
    const dest = path.join(targetDir, v.name);
    const url = `https://stream.mux.com/${v.id}.m3u8`;
    await downloadHlsToMp4(url, dest);
  }

  console.log("\n🎉 ALL VIDEOS DOWNLOADED SUCCESSFULLY!");
}

run().catch(console.error);
