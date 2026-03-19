import type { TreeNode, TreeGraph } from "../types/skilltree";
import { TreeNodeType } from "../types/skilltree";
import type { CharacterClass } from "../types/character";
import type { StatModifier } from "../types/stats";

/**
 * Raw node format from GGG's skill tree JSON export.
 * This is a simplified version — the real GGG JSON is more complex.
 */
export interface RawTreeNode {
  id: number;
  name?: string;
  dn?: string; // display name
  sd?: string[]; // stat descriptions
  stats?: Record<string, number>; // stat_id -> value
  out?: number[]; // connected node IDs
  g?: number; // group ID
  o?: number; // orbit
  oidx?: number; // orbit index
  isKeystone?: boolean;
  isNotable?: boolean;
  isMastery?: boolean;
  isJewelSocket?: boolean;
  spc?: number[]; // starting class IDs
  ascendancyName?: string;
}

/**
 * Parse raw GGG tree data into our TreeGraph format.
 * This handles both the full GGG export and simplified custom formats.
 */
export function parseTreeGraph(
  nodes: readonly RawTreeNode[],
  classMapping: ReadonlyMap<number, CharacterClass>,
  statParser: (stats: Record<string, number>) => StatModifier[],
): TreeGraph {
  const nodeMap = new Map<string, TreeNode>();
  const classStartNodes = new Map<CharacterClass, string>();

  for (const raw of nodes) {
    const id = String(raw.id);
    const name = raw.name ?? raw.dn ?? `Node ${id}`;

    // Determine node type
    let type = TreeNodeType.Small;
    if (raw.spc && raw.spc.length > 0) {
      type = TreeNodeType.ClassStart;
    } else if (raw.isKeystone) {
      type = TreeNodeType.Keystone;
    } else if (raw.isNotable) {
      type = TreeNodeType.Notable;
    } else if (raw.isMastery) {
      type = TreeNodeType.Mastery;
    } else if (raw.isJewelSocket) {
      type = TreeNodeType.JewelSocket;
    } else if (raw.ascendancyName) {
      type = raw.isNotable
        ? TreeNodeType.AscendancyNotable
        : TreeNodeType.AscendancySmall;
    }

    // Parse stats
    const stats = raw.stats ? statParser(raw.stats) : [];

    // Connections
    const connections = (raw.out ?? []).map(String);

    // Position (simplified — real tree uses orbit math)
    const position = { x: 0, y: 0 };

    const node: TreeNode = {
      id,
      name,
      type,
      stats,
      position,
      connections,
      ascendancyId: raw.ascendancyName,
    };

    nodeMap.set(id, node);

    // Track class start nodes
    if (raw.spc) {
      for (const classNum of raw.spc) {
        const classId = classMapping.get(classNum);
        if (classId) {
          classStartNodes.set(classId, id);
        }
      }
    }
  }

  // Ensure bidirectional connections
  for (const [id, node] of nodeMap) {
    for (const connId of node.connections) {
      const connNode = nodeMap.get(connId);
      if (connNode && !connNode.connections.includes(id)) {
        // Add reverse connection
        nodeMap.set(connId, {
          ...connNode,
          connections: [...connNode.connections, id],
        });
      }
    }
  }

  return { nodes: nodeMap, classStartNodes };
}
