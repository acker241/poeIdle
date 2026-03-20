// ---------------------------------------------------------------------------
// Starter weapons and equipment display types
// ---------------------------------------------------------------------------

export type EquipSlot = "weapon" | "offhand" | "helmet" | "body" | "gloves" | "boots" | "belt" | "amulet" | "ring1" | "ring2";

export interface EquippedItem {
  id: string;
  name: string;
  slot: EquipSlot;
  baseType: string;
  implicitMods: string[];
  explicitMods: string[];
  physicalDamage?: { min: number; max: number };
  attackTime?: number;
  critChance?: number;
  armour?: number;
  evasion?: number;
  energyShield?: number;
  levelReq: number;
}

export interface DisplayEquipment {
  weapon: EquippedItem | null;
  offhand: EquippedItem | null;
  helmet: EquippedItem | null;
  body: EquippedItem | null;
  gloves: EquippedItem | null;
  boots: EquippedItem | null;
  belt: EquippedItem | null;
  amulet: EquippedItem | null;
  ring1: EquippedItem | null;
  ring2: EquippedItem | null;
}

export const EMPTY_EQUIPMENT: DisplayEquipment = {
  weapon: null, offhand: null, helmet: null, body: null,
  gloves: null, boots: null, belt: null, amulet: null,
  ring1: null, ring2: null,
};

const STARTER_WEAPONS: Record<string, EquippedItem> = {
  marauder: {
    id: "starter_maul", name: "Driftwood Maul", slot: "weapon",
    baseType: "Driftwood Maul", implicitMods: [], explicitMods: [],
    physicalDamage: { min: 6, max: 10 }, attackTime: 1300, critChance: 5,
    levelReq: 1,
  },
  ranger: {
    id: "starter_bow", name: "Crude Bow", slot: "weapon",
    baseType: "Crude Bow", implicitMods: [], explicitMods: [],
    physicalDamage: { min: 4, max: 11 }, attackTime: 1500, critChance: 5,
    levelReq: 1,
  },
  witch: {
    id: "starter_wand", name: "Driftwood Wand", slot: "weapon",
    baseType: "Driftwood Wand", implicitMods: ["11% increased Spell Damage"], explicitMods: [],
    physicalDamage: { min: 3, max: 6 }, attackTime: 1300, critChance: 7,
    levelReq: 1,
  },
  duelist: {
    id: "starter_sword", name: "Rusted Sword", slot: "weapon",
    baseType: "Rusted Sword", implicitMods: ["40% increased Global Accuracy Rating"], explicitMods: [],
    physicalDamage: { min: 4, max: 12 }, attackTime: 1400, critChance: 5,
    levelReq: 1,
  },
  templar: {
    id: "starter_staff", name: "Gnarled Branch", slot: "weapon",
    baseType: "Gnarled Branch", implicitMods: ["18% Chance to Block Attack Damage"], explicitMods: [],
    physicalDamage: { min: 5, max: 9 }, attackTime: 1300, critChance: 6.2,
    levelReq: 1,
  },
  shadow: {
    id: "starter_claw", name: "Nailed Fist", slot: "weapon",
    baseType: "Nailed Fist", implicitMods: ["+3 Life gained for each Enemy hit by Attacks"], explicitMods: [],
    physicalDamage: { min: 4, max: 8 }, attackTime: 1200, critChance: 6.2,
    levelReq: 1,
  },
  scion: {
    id: "starter_sword2", name: "Rusted Sword", slot: "weapon",
    baseType: "Rusted Sword", implicitMods: ["40% increased Global Accuracy Rating"], explicitMods: [],
    physicalDamage: { min: 4, max: 12 }, attackTime: 1400, critChance: 5,
    levelReq: 1,
  },
};

export function getStarterWeapon(charClass: string): EquippedItem {
  return STARTER_WEAPONS[charClass.toLowerCase()] ?? STARTER_WEAPONS.marauder;
}
