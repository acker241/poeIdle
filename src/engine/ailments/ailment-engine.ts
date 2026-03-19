import { DamageType } from "../types/damage";
import type { AilmentInstance, AilmentState } from "../types/ailments";
import { AilmentType, createEmptyAilmentState } from "../types/ailments";
import type { ComputedStats } from "../types/stats";
import type { DurationMs } from "../types/common";
import type { SeededRng } from "../utils/rng";
import { getStatValue } from "../stats/stat-calculator";
import {
  STAT_IGNITE_CHANCE,
  STAT_CHILL_CHANCE,
  STAT_FREEZE_CHANCE,
  STAT_SHOCK_CHANCE,
  STAT_POISON_CHANCE,
  STAT_BLEED_CHANCE,
} from "../stats/stat-registry";

import { calculateIgnite, resolveIgnite } from "./ignite";
import { calculatePoison, tickPoisons } from "./poison";
import { calculateBleed, resolveBleed, effectiveBleedDps } from "./bleed";
import { calculateChill, resolveChill, calculateFreeze, resolveFreeze } from "./chill-freeze";
import { calculateShock, resolveShock } from "./shock";

/** Damage per type dealt by a hit (for ailment calculations) */
export interface HitDamageByType {
  physical: number;
  fire: number;
  cold: number;
  lightning: number;
  chaos: number;
}

/** Result of applying ailments from a hit */
export interface AilmentApplicationResult {
  readonly newAilmentState: AilmentState;
  readonly appliedAilments: readonly AilmentType[];
}

/**
 * Apply ailments from a hit to the target.
 * Checks chances, calculates effects, resolves with existing ailments.
 */
export function applyAilmentsFromHit(
  hitDamage: HitDamageByType,
  totalHitDamage: number,
  enemyMaxLife: number,
  currentAilments: AilmentState,
  stats: ComputedStats,
  skillId: string,
  currentTimeMs: DurationMs,
  rng: SeededRng,
  innateChances?: Partial<Record<AilmentType, number>>,
): AilmentApplicationResult {
  const applied: AilmentType[] = [];
  let newState = { ...currentAilments };

  // --- Ignite (fire damage) ---
  const igniteChance = (innateChances?.[AilmentType.Ignite] ?? 0)
    + getStatValue(stats, STAT_IGNITE_CHANCE);
  if (hitDamage.fire > 0 && rng.chance(igniteChance)) {
    const ignite = calculateIgnite(totalHitDamage, stats, skillId, currentTimeMs);
    if (ignite) {
      newState = { ...newState, ignite: resolveIgnite(newState.ignite, ignite) };
      applied.push(AilmentType.Ignite);
    }
  }

  // --- Chill (cold damage) ---
  // Cold damage always chills if it deals enough damage (or with chance)
  const chillChance = hitDamage.cold > 0 ? 1.0 : getStatValue(stats, STAT_CHILL_CHANCE);
  if (chillChance > 0 && rng.chance(chillChance)) {
    const chill = calculateChill(hitDamage.cold, enemyMaxLife, currentTimeMs, skillId);
    if (chill) {
      newState = { ...newState, chill: resolveChill(newState.chill, chill) };
      applied.push(AilmentType.Chill);
    }
  }

  // --- Freeze (cold damage, needs crit or chance) ---
  const freezeChance = (innateChances?.[AilmentType.Freeze] ?? 0)
    + getStatValue(stats, STAT_FREEZE_CHANCE);
  if (hitDamage.cold > 0 && rng.chance(freezeChance)) {
    const freeze = calculateFreeze(hitDamage.cold, enemyMaxLife, currentTimeMs, skillId);
    if (freeze) {
      newState = { ...newState, freeze: resolveFreeze(newState.freeze, freeze) };
      applied.push(AilmentType.Freeze);
    }
  }

  // --- Shock (lightning damage) ---
  const shockChance = hitDamage.lightning > 0 ? 1.0 : getStatValue(stats, STAT_SHOCK_CHANCE);
  if (shockChance > 0 && rng.chance(shockChance)) {
    const shock = calculateShock(hitDamage.lightning, enemyMaxLife, currentTimeMs, skillId);
    if (shock) {
      newState = { ...newState, shock: resolveShock(newState.shock, shock) };
      applied.push(AilmentType.Shock);
    }
  }

  // --- Poison (phys + chaos damage) ---
  const poisonChance = (innateChances?.[AilmentType.Poison] ?? 0)
    + getStatValue(stats, STAT_POISON_CHANCE);
  if ((hitDamage.physical > 0 || hitDamage.chaos > 0) && rng.chance(poisonChance)) {
    const poison = calculatePoison(hitDamage.physical, hitDamage.chaos, stats, skillId, currentTimeMs);
    if (poison) {
      newState = { ...newState, poisons: [...newState.poisons, poison] };
      applied.push(AilmentType.Poison);
    }
  }

  // --- Bleed (physical damage) ---
  const bleedChance = (innateChances?.[AilmentType.Bleed] ?? 0)
    + getStatValue(stats, STAT_BLEED_CHANCE);
  if (hitDamage.physical > 0 && rng.chance(bleedChance)) {
    const bleed = calculateBleed(hitDamage.physical, stats, skillId, currentTimeMs);
    if (bleed) {
      newState = { ...newState, bleed: resolveBleed(newState.bleed, bleed) };
      applied.push(AilmentType.Bleed);
    }
  }

  return { newAilmentState: newState, appliedAilments: applied };
}

