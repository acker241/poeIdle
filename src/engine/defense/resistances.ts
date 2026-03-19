import { DamageType } from "../types/damage";
import { clamp } from "../utils/clamp";

/** Default resistance cap in PoE */
export const DEFAULT_RESISTANCE_CAP = 0.75;

/** Default maximum chaos resistance */
export const DEFAULT_CHAOS_RESISTANCE_CAP = 0.75;

/**
 * Calculate effective resistance after cap and penetration.
 *
 * @param resistance - Total resistance from gear/tree/etc (can exceed cap)
 * @param cap - Maximum resistance (default 75%)
 * @param penetration - Attacker's penetration (reduces effective resistance)
 * @returns Effective resistance as decimal
 */
export function calculateEffectiveResistance(
  resistance: number,
  cap: number = DEFAULT_RESISTANCE_CAP,
  penetration: number = 0,
): number {
  // Cap the resistance first
  const capped = Math.min(resistance, cap);
  // Penetration reduces effective resistance (can go negative)
  return capped - penetration;
}

/**
 * Apply resistance to damage.
 */
export function applyResistance(damage: number, effectiveResistance: number): number {
  return Math.max(0, damage * (1 - effectiveResistance));
}

/**
 * Get the default uncapped resistance for a given damage type.
 * In merciless (post act 5), players get -60% to all elemental resistances.
 * Chaos starts at -60%.
 */
export function getDefaultResistancePenalty(damageType: DamageType, act: number): number {
  if (damageType === DamageType.Physical) return 0;
  // After act 5, -30% all res. After act 10, -60% all res (like PoE).
  if (act <= 5) return 0;
  if (act <= 10) return -0.30;
  return -0.60;
}
