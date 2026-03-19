import { DamageType, CONVERSION_CHAIN } from "../types/damage";
import type { DamageConversion, DamagePool } from "../types/damage";
import { clamp } from "../utils/clamp";

/**
 * Apply damage conversions following PoE's conversion chain:
 *   Physical → Lightning → Cold → Fire → Chaos
 *
 * Key rules:
 * 1. Damage can only convert forward in the chain
 * 2. Total conversion from any type is capped at 100%
 * 3. Converted damage retains its "origin type" for modifier purposes
 *    (e.g., "increased physical damage" still applies to phys-converted-to-fire)
 *
 * @param baseDamageByType - Starting damage amounts per type
 * @param conversions - All active conversion specs
 * @returns DamagePool tracking both final type and origin type
 */
export function applyConversions(
  baseDamageByType: ReadonlyMap<DamageType, number>,
  conversions: readonly DamageConversion[],
): DamagePool {
  // Initialize: each damage type starts as its own origin
  // pool[finalType][originType] = amount
  const pool: DamagePool = new Map();
  for (const type of CONVERSION_CHAIN) {
    const origins = new Map<DamageType, number>();
    const base = baseDamageByType.get(type) ?? 0;
    if (base > 0) {
      origins.set(type, base);
    }
    pool.set(type, origins);
  }

  // Process conversions in chain order
  for (const fromType of CONVERSION_CHAIN) {
    // Gather all conversions FROM this type
    const conversionsFromThis = conversions.filter(c => c.from === fromType);
    if (conversionsFromThis.length === 0) continue;

    // Calculate total conversion percentage (cap at 100%)
    let totalConversionPct = 0;
    for (const conv of conversionsFromThis) {
      totalConversionPct += conv.percentage;
    }
    const scale = totalConversionPct > 1.0
      ? 1.0 / totalConversionPct
      : 1.0;

    const fromOrigins = pool.get(fromType)!;

    // For each conversion target
    for (const conv of conversionsFromThis) {
      const effectivePct = clamp(conv.percentage * scale, 0, 1);
      const toOrigins = pool.get(conv.to)!;

      // Move damage from each origin type
      for (const [originType, amount] of fromOrigins) {
        const converted = amount * effectivePct;
        if (converted <= 0) continue;

        // Add to target type, preserving origin
        toOrigins.set(originType, (toOrigins.get(originType) ?? 0) + converted);
      }
    }

    // Remove converted portion from source
    const totalEffectivePct = clamp(totalConversionPct, 0, 1);
    for (const [originType, amount] of fromOrigins) {
      fromOrigins.set(originType, amount * (1 - totalEffectivePct));
    }
  }

  return pool;
}

/**
 * Get total damage of a specific final type from a DamagePool.
 */
export function getPoolDamage(pool: DamagePool, finalType: DamageType): number {
  const origins = pool.get(finalType);
  if (!origins) return 0;
  let total = 0;
  for (const amount of origins.values()) {
    total += amount;
  }
  return total;
}

/**
 * Get total damage across all final types.
 */
export function getPoolTotalDamage(pool: DamagePool): number {
  let total = 0;
  for (const origins of pool.values()) {
    for (const amount of origins.values()) {
      total += amount;
    }
  }
  return total;
}
