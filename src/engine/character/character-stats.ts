import type { CharacterState, ResolvedCharacter } from "../types/character";
import type { StatModifier, ComputedStats } from "../types/stats";
import { ModifierType } from "../types/stats";
import type { TreeGraph } from "../types/skilltree";
import type { ActiveSkillDef, SupportGemDef } from "../types/skills";
import { calculateAllStats, getStatValue } from "../stats/stat-calculator";
import { collectTreeModifiers } from "../tree/tree-stats";
import { getAllEquipmentModifiers } from "../items/equipment";
import { resolveAllSkillLinks } from "../skills/skill-resolver";
import { CLASS_BASE_STATS_MAP, ATTRIBUTE_BONUSES, PER_LEVEL_BONUSES } from "../data/stats/class-base-stats";
import {
  STAT_STRENGTH,
  STAT_DEXTERITY,
  STAT_INTELLIGENCE,
  STAT_MAX_LIFE,
  STAT_MAX_MANA,
  STAT_MAX_ENERGY_SHIELD,
  STAT_ATTACK_SPEED,
  STAT_CAST_SPEED,
  STAT_MOVEMENT_SPEED,
  STAT_FIRE_RESISTANCE,
  STAT_COLD_RESISTANCE,
  STAT_LIGHTNING_RESISTANCE,
  STAT_CHAOS_RESISTANCE,
} from "../stats/stat-registry";

/**
 * Build the base stat modifiers for a character (class + level).
 */
export function buildBaseModifiers(state: CharacterState): readonly StatModifier[] {
  const classStats = CLASS_BASE_STATS_MAP.get(state.classId);
  if (!classStats) return [];

  const src = { kind: "base" as const, id: "class", label: state.classId };
  const lvlSrc = { kind: "base" as const, id: "level", label: `Level ${state.level}` };

  const mods: StatModifier[] = [
    // Class base attributes
    { statId: STAT_STRENGTH, type: ModifierType.Flat, value: classStats.strength, source: src },
    { statId: STAT_DEXTERITY, type: ModifierType.Flat, value: classStats.dexterity, source: src },
    { statId: STAT_INTELLIGENCE, type: ModifierType.Flat, value: classStats.intelligence, source: src },

    // Base life/mana from class
    { statId: STAT_MAX_LIFE, type: ModifierType.Flat, value: classStats.baseLife, source: src },
    { statId: STAT_MAX_MANA, type: ModifierType.Flat, value: classStats.baseMana, source: src },
    { statId: STAT_MAX_ENERGY_SHIELD, type: ModifierType.Flat, value: classStats.baseEnergyShield, source: src },

    // Per-level bonuses
    { statId: STAT_MAX_LIFE, type: ModifierType.Flat, value: PER_LEVEL_BONUSES.lifePerLevel * state.level, source: lvlSrc },
    { statId: STAT_MAX_MANA, type: ModifierType.Flat, value: PER_LEVEL_BONUSES.manaPerLevel * state.level, source: lvlSrc },

    // Base movement speed (30% in PoE)
    { statId: STAT_MOVEMENT_SPEED, type: ModifierType.Flat, value: 1.0, source: src },

    // Base attack/cast speed (1.0 = 1 per second)
    { statId: STAT_ATTACK_SPEED, type: ModifierType.Flat, value: 1.0, source: src },
    { statId: STAT_CAST_SPEED, type: ModifierType.Flat, value: 1.0, source: src },

    // Base resistances (0% at act 1)
    { statId: STAT_FIRE_RESISTANCE, type: ModifierType.Flat, value: 0, source: src },
    { statId: STAT_COLD_RESISTANCE, type: ModifierType.Flat, value: 0, source: src },
    { statId: STAT_LIGHTNING_RESISTANCE, type: ModifierType.Flat, value: 0, source: src },
    { statId: STAT_CHAOS_RESISTANCE, type: ModifierType.Flat, value: -0.60, source: src }, // -60% chaos res
  ];

  return mods;
}

/**
 * Resolve a character: compute all stats from all sources.
 */
export function resolveCharacter(
  state: CharacterState,
  treeGraph: TreeGraph,
  skillDefs: ReadonlyMap<string, ActiveSkillDef>,
  supportDefs: ReadonlyMap<string, SupportGemDef>,
): ResolvedCharacter {
  // Collect modifiers from all sources
  const baseMods = buildBaseModifiers(state);
  const treeMods = collectTreeModifiers(treeGraph, state.allocatedPassives);
  const itemMods = getAllEquipmentModifiers(state.equipment);
  const resolvedSkills = resolveAllSkillLinks(state.skillLinks, skillDefs, supportDefs);
  const skillMods: StatModifier[] = [];
  for (const skill of resolvedSkills) {
    skillMods.push(...skill.totalStatModifiers);
  }

  // All modifiers combined
  const allModifiers = [...baseMods, ...treeMods, ...itemMods, ...skillMods];

  // Calculate base stats map
  const baseStats = new Map<string, number>();

  // Compute all stats
  const stats = calculateAllStats(baseStats, allModifiers);

  // Derive secondary stats from attributes
  const str = getStatValue(stats, STAT_STRENGTH);
  const dex = getStatValue(stats, STAT_DEXTERITY);
  const int = getStatValue(stats, STAT_INTELLIGENCE);

  // Attribute-derived bonuses
  const attrLifeBonus = str * ATTRIBUTE_BONUSES.lifePerStrength;
  const attrManaBonus = int * ATTRIBUTE_BONUSES.manaPerIntelligence;

  const maxLife = getStatValue(stats, STAT_MAX_LIFE) + attrLifeBonus;
  const maxMana = getStatValue(stats, STAT_MAX_MANA) + attrManaBonus;
  const maxEnergyShield = getStatValue(stats, STAT_MAX_ENERGY_SHIELD);

  const attacksPerSecond = getStatValue(stats, STAT_ATTACK_SPEED);
  const castsPerSecond = getStatValue(stats, STAT_CAST_SPEED);
  const movementSpeed = getStatValue(stats, STAT_MOVEMENT_SPEED);

  return {
    state,
    stats,
    maxLife,
    maxMana,
    maxEnergyShield,
    attacksPerSecond,
    castsPerSecond,
    movementSpeed,
    resistances: {
      fire: Math.min(getStatValue(stats, STAT_FIRE_RESISTANCE), 0.75),
      cold: Math.min(getStatValue(stats, STAT_COLD_RESISTANCE), 0.75),
      lightning: Math.min(getStatValue(stats, STAT_LIGHTNING_RESISTANCE), 0.75),
      chaos: Math.min(getStatValue(stats, STAT_CHAOS_RESISTANCE), 0.75),
    },
  };
}
