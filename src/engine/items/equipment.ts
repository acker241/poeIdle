import type { EquipmentSet, ItemInstance } from "../types/items";
import type { StatModifier } from "../types/stats";
import type { DamageInstance } from "../types/damage";
import type { BaseItemDef } from "../types/items";

/**
 * Equip an item into the appropriate slot.
 * Returns new equipment set (immutable).
 */
export function equipItem(
  equipment: EquipmentSet,
  item: ItemInstance,
  slot: string,
): EquipmentSet {
  return { ...equipment, [slot]: item };
}

/**
 * Unequip an item from a slot.
 */
export function unequipItem(
  equipment: EquipmentSet,
  slot: string,
): EquipmentSet {
  const newEquip = { ...equipment };
  delete (newEquip as Record<string, unknown>)[slot];
  return newEquip;
}

/**
 * Get all stat modifiers from all equipped items.
 */
export function getAllEquipmentModifiers(equipment: EquipmentSet): readonly StatModifier[] {
  const mods: StatModifier[] = [];
  for (const item of Object.values(equipment)) {
    if (item) {
      mods.push(...item.allStatModifiers);
    }
  }
  return mods;
}

/**
 * Get weapon damage from equipped weapon.
 * Returns base damage instances and attack speed.
 */
export function getWeaponStats(
  equipment: EquipmentSet,
  baseItemDefs: ReadonlyMap<string, BaseItemDef>,
): { damage: readonly DamageInstance[]; attacksPerSecond: number; critChance: number } | null {
  const weapon = equipment.weapon;
  if (!weapon) return null;

  const baseDef = baseItemDefs.get(weapon.baseId);
  if (!baseDef || !baseDef.baseDamage) return null;

  return {
    damage: baseDef.baseDamage,
    attacksPerSecond: baseDef.attacksPerSecond ?? 1.0,
    critChance: baseDef.critChance ?? 0.05,
  };
}
