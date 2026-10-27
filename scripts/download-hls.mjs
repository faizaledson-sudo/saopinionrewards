import fs from "node:fs";
import path from "node:path";

async function downloadHlsToMp4(m3u8MasterUrl, outputPath) {
  console.log(`Fetching master playlist: ${m3u8MasterUrl}`);
  const masterRes = await fetch(m3u8MasterUrl);
  const masterText = await masterRes.text();

  // Find stream renditions
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

  console.log(`Fetching rendition playlist: ${renditionUrl}`);
  const rendRes = await fetch(renditionUrl);
  const rendText = await rendRes.text();
  const rendLines = rendText.split("\n").map(l => l.trim());

  // Find MAP (init segment)
  let initUrl = null;
  const chunkUrls = [];

  for (const line of rendLines) {
    if (line.startsWith("#EXT-X-MAP:URI=")) {
      initUrl = line.match(/URI="([^"]+)"/)?.[1];
    } else if (line.startsWith("http") && (line.includes(".m4s") || line.includes(".ts"))) {
      chunkUrls.push(line);
    }
  }

  console.log(`Found init segment: ${initUrl ? "YES" : "NO"}, chunks: ${chunkUrls.length}`);

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
    process.stdout.write(`\rDownloading chunk ${idx + 1}/${chunkUrls.length}...`);
  }

  fileStream.end();
  await new Promise(res => fileStream.on("finish", res));
  const stats = fs.statSync(outputPath);
  console.log(`\n✅ Saved to ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function run() {
  const targetDir = "videos-baixados-sa-opinion-rewards";
  const vslUrl = "https://stream.mux.com/OiiwNmYmECTBviTLfzMQUsSp9hlZn5cPW3bGFkAaDts.m3u8";
  await downloadHlsToMp4(vslUrl, path.join(targetDir, "VSL-Verification-Video.mp4"));
}

run().catch(console.error);
