import type { StatId, StatModifier, StatBreakdown, ComputedStats } from "../types/stats";
import { ModifierType } from "../types/stats";

/**
 * Calculate a single stat using PoE's formula:
 *   final = (base + Σflat) × (1 + Σincreased) × Π(1 + each_more)
 *
 * @param base - The base value of the stat (before any modifiers)
 * @param modifiers - All modifiers that apply to this stat
 * @returns Full breakdown of the calculation
 */
export function calculateStat(
  base: number,
  modifiers: readonly StatModifier[],
): StatBreakdown {
  let flatTotal = 0;
  let increasedTotal = 0;
  const moreMultipliers: number[] = [];

  for (const mod of modifiers) {
    switch (mod.type) {
      case ModifierType.Flat:
        flatTotal += mod.value;
        break;
      case ModifierType.Increased:
        increasedTotal += mod.value;
        break;
      case ModifierType.More:
        moreMultipliers.push(mod.value);
        break;
    }
  }

  const afterFlat = base + flatTotal;
  const afterIncreased = afterFlat * (1 + increasedTotal);
  let finalValue = afterIncreased;
  for (const more of moreMultipliers) {
    finalValue *= (1 + more);
  }

  return {
    base,
    flatTotal,
    increasedTotal,
    moreMultipliers,
    finalValue,
  };
}

/**
 * Calculate all stats from a collection of modifiers.
 *
 * Groups modifiers by statId first (single pass), then computes each stat.
 * This is O(N + S) where N = total modifiers and S = unique stats,
 * instead of O(N × S) if filtering per stat.
 *
 * @param baseStats - Map of statId → base value
 * @param allModifiers - All modifiers from all sources
 * @returns ComputedStats with final values and breakdowns
 */
export function calculateAllStats(
  baseStats: ReadonlyMap<StatId, number>,
  allModifiers: readonly StatModifier[],
): ComputedStats {
  // Group modifiers by statId (single pass)
  const grouped = new Map<StatId, StatModifier[]>();
  for (const mod of allModifiers) {
    let group = grouped.get(mod.statId);
    if (!group) {
      group = [];
      grouped.set(mod.statId, group);
    }
    group.push(mod);
  }

  const values = new Map<StatId, number>();
  const breakdowns = new Map<StatId, StatBreakdown>();

  // Compute stats that have a base value
  for (const [statId, base] of baseStats) {
    const mods = grouped.get(statId) ?? [];
    const breakdown = calculateStat(base, mods);
    values.set(statId, breakdown.finalValue);
    breakdowns.set(statId, breakdown);
    grouped.delete(statId); // mark as processed
  }

  // Compute stats that only have modifiers (no base)
  for (const [statId, mods] of grouped) {
    const breakdown = calculateStat(0, mods);
    values.set(statId, breakdown.finalValue);
    breakdowns.set(statId, breakdown);
  }

  return { values, breakdowns };
}

/**
 * Get a stat's final value, defaulting to 0 if not present.
 */
export function getStatValue(stats: ComputedStats, statId: StatId): number {
  return stats.values.get(statId) ?? 0;
}
