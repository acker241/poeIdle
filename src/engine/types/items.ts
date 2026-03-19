import type { DamageInstance } from "./damage";
import type { StatModifier } from "./stats";

/** Equipment slots */
export enum EquipSlot {
  Weapon = "weapon",
  OffHand = "offhand",
  Helmet = "helmet",
  BodyArmour = "body",
  Gloves = "gloves",
  Boots = "boots",
  Belt = "belt",
  Ring1 = "ring1",
  Ring2 = "ring2",
  Amulet = "amulet",
}

/** Item rarities */
export enum ItemRarity {
  Normal = "normal",
  Magic = "magic",
  Rare = "rare",
  Unique = "unique",
}

/** Base item type definition (loaded from data) */
export interface BaseItemDef {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipSlot;
  readonly itemClass: string; // "One Hand Sword", "Vaal Regalia", etc.
  readonly tags: readonly string[];
  readonly requirements: {
    readonly level?: number;
    readonly str?: number;
    readonly dex?: number;
    readonly int?: number;
  };
  readonly implicitMods: readonly StatModifier[];
  // Weapon-specific
  readonly baseDamage?: readonly DamageInstance[];
  readonly attacksPerSecond?: number;
  readonly critChance?: number; // decimal
}

/** A rolled mod on an item */
export interface ItemMod {
  readonly id: string;
  readonly name: string;
  readonly type: "prefix" | "suffix" | "implicit";
  readonly statModifiers: readonly StatModifier[];
  readonly tier: number;
  readonly levelReq: number;
}

/** A specific item instance (dropped/crafted) */
export interface ItemInstance {
  readonly id: string;
  readonly baseId: string;
  readonly rarity: ItemRarity;
  readonly name: string;
  readonly mods: readonly ItemMod[];
  /** All stat modifiers (implicit + explicit), pre-computed */
  readonly allStatModifiers: readonly StatModifier[];
}

/** All equipped items */
export type EquipmentSet = Partial<Record<EquipSlot, ItemInstance>>;
