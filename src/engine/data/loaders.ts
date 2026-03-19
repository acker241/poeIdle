/**
 * Data loaders that read from the processed JSON files.
 * These replace the hardcoded data in the engine.
 *
 * Data is loaded lazily on first access and cached.
 */

// Types matching the processed JSON structures
export interface ProcessedCharacter {
  id: string;
  name: string;
  integerId: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  baseLife: number;
  baseMana: number;
  unarmed: { attackTime: number; minDamage: number; maxDamage: number };
}

export interface ProcessedActiveSkill {
  id: string;
  internalId: string;
  name: string;
  description: string;
  tags: string[];
  types: string[];
  castTime: number | null;
  requiredLevel: number;
  statRequirements: Record<string, number>;
  baseDamage: Array<{ type: string; min: number; max: number }>;
  damageEffectiveness: number;
  critChance: number;
  manaCost: number;
  staticStats: Array<{ id: string; value: number | null; type: string | null }>;
  perLevel: Record<string, PerLevelData>;
  color: string;
  clearRating: number | null;
  singleTargetRating: number | null;
  isWeaponAttack: boolean;
  isSpell: boolean;
}

export interface ProcessedSupportGem {
  id: string;
  name: string;
  tags: string[];
  allowedTypes: string[];
  excludedTypes: string[];
  addedTypes: string[];
  costMultiplier: number;
  requiredLevel: number;
  statRequirements: Record<string, number>;
  staticStats: Array<{ id: string; value: number | null; type: string | null }>;
  perLevel: Record<string, PerLevelData>;
  color: string;
}

export interface PerLevelData {
  requiredLevel: number | null;
  manaCost: number | null;
  damageEffectiveness: number | null;
  costMultiplier: number | null;
  statText: Record<string, string>;
  stats: Array<{ value: number | null; id: string | null }>;
}

export interface ProcessedMonsterStats {
  level: number;
  physicalDamage: number;
  evasion: number;
  accuracy: number;
  life: number;
  allyLife: number;
  armour: number;
  experience: number;
}

export interface ProcessedWorldArea {
  id: string;
  name: string;
  act: number | null;
  areaLevel: number;
  isTown: boolean;
  hasWaypoint: boolean;
  connections: string[];
  bossMonsters: string[];
  tags: string[];
  idleTimeMultiplier: number;
  encounterCount: number;
}

export interface ProcessedBaseItem {
  id: string;
  name: string;
  itemClass: string;
  dropLevel: number;
  tags: string[];
  properties: Record<string, unknown>;
  requirements: { level: number; str: number; dex: number; int: number };
  implicitStats: string[];
  domain: string;
  inventoryWidth: number;
  inventoryHeight: number;
}

// Cache
let _characters: ProcessedCharacter[] | null = null;
let _activeSkills: ProcessedActiveSkill[] | null = null;
let _supportGems: ProcessedSupportGem[] | null = null;
let _monsterStats: ProcessedMonsterStats[] | null = null;
let _worldAreas: ProcessedWorldArea[] | null = null;
let _baseItems: ProcessedBaseItem[] | null = null;

// Maps for O(1) lookup
let _activeSkillMap: Map<string, ProcessedActiveSkill> | null = null;
let _supportGemMap: Map<string, ProcessedSupportGem> | null = null;
let _monsterStatsMap: Map<number, ProcessedMonsterStats> | null = null;
let _worldAreaMap: Map<string, ProcessedWorldArea> | null = null;

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  return response.json() as Promise<T>;
}

// --- Characters ---
export async function loadCharacters(): Promise<ProcessedCharacter[]> {
  if (!_characters) {
    _characters = await loadJson<ProcessedCharacter[]>("/data/processed/characters.json");
  }
  return _characters;
}

export async function getCharacterByName(name: string): Promise<ProcessedCharacter | undefined> {
  const chars = await loadCharacters();
  return chars.find(c => c.name.toLowerCase() === name.toLowerCase() || c.id === name.toLowerCase());
}

// --- Active Skills ---
export async function loadActiveSkills(): Promise<ProcessedActiveSkill[]> {
  if (!_activeSkills) {
    _activeSkills = await loadJson<ProcessedActiveSkill[]>("/data/processed/active-skills.json");
  }
  return _activeSkills;
}

