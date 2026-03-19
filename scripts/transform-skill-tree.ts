/**
 * Transform GGG's skill tree export into a processed format for the engine.
 *
 * Run with: npx tsx scripts/transform-skill-tree.ts
 *
 * Input:  data/poe-raw/skill-tree.json (from grindinggear/skilltree-export)
 * Output: data/processed/skill-tree.json + public/data/processed/skill-tree.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RAW = join(ROOT, "data", "poe-raw", "skill-tree.json");
const OUT = join(ROOT, "data", "processed", "skill-tree.json");
const PUBLIC_OUT = join(ROOT, "public", "data", "processed", "skill-tree.json");

// GGG raw types
interface RawTree {
  nodes: Record<string, RawNode>;
  groups: Record<string, RawGroup>;
  classes: RawClass[];
  constants: {
    classes: Record<string, number>;
    skillsPerOrbit: number[];
    orbitRadii: number[];
  };
  min_x: number; min_y: number; max_x: number; max_y: number;
  points: { totalPoints: number; ascendancyPoints: number };
  sprites: Record<string, unknown>;
  imageZoomLevels: number[];
}

interface RawNode {
  skill: number;
  name: string;
  icon: string;
  stats?: string[];
  group?: number;
  orbit?: number;
  orbitIndex?: number;
  out?: string[];
  in?: string[];
  isKeystone?: boolean;
  isNotable?: boolean;
  isMastery?: boolean;
  isJewelSocket?: boolean;
  isBlighted?: boolean;
  classStartIndex?: number;
  ascendancyName?: string;
  isAscendancyStart?: boolean;
  isMultipleChoice?: boolean;
  isMultipleChoiceOption?: boolean;
  masteryEffects?: Array<{ effect: number; stats: string[] }>;
  reminderText?: string[];
  grantedStrength?: number;
  grantedDexterity?: number;
  grantedIntelligence?: number;
  grantedPassivePoints?: number;
  flavourText?: string[];
  recipe?: string[];
}

interface RawGroup {
  x: number;
  y: number;
  orbits: number[];
  nodes: string[];
  isProxy?: boolean;
}

interface RawClass {
  name: string;
  ascendancies: Array<{ id: string; name: string; flavourText?: string }>;
}

// Output types
interface ProcessedNode {
  id: string;
  skill: number;
  name: string;
  icon: string;
  stats: string[];
  type: "small" | "notable" | "keystone" | "mastery" | "jewel_socket" | "class_start" | "ascendancy_small" | "ascendancy_notable" | "ascendancy_start";
  x: number;
  y: number;
  connections: string[]; // outgoing node IDs
  group: number | null;
  orbit: number | null;
  orbitIndex: number | null;
  // Attributes granted
  grantedStrength: number;
  grantedDexterity: number;
  grantedIntelligence: number;
  // Class/ascendancy
  classStartIndex: number | null;
  ascendancyName: string | null;
  isAscendancyStart: boolean;
  // Mastery
  masteryEffects: Array<{ effect: number; stats: string[] }> | null;
}

interface ProcessedTree {
  nodes: ProcessedNode[];
  classes: Array<{
    name: string;
    classIndex: number;
    startNodeId: string | null;
    ascendancies: Array<{ id: string; name: string }>;
  }>;
  groups: Array<{
    id: string;
    x: number;
    y: number;
    orbits: number[];
    nodeIds: string[];
  }>;
  constants: {
    skillsPerOrbit: number[];
    orbitRadii: number[];
    totalPoints: number;
    ascendancyPoints: number;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  stats: {
    totalNodes: number;
    keystones: number;
    notables: number;
    smallNodes: number;
    masteries: number;
    jewelSockets: number;
    ascendancyNodes: number;
  };
}

function calculateNodePosition(
  group: RawGroup,
  orbit: number,
  orbitIndex: number,
  constants: RawTree["constants"],
): { x: number; y: number } {
  if (orbit === 0) {
    return { x: group.x, y: group.y };
  }

  const radius = constants.orbitRadii[orbit] ?? 0;
  const skillsInOrbit = constants.skillsPerOrbit[orbit] ?? 1;
  const angle = (2 * Math.PI * orbitIndex) / skillsInOrbit - Math.PI / 2;

  return {
    x: group.x + radius * Math.cos(angle),
    y: group.y + radius * Math.sin(angle),
  };
}

function getNodeType(node: RawNode): ProcessedNode["type"] {
  if (node.classStartIndex !== undefined) return "class_start";
  if (node.isAscendancyStart) return "ascendancy_start";
  if (node.ascendancyName && node.isNotable) return "ascendancy_notable";
  if (node.ascendancyName) return "ascendancy_small";
  if (node.isKeystone) return "keystone";
  if (node.isNotable) return "notable";
  if (node.isMastery) return "mastery";
  if (node.isJewelSocket) return "jewel_socket";
  return "small";
}

function main() {
  console.log("=== Transforming Skill Tree ===\n");

  if (!existsSync(RAW)) {
    console.error("Error: skill-tree.json not found. Run: curl -sL https://raw.githubusercontent.com/grindinggear/skilltree-export/master/data.json -o data/poe-raw/skill-tree.json");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(RAW, "utf-8")) as RawTree;

  // Process nodes
  const processedNodes: ProcessedNode[] = [];
  const classStartMap = new Map<number, string>(); // classIndex -> nodeId

  const stats = { totalNodes: 0, keystones: 0, notables: 0, smallNodes: 0, masteries: 0, jewelSockets: 0, ascendancyNodes: 0 };

  for (const [id, node] of Object.entries(raw.nodes)) {
    // Skip root/proxy nodes
    if (id === "root") continue;

    const group = node.group != null ? raw.groups[String(node.group)] : null;
    const pos = group && node.orbit != null && node.orbitIndex != null
      ? calculateNodePosition(group, node.orbit, node.orbitIndex, raw.constants)
      : { x: 0, y: 0 };

    const type = getNodeType(node);

    // Track class starts
    if (node.classStartIndex !== undefined) {
      classStartMap.set(node.classStartIndex, id);
    }

    // Count stats
    stats.totalNodes++;
    switch (type) {
      case "keystone": stats.keystones++; break;
      case "notable": stats.notables++; break;
      case "small": stats.smallNodes++; break;
      case "mastery": stats.masteries++; break;
      case "jewel_socket": stats.jewelSockets++; break;
      case "ascendancy_small": case "ascendancy_notable": case "ascendancy_start":
        stats.ascendancyNodes++; break;
    }

    processedNodes.push({
      id,
      skill: node.skill,
      name: node.name,
      icon: node.icon,
      stats: node.stats ?? [],
      type,
      x: Math.round(pos.x * 100) / 100,
      y: Math.round(pos.y * 100) / 100,
      connections: [...(node.out ?? [])],
      group: node.group ?? null,
      orbit: node.orbit ?? null,
      orbitIndex: node.orbitIndex ?? null,
      grantedStrength: node.grantedStrength ?? 0,
      grantedDexterity: node.grantedDexterity ?? 0,
      grantedIntelligence: node.grantedIntelligence ?? 0,
      classStartIndex: node.classStartIndex ?? null,
      ascendancyName: node.ascendancyName ?? null,
      isAscendancyStart: node.isAscendancyStart ?? false,
      masteryEffects: node.masteryEffects ?? null,
    });
  }

  // Process classes
  const classMap: Record<string, number> = raw.constants.classes;
  const classes = raw.classes.map(c => {
    const classIndex = classMap[
      Object.keys(classMap).find(k =>
        k.toLowerCase().replace("class", "") === c.name.toLowerCase() ||
        classMap[k] === raw.classes.indexOf(c)
      ) ?? ""
    ] ?? raw.classes.indexOf(c);

    return {
      name: c.name,
      classIndex,
      startNodeId: classStartMap.get(classIndex) ?? null,
      ascendancies: c.ascendancies.map(a => ({ id: a.id, name: a.name })),
    };
  });

  // Process groups
  const groups = Object.entries(raw.groups).map(([id, g]) => ({
    id,
    x: Math.round(g.x * 100) / 100,
    y: Math.round(g.y * 100) / 100,
    orbits: g.orbits,
    nodeIds: g.nodes,
  }));

  const result: ProcessedTree = {
    nodes: processedNodes,
    classes,
    groups,
    constants: {
      skillsPerOrbit: raw.constants.skillsPerOrbit,
      orbitRadii: raw.constants.orbitRadii,
      totalPoints: raw.points.totalPoints,
      ascendancyPoints: raw.points.ascendancyPoints,
    },
    bounds: {
      minX: raw.min_x,
      minY: raw.min_y,
      maxX: raw.max_x,
      maxY: raw.max_y,
    },
    stats,
  };

  // Write output
  const json = JSON.stringify(result);
  writeFileSync(OUT, json, "utf-8");
  const pubDir = join(ROOT, "public", "data", "processed");
  if (!existsSync(pubDir)) mkdirSync(pubDir, { recursive: true });
  writeFileSync(PUBLIC_OUT, json, "utf-8");

  const sizeKB = Math.round(Buffer.byteLength(json) / 1024);
  console.log(`Output: skill-tree.json (${sizeKB} KB)`);
  console.log(`\nStats:`);
  console.log(`  Total nodes: ${stats.totalNodes}`);
  console.log(`  Keystones: ${stats.keystones}`);
  console.log(`  Notables: ${stats.notables}`);
  console.log(`  Small nodes: ${stats.smallNodes}`);
  console.log(`  Masteries: ${stats.masteries}`);
  console.log(`  Jewel sockets: ${stats.jewelSockets}`);
  console.log(`  Ascendancy nodes: ${stats.ascendancyNodes}`);
  console.log(`  Classes: ${classes.length}`);
  console.log(`  Groups: ${groups.length}`);
  console.log(`\n✓ Done!`);
}

main();
