import type { StatModifier } from "./stats";
import type { CharacterClass } from "./character";

/** Types of nodes in the passive skill tree */
export enum TreeNodeType {
  Small = "small",
  Notable = "notable",
  Keystone = "keystone",
  Mastery = "mastery",
  JewelSocket = "jewel_socket",
  ClassStart = "class_start",
  AscendancySmall = "ascendancy_small",
  AscendancyNotable = "ascendancy_notable",
}

/** A single node in the passive skill tree */
export interface TreeNode {
  readonly id: string;
  readonly name: string;
  readonly type: TreeNodeType;
  readonly stats: readonly StatModifier[];
  readonly position: { readonly x: number; readonly y: number };
  readonly connections: readonly string[];
  readonly classStartId?: CharacterClass;
  readonly ascendancyId?: string;
  readonly icon?: string;
}

/** The full passive tree graph */
export interface TreeGraph {
  readonly nodes: ReadonlyMap<string, TreeNode>;
  readonly classStartNodes: ReadonlyMap<CharacterClass, string>;
}

/** Result of validating a set of allocated nodes */
export interface AllocationResult {
  readonly valid: boolean;
  readonly allocatedNodes: readonly string[];
  readonly errors: readonly string[];
}
