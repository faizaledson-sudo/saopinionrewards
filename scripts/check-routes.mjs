const base = "https://sa-opinion-rewards.vercel.app";

async function run() {
  const bundles = [
    "/assets/routes-CN-QIV4d.js",
    "/assets/routes-DukSQ-o3.js",
    "/assets/routes-fmGtfvwy.js"
  ];
  for (const b of bundles) {
    const res = await fetch(base + b);
    if (!res.ok) continue;
    const text = await res.text();
    console.log("=== BUNDLE:", b, "length:", text.length);
    // Find any video URLs, paths, routes
    const urls = text.match(/https?:\/\/[^"'`\s\\]+/g) || [];
    const mediaUrls = urls.filter(u => u.includes("mux") || u.includes("mp4") || u.includes("m3u8") || u.includes("supabase") || u.includes("youtube") || u.includes("vimeo"));
    console.log("Media URLs:", Array.from(new Set(mediaUrls)));
    
    // Find route paths
    const routeMatches = text.match(/path:\s*["'][^"']+["']/g) || [];
    console.log("Routes:", Array.from(new Set(routeMatches)).slice(0, 30));
  }
}

run();
