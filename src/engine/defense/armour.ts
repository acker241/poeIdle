/**
 * Physical damage reduction from armour.
 * Formula: reduction = armour / (armour + 5 × rawDamage), capped at 90%
 */
export function calculateArmourReduction(armour: number, rawDamage: number): number {
  if (armour <= 0 || rawDamage <= 0) return 0;
  return Math.min(armour / (armour + 5 * rawDamage), 0.90);
}

export function applyArmour(damage: number, armour: number): number {
  return Math.max(0, damage * (1 - calculateArmourReduction(armour, damage)));
}
