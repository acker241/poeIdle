import type { TreeGraph, AllocationResult } from "../types/skilltree";
import { TreeNodeType } from "../types/skilltree";
import type { CharacterClass } from "../types/character";

/**
 * Validate that a set of allocated nodes forms a connected path
 * from the class start node.
 */
export function validateAllocation(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
  characterClass: CharacterClass,
): AllocationResult {
  const errors: string[] = [];
  const allocated = new Set(allocatedNodeIds);

  // Get class start node
  const startNodeId = graph.classStartNodes.get(characterClass);
  if (!startNodeId) {
    return { valid: false, allocatedNodes: allocatedNodeIds, errors: [`No start node for class ${characterClass}`] };
  }

  // Class start is always allocated (implicitly)
  allocated.add(startNodeId);

  // BFS from start node through allocated nodes
  const reachable = new Set<string>();
  const queue: string[] = [startNodeId];
  reachable.add(startNodeId);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = graph.nodes.get(currentId);
    if (!node) continue;

    for (const connId of node.connections) {
      if (allocated.has(connId) && !reachable.has(connId)) {
        reachable.add(connId);
        queue.push(connId);
      }
    }
  }

  // Check if all allocated nodes are reachable
  for (const nodeId of allocatedNodeIds) {
    if (!reachable.has(nodeId)) {
      const node = graph.nodes.get(nodeId);
      errors.push(`Node "${node?.name ?? nodeId}" is not connected to the passive tree`);
    }
  }

  return {
    valid: errors.length === 0,
    allocatedNodes: allocatedNodeIds,
    errors,
  };
}

/**
 * Check if a specific node can be allocated (is adjacent to an already-allocated node).
 */
export function canAllocateNode(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
  characterClass: CharacterClass,
  nodeId: string,
): boolean {
  const node = graph.nodes.get(nodeId);
  if (!node) return false;

  // Can't allocate class start nodes (they're implicit)
  if (node.type === TreeNodeType.ClassStart) return false;

  // Can't allocate if already allocated
  if (allocatedNodeIds.includes(nodeId)) return false;

  // Must be connected to at least one allocated node or the class start
  const startNodeId = graph.classStartNodes.get(characterClass);
  const allocated = new Set(allocatedNodeIds);
  if (startNodeId) allocated.add(startNodeId);

  for (const connId of node.connections) {
    if (allocated.has(connId)) return true;
  }

  return false;
}

/**
 * Allocate a node. Returns new allocated list or null if invalid.
 */
export function allocateNode(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
  characterClass: CharacterClass,
  nodeId: string,
): readonly string[] | null {
  if (!canAllocateNode(graph, allocatedNodeIds, characterClass, nodeId)) {
    return null;
  }
  return [...allocatedNodeIds, nodeId];
}

/**
 * Deallocate a node. Returns new list or null if it would break connectivity.
 */
export function deallocateNode(
  graph: TreeGraph,
  allocatedNodeIds: readonly string[],
  characterClass: CharacterClass,
  nodeId: string,
): readonly string[] | null {
  const newAllocated = allocatedNodeIds.filter(id => id !== nodeId);
  const result = validateAllocation(graph, newAllocated, characterClass);
  return result.valid ? newAllocated : null;
}
