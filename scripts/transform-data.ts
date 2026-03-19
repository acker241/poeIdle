/**
 * Transform raw PoE data + game overrides → processed data for the engine.
 *
 * Run with: npx tsx scripts/transform-data.ts
 *
 * Reads from: data/poe-raw/ (downloaded RePoE JSONs)
 * Reads from: data/overrides/ (our game-specific tweaks)
 * Writes to:  data/processed/ + public/data/processed/ (for Vite serving)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RAW = join(ROOT, "data", "poe-raw");
const OVERRIDES = join(ROOT, "data", "overrides");
const OUT = join(ROOT, "data", "processed");
const PUBLIC_OUT = join(ROOT, "public", "data", "processed");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function writeJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(join(OUT, filename), json, "utf-8");
  // Also write to public/ for Vite dev server
  if (!existsSync(PUBLIC_OUT)) mkdirSync(PUBLIC_OUT, { recursive: true });
  writeFileSync(join(PUBLIC_OUT, filename), json, "utf-8");
  const sizeKB = Math.round(Buffer.byteLength(json) / 1024);
  console.log(`  ✓ ${filename} (${sizeKB} KB)`);
}

function readOverride<T>(filename: string): T | null {
  const path = join(OVERRIDES, filename);
  if (!existsSync(path)) return null;
  return readJson<T>(path);
}

// ============================================================
// 1. CHARACTERS
// ============================================================
function transformCharacters() {
  console.log("\n=== Characters ===");
  const raw = readJson<RawCharacter[]>(join(RAW, "characters.json"));

  const characters = raw.map(c => ({
    id: c.name.toLowerCase(),
    name: c.name,
    integerId: c.integer_id,
    strength: c.base_stats.strength,
    dexterity: c.base_stats.dexterity,
    intelligence: c.base_stats.intelligence,
    baseLife: c.base_stats.life,
    baseMana: c.base_stats.mana,
    unarmed: {
      attackTime: c.base_stats.unarmed.attack_time,
      minDamage: c.base_stats.unarmed.min_physical_damage,
      maxDamage: c.base_stats.unarmed.max_physical_damage,
    },
  }));

  writeJson("characters.json", characters);
}

// ============================================================
// 2. GEMS (Active Skills + Support Gems)
// ============================================================
function transformGems() {
  console.log("\n=== Gems ===");
  const raw = readJson<Record<string, RawGem>>(join(RAW, "gems.json"));
  const overrides = readOverride<Record<string, GemOverride>>("gem-overrides.json") ?? {};

  const activeSkills: ProcessedActiveSkill[] = [];
  const supportGems: ProcessedSupportGem[] = [];

  for (const [key, gem] of Object.entries(raw)) {
    // Skip unreleased and Vaal variants for MVP
    if (gem.base_item?.release_state !== "released") continue;
    if (key.startsWith("Vaal")) continue;

    const level1 = gem.per_level?.["1"];
    if (!level1) continue;

    if (gem.is_support) {
      const sg = gem.support_gem;
      if (!sg) continue;

      supportGems.push({
        id: key,
        name: gem.display_name,
        tags: gem.tags ?? [],
        allowedTypes: sg.allowed_types ?? [],
        excludedTypes: sg.excluded_types ?? [],
        addedTypes: sg.added_types ?? [],
        costMultiplier: (gem.static?.cost_multiplier ?? 100) / 100,
        requiredLevel: level1.required_level ?? 1,
        statRequirements: cleanStatReqs(level1.stat_requirements),
        staticStats: extractStaticStats(gem),
        perLevel: extractPerLevelStats(gem),
        color: gem.color,
      });
    } else if (gem.active_skill) {
      const override = overrides[key];
      const types = gem.active_skill.types ?? [];

      activeSkills.push({
        id: key,
        internalId: gem.active_skill.id,
        name: gem.display_name,
        description: gem.active_skill.description ?? "",
        tags: gem.tags ?? [],
        types,
        castTime: gem.cast_time ?? null,
        requiredLevel: level1.required_level ?? 1,
        statRequirements: cleanStatReqs(level1.stat_requirements),
        baseDamage: extractBaseDamage(gem),
        damageEffectiveness: (level1.damage_effectiveness ?? 100) / 100,
        critChance: (gem.static?.crit_chance ?? 500) / 100, // stored as permyriad
        manaCost: level1.costs?.Mana ?? 0,
        staticStats: extractStaticStats(gem),
        perLevel: extractPerLevelStats(gem),
        color: gem.color,
        // Game-specific overrides
        clearRating: override?.clearRating ?? null,
        singleTargetRating: override?.singleTargetRating ?? null,
        isWeaponAttack: types.includes("Attack"),
        isSpell: types.includes("Spell"),
      });
    }
  }

  console.log(`  Active skills: ${activeSkills.length}`);
  console.log(`  Support gems: ${supportGems.length}`);

  writeJson("active-skills.json", activeSkills);
  writeJson("support-gems.json", supportGems);
}

// ============================================================
// 3. DEFAULT MONSTER STATS
// ============================================================
function transformMonsterStats() {
  console.log("\n=== Monster Stats ===");
  const raw = readJson<Record<string, RawMonsterStats>>(join(RAW, "default_monster_stats.json"));

  // Convert keyed-by-level object to array
  const stats = Object.entries(raw).map(([level, s]) => ({
    level: parseInt(level),
    physicalDamage: s.physical_damage,
    evasion: s.evasion,
    accuracy: s.accuracy,
    life: s.life,
    allyLife: s.ally_life,
    armour: s.armour ?? 0,
    experience: s.experience,
  }));

  writeJson("monster-stats.json", stats);
}

// ============================================================
// 4. WORLD AREAS (zones)
// ============================================================
function transformWorldAreas() {
  console.log("\n=== World Areas ===");
  const raw = readJson<Record<string, RawWorldArea>>(join(RAW, "world_areas.json"));
  const overrides = readOverride<Record<string, ZoneOverride>>("zone-overrides.json") ?? {};

  // Filter to Act 1 areas (act1 = true or name contains "Act 1")
  const zones: ProcessedZone[] = [];

  for (const [key, area] of Object.entries(raw)) {
    if (!area.name) continue;

    // We care about areas with monster levels
    if (!area.area_level || area.area_level < 1) continue;

    const override = overrides[key];

    zones.push({
      id: key,
      name: area.name,
      act: area.act ?? null,
      areaLevel: area.area_level,
      isTown: area.is_town_area ?? false,
      hasWaypoint: area.has_waypoint ?? false,
      connections: area.connections ?? [],
      bossMonsters: area.boss_monster_ids ?? [],
      tags: area.tags ?? [],
      // Game-specific
      idleTimeMultiplier: override?.idleTimeMultiplier ?? 1.0,
      encounterCount: override?.encounterCount ?? 10,
    });
  }

  // Sort by act then level
  zones.sort((a, b) => (a.act ?? 99) - (b.act ?? 99) || a.areaLevel - b.areaLevel);

  console.log(`  Total zones: ${zones.length}`);
  console.log(`  Act 1 zones: ${zones.filter(z => z.act === 1).length}`);

  writeJson("world-areas.json", zones);
}

// ============================================================
// 5. BASE ITEMS
// ============================================================
function transformBaseItems() {
  console.log("\n=== Base Items ===");
  const raw = readJson<Record<string, RawBaseItem>>(join(RAW, "base_items.json"));

  const items: ProcessedBaseItem[] = [];

  for (const [key, item] of Object.entries(raw)) {
    if (!item.name || item.release_state !== "released") continue;

    items.push({
      id: key,
      name: item.name,
      itemClass: item.item_class,
      dropLevel: item.drop_level ?? 1,
      tags: item.tags ?? [],
      properties: item.properties ?? {},
      requirements: {
        level: item.requirements?.level ?? 0,
        str: item.requirements?.strength ?? 0,
        dex: item.requirements?.dexterity ?? 0,
        int: item.requirements?.intelligence ?? 0,
      },
      implicitStats: item.implicits ?? [],
      domain: item.domain,
      inventoryWidth: item.inventory_width ?? 1,
      inventoryHeight: item.inventory_height ?? 1,
    });
  }

  console.log(`  Total items: ${items.length}`);

  // Count by class
  const byClass: Record<string, number> = {};
  items.forEach(i => { byClass[i.itemClass] = (byClass[i.itemClass] ?? 0) + 1; });
  Object.entries(byClass).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([cls, n]) => console.log(`    ${cls}: ${n}`));

  writeJson("base-items.json", items);
}

// ============================================================
// 6. ITEM CLASSES
// ============================================================
function transformItemClasses() {
  console.log("\n=== Item Classes ===");
  const raw = readJson<Record<string, RawItemClass>>(join(RAW, "item_classes.json"));

  const classes = Object.entries(raw).map(([key, cls]) => ({
    id: key,
    name: cls.name,
    elderTag: cls.elder_tag ?? null,
    shaperTag: cls.shaper_tag ?? null,
    crusaderTag: cls.crusader_tag ?? null,
    redeemerTag: cls.redeemer_tag ?? null,
    hunterTag: cls.hunter_tag ?? null,
    warlordTag: cls.warlord_tag ?? null,
  }));

  writeJson("item-classes.json", classes);
}

// ============================================================
// HELPERS
// ============================================================

function cleanStatReqs(reqs: Record<string, number | null> | null): Record<string, number> {
  if (!reqs) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(reqs)) {
    if (v != null && v > 0) result[k] = v;
  }
  return result;
}

function extractStaticStats(gem: RawGem): Array<{ id: string; value: number | null; type: string | null }> {
  if (!gem.static?.stats) return [];
  return gem.static.stats
    .filter((s): s is { id: string; value: number | null; type: string | null } => s?.id != null)
    .map(s => ({ id: s.id, value: s.value, type: s.type }));
}

function extractPerLevelStats(gem: RawGem): Record<string, PerLevelData> {
  const result: Record<string, PerLevelData> = {};
  if (!gem.per_level) return result;

  for (const [level, data] of Object.entries(gem.per_level)) {
    result[level] = {
      requiredLevel: data.required_level,
      manaCost: data.costs?.Mana ?? null,
      damageEffectiveness: data.damage_effectiveness ? data.damage_effectiveness / 100 : null,
      costMultiplier: data.cost_multiplier ? data.cost_multiplier / 100 : null,
      statText: data.stat_text ?? {},
      stats: (data.stats ?? []).filter(s => s != null).map(s => ({
        value: s!.value,
        id: s!.id,
      })),
    };
  }
  return result;
}

function extractBaseDamage(gem: RawGem): Array<{ type: string; min: number; max: number }> {
  const level1 = gem.per_level?.["1"];
  if (!level1?.stat_text) return [];

  const result: Array<{ type: string; min: number; max: number }> = [];

  for (const [statKeys, text] of Object.entries(level1.stat_text)) {
    const match = text.match(/Deals (\d+) to (\d+) (\w+) Damage/);
    if (match) {
      const [, min, max, type] = match;
      result.push({
        type: type.toLowerCase(),
        min: parseInt(min),
        max: parseInt(max),
      });
    }
  }
  return result;
}

// ============================================================
// RAW TYPES
// ============================================================

interface RawCharacter {
  name: string;
  integer_id: number;
  base_stats: {
    strength: number;
    dexterity: number;
    intelligence: number;
    life: number;
    mana: number;
    unarmed: { attack_time: number; min_physical_damage: number; max_physical_damage: number; range: number };
  };
}

interface RawGem {
  display_name: string;
  is_support: boolean;
  cast_time: number | null;
  color: string;
  tags?: string[];
  active_skill?: {
    id: string;
    display_name: string;
    description?: string;
    types?: string[];
    weapon_restrictions?: string[];
    stat_conversions?: Record<string, string>;
  } | null;
  support_gem?: {
    allowed_types: string[] | null;
    excluded_types: string[] | null;
    added_types: string[] | null;
    letter: string;
    support_text: string;
  } | null;
  base_item?: { id: string; display_name: string; release_state: string; max_level: number };
  static?: {
    crit_chance: number | null;
    damage_effectiveness: number | null;
    cost_multiplier: number | null;
    stats: Array<{ id: string | null; value: number | null; type: string | null } | null> | null;
    quality_stats?: unknown;
  };
  per_level?: Record<string, {
    required_level: number | null;
    costs: { Mana: number | null } | null;
    stat_requirements: Record<string, number | null> | null;
    stat_text: Record<string, string> | null;
    stats: Array<{ value: number | null; id: string | null; type: string | null } | null> | null;
    damage_effectiveness: number | null;
    cost_multiplier: number | null;
    damage_multiplier: number | null;
    experience: number;
  }>;
}

interface RawMonsterStats {
  physical_damage: number;
  evasion: number;
  accuracy: number;
  life: number;
  ally_life: number;
  armour?: number;
  experience: number;
}

interface RawWorldArea {
  name: string | null;
  act?: number | null;
  area_level?: number;
  is_town_area?: boolean;
  has_waypoint?: boolean;
  connections?: string[];
  boss_monster_ids?: string[];
  tags?: string[];
}

interface RawBaseItem {
  name: string | null;
  item_class: string;
  release_state: string;
  drop_level?: number;
  tags?: string[];
  properties?: Record<string, unknown>;
  requirements?: { level?: number; strength?: number; dexterity?: number; intelligence?: number };
  implicits?: string[];
  domain: string;
  inventory_width?: number;
  inventory_height?: number;
}

interface RawItemClass {
  name: string;
  elder_tag?: string | null;
  shaper_tag?: string | null;
  crusader_tag?: string | null;
  redeemer_tag?: string | null;
  hunter_tag?: string | null;
  warlord_tag?: string | null;
}

// OUTPUT TYPES
interface ProcessedActiveSkill {
  id: string; internalId: string; name: string; description: string;
  tags: string[]; types: string[]; castTime: number | null;
  requiredLevel: number; statRequirements: Record<string, number>;
  baseDamage: Array<{ type: string; min: number; max: number }>;
  damageEffectiveness: number; critChance: number; manaCost: number;
  staticStats: Array<{ id: string; value: number | null; type: string | null }>;
  perLevel: Record<string, PerLevelData>;
  color: string;
  clearRating: number | null; singleTargetRating: number | null;
  isWeaponAttack: boolean; isSpell: boolean;
}

interface ProcessedSupportGem {
  id: string; name: string; tags: string[];
  allowedTypes: string[]; excludedTypes: string[]; addedTypes: string[];
  costMultiplier: number; requiredLevel: number;
  statRequirements: Record<string, number>;
  staticStats: Array<{ id: string; value: number | null; type: string | null }>;
  perLevel: Record<string, PerLevelData>;
  color: string;
}

interface PerLevelData {
  requiredLevel: number | null;
  manaCost: number | null;
  damageEffectiveness: number | null;
  costMultiplier: number | null;
  statText: Record<string, string>;
  stats: Array<{ value: number | null; id: string | null }>;
}

interface ProcessedZone {
  id: string; name: string; act: number | null; areaLevel: number;
  isTown: boolean; hasWaypoint: boolean; connections: string[];
  bossMonsters: string[]; tags: string[];
  idleTimeMultiplier: number; encounterCount: number;
}

interface ProcessedBaseItem {
  id: string; name: string; itemClass: string; dropLevel: number;
  tags: string[]; properties: Record<string, unknown>;
  requirements: { level: number; str: number; dex: number; int: number };
  implicitStats: string[]; domain: string;
  inventoryWidth: number; inventoryHeight: number;
}

interface GemOverride { clearRating?: number; singleTargetRating?: number; }
interface ZoneOverride { idleTimeMultiplier?: number; encounterCount?: number; }

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log("=== Transforming PoE data → poeIdle format ===");

  transformCharacters();
  transformGems();
  transformMonsterStats();
  transformWorldAreas();
  transformBaseItems();
  transformItemClasses();

  console.log("\n✓ Done! Data saved to data/processed/");
}

main();
