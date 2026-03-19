import { DamageType, CONVERSION_CHAIN } from "../types/damage";
import type { DamageInstance, DamageConversion, DamagePool, HitDamageBreakdown } from "../types/damage";
import type { ComputedStats } from "../types/stats";
import type { NumericRange } from "../types/common";
import type { SeededRng } from "../utils/rng";
import { applyConversions, getPoolDamage } from "./damage-conversion";
import { getStatValue } from "../stats/stat-calculator";
import {
  STAT_DAMAGE,
  STAT_PHYSICAL_DAMAGE,
  STAT_FIRE_DAMAGE,
  STAT_COLD_DAMAGE,
  STAT_LIGHTNING_DAMAGE,
  STAT_CHAOS_DAMAGE,
  STAT_ELEMENTAL_DAMAGE,
  STAT_ATTACK_DAMAGE,
  STAT_SPELL_DAMAGE,
  STAT_CRIT_CHANCE,
  STAT_CRIT_MULTIPLIER,
  STAT_FIRE_PENETRATION,
  STAT_COLD_PENETRATION,
  STAT_LIGHTNING_PENETRATION,
  STAT_CHAOS_PENETRATION,
  STAT_ELEMENTAL_PENETRATION,
} from "../stats/stat-registry";
import { clamp } from "../utils/clamp";

/** Context for a hit calculation */
export interface HitContext {
  /** Base damage instances (from weapon or spell gem) */
  baseDamage: readonly DamageInstance[];
  /** Added flat damage (from supports, gear, etc.) */
  addedDamage: readonly DamageInstance[];
  /** Damage effectiveness for added damage (e.g., 1.0 = 100%) */
  damageEffectiveness: number;
  /** Active damage conversions */
  conversions: readonly DamageConversion[];
  /** Is this an attack or spell? */
  isAttack: boolean;
  /** Character's computed stats */
  stats: ComputedStats;
  /** Enemy resistances per damage type */
  enemyResistances: Record<DamageType, number>;
  /** Enemy armour (for physical damage reduction) */
  enemyArmour: number;
  /** RNG for damage rolls and crit */
  rng: SeededRng;
  /** Whether the hit was already determined to miss (skip damage calc) */
  didHit: boolean;
}

/**
 * Calculate the full damage of a single hit.
 *
 * Pipeline:
 * 1. Roll base damage ranges
 * 2. Add flat damage (scaled by effectiveness)
 * 3. Apply damage conversion
 * 4. Apply increased/more modifiers per damage type (respecting origin types)
 * 5. Roll crit → apply crit multiplier
 * 6. Apply enemy defenses (armour for phys, resistances with penetration for ele/chaos)
 */
export function calculateHitDamage(ctx: HitContext): HitDamageBreakdown {
  const baseDamageMap = new Map<DamageType, NumericRange>();
  const afterFlatMap = new Map<DamageType, NumericRange>();

  if (!ctx.didHit) {
    return createMissBreakdown(ctx.baseDamage);
  }

  // Step 1: Collect base damage ranges
  for (const inst of ctx.baseDamage) {
    baseDamageMap.set(inst.type, { min: inst.min, max: inst.max });
  }

  // Step 2: Add flat damage (scaled by effectiveness)
  const damageRanges = new Map<DamageType, NumericRange>();
  for (const type of CONVERSION_CHAIN) {
    const base = baseDamageMap.get(type) ?? { min: 0, max: 0 };
    let addedMin = 0;
    let addedMax = 0;
    for (const added of ctx.addedDamage) {
      if (added.type === type) {
        addedMin += added.min * ctx.damageEffectiveness;
        addedMax += added.max * ctx.damageEffectiveness;
      }
    }
    const range = {
      min: base.min + addedMin,
      max: base.max + addedMax,
    };
    damageRanges.set(type, range);
    afterFlatMap.set(type, range);
  }

  // Roll damage within ranges
  const rolledDamage = new Map<DamageType, number>();
  for (const [type, range] of damageRanges) {
    rolledDamage.set(type, ctx.rng.rollRange(range.min, range.max));
  }

  // Step 3: Apply damage conversion
  const pool = applyConversions(rolledDamage, ctx.conversions);

  const afterConversion = new Map<DamageType, number>();
  for (const type of CONVERSION_CHAIN) {
    afterConversion.set(type, getPoolDamage(pool, type));
  }

  // Step 4: Apply increased/more modifiers
  const afterModifiers = applyDamageModifiers(pool, ctx.stats, ctx.isAttack);

  // Step 5: Crit check
  const baseCritChance = getStatValue(ctx.stats, STAT_CRIT_CHANCE);
  const effectiveCritChance = clamp(baseCritChance, 0.05, 1.0); // 5% min, 100% max
  const wasCrit = ctx.rng.chance(effectiveCritChance);
  const critMultiplier = wasCrit
    ? 1.0 + Math.max(getStatValue(ctx.stats, STAT_CRIT_MULTIPLIER), 0.5) // base 150% multi
    : 1.0;

  const afterCrit = new Map<DamageType, number>();
  for (const [type, damage] of afterModifiers) {
    afterCrit.set(type, damage * critMultiplier);
  }

  // Step 6: Apply enemy defenses
  const afterResistances = new Map<DamageType, number>();
  let totalDamage = 0;

  for (const [type, damage] of afterCrit) {
    let finalDamage = damage;

    if (type === DamageType.Physical) {
      // Armour reduces physical hit damage
      const reduction = ctx.enemyArmour / (ctx.enemyArmour + 5 * damage);
      finalDamage = damage * (1 - Math.min(reduction, 0.90));
    } else {
      // Elemental/chaos: apply resistance - penetration
      const baseRes = ctx.enemyResistances[type] ?? 0;
      const pen = getPenetration(type, ctx.stats);
      const effectiveRes = baseRes - pen;
      finalDamage = damage * (1 - effectiveRes);
    }

    finalDamage = Math.max(0, finalDamage);
    afterResistances.set(type, finalDamage);
    totalDamage += finalDamage;
  }

  return {
    baseDamage: baseDamageMap,
    afterFlat: afterFlatMap,
    afterConversion,
    afterModifiers,
    wasCrit,
    critMultiplier,
    afterCrit,
    hitOrMiss: true,
    afterResistances,
    totalDamage,
  };
}

