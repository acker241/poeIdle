import type { CombatState, CombatEvent, EnemyDef } from "../types/combat";
import type { ResolvedCharacter } from "../types/character";
import type { ResolvedSkill } from "../types/skills";
import type { SeededRng } from "../utils/rng";
import { combatTick, TICK_DURATION } from "./combat-tick";
import { createCombatState } from "./enemy-factory";

/** Result of running a full combat encounter (one enemy fight) */
export interface EncounterResult {
  readonly won: boolean;
  readonly ticksElapsed: number;
  readonly timeElapsedMs: number;
  readonly xpGained: number;
  readonly events: readonly CombatEvent[];
  readonly finalState: CombatState;
}

/**
 * Run a single encounter: player vs one enemy until one dies.
 * Returns the full result including event log.
 *
 * @param maxTicks - Safety limit to prevent infinite loops
 */
export function runEncounter(
  enemy: EnemyDef,
  player: ResolvedCharacter,
  activeSkill: ResolvedSkill,
  rng: SeededRng,
  maxTicks: number = 3000, // 5 minutes at 10 ticks/sec
): EncounterResult {
  let state = createCombatState(enemy, player);
  const allEvents: CombatEvent[] = [];
  let xpGained = 0;

  for (let i = 0; i < maxTicks; i++) {
    const result = combatTick(state, player, activeSkill, rng);
    state = result.newState;
    allEvents.push(...result.events);

    if (result.enemyDefeated) {
      xpGained = enemy.experienceReward;
      return {
        won: true,
        ticksElapsed: state.tickCount,
        timeElapsedMs: state.elapsedMs,
        xpGained,
        events: allEvents,
        finalState: state,
      };
    }

    if (result.playerDefeated) {
      return {
        won: false,
        ticksElapsed: state.tickCount,
        timeElapsedMs: state.elapsedMs,
        xpGained: 0,
        events: allEvents,
        finalState: state,
      };
    }
  }

  // Timed out (shouldn't happen with reasonable builds)
  return {
    won: false,
    ticksElapsed: state.tickCount,
    timeElapsedMs: state.elapsedMs,
    xpGained: 0,
    events: allEvents,
    finalState: state,
  };
}

