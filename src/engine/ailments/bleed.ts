import type { AilmentInstance } from "../types/ailments";
import {
  AilmentType,
  BLEED_BASE_DURATION,
  BLEED_BASE_DAMAGE_MULTIPLIER,
  BLEED_MOVING_MORE_MULTIPLIER,
} from "../types/ailments";
import type { ComputedStats } from "../types/stats";
import type { DurationMs } from "../types/common";
import { getStatValue } from "../stats/stat-calculator";
import { STAT_BLEED_DAMAGE, STAT_AILMENT_DURATION } from "../stats/stat-registry";

/**
 * Calculate bleed from a hit.
 *
 * Bleed DPS = physDamage × 0.70 × modifiers
 * Duration = 5s × (1 + increased duration)
 * Does not stack by default (only strongest applies).
 * Deals 150% more damage if target is moving (×2.5 total).
 */
export function calculateBleed(
  physDamageOfHit: number,
  stats: ComputedStats,
  skillId: string,
  currentTimeMs: DurationMs,
): AilmentInstance | null {
  if (physDamageOfHit <= 0) return null;

  const baseDps = physDamageOfHit * BLEED_BASE_DAMAGE_MULTIPLIER;

  const increasedBleed = getStatValue(stats, STAT_BLEED_DAMAGE + "_increased") || 0;
  const dps = baseDps * (1 + increasedBleed);

  const durationIncrease = getStatValue(stats, STAT_AILMENT_DURATION + "_increased") || 0;
  const duration = BLEED_BASE_DURATION * (1 + durationIncrease);

  return {
    type: AilmentType.Bleed,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration,
    baseDuration: duration,
    dps,
  };
}

/**
 * Get effective bleed DPS considering if target is moving.
 * Moving targets take 150% more bleed damage (total × 2.5).
 */
export function effectiveBleedDps(bleed: AilmentInstance, targetIsMoving: boolean): number {
  const baseDps = bleed.dps ?? 0;
  return targetIsMoving ? baseDps * (1 + BLEED_MOVING_MORE_MULTIPLIER) : baseDps;
}

/**
 * Resolve which bleed to keep (strongest only).
 */
export function resolveBleed(
  current: AilmentInstance | null,
  incoming: AilmentInstance,
): AilmentInstance {
  if (!current) return incoming;
  return (incoming.dps ?? 0) > (current.dps ?? 0) ? incoming : current;
}
