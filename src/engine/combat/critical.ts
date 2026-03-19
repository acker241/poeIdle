import type { SeededRng } from "../utils/rng";
import { clamp } from "../utils/clamp";

/**
 * Resolve a critical strike check.
 *
 * @param critChance - Effective crit chance (0-1)
 * @param rng - RNG instance
 * @returns Whether the hit is a critical strike
 */
export function resolveCriticalStrike(critChance: number, rng: SeededRng): boolean {
  const effective = clamp(critChance, 0.05, 1.0); // min 5%, max 100%
  return rng.chance(effective);
}

/**
 * Get effective crit multiplier.
 * PoE base crit multi is 150% (1.5).
 * Additional crit multi is added to this.
 */
export function getEffectiveCritMultiplier(baseCritMulti: number, additionalMulti: number): number {
  return Math.max(1.0, baseCritMulti + additionalMulti);
}
