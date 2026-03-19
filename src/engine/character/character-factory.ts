import type { CharacterState } from "../types/character";
import { CharacterClass } from "../types/character";

let nextCharId = 1;

/**
 * Create a new character at level 1.
 */
export function createCharacter(
  name: string,
  classId: CharacterClass,
): CharacterState {
  return {
    id: `char_${nextCharId++}`,
    name,
    classId,
    level: 1,
    experience: 0,
    allocatedPassives: [],
    equipment: {},
    skillLinks: [],
    ascendancyId: undefined,
    ascendancyPoints: 0,
  };
}

/**
 * XP required for each level (simplified PoE curve).
 * PoE uses a polynomial formula; this is an approximation.
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  // Simplified: base * level^2.5
  return Math.floor(50 * Math.pow(level, 2.5));
}

/**
 * XP penalty based on level difference between character and zone.
 * PoE "safe zone" is ±3 levels at low levels, expanding at higher levels.
 * Outside safe zone, XP is reduced.
 */
export function xpEfficiencyMultiplier(characterLevel: number, zoneLevel: number): number {
  const safeRange = 3 + Math.floor(characterLevel / 16);
  const diff = Math.abs(characterLevel - zoneLevel);

  if (diff <= safeRange) return 1.0;

  const penalty = diff - safeRange;
  // Each level outside safe zone reduces XP by ~10%
  return Math.max(0.01, 1.0 - penalty * 0.10);
}

/**
 * XP penalty on death based on current act.
 * Acts 1-5: 0%, Acts 6-10: 5%, Maps: 10%
 */
export function deathXpPenalty(act: number): number {
  if (act <= 5) return 0;
  if (act <= 10) return 0.05;
  return 0.10;
}

/**
 * Add experience to a character, handling level-ups.
 * Returns new character state.
 */
export function addExperience(
  state: CharacterState,
  rawXp: number,
  zoneLevel: number,
): CharacterState {
  const efficiency = xpEfficiencyMultiplier(state.level, zoneLevel);
  const xp = Math.floor(rawXp * efficiency);

  let { level, experience } = state;
  experience += xp;

  // Check for level-ups
  while (level < 100) {
    const required = xpRequiredForLevel(level + 1);
    if (experience >= required) {
      experience -= required;
      level++;
    } else {
      break;
    }
  }

  return { ...state, level, experience };
}

/**
 * Apply death XP penalty.
 */
export function applyDeathPenalty(state: CharacterState, act: number): CharacterState {
  const penalty = deathXpPenalty(act);
  if (penalty <= 0) return state;

  const required = xpRequiredForLevel(state.level + 1);
  const xpLost = Math.floor(required * penalty);
  const newXp = Math.max(0, state.experience - xpLost);

  return { ...state, experience: newXp };
}

/**
 * Passive points available (from leveling + quest rewards).
 * PoE gives 1 point per level (starting at level 2) + ~20-24 from quests.
 * For Act 1 MVP, assume ~2 quest reward points.
 */
export function availablePassivePoints(level: number, questRewards: number = 0): number {
  return Math.max(0, level - 1) + questRewards;
}
