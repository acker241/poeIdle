import type { ClassBaseStats } from "../../types/character";
import { CharacterClass } from "../../types/character";

/**
 * Base stats per class at level 1 (based on PoE1 values).
 */
export const CLASS_BASE_STATS: readonly ClassBaseStats[] = [
  {
    classId: CharacterClass.Marauder,
    strength: 32,
    dexterity: 14,
    intelligence: 14,
    baseLife: 66,
    baseMana: 47,
    baseEnergyShield: 0,
  },
  {
    classId: CharacterClass.Ranger,
    strength: 14,
    dexterity: 32,
    intelligence: 14,
    baseLife: 50,
    baseMana: 47,
    baseEnergyShield: 0,
  },
  {
    classId: CharacterClass.Witch,
    strength: 14,
    dexterity: 14,
    intelligence: 32,
    baseLife: 42,
    baseMana: 62,
    baseEnergyShield: 6,
  },
  {
    classId: CharacterClass.Duelist,
    strength: 23,
    dexterity: 23,
    intelligence: 14,
    baseLife: 58,
    baseMana: 47,
    baseEnergyShield: 0,
  },
  {
    classId: CharacterClass.Templar,
    strength: 23,
    dexterity: 14,
    intelligence: 23,
    baseLife: 54,
    baseMana: 55,
    baseEnergyShield: 4,
  },
  {
    classId: CharacterClass.Shadow,
    strength: 14,
    dexterity: 23,
    intelligence: 23,
    baseLife: 46,
    baseMana: 55,
    baseEnergyShield: 4,
  },
  {
    classId: CharacterClass.Scion,
    strength: 20,
    dexterity: 20,
    intelligence: 20,
    baseLife: 50,
    baseMana: 50,
    baseEnergyShield: 2,
  },
];

export const CLASS_BASE_STATS_MAP: ReadonlyMap<CharacterClass, ClassBaseStats> = new Map(
  CLASS_BASE_STATS.map(c => [c.classId, c]),
);

/**
 * PoE: +1 life per 2 strength, +1 melee phys per 5 str
 * +2 accuracy per dexterity, +1 evasion per 5 dex
 * +1 mana per 2 intelligence, +1 ES per 5 int
 */
export const ATTRIBUTE_BONUSES = {
  lifePerStrength: 0.5,        // +1 life per 2 str
  meleePhysPerStrength: 0.2,   // +1% melee phys per 5 str
  accuracyPerDexterity: 2,     // +2 accuracy per dex
  evasionPerDexterity: 0.2,    // +1% evasion per 5 dex
  manaPerIntelligence: 0.5,    // +1 mana per 2 int
  esPerIntelligence: 0.2,      // +1% ES per 5 int
} as const;

/**
 * PoE: +12 life per level (base)
 * +6 mana per level (base)
 * +2 accuracy per level
 */
export const PER_LEVEL_BONUSES = {
  lifePerLevel: 12,
  manaPerLevel: 6,
  accuracyPerLevel: 2,
  evasionPerLevel: 3,
} as const;
