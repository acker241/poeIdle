import type { AilmentInstance } from "../types/ailments";
import {
  AilmentType,
  SHOCK_MIN_EFFECT,
  SHOCK_MAX_EFFECT,
} from "../types/ailments";
import type { DurationMs } from "../types/common";
import { clamp } from "../utils/clamp";

/**
 * Calculate shock effect from lightning damage.
 *
 * Shock increases damage taken by the enemy.
 * Effect = lightningDamage / enemyMaxLife, scaled and clamped to 5%-50%.
 */
export function calculateShock(
  lightningDamageOfHit: number,
  enemyMaxLife: number,
  currentTimeMs: DurationMs,
  skillId: string,
): AilmentInstance | null {
  if (lightningDamageOfHit <= 0 || enemyMaxLife <= 0) return null;

  const rawEffect = lightningDamageOfHit / enemyMaxLife;
  const effect = clamp(rawEffect, SHOCK_MIN_EFFECT, SHOCK_MAX_EFFECT);

  if (rawEffect < SHOCK_MIN_EFFECT) return null;

  return {
    type: AilmentType.Shock,
    sourceSkillId: skillId,
    appliedAtMs: currentTimeMs,
    duration: 2000, // base 2s shock duration
    baseDuration: 2000,
    effect,
  };
}

/**
 * Resolve shock: keep strongest effect.
 */
export function resolveShock(
  current: AilmentInstance | null,
  incoming: AilmentInstance,
): AilmentInstance {
  if (!current) return incoming;
  return (incoming.effect ?? 0) > (current.effect ?? 0) ? incoming : current;
}
