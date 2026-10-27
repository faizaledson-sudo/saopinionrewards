const base = "https://sa-opinion-rewards.vercel.app";

async function main() {
  const res = await fetch(base + "/");
  const html = await res.text();
  const scriptRegex = /\/assets\/[^"'`\s]+\.js/g;
  const matches = Array.from(new Set(html.match(scriptRegex) || []));
  console.log("Initial JS bundles found in HTML:", matches);

  const checked = new Set();
  const toCheck = [...matches];

  const foundMux = new Set();
  const foundMp4 = new Set();
  const foundM3u8 = new Set();
  const foundSurveys = [];

  while (toCheck.length > 0) {
    const jsPath = toCheck.pop();
    if (checked.has(jsPath)) continue;
    checked.add(jsPath);

    try {
      const r = await fetch(base + jsPath);
      if (!r.ok) continue;
      const text = await r.text();

      // Find more bundles
      const more = text.match(scriptRegex) || [];
      for (const m of more) {
        if (!checked.has(m)) toCheck.push(m);
      }

      // Check Mux Playback IDs
      const muxUrls = text.match(/(?:stream|image|player)\.mux\.com\/([a-zA-Z0-9_-]+)/g) || [];
      for (const m of muxUrls) foundMux.add(m);

      // Check MP4
      const mp4s = text.match(/https?:\/\/[^"'`\s\\]+\.mp4/g) || [];
      for (const m of mp4s) foundMp4.add(m);

      // Check M3U8
      const m3u8s = text.match(/https?:\/\/[^"'`\s\\]+\.m3u8/g) || [];
      for (const m of m3u8s) foundM3u8.add(m);

      // Look for Supabase URL or project id
      const sbMatch = text.match(/https:\/\/[a-z0-9]+\.supabase\.co/g) || [];
      if (sbMatch.length) console.log("Supabase URL found in", jsPath, ":", sbMatch);

      // Look for survey or video tasks objects
      if (text.includes("videoUrl") || text.includes("playbackId") || text.includes("durationSeconds") || text.includes("DEFAULT_VIDEOS")) {
        console.log("Found video/survey data in:", jsPath);
        // Find snippets
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.includes("DEFAULT_VIDEOS") || line.includes("videoUrl")) {
            console.log("Snippet:", line.slice(0, 300));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching", jsPath, e);
    }
  }

  console.log("\n--- RESULTS ---");
  console.log("Mux URLs found:", Array.from(foundMux));
  console.log("MP4 URLs found:", Array.from(foundMp4));
  console.log("M3U8 URLs found:", Array.from(foundM3u8));
}

main();
