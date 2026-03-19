import type { TreeGraph } from "../types/skilltree";
import type { StatModifier } from "../types/stats";

/**
 * Collect all stat modifiers from allocated passive tree nodes.
 */
export function collectTreeModifiers(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
): readonly StatModifier[] {
  const modifiers: StatModifier[] = [];

  for (const nodeId of allocatedNodeIds) {
    const node = graph.nodes.get(nodeId);
    if (node) {
      modifiers.push(...node.stats);
    }
  }

  return modifiers;
}

/**
 * Count allocated nodes by type.
 */
export function countAllocatedByType(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const nodeId of allocatedNodeIds) {
    const node = graph.nodes.get(nodeId);
    if (node) {
      counts[node.type] = (counts[node.type] ?? 0) + 1;
    }
  }

  return counts;
}
