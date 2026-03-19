import type { EquipmentSet } from "./items";
import type { SkillLink } from "./skills";
import type { ComputedStats } from "./stats";

/** The 7 character classes */
export enum CharacterClass {
  Marauder = "marauder",
  Ranger = "ranger",
  Witch = "witch",
  Duelist = "duelist",
  Templar = "templar",
  Shadow = "shadow",
  Scion = "scion",
}

/** Base attributes per class at level 1 */
export interface ClassBaseStats {
  readonly classId: CharacterClass;
  readonly strength: number;
  readonly dexterity: number;
  readonly intelligence: number;
  readonly baseLife: number;
  readonly baseMana: number;
  readonly baseEnergyShield: number;
}

/** The complete serializable character state */
export interface CharacterState {
  readonly id: string;
  readonly name: string;
  readonly classId: CharacterClass;
  readonly level: number;
  readonly experience: number;
  readonly allocatedPassives: readonly string[];
  readonly equipment: EquipmentSet;
  readonly skillLinks: readonly SkillLink[];
  readonly ascendancyId?: string;
  readonly ascendancyPoints: number;
}

/** Fully resolved character with computed stats (derived, not stored) */
export interface ResolvedCharacter {
  readonly state: CharacterState;
  readonly stats: ComputedStats;
  readonly maxLife: number;
  readonly maxMana: number;
  readonly maxEnergyShield: number;
  readonly attacksPerSecond: number;
  readonly castsPerSecond: number;
  readonly movementSpeed: number;
  readonly resistances: {
    readonly fire: number;
    readonly cold: number;
    readonly lightning: number;
    readonly chaos: number;
  };
}
