import type { CombatState, CombatEvent, EnemyDef } from "../types/combat";
import type { ResolvedCharacter } from "../types/character";
import type { ResolvedSkill } from "../types/skills";
import { GemTag } from "../types/skills";
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

  // Ranged advantage: projectile/bow skills give a delay before the enemy can attack,
  // simulating the distance the enemy must close. The enemy accumulator starts negative
  // so the player gets free attacks while the enemy approaches.
  const isRanged = activeSkill.finalTags.includes(GemTag.Projectile) ||
    activeSkill.finalTags.includes(GemTag.Bow);
  if (isRanged) {
    const closingDelay = enemy.attackTime * 2; // enemy must "walk" ~2 attack cycles
    state = { ...state, enemyAttackAccumulator: -closingDelay };
  }

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

