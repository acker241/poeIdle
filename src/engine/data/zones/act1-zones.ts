import type { EnemyDef } from "../../types/combat";
import { ACT1_ENEMIES } from "../enemies/act1-enemies";

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------

export interface BossDef {
  enemyId: string; // references ACT1_ENEMIES id
  name: string;
}

export interface QuestTrigger {
  questId: string;
  trigger: "on_enter" | "on_clear" | "on_boss_kill";
}

export interface ZoneDef {
  id: string;
  name: string;
  level: number;
  encountersToComplete: number;
  isOptional: boolean;
  isTown: boolean;
  boss?: BossDef;
  questTriggers: QuestTrigger[];
}

// ---------------------------------------------------------------------------
// Act 1 zone list — required progression path
// ---------------------------------------------------------------------------

export const ACT1_ZONES: readonly ZoneDef[] = [
  {
    id: "twilight_strand",
    name: "Twilight Strand",
    level: 1,
    encountersToComplete: 3,
    isOptional: false,
    isTown: false,
    boss: { enemyId: "hillock", name: "Hillock" },
    questTriggers: [
      { questId: "enemy_at_the_gate", trigger: "on_boss_kill" },
    ],
  },
  {
    id: "lioneyes_watch",
    name: "Lioneye's Watch",
    level: 1,
    encountersToComplete: 0,
    isOptional: false,
    isTown: true,
    questTriggers: [],
  },
  {
    id: "the_coast",
    name: "The Coast",
    level: 2,
    encountersToComplete: 8,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_tidal_island",
    name: "The Tidal Island",
    level: 3,
    encountersToComplete: 6,
    isOptional: false,
    isTown: false,
    boss: { enemyId: "hailrake", name: "Hailrake" },
    questTriggers: [
      { questId: "mercy_mission", trigger: "on_clear" },
    ],
  },
  {
    id: "the_mud_flats",
    name: "The Mud Flats",
    level: 4,
    encountersToComplete: 10,
    isOptional: false,
    isTown: false,
    questTriggers: [
      { questId: "breaking_some_eggs", trigger: "on_clear" },
    ],
  },
  {
    id: "the_submerged_passage",
    name: "The Submerged Passage",
    level: 5,
    encountersToComplete: 10,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_ledge",
    name: "The Ledge",
    level: 6,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_climb",
    name: "The Climb",
    level: 7,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_lower_prison",
    name: "The Lower Prison",
    level: 8,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    boss: { enemyId: "chatters", name: "Chatters" },
    questTriggers: [],
  },
  {
    id: "the_upper_prison",
    name: "The Upper Prison",
    level: 9,
    encountersToComplete: 10,
    isOptional: false,
    isTown: false,
    boss: { enemyId: "brutus", name: "Brutus, Lord Incarcerator" },
    questTriggers: [
      { questId: "the_caged_brute", trigger: "on_boss_kill" },
    ],
  },
  {
    id: "prisoners_gate",
    name: "Prisoner's Gate",
    level: 10,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_ship_graveyard",
    name: "The Ship Graveyard",
    level: 11,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    questTriggers: [
      { questId: "the_marooned_mariner", trigger: "on_clear" },
    ],
  },
  {
    id: "the_ship_graveyard_cave",
    name: "The Ship Graveyard Cave",
    level: 12,
    encountersToComplete: 8,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_cavern_of_wrath",
    name: "The Cavern of Wrath",
    level: 12,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    questTriggers: [],
  },
  {
    id: "the_cavern_of_anger",
    name: "The Cavern of Anger",
    level: 13,
    encountersToComplete: 12,
    isOptional: false,
    isTown: false,
    boss: { enemyId: "merveil", name: "Merveil, the Siren" },
    questTriggers: [
      { questId: "the_siren_cadence", trigger: "on_boss_kill" },
    ],
  },
];

/** Map for O(1) lookup */
export const ACT1_ZONE_MAP: ReadonlyMap<string, ZoneDef> = new Map(
  ACT1_ZONES.map((z) => [z.id, z]),
);

// ---------------------------------------------------------------------------
// Helper: get enemies appropriate for a zone level (±1)
// ---------------------------------------------------------------------------

export function getEnemiesForZone(zone: ZoneDef): EnemyDef[] {
  return ACT1_ENEMIES.filter(
    (e) =>
      !e.isBoss &&
      e.level >= zone.level - 1 &&
      e.level <= zone.level + 1,
  );
}
