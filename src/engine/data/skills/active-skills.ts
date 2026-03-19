import type { ActiveSkillDef } from "../../types/skills";
import { GemTag } from "../../types/skills";
import { DamageType } from "../../types/damage";
import { AilmentType } from "../../types/ailments";

/**
 * MVP Active Skills (12 skills covering 4 archetypes)
 * Values loosely based on PoE1 level ~1-12 gem data.
 */
export const ACTIVE_SKILLS: readonly ActiveSkillDef[] = [
  // === MELEE (STR) ===
  {
    id: "ground_slam",
    name: "Ground Slam",
    tags: [GemTag.Attack, GemTag.Melee, GemTag.AoE, GemTag.Slam, GemTag.Physical],
    baseDamage: [], // uses weapon
    damageEffectiveness: 1.0,
    attackTime: undefined, // uses weapon
    manaCost: 6,
    critChance: 0.05,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 3,
    singleTargetRating: 2,
  },
  {
    id: "heavy_strike",
    name: "Heavy Strike",
    tags: [GemTag.Attack, GemTag.Melee, GemTag.Strike, GemTag.Physical],
    baseDamage: [],
    damageEffectiveness: 1.5, // 150% damage effectiveness
    manaCost: 6,
    critChance: 0.05,
    statModifiers: [
      { statId: "physical_damage", type: "more" as any, value: 0.50, source: { kind: "gem", id: "heavy_strike", label: "Heavy Strike" } },
    ],
    canDealDoT: false,
    clearRating: 1,
    singleTargetRating: 4,
  },
  {
    id: "cleave",
    name: "Cleave",
    tags: [GemTag.Attack, GemTag.Melee, GemTag.AoE, GemTag.Physical],
    baseDamage: [],
    damageEffectiveness: 0.85,
    manaCost: 6,
    critChance: 0.05,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 3,
    singleTargetRating: 2,
  },
  {
    id: "molten_strike",
    name: "Molten Strike",
    tags: [GemTag.Attack, GemTag.Melee, GemTag.Strike, GemTag.Projectile, GemTag.Fire, GemTag.Physical],
    baseDamage: [],
    damageEffectiveness: 0.80,
    manaCost: 8,
    critChance: 0.06,
    statModifiers: [
      { statId: "physical_to_fire_conversion", type: "flat" as any, value: 0.60, source: { kind: "gem", id: "molten_strike", label: "Molten Strike" } },
    ],
    canDealDoT: false,
    clearRating: 2,
    singleTargetRating: 3,
  },

  // === RANGED (DEX) ===
  {
    id: "split_arrow",
    name: "Split Arrow",
    tags: [GemTag.Attack, GemTag.Projectile, GemTag.Bow, GemTag.Physical],
    baseDamage: [],
    damageEffectiveness: 0.85,
    manaCost: 6,
    critChance: 0.06,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 4,
    singleTargetRating: 1,
  },
  {
    id: "burning_arrow",
    name: "Burning Arrow",
    tags: [GemTag.Attack, GemTag.Projectile, GemTag.Bow, GemTag.Fire],
    baseDamage: [],
    damageEffectiveness: 1.0,
    manaCost: 7,
    critChance: 0.06,
    statModifiers: [
      { statId: "physical_to_fire_conversion", type: "flat" as any, value: 0.50, source: { kind: "gem", id: "burning_arrow", label: "Burning Arrow" } },
    ],
    canDealDoT: true,
    ailmentChances: { [AilmentType.Ignite]: 0.50 },
    clearRating: 2,
    singleTargetRating: 3,
  },
  {
    id: "rain_of_arrows",
    name: "Rain of Arrows",
    tags: [GemTag.Attack, GemTag.AoE, GemTag.Bow, GemTag.Physical],
    baseDamage: [],
    damageEffectiveness: 0.80,
    manaCost: 10,
    critChance: 0.05,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 3,
    singleTargetRating: 2,
  },

  // === SPELLS (INT) ===
  {
    id: "fireball",
    name: "Fireball",
    tags: [GemTag.Spell, GemTag.Projectile, GemTag.AoE, GemTag.Fire],
    baseDamage: [{ type: DamageType.Fire, min: 9, max: 14 }],
    damageEffectiveness: 1.0,
    castTime: 750,
    manaCost: 6,
    critChance: 0.06,
    statModifiers: [],
    canDealDoT: false,
    ailmentChances: { [AilmentType.Ignite]: 0.40 },
    clearRating: 3,
    singleTargetRating: 3,
  },
  {
    id: "freezing_pulse",
    name: "Freezing Pulse",
    tags: [GemTag.Spell, GemTag.Projectile, GemTag.Cold],
    baseDamage: [{ type: DamageType.Cold, min: 8, max: 12 }],
    damageEffectiveness: 1.0,
    castTime: 650,
    manaCost: 5,
    critChance: 0.07,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 3,
    singleTargetRating: 2,
  },
  {
    id: "arc",
    name: "Arc",
    tags: [GemTag.Spell, GemTag.Chaining, GemTag.Lightning],
    baseDamage: [{ type: DamageType.Lightning, min: 4, max: 22 }],
    damageEffectiveness: 0.80,
    castTime: 700,
    manaCost: 7,
    critChance: 0.05,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 4,
    singleTargetRating: 2,
  },
  {
    id: "spark",
    name: "Spark",
    tags: [GemTag.Spell, GemTag.Projectile, GemTag.Duration, GemTag.Lightning],
    baseDamage: [{ type: DamageType.Lightning, min: 3, max: 18 }],
    damageEffectiveness: 0.70,
    castTime: 650,
    manaCost: 6,
    critChance: 0.05,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 4,
    singleTargetRating: 1,
  },

  // === MINIONS (INT) ===
  {
    id: "raise_zombie",
    name: "Raise Zombie",
    tags: [GemTag.Spell, GemTag.Minion],
    baseDamage: [],
    damageEffectiveness: 0,
    castTime: 500,
    manaCost: 20,
    critChance: 0,
    statModifiers: [],
    canDealDoT: false,
    clearRating: 3,
    singleTargetRating: 2,
  },
];

/** Map for O(1) lookup */
export const ACTIVE_SKILL_MAP: ReadonlyMap<string, ActiveSkillDef> = new Map(
  ACTIVE_SKILLS.map(s => [s.id, s]),
);
