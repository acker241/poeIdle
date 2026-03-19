import { resolveEvasion } from "../defense/evasion";
import type { EntropyState } from "../utils/entropy";

/**
 * Resolve whether an attack hits.
 * Uses entropy-based evasion system for fairness.
 */
export function resolveAttackHit(
  attackerAccuracy: number,
  defenderEvasion: number,
  entropy: EntropyState,
): { hit: boolean; newEntropy: EntropyState } {
  return resolveEvasion(attackerAccuracy, defenderEvasion, entropy);
}
