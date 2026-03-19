// ---------------------------------------------------------------------------
// Quest definitions for Act 1
// ---------------------------------------------------------------------------

export type QuestReward =
  | { type: "passive_skill_point"; count: number }
  | { type: "respec_points"; count: number }
  | { type: "skill_gem"; gemId: string; gemName: string }
  | { type: "support_gem"; gemId: string; gemName: string }
  | { type: "flask"; name: string };

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  rewards: QuestReward[];
}

export const ACT1_QUESTS: readonly QuestDef[] = [
  {
    id: "enemy_at_the_gate",
    name: "Enemy at the Gate",
    description: "Kill Hillock at the Twilight Strand.",
    rewards: [
      { type: "skill_gem", gemId: "fireball", gemName: "Fireball" },
    ],
  },
  {
    id: "mercy_mission",
    name: "Mercy Mission",
    description: "Clear The Tidal Island and retrieve the medicine chest.",
    rewards: [
      { type: "flask", name: "Quicksilver Flask" },
      { type: "support_gem", gemId: "added_cold_damage", gemName: "Added Cold Damage" },
    ],
  },
  {
    id: "breaking_some_eggs",
    name: "Breaking Some Eggs",
    description: "Find the three Rhoa Eggs in The Mud Flats.",
    rewards: [{ type: "passive_skill_point", count: 1 }],
  },
  {
    id: "the_caged_brute",
    name: "The Caged Brute",
    description: "Kill Brutus, Lord Incarcerator.",
    rewards: [
      { type: "support_gem", gemId: "added_fire_damage", gemName: "Added Fire Damage" },
    ],
  },
  {
    id: "the_marooned_mariner",
    name: "The Marooned Mariner",
    description: "Clear the Ship Graveyard and free the marooned mariner.",
    rewards: [{ type: "passive_skill_point", count: 1 }],
  },
  {
    id: "the_siren_cadence",
    name: "The Siren's Cadence",
    description: "Defeat Merveil, the Siren, to open the way to Act 2.",
    rewards: [{ type: "passive_skill_point", count: 1 }],
  },
];

/** Map for O(1) lookup */
export const ACT1_QUEST_MAP: ReadonlyMap<string, QuestDef> = new Map(
  ACT1_QUESTS.map((q) => [q.id, q]),
);
