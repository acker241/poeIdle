import type { DurationMs } from "../types/common";

/** Default ES recharge delay in PoE (2 seconds after last hit) */
export const DEFAULT_ES_RECHARGE_DELAY: DurationMs = 2000;

/** Default ES recharge rate (33% of max ES per second) */
export const DEFAULT_ES_RECHARGE_RATE = 0.33;

/** State for ES recharge tracking */
export interface EnergyShieldState {
  readonly current: number;
  readonly max: number;
  /** Time since last damage taken (for recharge delay) */
  readonly timeSinceLastHit: DurationMs;
  readonly rechargeDelay: DurationMs;
  readonly rechargeRate: number; // fraction of max per second
}

/**
 * Tick ES recharge. ES starts recharging after not being hit for rechargeDelay ms.
 */
export function tickEnergyShield(
  state: EnergyShieldState,
  deltaMs: DurationMs,
  tookDamage: boolean,
): EnergyShieldState {
  let timeSinceLastHit = tookDamage ? 0 : state.timeSinceLastHit + deltaMs;

  // If we haven't reached recharge delay, or already full, no change
  if (timeSinceLastHit < state.rechargeDelay || state.current >= state.max) {
    return { ...state, timeSinceLastHit };
  }

  // Recharge ES
  const rechargePerMs = (state.max * state.rechargeRate) / 1000;
  const newCurrent = Math.min(state.max, state.current + rechargePerMs * deltaMs);

  return {
    ...state,
    current: newCurrent,
    timeSinceLastHit,
  };
}

export function createEnergyShieldState(
  maxES: number,
  rechargeDelay: DurationMs = DEFAULT_ES_RECHARGE_DELAY,
  rechargeRate: number = DEFAULT_ES_RECHARGE_RATE,
): EnergyShieldState {
  return {
    current: maxES,
    max: maxES,
    timeSinceLastHit: rechargeDelay, // start fully recharged
    rechargeDelay,
    rechargeRate,
  };
}
