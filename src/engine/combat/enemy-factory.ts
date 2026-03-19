import type { EnemyDef } from "../types/combat";
import type { CombatState } from "../types/combat";
import { createEmptyAilmentState } from "../types/ailments";
import { createEntropyState } from "../utils/entropy";
import type { ResolvedCharacter } from "../types/character";

/**
 * Create initial combat state for an encounter.
 */
export function createCombatState(
  enemy: EnemyDef,
  player: ResolvedCharacter,
): CombatState {
  return {
    enemy,
    enemyCurrentLife: enemy.baseLife,
    enemyAilments: createEmptyAilmentState(),
    playerCurrentLife: player.maxLife,
    playerCurrentMana: player.maxMana,
    playerCurrentES: player.maxEnergyShield,
    playerAilments: createEmptyAilmentState(),
    tickCount: 0,
    elapsedMs: 0,
    playerEvasionEntropy: createEntropyState(),
    enemyEvasionEntropy: createEntropyState(),
    playerAttackAccumulator: 0,
    enemyAttackAccumulator: 0,
  };
}
