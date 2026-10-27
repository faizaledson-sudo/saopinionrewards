async function run() {
  const res = await fetch("https://sa-opinion-rewards.vercel.app/");
  const html = await res.text();
  console.log("HTML length:", html.length);
  // Find all video tags, img tags, sources, iframes
  const videoMatches = html.match(/<video[^>]*>([\s\S]*?)<\/video>/gi) || [];
  console.log("Video tags:", videoMatches);

  const sourceMatches = html.match(/<source[^>]*>/gi) || [];
  console.log("Source tags:", sourceMatches);

  const iframes = html.match(/<iframe[^>]*>/gi) || [];
  console.log("Iframe tags:", iframes);

  const imgs = html.match(/<img[^>]*>/gi) || [];
  console.log("Img tags (first 10):", imgs.slice(0, 10));
}

run();
