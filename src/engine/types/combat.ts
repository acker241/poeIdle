import type { DamageType, DamageInstance, HitDamageBreakdown } from "./damage";
import type { AilmentType, AilmentState } from "./ailments";
import type { DurationMs } from "./common";
import type { EntropyState } from "../utils/entropy";

/** Enemy definition (loaded from data) */
export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly baseLife: number;
  readonly armour: number;
  readonly evasion: number;
  readonly accuracy: number;
  readonly resistances: Record<DamageType, number>; // can be negative
  readonly damagePerHit: readonly DamageInstance[];
  readonly attackTime: DurationMs;
  readonly isMoving: boolean;
  readonly experienceReward: number;
  readonly isBoss: boolean;
  /** Bosses have reduced ailment effectiveness */
  readonly ailmentThreshold?: number;
}

/** Runtime state of a single combat encounter */
export interface CombatState {
  readonly enemy: EnemyDef;
  readonly enemyCurrentLife: number;
  readonly enemyAilments: AilmentState;
  readonly playerCurrentLife: number;
  readonly playerCurrentMana: number;
  readonly playerCurrentES: number;
  readonly playerAilments: AilmentState;
  readonly tickCount: number;
  readonly elapsedMs: DurationMs;
  readonly playerEvasionEntropy: EntropyState;
  readonly enemyEvasionEntropy: EntropyState;
  /** Time accumulator for player attack/cast (ms since last use) */
  readonly playerAttackAccumulator: DurationMs;
  /** Time accumulator for enemy attacks */
  readonly enemyAttackAccumulator: DurationMs;
}

/** Result of a single combat tick */
export interface TickResult {
  readonly newState: CombatState;
  readonly events: readonly CombatEvent[];
  readonly enemyDefeated: boolean;
  readonly playerDefeated: boolean;
}

/** Events that can happen during a combat tick */
export type CombatEvent =
  | { readonly type: "player_hit"; readonly damage: number; readonly breakdown: HitDamageBreakdown }
  | { readonly type: "player_miss" }
  | { readonly type: "player_blocked" }
  | { readonly type: "enemy_hit"; readonly damage: number }
  | { readonly type: "enemy_miss" }
  | { readonly type: "ailment_applied"; readonly ailment: AilmentType; readonly effect: number }
  | { readonly type: "ailment_expired"; readonly ailment: AilmentType }
  | { readonly type: "dot_tick"; readonly ailment: AilmentType; readonly damage: number }
  | { readonly type: "es_recharge_start" }
  | { readonly type: "enemy_defeated"; readonly xp: number }
  | { readonly type: "player_defeated" };
