import type { StatSource } from "./stats";
import type { NumericRange } from "./common";

/** The five damage types in PoE */
export enum DamageType {
  Physical = "physical",
  Lightning = "lightning",
  Cold = "cold",
  Fire = "fire",
  Chaos = "chaos",
}

/**
 * The canonical damage conversion chain in PoE.
 * Damage can only convert "forward" in this order:
 *   Physical → Lightning → Cold → Fire → Chaos
 */
export const CONVERSION_CHAIN: readonly DamageType[] = [
  DamageType.Physical,
  DamageType.Lightning,
  DamageType.Cold,
  DamageType.Fire,
  DamageType.Chaos,
] as const;

/** A damage range (e.g., "10-20 physical damage") */
export interface DamageInstance {
  readonly type: DamageType;
  readonly min: number;
  readonly max: number;
}

/** Conversion spec (e.g., "50% of physical converted to fire") */
export interface DamageConversion {
  readonly from: DamageType;
  readonly to: DamageType;
  readonly percentage: number; // 0.0 - 1.0
  readonly source: StatSource;
}

/**
 * Tracks damage through conversion.
 * For each final damage type, records how much came from each original type.
 * This is needed because "increased physical damage" still applies to
 * physical damage that was converted to fire.
 *
 * Map<finalType, Map<originType, amount>>
 */
export type DamagePool = Map<DamageType, Map<DamageType, number>>;

/** Full breakdown of a single hit (for UI/debug display) */
export interface HitDamageBreakdown {
  readonly baseDamage: ReadonlyMap<DamageType, NumericRange>;
  readonly afterFlat: ReadonlyMap<DamageType, NumericRange>;
  readonly afterConversion: ReadonlyMap<DamageType, number>;
  readonly afterModifiers: ReadonlyMap<DamageType, number>;
  readonly wasCrit: boolean;
  readonly critMultiplier: number;
  readonly afterCrit: ReadonlyMap<DamageType, number>;
  readonly hitOrMiss: boolean;
  readonly afterResistances: ReadonlyMap<DamageType, number>;
  readonly totalDamage: number;
}