/**
 * Tick all ailments: reduce durations, remove expired, calculate DoT damage.
 */
export function tickAilments(
  state: AilmentState,
  deltaMs: DurationMs,
  targetIsMoving: boolean,
): { newState: AilmentState; dotDamage: number; expired: AilmentType[] } {
  let dotDamage = 0;
  const expired: AilmentType[] = [];
  const dps = deltaMs / 1000;

  // Ignite
  let ignite = state.ignite;
  if (ignite) {
    dotDamage += (ignite.dps ?? 0) * dps;
    ignite = { ...ignite, duration: ignite.duration - deltaMs };
    if (ignite.duration <= 0) {
      ignite = null;
      expired.push(AilmentType.Ignite);
    }
  }

  // Chill (no damage, just debuff)
  let chill = state.chill;
  if (chill) {
    chill = { ...chill, duration: chill.duration - deltaMs };
    if (chill.duration <= 0) {
      chill = null;
      expired.push(AilmentType.Chill);
    }
  }

  // Freeze (no damage, just debuff)
  let freeze = state.freeze;
  if (freeze) {
    freeze = { ...freeze, duration: freeze.duration - deltaMs };
    if (freeze.duration <= 0) {
      freeze = null;
      expired.push(AilmentType.Freeze);
    }
  }

  // Shock (no damage, just debuff)
  let shock = state.shock;
  if (shock) {
    shock = { ...shock, duration: shock.duration - deltaMs };
    if (shock.duration <= 0) {
      shock = null;
      expired.push(AilmentType.Shock);
    }
  }

  // Poisons (stacking DoT)
  let poisons = tickPoisons(state.poisons, deltaMs);
  for (const p of state.poisons) {
    dotDamage += (p.dps ?? 0) * dps;
  }
  if (poisons.length < state.poisons.length) {
    expired.push(AilmentType.Poison);
  }

  // Bleed
  let bleed = state.bleed;
  if (bleed) {
    dotDamage += effectiveBleedDps(bleed, targetIsMoving) * dps;
    bleed = { ...bleed, duration: bleed.duration - deltaMs };
    if (bleed.duration <= 0) {
      bleed = null;
      expired.push(AilmentType.Bleed);
    }
  }

  return {
    newState: { ignite, chill, freeze, shock, poisons, bleed },
    dotDamage,
    expired,
  };
}
