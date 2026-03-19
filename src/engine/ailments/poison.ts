import type { AilmentInstance } from "../types/ailments";
import {
  AilmentType,
  POISON_BASE_DURATION,
  POISON_BASE_DAMAGE_MULTIPLIER,
} from "../types/ailments";
import type { ComputedStats } from "../types/stats";
import type { DurationMs } from "../types/common";
import { getStatValue } from "../stats/stat-calculator";
import { STAT_POISON_DAMAGE, STAT_AILMENT_DURATION } from "../stats/stat-registry";

/**
 * Calculate a poison stack from a hit.
 *
 * Poison DPS per stack = (physDamage + chaosDamage) × 0.20 × modifiers
 * Duration = 2s × (1 + increased duration)
 * Stacks infinitely.
 */
export function calculatePoison(
  physDamageOfHit: number,
  chaosDamageOfHit: number,
  stats: ComputedStats,
  skillId: string,
  currentTimeMs: DurationMs,
): AilmentInstance | null {
  const baseDamage = physDamageOfHit + chaosDamageOfHit;
  if (baseDamage <= 0) return null;

  const baseDps = baseDamage * POISON_BASE_DAMAGE_MULTIPLIER;

  const increasedPoison = getStatValue(stats, STAT_POISON_DAMAGE + "_increased") || 0;
  const dps = baseDps * (1 + increasedPoison);

  const durationIncrease = getStatValue(stats, STAT_AILMENT_DURATION + "_increased") || 0;
  const duration = POISON_BASE_DURATION * (1 + durationIncrease);

  return {
    type: AilmentType.Poison,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration,
    baseDuration: duration,
    dps,
  };
}

/**
 * Calculate total poison DPS from all active stacks.
 */
export function totalPoisonDps(poisons: readonly AilmentInstance[]): number {
  let total = 0;
  for (const p of poisons) {
    total += p.dps ?? 0;
  }
  return total;
}

/**
 * Tick poison stacks: remove expired, return remaining.
 */
export function tickPoisons(
  poisons: readonly AilmentInstance[],
  deltaMs: DurationMs,
): readonly AilmentInstance[] {
  return poisons
    .map(p => ({ ...p, duration: p.duration - deltaMs }))
    .filter(p => p.duration > 0);
}
