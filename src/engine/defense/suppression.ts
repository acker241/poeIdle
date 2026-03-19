import type { SeededRng } from "../utils/rng";
import { clamp } from "../utils/clamp";

/**
 * Spell suppression in PoE:
 * - Chance to suppress spell damage
 * - When suppressed, damage is halved (50% less)
 * - Chance is capped at 100%
 */

export function resolveSpellSuppression(
  suppressionChance: number,
  rng: SeededRng,
): boolean {
  const effective = clamp(suppressionChance, 0, 1.0);
  return rng.chance(effective);
}

/**
 * Apply suppression to spell damage.
 * Suppressed spells deal 50% less damage.
 */
export function applySuppression(damage: number, wasSuppressed: boolean): number {
  return wasSuppressed ? damage * 0.5 : damage;
}