export async function getActiveSkillMap(): Promise<Map<string, ProcessedActiveSkill>> {
  if (!_activeSkillMap) {
    const skills = await loadActiveSkills();
    _activeSkillMap = new Map(skills.map(s => [s.id, s]));
  }
  return _activeSkillMap;
}

// --- Support Gems ---
export async function loadSupportGems(): Promise<ProcessedSupportGem[]> {
  if (!_supportGems) {
    _supportGems = await loadJson<ProcessedSupportGem[]>("/data/processed/support-gems.json");
  }
  return _supportGems;
}

export async function getSupportGemMap(): Promise<Map<string, ProcessedSupportGem>> {
  if (!_supportGemMap) {
    const gems = await loadSupportGems();
    _supportGemMap = new Map(gems.map(g => [g.id, g]));
  }
  return _supportGemMap;
}

// --- Monster Stats ---
export async function loadMonsterStats(): Promise<ProcessedMonsterStats[]> {
  if (!_monsterStats) {
    _monsterStats = await loadJson<ProcessedMonsterStats[]>("/data/processed/monster-stats.json");
  }
  return _monsterStats;
}

export async function getMonsterStatsForLevel(level: number): Promise<ProcessedMonsterStats | undefined> {
  if (!_monsterStatsMap) {
    const stats = await loadMonsterStats();
    _monsterStatsMap = new Map(stats.map(s => [s.level, s]));
  }
  return _monsterStatsMap.get(level);
}

// --- World Areas ---
export async function loadWorldAreas(): Promise<ProcessedWorldArea[]> {
  if (!_worldAreas) {
    _worldAreas = await loadJson<ProcessedWorldArea[]>("/data/processed/world-areas.json");
  }
  return _worldAreas;
}

export async function getWorldAreaMap(): Promise<Map<string, ProcessedWorldArea>> {
  if (!_worldAreaMap) {
    const areas = await loadWorldAreas();
    _worldAreaMap = new Map(areas.map(a => [a.id, a]));
  }
  return _worldAreaMap;
}

export async function getAct1Areas(): Promise<ProcessedWorldArea[]> {
  const areas = await loadWorldAreas();
  return areas.filter(a => a.act === 1 && !a.isTown);
}

// --- Base Items ---
export async function loadBaseItems(): Promise<ProcessedBaseItem[]> {
  if (!_baseItems) {
    _baseItems = await loadJson<ProcessedBaseItem[]>("/data/processed/base-items.json");
  }
  return _baseItems;
}

export async function getBaseItemsByClass(itemClass: string): Promise<ProcessedBaseItem[]> {
  const items = await loadBaseItems();
  return items.filter(i => i.itemClass === itemClass);
}

export async function getWeaponsForLevel(maxLevel: number): Promise<ProcessedBaseItem[]> {
  const items = await loadBaseItems();
  const weaponClasses = [
    "One Hand Sword", "Two Hand Sword", "One Hand Axe", "Two Hand Axe",
    "One Hand Mace", "Two Hand Mace", "Bow", "Claw", "Dagger",
    "Sceptre", "Staff", "Wand",
  ];
  return items.filter(i =>
    weaponClasses.includes(i.itemClass) &&
    i.dropLevel <= maxLevel &&
    i.domain === "item"
  );
}

export async function getArmourForLevel(maxLevel: number): Promise<ProcessedBaseItem[]> {
  const items = await loadBaseItems();
  const armourClasses = [
    "Body Armour", "Helmet", "Gloves", "Boots", "Shield",
  ];
  return items.filter(i =>
    armourClasses.includes(i.itemClass) &&
    i.dropLevel <= maxLevel &&
    i.domain === "item"
  );
}

// --- Utility: Clear cache ---
export function clearDataCache(): void {
  _characters = null;
  _activeSkills = null;
  _supportGems = null;
  _monsterStats = null;
  _worldAreas = null;
  _baseItems = null;
  _activeSkillMap = null;
  _supportGemMap = null;
  _monsterStatsMap = null;
  _worldAreaMap = null;
}
