/**
 * Core stat system types.
 *
 * PoE's stat formula:
 *   final = (base + Σflat) × (1 + Σincreased) × Π(1 + each_more)
 *
 * Every source of stats (tree, items, gems, buffs) produces StatModifier[].
 * The stat calculator aggregates them all into ComputedStats.
 */

/** Stat identifier — string for data-driven extensibility */
export type StatId = string;

/** The three modifier categories in PoE */
export enum ModifierType {
  /** +10 to maximum life, +5 flat physical damage */
  Flat = "flat",
  /** 20% increased fire damage — additive with other "increased" */
  Increased = "increased",
  /** 30% more attack speed — multiplicative, each applied separately */
  More = "more",
}

/** Where a modifier comes from (for UI breakdown and debugging) */
export interface StatSource {
  readonly kind:
    | "base"
    | "tree"
    | "item"
    | "gem"
    | "support"
    | "buff"
    | "aura"
    | "ascendancy"
    | "flask";
  readonly id: string;
  readonly label: string;
}

/** A single stat modifier from any source */
export interface StatModifier {
  readonly statId: StatId;
  readonly type: ModifierType;
  readonly value: number; // flat: absolute, increased/more: decimal (0.20 = 20%)
  readonly source: StatSource;
  readonly condition?: StatCondition;
}

/** Optional condition for a modifier to apply */
export interface StatCondition {
  readonly type: string; // "while_holding_shield", "against_burning", "with_attacks", etc.
}

/** Breakdown of how a single stat was computed */
export interface StatBreakdown {
  readonly base: number;
  readonly flatTotal: number;
  readonly increasedTotal: number;
  readonly moreMultipliers: readonly number[];
  readonly finalValue: number;
}

/** All computed stats for a character */
export interface ComputedStats {
  readonly values: ReadonlyMap<StatId, number>;
  readonly breakdowns: ReadonlyMap<StatId, StatBreakdown>;
}
