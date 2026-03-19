import type { SupportGemDef } from "../../types/skills";
import { GemTag } from "../../types/skills";
import { DamageType } from "../../types/damage";
import { ModifierType } from "../../types/stats";

const src = (id: string, label: string) => ({ kind: "support" as const, id, label });

/**
 * MVP Support Gems (10 supports)
 * Values loosely based on PoE1 level ~1-12 gem data.
 */
export const SUPPORT_GEMS: readonly SupportGemDef[] = [
  {
    id: "added_fire_damage",
    name: "Added Fire Damage",
    requiredTags: [],
    excludedTags: [],
    addedTags: [GemTag.Fire],
    statModifiers: [
      { statId: "physical_to_fire_conversion", type: ModifierType.Flat, value: 0.25, source: src("added_fire_damage", "Added Fire Damage Support") },
    ],
    addedDamage: [],
    manaCostMultiplier: 1.2,
  },
  {
    id: "added_cold_damage",
    name: "Added Cold Damage",
    requiredTags: [],
    excludedTags: [],
    addedTags: [GemTag.Cold],
    statModifiers: [],
    addedDamage: [{ type: DamageType.Cold, min: 3, max: 5 }],
    manaCostMultiplier: 1.2,
  },
  {
    id: "added_lightning_damage",
    name: "Added Lightning Damage",
    requiredTags: [],
    excludedTags: [],
    addedTags: [GemTag.Lightning],
    statModifiers: [],
    addedDamage: [{ type: DamageType.Lightning, min: 1, max: 10 }],
    manaCostMultiplier: 1.2,
  },
  {
    id: "faster_attacks",
    name: "Faster Attacks",
    requiredTags: [GemTag.Attack],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "attack_speed", type: ModifierType.More, value: 0.44, source: src("faster_attacks", "Faster Attacks Support") },
    ],
    manaCostMultiplier: 1.15,
  },
  {
    id: "faster_casting",
    name: "Faster Casting",
    requiredTags: [GemTag.Spell],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "cast_speed", type: ModifierType.More, value: 0.39, source: src("faster_casting", "Faster Casting Support") },
    ],
    manaCostMultiplier: 1.15,
  },
  {
    id: "lesser_multiple_projectiles",
    name: "Lesser Multiple Projectiles",
    requiredTags: [GemTag.Projectile],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "damage", type: ModifierType.More, value: -0.20, source: src("lesser_multiple_projectiles", "LMP Support") },
    ],
    manaCostMultiplier: 1.4,
  },
  {
    id: "onslaught",
    name: "Onslaught",
    requiredTags: [],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "attack_speed", type: ModifierType.Increased, value: 0.20, source: src("onslaught", "Onslaught Support") },
      { statId: "cast_speed", type: ModifierType.Increased, value: 0.20, source: src("onslaught", "Onslaught Support") },
      { statId: "movement_speed", type: ModifierType.Increased, value: 0.20, source: src("onslaught", "Onslaught Support") },
    ],
    manaCostMultiplier: 1.1,
  },
  {
    id: "minion_damage",
    name: "Minion Damage",
    requiredTags: [GemTag.Minion],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "damage", type: ModifierType.More, value: 0.30, source: src("minion_damage", "Minion Damage Support") },
    ],
    manaCostMultiplier: 1.3,
  },
  {
    id: "melee_physical_damage",
    name: "Melee Physical Damage",
    requiredTags: [GemTag.Melee],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "physical_damage", type: ModifierType.More, value: 0.49, source: src("melee_physical_damage", "Melee Physical Damage Support") },
      { statId: "attack_speed", type: ModifierType.More, value: -0.10, source: src("melee_physical_damage", "Melee Physical Damage Support") },
    ],
    manaCostMultiplier: 1.4,
  },
  {
    id: "concentrated_effect",
    name: "Concentrated Effect",
    requiredTags: [GemTag.AoE],
    excludedTags: [],
    addedTags: [],
    statModifiers: [
      { statId: "damage", type: ModifierType.More, value: 0.54, source: src("concentrated_effect", "Concentrated Effect Support") },
    ],
    manaCostMultiplier: 1.4,
  },
];

export const SUPPORT_GEM_MAP: ReadonlyMap<string, SupportGemDef> = new Map(
  SUPPORT_GEMS.map(s => [s.id, s]),
);
