const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const visited = new Set();
  const queue = ["/", "/surveys", "/upgrade", "/payout-setup", "/login", "/register", "/admin"];
  const allBundles = new Set();

  while (queue.length > 0) {
    const page = queue.shift();
    if (visited.has(page)) continue;
    visited.add(page);

    try {
      const res = await fetch(base + page);
      const text = await res.text();
      const scripts = text.match(/\/assets\/[a-zA-Z0-9_.-]+\.js/g) || [];
      for (const s of scripts) {
        allBundles.add(s);
      }
    } catch (e) {}
  }

  console.log(`Found ${allBundles.size} bundles directly in pages:`, Array.from(allBundles));

  // Now trace all imports in bundles
  const queueBundles = [...allBundles];
  const checkedBundles = new Set();

  while (queueBundles.length > 0) {
    const b = queueBundles.shift();
    if (checkedBundles.has(b)) continue;
    checkedBundles.add(b);

    try {
      const res = await fetch(base + b);
      if (!res.ok) continue;
      const text = await res.text();

      // Find import or asset references
      const refs = text.match(/["'](\/assets\/[a-zA-Z0-9_.-]+\.js)["']/g) || [];
      for (const r of refs) {
        const clean = r.replace(/["']/g, "");
        if (!checkedBundles.has(clean)) {
          queueBundles.push(clean);
          allBundles.add(clean);
        }
      }

      // Also search for any video, mp4, webm, mov, m3u8, mux, vimeo, youtube
      const media = text.match(/(https?:\/\/[^"'`\s\\]+\.(mp4|webm|mov|m3u8|m4v)|stream\.mux\.com\/[a-zA-Z0-9_-]+)/gi) || [];
      if (media.length > 0) {
        console.log(`Media in ${b}:`, Array.from(new Set(media)));
      }

      // Check if there are default video definitions or titles
      if (text.includes("video_url") || text.includes("videoUrl") || text.includes("playbackId")) {
        console.log(`Bundle ${b} has video references!`);
        // let's print snippet
        const matches = text.match(/(?:videoUrl|playbackId|video_url)["']?\s*[:=]\s*["'][^"']+["']/g) || [];
        if (matches.length > 0) {
          console.log(`  Properties:`, matches);
        }
      }
    } catch (e) {}
  }

  console.log(`Total bundles scanned: ${checkedBundles.size}`);
}

run();
