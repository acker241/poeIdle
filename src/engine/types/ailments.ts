import type { DurationMs } from "./common";

/** The six ailment types in PoE */
export enum AilmentType {
  /** Fire DoT — only strongest applies */
  Ignite = "ignite",
  /** Slows enemy action speed — only strongest applies */
  Chill = "chill",
  /** Stops enemy completely — only strongest applies */
  Freeze = "freeze",
  /** Increases damage taken — only strongest applies */
  Shock = "shock",
  /** Chaos+Physical DoT — stacks infinitely */
  Poison = "poison",
  /** Physical DoT — does not stack by default */
  Bleed = "bleed",
}

/** A single ailment instance applied to a target */
export interface AilmentInstance {
  readonly type: AilmentType;
  readonly sourceSkillId: string;
  readonly appliedAtMs: DurationMs;
  readonly duration: DurationMs;
  readonly baseDuration: DurationMs;
  /** DPS for DoT ailments (ignite, poison, bleed) */
  readonly dps?: number;
  /** Effect magnitude for debuff ailments (chill %, shock %) */
  readonly effect?: number;
}

/** All active ailments on a target */
export interface AilmentState {
  readonly ignite: AilmentInstance | null;
  readonly chill: AilmentInstance | null;
  readonly freeze: AilmentInstance | null;
  readonly shock: AilmentInstance | null;
  readonly poisons: readonly AilmentInstance[];
  readonly bleed: AilmentInstance | null;
}

/** Default empty ailment state */
export function createEmptyAilmentState(): AilmentState {
  return {
    ignite: null,
    chill: null,
    freeze: null,
    shock: null,
    poisons: [],
    bleed: null,
  };
}

// --- Ailment base constants (PoE defaults) ---

export const IGNITE_BASE_DURATION: DurationMs = 4000;
export const IGNITE_BASE_DAMAGE_MULTIPLIER = 0.5; // 50% of base damage per second

export const POISON_BASE_DURATION: DurationMs = 2000;
export const POISON_BASE_DAMAGE_MULTIPLIER = 0.20; // 20% of (phys + chaos) per second

export const BLEED_BASE_DURATION: DurationMs = 5000;
export const BLEED_BASE_DAMAGE_MULTIPLIER = 0.70; // 70% of phys per second
export const BLEED_MOVING_MORE_MULTIPLIER = 1.5; // 150% more damage while moving (×2.5 total)

export const CHILL_MIN_EFFECT = 0.05; // 5% slow
export const CHILL_MAX_EFFECT = 0.30; // 30% slow

export const SHOCK_MIN_EFFECT = 0.05; // 5% increased damage taken
export const SHOCK_MAX_EFFECT = 0.50; // 50% increased damage taken

export const FREEZE_MIN_DURATION: DurationMs = 300; // Freeze doesn't apply below 300ms
