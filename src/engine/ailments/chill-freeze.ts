import type { AilmentInstance } from "../types/ailments";
import {
  AilmentType,
  CHILL_MIN_EFFECT,
  CHILL_MAX_EFFECT,
  FREEZE_MIN_DURATION,
} from "../types/ailments";
import type { DurationMs } from "../types/common";
import { clamp } from "../utils/clamp";

/**
 * Calculate chill effect from cold damage.
 *
 * Chill slows enemy action speed.
 * Effect = coldDamage / enemyMaxLife, scaled and clamped to 5%-30%.
 */
export function calculateChill(
  coldDamageOfHit: number,
  enemyMaxLife: number,
  currentTimeMs: DurationMs,
  skillId: string,
): AilmentInstance | null {
  if (coldDamageOfHit <= 0 || enemyMaxLife <= 0) return null;

  const rawEffect = coldDamageOfHit / enemyMaxLife;
  const effect = clamp(rawEffect, CHILL_MIN_EFFECT, CHILL_MAX_EFFECT);

  // Chill doesn't apply if effect would be below minimum
  if (rawEffect < CHILL_MIN_EFFECT) return null;

  return {
    type: AilmentType.Chill,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration: 2000, // base 2s chill duration
    baseDuration: 2000,
    effect,
  };
}

/**
 * Calculate freeze duration from cold damage.
 *
 * Freeze duration = 60 × coldDamage / enemyMaxLife (in ms)
 * Minimum 300ms or freeze doesn't apply.
 */
export function calculateFreeze(
  coldDamageOfHit: number,
  enemyMaxLife: number,
  currentTimeMs: DurationMs,
  skillId: string,
): AilmentInstance | null {
  if (coldDamageOfHit <= 0 || enemyMaxLife <= 0) return null;

  // Duration in ms
  const duration = (60 * coldDamageOfHit / enemyMaxLife) * 1000;

  if (duration < FREEZE_MIN_DURATION) return null;

  return {
    type: AilmentType.Freeze,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration,
    baseDuration: duration,
    effect: 1.0, // freeze = 100% action speed reduction
  };
}

/**
 * Resolve chill: keep strongest effect.
 */
export function resolveChill(
  current: AilmentInstance | null,
  incoming: AilmentInstance,
): AilmentInstance {
  if (!current) return incoming;
  return (incoming.effect ?? 0) > (current.effect ?? 0) ? incoming : current;
}

/**
 * Resolve freeze: keep longest remaining duration.
 */
export function resolveFreeze(
  current: AilmentInstance | null,
  incoming: AilmentInstance,
): AilmentInstance {
  if (!current) return incoming;
  return incoming.duration > current.duration ? incoming : current;
}
