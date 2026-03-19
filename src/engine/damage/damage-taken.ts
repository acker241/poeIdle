import { DamageType } from "../types/damage";
import { clamp } from "../utils/clamp";

/**
 * Calculate physical damage reduction from armour.
 *
 * PoE formula: reduction = armour / (armour + 5 × rawDamage)
 * Capped at 90%.
 */
export function calculateArmourReduction(armour: number, rawPhysDamage: number): number {
  if (armour <= 0 || rawPhysDamage <= 0) return 0;
  const reduction = armour / (armour + 5 * rawPhysDamage);
  return Math.min(reduction, 0.90);
}

/**
 * Apply armour to physical damage.
 */
export function applyArmour(damage: number, armour: number): number {
  const reduction = calculateArmourReduction(armour, damage);
  return Math.max(0, damage * (1 - reduction));
}

/**
 * Apply resistance to damage.
 * Resistance is a percentage: 0.75 = 75% resistance → takes 25% damage.
 * Can be negative (enemy takes more damage).
 *
 * @param damage - Raw damage amount
 * @param resistance - Resistance as decimal (0.75 = 75%)
 * @param penetration - Penetration as decimal (reduces effective resistance)
 * @returns Damage after resistance
 */
export function applyResistance(
  damage: number,
  resistance: number,
  penetration: number = 0,
): number {
  const effectiveRes = resistance - penetration;
  // No cap on effective resistance (can go negative = amplified damage)
  return Math.max(0, damage * (1 - effectiveRes));
}

/**
 * Apply damage to a health pool (ES first, then life).
 * Returns remaining damage after ES absorption and new ES/life values.
 */
export function applyDamageToHealthPool(
  damage: number,
  currentLife: number,
  currentES: number,
  isChaos: boolean = false,
): { newLife: number; newES: number; overkill: number } {
  // Chaos damage bypasses ES in PoE
  if (isChaos) {
    const newLife = currentLife - damage;
    return {
      newLife: Math.max(0, newLife),
      newES: currentES,
      overkill: newLife < 0 ? -newLife : 0,
    };
  }

  // ES absorbs first
  let remaining = damage;
  let newES = currentES;
  let newLife = currentLife;

  if (newES > 0) {
    if (remaining <= newES) {
      newES -= remaining;
      remaining = 0;
    } else {
      remaining -= newES;
      newES = 0;
    }
  }

  if (remaining > 0) {
    newLife -= remaining;
  }

  return {
    newLife: Math.max(0, newLife),
    newES,
    overkill: newLife < 0 ? -newLife : 0,
  };
}
