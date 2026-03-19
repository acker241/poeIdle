import type { CharacterState } from "../types/character";
import { CharacterClass } from "../types/character";
import { createCharacter } from "../character/character-factory";
import { ACT1_ZONES, type ZoneDef } from "../data/zones/act1-zones";
import { ACT1_QUEST_MAP, type QuestReward } from "../data/quests/act1-quests";

// ---------------------------------------------------------------------------
// Game log
// ---------------------------------------------------------------------------

export interface GameLogEntry {
  timestamp: number;
  message: string;
  type: "zone" | "quest" | "level_up" | "death" | "boss" | "reward";
}

// ---------------------------------------------------------------------------
// Idle game state
// ---------------------------------------------------------------------------

export interface IdleGameState {
  character: CharacterState;
  currentZoneIndex: number;
  encountersRemaining: number;
  isFightingBoss: boolean;
  bossKilled: boolean;
  completedQuests: string[];
  availableSkillPoints: number;
  pendingQuestRewards: QuestReward[];
  gameLog: GameLogEntry[];
  totalKills: number;
  totalXp: number;
  totalDeaths: number;
  currentView: "combat" | "tree" | "town" | "quest_reward";
  act1Complete: boolean;
}

// ---------------------------------------------------------------------------
// Default skill per class (uses skills that exist in ACTIVE_SKILL_MAP)
// ---------------------------------------------------------------------------

