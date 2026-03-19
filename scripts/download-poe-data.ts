/**
 * Download PoE game data from RePoE (repoe-fork.github.io)
 * and save to local data/ directory.
 *
 * Run with: npx tsx scripts/download-poe-data.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = "https://repoe-fork.github.io";
const OUTPUT_DIR = join(import.meta.dirname, "..", "data", "poe-raw");

/** All data files to download */
const FILES = [
  // Core game data
  "gems.json",
  "gem_tags.json",
  "base_items.json",
  "mods.json",
  "mod_types.json",
  "stats.json",
  "stat_translations.json",
  "characters.json",
  "default_monster_stats.json",
  "item_classes.json",
  "tags.json",
  "cost_types.json",
  "active_skill_types.json",

  // Crafting
  "crafting_bench_options.json",
  "essences.json",
  "fossils.json",

  // Special items
  "uniques.json",
  "cluster_jewels.json",
  "cluster_jewel_notables.json",

  // Other
  "flavour.json",
  "world_areas.json",
];

async function downloadFile(filename: string): Promise<boolean> {
  const url = `${BASE_URL}/${filename}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ✗ ${filename} — HTTP ${res.status}`);
      return false;
    }
    const data = await res.text();
    const outPath = join(OUTPUT_DIR, filename);
    writeFileSync(outPath, data, "utf-8");
    const sizeKB = Math.round(Buffer.byteLength(data) / 1024);
    console.log(`  ✓ ${filename} (${sizeKB} KB)`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${filename} — ${err}`);
    return false;
  }
}

async function main() {
  console.log("=== Downloading PoE data from RePoE ===\n");

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let success = 0;
  let fail = 0;

  for (const file of FILES) {
    const ok = await downloadFile(file);
    ok ? success++ : fail++;
  }

  console.log(`\nDone: ${success} downloaded, ${fail} failed`);
  console.log(`Data saved to: ${OUTPUT_DIR}`);
}

main();
