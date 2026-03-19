/**
 * Entropy-based hit resolution system (used by PoE for evasion).
 *
 * Instead of pure RNG, PoE uses an entropy accumulator that ensures
 * results are evenly distributed. With 50% chance to evade, you will
 * evade exactly every other hit — no lucky/unlucky streaks.
 *
 * How it works:
 * - Counter starts at 0
 * - Each check: counter += chanceToSucceed (as integer 0-100)
 * - If counter >= 100: success, counter -= 100
 * - If counter < 100: failure
 */
export interface EntropyState {
  readonly counter: number;
}

export function createEntropyState(): EntropyState {
  return { counter: 0 };
}

/**
 * Resolve an entropy-based check.
 * @param chancePercent - Chance of success as integer 0-100 (e.g., 75 = 75%)
 * @param entropy - Current entropy state
 * @returns Whether the check succeeded and the new entropy state
 */
export function resolveEntropy(
  chancePercent: number,
  entropy: EntropyState,
): { success: boolean; newEntropy: EntropyState } {
  const clamped = Math.round(Math.min(Math.max(chancePercent, 0), 100));
  const newCounter = entropy.counter + clamped;

  if (newCounter >= 100) {
    return {
      success: true,
      newEntropy: { counter: newCounter - 100 },
    };
  }

  return {
    success: false,
    newEntropy: { counter: newCounter },
  };
}
