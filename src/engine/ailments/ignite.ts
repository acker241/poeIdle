import type { DamageType } from "../types/damage";
import type { AilmentInstance } from "../types/ailments";
import {
  AilmentType,
  IGNITE_BASE_DURATION,
  IGNITE_BASE_DAMAGE_MULTIPLIER,
} from "../types/ailments";
import type { ComputedStats } from "../types/stats";
import type { DurationMs } from "../types/common";
import { getStatValue } from "../stats/stat-calculator";
import { STAT_IGNITE_DAMAGE, STAT_AILMENT_DURATION } from "../stats/stat-registry";

/**
 * Calculate ignite from a hit.
 *
 * Ignite DPS = baseDamage × 0.5 × (1 + increased ignite/fire damage)
 * Duration = 4s × (1 + increased duration)
 * Only the strongest ignite applies.
 *
 * @param hitBaseDamage - The hit's base damage (before modifiers, used for ailment calc)
 * @param fireDamageOfHit - Total fire damage dealt by the hit
 * @param stats - Character stats
 * @param skillId - Source skill
 * @param currentTimeMs - Current game time
 * @returns AilmentInstance or null if ignite doesn't apply
 */
export function calculateIgnite(
  hitBaseDamage: number,
  stats: ComputedStats,
  skillId: string,
  currentTimeMs: DurationMs,
): AilmentInstance | null {
  if (hitBaseDamage <= 0) return null;

  // Base ignite DPS = 50% of base damage per second
  const baseDps = hitBaseDamage * IGNITE_BASE_DAMAGE_MULTIPLIER;

  // Apply increased ignite/fire DoT damage
  const increasedIgnite = getStatValue(stats, STAT_IGNITE_DAMAGE + "_increased") || 0;
  const dps = baseDps * (1 + increasedIgnite);

  // Duration
  const durationIncrease = getStatValue(stats, STAT_AILMENT_DURATION + "_increased") || 0;
  const duration = IGNITE_BASE_DURATION * (1 + durationIncrease);

  return {
    type: AilmentType.Ignite,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration,
    baseDuration: duration,
    dps,
  };
}

/**
 * Resolve which ignite to keep (only strongest applies).
 */
export function resolveIgnite(
  current: AilmentInstance | null,
  incoming: AilmentInstance,
): AilmentInstance {
  if (!current) return incoming;
  // Keep the one with higher DPS
  return (incoming.dps ?? 0) > (current.dps ?? 0) ? incoming : current;
}
