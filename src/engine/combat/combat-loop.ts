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

/** Zone definition for idle progression */
export interface ZoneDef {
  readonly id: string;
  readonly name: string;
  readonly act: number;
  readonly level: number;
  readonly enemies: readonly EnemyDef[];
  readonly bossId?: string;
}

/** Result of running through a zone */
export interface ZoneResult {
  readonly completed: boolean;
  readonly totalTimeMs: number;
  readonly totalXp: number;
  readonly deaths: number;
  readonly encounters: readonly EncounterResult[];
}

/**
 * Run through an entire zone (series of enemy encounters).
 * The idle loop calls this repeatedly.
 */
export function runZone(
  zone: ZoneDef,
  player: ResolvedCharacter,
  activeSkill: ResolvedSkill,
  rng: SeededRng,
  encounterCount: number = 10, // number of packs before boss
): ZoneResult {
  const encounters: EncounterResult[] = [];
  let totalXp = 0;
  let totalTimeMs = 0;
  let deaths = 0;

  // Regular enemies
  for (let i = 0; i < encounterCount; i++) {
    const enemy = zone.enemies[rng.nextInt(0, zone.enemies.length - 1)];
    const result = runEncounter(enemy, player, activeSkill, rng);
    encounters.push(result);
    totalTimeMs += result.timeElapsedMs;

    if (result.won) {
      totalXp += result.xpGained;
    } else {
      deaths++;
      // Player died — in idle game, respawn and retry
      // (penalidade de XP é aplicada fora desta função)
    }
  }

  // Boss (if zone has one)
  if (zone.bossId) {
    const boss = zone.enemies.find(e => e.id === zone.bossId);
    if (boss) {
      const result = runEncounter(boss, player, activeSkill, rng);
      encounters.push(result);
      totalTimeMs += result.timeElapsedMs;

      if (result.won) {
        totalXp += result.xpGained;
      } else {
        deaths++;
      }
    }
  }

  return {
    completed: deaths === 0 || encounters[encounters.length - 1]?.won === true,
    totalTimeMs,
    totalXp,
    deaths,
    encounters,
  };
}
