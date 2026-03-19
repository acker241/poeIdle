import type { ItemMod, ItemInstance, BaseItemDef } from "../types/items";
import type { StatModifier } from "../types/stats";
import { ItemRarity } from "../types/items";
import type { SeededRng } from "../utils/rng";

/**
 * Collect all stat modifiers from an item (implicit + explicit mods).
 */
export function collectItemModifiers(item: ItemInstance): readonly StatModifier[] {
  const mods: StatModifier[] = [];
  for (const mod of item.mods) {
    mods.push(...mod.statModifiers);
  }
  return mods;
}

/**
 * Generate a random item instance from a base item definition.
 */
export function generateItem(
  base: BaseItemDef,
  rarity: ItemRarity,
  availablePrefixes: readonly ItemMod[],
  availableSuffixes: readonly ItemMod[],
  rng: SeededRng,
  instanceId: string,
): ItemInstance {
  const mods: ItemMod[] = [];

  // Add implicit mods (always present)
  // Implicits are part of base, stored separately

  // Determine number of affixes by rarity
  let numPrefixes = 0;
  let numSuffixes = 0;

  switch (rarity) {
    case ItemRarity.Normal:
      break;
    case ItemRarity.Magic:
      numPrefixes = rng.nextInt(0, 1);
      numSuffixes = rng.nextInt(0, 1);
      // Magic must have at least 1 mod
      if (numPrefixes + numSuffixes === 0) {
        rng.chance(0.5) ? numPrefixes = 1 : numSuffixes = 1;
      }
      break;
    case ItemRarity.Rare:
      numPrefixes = rng.nextInt(1, 3);
      numSuffixes = rng.nextInt(1, 3);
      break;
    case ItemRarity.Unique:
      // Uniques have fixed mods, handled separately
      break;
  }

  // Roll prefixes
  const usedPrefixIds = new Set<string>();
  for (let i = 0; i < numPrefixes && availablePrefixes.length > 0; i++) {
    const eligible = availablePrefixes.filter(m => !usedPrefixIds.has(m.id));
    if (eligible.length === 0) break;
    const mod = eligible[rng.nextInt(0, eligible.length - 1)];
    mods.push(mod);
    usedPrefixIds.add(mod.id);
  }

  // Roll suffixes
  const usedSuffixIds = new Set<string>();
  for (let i = 0; i < numSuffixes && availableSuffixes.length > 0; i++) {
    const eligible = availableSuffixes.filter(m => !usedSuffixIds.has(m.id));
    if (eligible.length === 0) break;
    const mod = eligible[rng.nextInt(0, eligible.length - 1)];
    mods.push(mod);
    usedSuffixIds.add(mod.id);
  }

  // Collect all stat modifiers
  const allStatModifiers: StatModifier[] = [
    ...base.implicitMods,
    ...mods.flatMap(m => m.statModifiers),
  ];

  return {
    id: instanceId,
    baseId: base.id,
    rarity,
    name: generateItemName(base.name, rarity, mods),
    mods,
    allStatModifiers,
  };
}

function generateItemName(baseName: string, rarity: ItemRarity, mods: ItemMod[]): string {
  if (rarity === ItemRarity.Normal) return baseName;
  if (rarity === ItemRarity.Magic) {
    const prefix = mods.find(m => m.type === "prefix");
    const suffix = mods.find(m => m.type === "suffix");
    const parts: string[] = [];
    if (prefix) parts.push(prefix.name);
    parts.push(baseName);
    if (suffix) parts.push(suffix.name);
    return parts.join(" ");
  }
  // Rare/Unique would have random names — simplified for MVP
  return baseName;
}
