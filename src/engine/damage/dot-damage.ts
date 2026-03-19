import type { DamageType } from "../types/damage";
import type { ComputedStats } from "../types/stats";
import { getStatValue } from "../stats/stat-calculator";
import {
  STAT_DOT_DAMAGE,
  STAT_PHYSICAL_DAMAGE,
  STAT_FIRE_DAMAGE,
  STAT_COLD_DAMAGE,
  STAT_LIGHTNING_DAMAGE,
  STAT_CHAOS_DAMAGE,
} from "../stats/stat-registry";

/**
 * Calculate Damage over Time DPS.
 *
 * DoT in PoE uses a separate modifier pool from hits:
 *   dotDPS = baseDPS × (1 + Σincreased) × Π(1 + each_more)
 *
 * Modifiers that apply:
 * - "increased/more damage over time"
 * - "increased/more [type] damage" (e.g., fire damage for ignite)
 * - Does NOT benefit from attack/spell damage, crit, penetration
 *
 * @param baseDps - The base DoT DPS (from ailment calc or skill definition)
 * @param damageType - The type of DoT damage
 * @param stats - Character's computed stats
 * @returns Final DoT DPS
 */
export function calculateDotDps(
  baseDps: number,
  damageType: DamageType,
  stats: ComputedStats,
): number {
  // Collect applicable increased modifiers
  let increased = 0;

  // Global DoT damage
  increased += getStatValue(stats, STAT_DOT_DAMAGE + "_increased") || 0;

  // Type-specific damage
  increased += getIncreasedForDotType(damageType, stats);

  // Apply increased
  let dps = baseDps * (1 + increased);

  // Apply more multipliers
  // DoT "more" multipliers come from specific sources (support gems, keystones)
  // They are tracked as separate stats
  const dotMore = getStatValue(stats, STAT_DOT_DAMAGE + "_more") || 0;
  if (dotMore !== 0) {
    dps *= (1 + dotMore);
  }

  const typeMore = getStatValue(stats, getDotTypeStatId(damageType) + "_more") || 0;
  if (typeMore !== 0) {
    dps *= (1 + typeMore);
  }

  return Math.max(0, dps);
}

function getIncreasedForDotType(type: DamageType, stats: ComputedStats): number {
  return getStatValue(stats, getDotTypeStatId(type) + "_increased") || 0;
}

function getDotTypeStatId(type: DamageType): string {
  const map: Record<string, string> = {
    physical: STAT_PHYSICAL_DAMAGE,
    fire: STAT_FIRE_DAMAGE,
    cold: STAT_COLD_DAMAGE,
    lightning: STAT_LIGHTNING_DAMAGE,
    chaos: STAT_CHAOS_DAMAGE,
  };
  return map[type] ?? STAT_DOT_DAMAGE;
}
