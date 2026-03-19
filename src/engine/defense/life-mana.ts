import type { DurationMs } from "../types/common";

/**
 * Tick life regeneration.
 * Life regen in PoE is flat amount per second.
 */
export function tickLifeRegen(
  currentLife: number,
  maxLife: number,
  regenPerSecond: number,
  deltaMs: DurationMs,
): number {
  if (regenPerSecond <= 0 || currentLife >= maxLife) return currentLife;
  const regen = (regenPerSecond / 1000) * deltaMs;
  return Math.min(maxLife, currentLife + regen);
}

/**
 * Tick mana regeneration.
 * Base mana regen in PoE is 1.75% of max mana per second (+ flat/increased).
 */
export function tickManaRegen(
  currentMana: number,
  maxMana: number,
  regenPerSecond: number,
  deltaMs: DurationMs,
): number {
  if (regenPerSecond <= 0 || currentMana >= maxMana) return currentMana;
  const regen = (regenPerSecond / 1000) * deltaMs;
  return Math.min(maxMana, currentMana + regen);
}

/**
 * Spend mana for a skill use.
 * Returns new mana amount, or null if insufficient mana.
 */
export function spendMana(
  currentMana: number,
  cost: number,
): { newMana: number } | null {
  if (currentMana < cost) return null;
  return { newMana: currentMana - cost };
}
