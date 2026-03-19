import type { StatModifier } from "../types/stats";
import type { EquipmentSet } from "../types/items";
import type { ResolvedSkill } from "../types/skills";
import { StatPool } from "./stat-pool";

/**
 * Collects stat modifiers from all possible sources into a single StatPool.
 * This is the function that wires together tree + items + gems + buffs.
 */

/** Collect stat modifiers from all equipped items */
export function collectItemStats(equipment: EquipmentSet): readonly StatModifier[] {
  const modifiers: StatModifier[] = [];
  for (const item of Object.values(equipment)) {
    if (item) {
      modifiers.push(...item.allStatModifiers);
    }
  }
  return modifiers;
}

/** Collect stat modifiers from resolved active skills and their supports */
export function collectSkillStats(skills: readonly ResolvedSkill[]): readonly StatModifier[] {
  const modifiers: StatModifier[] = [];
  for (const skill of skills) {
    modifiers.push(...skill.totalStatModifiers);
  }
  return modifiers;
}

/** Collect stat modifiers from allocated passive tree nodes */
export function collectTreeStats(
  allocatedNodeIds: readonly string[],
  nodeStatsMap: ReadonlyMap<string, readonly StatModifier[]>,
): readonly StatModifier[] {
  const modifiers: StatModifier[] = [];
  for (const nodeId of allocatedNodeIds) {
    const stats = nodeStatsMap.get(nodeId);
    if (stats) {
      modifiers.push(...stats);
    }
  }
  return modifiers;
}

/**
 * Collect all modifiers from every source into a single pool.
 */
export function collectAllStats(params: {
  baseModifiers: readonly StatModifier[];
  treeModifiers: readonly StatModifier[];
  itemModifiers: readonly StatModifier[];
  skillModifiers: readonly StatModifier[];
  buffModifiers?: readonly StatModifier[];
}): StatPool {
  return StatPool.create()
    .addAll(params.baseModifiers)
    .addAll(params.treeModifiers)
    .addAll(params.itemModifiers)
    .addAll(params.skillModifiers)
    .addAll(params.buffModifiers ?? []);
}