export const DEFAULT_SKILL_PER_CLASS: Record<CharacterClass, { activeSkillId: string; supportGemIds: string[] }> = {
  [CharacterClass.Marauder]:  { activeSkillId: "heavy_strike",  supportGemIds: ["melee_physical_damage"] },
  [CharacterClass.Ranger]:    { activeSkillId: "burning_arrow",  supportGemIds: ["added_fire_damage"] },
  [CharacterClass.Witch]:     { activeSkillId: "fireball",       supportGemIds: ["added_fire_damage"] },
  [CharacterClass.Duelist]:   { activeSkillId: "cleave",         supportGemIds: ["melee_physical_damage"] },
  [CharacterClass.Templar]:   { activeSkillId: "molten_strike",  supportGemIds: ["added_fire_damage"] },
  [CharacterClass.Shadow]:    { activeSkillId: "freezing_pulse", supportGemIds: ["added_cold_damage"] },
  [CharacterClass.Scion]:     { activeSkillId: "split_arrow",   supportGemIds: ["added_cold_damage"] },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInitialGameState(
  charName: string,
  charClass: CharacterClass,
): IdleGameState {
  const character = createCharacter(charName, charClass);
  const firstZone = ACT1_ZONES[0];

  return {
    character,
    currentZoneIndex: 0,
    encountersRemaining: firstZone.encountersToComplete,
    isFightingBoss: false,
    bossKilled: false,
    completedQuests: [],
    availableSkillPoints: 0,
    pendingQuestRewards: [],
    gameLog: [
      {
        timestamp: Date.now(),
        message: `Entered ${firstZone.name} (Level ${firstZone.level})`,
        type: "zone",
      },
    ],
    totalKills: 0,
    totalXp: 0,
    totalDeaths: 0,
    currentView: "combat",
    act1Complete: false,
  };
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

function addLog(
  state: IdleGameState,
  message: string,
  type: GameLogEntry["type"],
): GameLogEntry[] {
  const entry: GameLogEntry = { timestamp: Date.now(), message, type };
  // Keep last 100 log entries
  const log = [...state.gameLog, entry];
  return log.length > 100 ? log.slice(-100) : log;
}

/** Complete one encounter: decrement remaining, tally XP & kills. */
export function completeEncounter(
  state: IdleGameState,
  xpGained: number,
): IdleGameState {
  return {
    ...state,
    encountersRemaining: Math.max(0, state.encountersRemaining - 1),
    totalKills: state.totalKills + 1,
    totalXp: state.totalXp + xpGained,
  };
}

/** Start the boss fight for the current zone. */
export function startBossFight(state: IdleGameState): IdleGameState {
  const zone = ACT1_ZONES[state.currentZoneIndex];
  if (!zone?.boss) return state;
  return {
    ...state,
    isFightingBoss: true,
    gameLog: addLog(state, `BOSS: ${zone.boss.name} appears!`, "boss"),
  };
}

/** Mark boss as killed (separate from encounter completion). */
export function markBossKilled(state: IdleGameState): IdleGameState {
  const zone = ACT1_ZONES[state.currentZoneIndex];
  const bossName = zone?.boss?.name ?? "Boss";
  return {
    ...state,
    bossKilled: true,
    isFightingBoss: false,
    gameLog: addLog(state, `${bossName} has been defeated!`, "boss"),
  };
}

/** Process quest triggers for the current zone. */
export function processQuestTriggers(
  state: IdleGameState,
  triggerType: "on_enter" | "on_clear" | "on_boss_kill",
): IdleGameState {
  const zone = ACT1_ZONES[state.currentZoneIndex];
  if (!zone) return state;

  let newState = { ...state };

  for (const qt of zone.questTriggers) {
    if (qt.trigger !== triggerType) continue;
    if (newState.completedQuests.includes(qt.questId)) continue;

    const quest = ACT1_QUEST_MAP.get(qt.questId);
    if (!quest) continue;

    // Complete the quest
    newState = {
      ...newState,
      completedQuests: [...newState.completedQuests, qt.questId],
      gameLog: addLog(newState, `Quest completed: ${quest.name}`, "quest"),
    };

    // Process rewards
    for (const reward of quest.rewards) {
      if (reward.type === "passive_skill_point") {
        newState = {
          ...newState,
          availableSkillPoints: newState.availableSkillPoints + reward.count,
          gameLog: addLog(
            newState,
            `Reward: +${reward.count} passive skill point${reward.count > 1 ? "s" : ""}`,
            "reward",
          ),
        };
      } else {
        // Queue non-skill-point rewards for display
        newState = {
          ...newState,
          pendingQuestRewards: [...newState.pendingQuestRewards, reward],
          gameLog: addLog(
            newState,
            `Reward: ${rewardLabel(reward)}`,
            "reward",
          ),
        };
      }
    }
  }

  return newState;
}

function rewardLabel(reward: QuestReward): string {
  switch (reward.type) {
    case "passive_skill_point":
      return `+${reward.count} Passive Skill Point${reward.count > 1 ? "s" : ""}`;
    case "respec_points":
      return `+${reward.count} Respec Point${reward.count > 1 ? "s" : ""}`;
    case "skill_gem":
      return `Skill Gem: ${reward.gemName}`;
    case "support_gem":
      return `Support Gem: ${reward.gemName}`;
    case "flask":
      return reward.name;
  }
}

/** Advance to the next zone. */
export function advanceZone(state: IdleGameState): IdleGameState {
  const nextIndex = state.currentZoneIndex + 1;

  if (nextIndex >= ACT1_ZONES.length) {
    // Act 1 complete!
    return {
      ...state,
      act1Complete: true,
      gameLog: addLog(state, "Act 1 Complete! You have defeated Merveil.", "zone"),
    };
  }

  const nextZone = ACT1_ZONES[nextIndex];
  let newState: IdleGameState = {
    ...state,
    currentZoneIndex: nextIndex,
    encountersRemaining: nextZone.encountersToComplete,
    isFightingBoss: false,
    bossKilled: false,
    gameLog: addLog(
      state,
      `Entered ${nextZone.name} (Level ${nextZone.level})`,
      "zone",
    ),
  };

  // Process on_enter quest triggers
  newState = processQuestTriggers(newState, "on_enter");

  return newState;
}

/** Apply death: respawn with full HP, no XP penalty in Act 1. */
export function applyDeath(state: IdleGameState): IdleGameState {
  return {
    ...state,
    totalDeaths: state.totalDeaths + 1,
    gameLog: addLog(state, "You have been slain. Respawning...", "death"),
  };
}

/** Check if the player can progress to the next zone. */
export function canProgressToNextZone(state: IdleGameState): boolean {
  const zone = ACT1_ZONES[state.currentZoneIndex];
  if (!zone) return false;

  // Encounters must be cleared
  if (state.encountersRemaining > 0) return false;

  // Boss must be killed if zone has one
  if (zone.boss && !state.bossKilled) return false;

  return true;
}

/** Dismiss pending quest rewards (player acknowledged them). */
export function dismissRewards(state: IdleGameState): IdleGameState {
  return {
    ...state,
    pendingQuestRewards: [],
  };
}

/** Record a level-up in the log. */
export function recordLevelUp(
  state: IdleGameState,
  newLevel: number,
): IdleGameState {
  return {
    ...state,
    gameLog: addLog(state, `Level up! You are now level ${newLevel}.`, "level_up"),
  };
}
