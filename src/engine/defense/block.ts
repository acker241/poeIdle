import type { SeededRng } from "../utils/rng";
import { clamp } from "../utils/clamp";

/** Maximum block chance in PoE */
export const MAX_BLOCK_CHANCE = 0.75;

/**
 * Resolve a block check.
 * Block prevents all damage from the blocked hit.
 *
 * @param blockChance - Total block chance as decimal (0-0.75)
 * @param rng - RNG instance
 * @returns Whether the hit was blocked
 */
export function resolveBlock(blockChance: number, rng: SeededRng): boolean {
  const effective = clamp(blockChance, 0, MAX_BLOCK_CHANCE);
  return rng.chance(effective);
}

/**
 * Resolve a spell block check.
 */
export function resolveSpellBlock(spellBlockChance: number, rng: SeededRng): boolean {
  const effective = clamp(spellBlockChance, 0, MAX_BLOCK_CHANCE);
  return rng.chance(effective);
}