/**
 * Apply increased/more damage modifiers per damage type,
 * respecting origin types through the damage pool.
 */
function applyDamageModifiers(
  pool: DamagePool,
  stats: ComputedStats,
  isAttack: boolean,
): Map<DamageType, number> {
  const result = new Map<DamageType, number>();

  for (const [finalType, origins] of pool) {
    let totalForType = 0;

    for (const [originType, amount] of origins) {
      if (amount <= 0) continue;

      // Collect all applicable increased/more multipliers
      // Damage benefits from modifiers matching EITHER origin or final type
      const typeMultiplier = getDamageTypeMultiplier(originType, finalType, stats, isAttack);
      totalForType += amount * typeMultiplier;
    }

    if (totalForType > 0) {
      result.set(finalType, totalForType);
    }
  }

  return result;
}

/**
 * Get the combined multiplier for damage of a given origin/final type.
 * In PoE, damage benefits from modifiers for:
 * - Global damage
 * - Attack/spell damage (based on source)
 * - Origin damage type (e.g., "physical damage" for phys-converted-to-fire)
 * - Final damage type (e.g., "fire damage")
 * - Elemental damage (if final type is fire/cold/lightning)
 */
function getDamageTypeMultiplier(
  originType: DamageType,
  finalType: DamageType,
  stats: ComputedStats,
  isAttack: boolean,
): number {
  // Get increased % for each applicable category
  let increased = 0;

  // Global damage
  increased += getStatValue(stats, STAT_DAMAGE + "_increased") || 0;

  // Attack/spell specific
  if (isAttack) {
    increased += getStatValue(stats, STAT_ATTACK_DAMAGE + "_increased") || 0;
  } else {
    increased += getStatValue(stats, STAT_SPELL_DAMAGE + "_increased") || 0;
  }

  // Origin type damage (e.g., "increased physical damage")
  increased += getIncreasedForType(originType, stats);

  // Final type damage (if different from origin)
  if (finalType !== originType) {
    increased += getIncreasedForType(finalType, stats);
  }

  // Elemental damage (applies to fire, cold, lightning)
  if (isElemental(finalType) || (finalType !== originType && isElemental(originType))) {
    increased += getStatValue(stats, STAT_ELEMENTAL_DAMAGE + "_increased") || 0;
  }

  return 1 + increased;
}

function getIncreasedForType(type: DamageType, stats: ComputedStats): number {
  const statMap: Record<DamageType, string> = {
    [DamageType.Physical]: STAT_PHYSICAL_DAMAGE,
    [DamageType.Fire]: STAT_FIRE_DAMAGE,
    [DamageType.Cold]: STAT_COLD_DAMAGE,
    [DamageType.Lightning]: STAT_LIGHTNING_DAMAGE,
    [DamageType.Chaos]: STAT_CHAOS_DAMAGE,
  };
  return getStatValue(stats, statMap[type] + "_increased") || 0;
}

function getPenetration(type: DamageType, stats: ComputedStats): number {
  let pen = 0;
  switch (type) {
    case DamageType.Fire:
      pen = getStatValue(stats, STAT_FIRE_PENETRATION);
      break;
    case DamageType.Cold:
      pen = getStatValue(stats, STAT_COLD_PENETRATION);
      break;
    case DamageType.Lightning:
      pen = getStatValue(stats, STAT_LIGHTNING_PENETRATION);
      break;
    case DamageType.Chaos:
      pen = getStatValue(stats, STAT_CHAOS_PENETRATION);
      break;
  }
  // Elemental penetration applies to fire/cold/lightning
  if (isElemental(type)) {
    pen += getStatValue(stats, STAT_ELEMENTAL_PENETRATION);
  }
  return pen;
}

function isElemental(type: DamageType): boolean {
  return type === DamageType.Fire || type === DamageType.Cold || type === DamageType.Lightning;
}

function createMissBreakdown(baseDamage: readonly DamageInstance[]): HitDamageBreakdown {
  const baseDamageMap = new Map<DamageType, NumericRange>();
  for (const inst of baseDamage) {
    baseDamageMap.set(inst.type, { min: inst.min, max: inst.max });
  }
  return {
    baseDamage: baseDamageMap,
    afterFlat: new Map(),
    afterConversion: new Map(),
    afterModifiers: new Map(),
    wasCrit: false,
    critMultiplier: 1,
    afterCrit: new Map(),
    hitOrMiss: false,
    afterResistances: new Map(),
    totalDamage: 0,
  };
}
