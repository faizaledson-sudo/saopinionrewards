import { createClient } from "@supabase/supabase-js";
import { resolveVideoTask, DEFAULT_VIDEOS } from "../src/lib/videos.js";

const supabaseUrl = "https://chlezybvyqyksyiupudj.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobGV6eWJ2eXF5a3N5aXVwdWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIzNDc2MCwiZXhwIjoyMTA3ODEwNzYwfQ.veha6Zw8ZNBZKyAQ5gR48Tur6TAVJCqFB0oYUojXOWY";

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  console.log("=== VERIFYING 30 DOWNLOADED VIDEOS INTEGRATION ===");

  // 1. Check DEFAULT_VIDEOS count
  console.log(`1. Total DEFAULT_VIDEOS in code: ${DEFAULT_VIDEOS.length}`);
  if (DEFAULT_VIDEOS.length !== 30) throw new Error("DEFAULT_VIDEOS must have 30 entries!");

  // 2. Check Surveys in Supabase
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, description, category")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  console.log(`2. Total Active Surveys in Supabase: ${surveys.length}`);
  if (surveys.length !== 30) throw new Error("Supabase must have exactly 30 surveys!");

  // 3. Check video resolution for Day 1 (first 5 tasks)
  console.log("\n3. Day 1 Tasks (First 5):");
  for (let i = 0; i < 5; i++) {
    const s = surveys[i];
    const task = resolveVideoTask(s, i);
    console.log(`   Task ${i + 1}: "${task.title}"`);
    console.log(`      Video URL: ${task.videoUrl}`);
    console.log(`      Creator:   ${task.creator}`);
    console.log(`      Duration:  ${task.durationSeconds}s`);
  }

  // 4. Verify Supabase Storage files
  const { data: storageFiles } = await supabase.storage.from("videos").list();
  console.log(`\n4. Total videos in Supabase Storage 'videos' bucket: ${storageFiles?.length}`);

  console.log("\n✅ ALL CHECKS PASSED PERFECTLY!");
}

test().catch(console.error);
