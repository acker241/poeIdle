import type { DamageInstance } from "./damage";
import type { StatModifier } from "./stats";
import type { AilmentType } from "./ailments";
import type { DurationMs } from "./common";

/** Tags that categorize skills and determine support gem compatibility */
export enum GemTag {
  Attack = "attack",
  Spell = "spell",
  Melee = "melee",
  Projectile = "projectile",
  AoE = "aoe",
  Fire = "fire",
  Cold = "cold",
  Lightning = "lightning",
  Chaos = "chaos",
  Physical = "physical",
  Duration = "duration",
  Minion = "minion",
  Totem = "totem",
  Trap = "trap",
  Mine = "mine",
  Bow = "bow",
  Strike = "strike",
  Slam = "slam",
  DoT = "dot",
  Chaining = "chaining",
}

/** Static definition of an active skill gem (loaded from data) */
export interface ActiveSkillDef {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly GemTag[];
  /** Base damage for spells; empty for attacks (which use weapon damage) */
  readonly baseDamage: readonly DamageInstance[];
  /** Multiplier for added damage (e.g., 1.0 = 100% effectiveness) */
  readonly damageEffectiveness: number;
  /** Base attack time in ms (for attacks) */
  readonly attackTime?: DurationMs;
  /** Base cast time in ms (for spells) */
  readonly castTime?: DurationMs;
  readonly manaCost: number;
  /** Base crit chance as decimal (0.06 = 6%) */
  readonly critChance: number;
  /** Inherent stat modifiers from the gem itself */
  readonly statModifiers: readonly StatModifier[];
  /** Whether this skill has a DoT component */
  readonly canDealDoT: boolean;
  /** Base DoT damage if applicable */
  readonly dotBase?: readonly DamageInstance[];
  /** Innate ailment application chances */
  readonly ailmentChances?: Partial<Record<AilmentType, number>>;
  /** Idle-specific: clear speed rating (1-5) */
  readonly clearRating: number;
  /** Idle-specific: single target rating (1-5) */
  readonly singleTargetRating: number;
}

/** Static definition of a support gem (loaded from data) */
export interface SupportGemDef {
  readonly id: string;
  readonly name: string;
  /** Active skill must have ALL of these tags */
  readonly requiredTags: readonly GemTag[];
  /** Active skill must have NONE of these tags */
  readonly excludedTags: readonly GemTag[];
  /** Tags added to the supported skill */
  readonly addedTags: readonly GemTag[];
  /** Modifiers applied when linked */
  readonly statModifiers: readonly StatModifier[];
  /** Flat added damage (e.g., Added Fire Damage support) */
  readonly addedDamage?: readonly DamageInstance[];
  /** Mana cost multiplier (e.g., 1.3 = 130% mana cost) */
  readonly manaCostMultiplier: number;
}

/** A configured skill link: one active skill + up to 5 supports */
export interface SkillLink {
  readonly activeSkillId: string;
  readonly supportGemIds: readonly string[];
}

/** An active skill after resolving all linked supports */
export interface ResolvedSkill {
  readonly active: ActiveSkillDef;
  readonly supports: readonly SupportGemDef[];
  readonly finalTags: readonly GemTag[];
  readonly totalStatModifiers: readonly StatModifier[];
  readonly totalAddedDamage: readonly DamageInstance[];
  readonly effectiveManaCost: number;
  readonly effectiveCritChance: number;
}
