import { resolveEntropy, type EntropyState } from "../utils/entropy";
import { clamp } from "../utils/clamp";

/**
 * Calculate chance to hit (attacker accuracy vs defender evasion).
 * PoE formula: chanceToHit = accuracy / (accuracy + (evasion/4)^0.8)
 * Clamped between 5% and 100%.
 */
export function calculateHitChance(accuracy: number, evasion: number): number {
  if (evasion <= 0) return 1.0;
  if (accuracy <= 0) return 0.05;
  const chance = accuracy / (accuracy + Math.pow(evasion / 4, 0.8));
  return clamp(chance, 0.05, 1.0);
}

/**
 * Resolve an evasion check using entropy system.
 * Returns whether the attack hit and the new entropy state.
 */
export function resolveEvasion(
  attackerAccuracy: number,
  defenderEvasion: number,
  entropy: EntropyState,
): { hit: boolean; newEntropy: EntropyState } {
  const hitChance = calculateHitChance(attackerAccuracy, defenderEvasion);
  const hitChancePct = Math.round(hitChance * 100);
  const { success, newEntropy } = resolveEntropy(hitChancePct, entropy);
  return { hit: success, newEntropy };
}
