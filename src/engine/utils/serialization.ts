import type { CharacterState } from "../types/character";

/**
 * Save game state to JSON string.
 */
export function serializeGameState(state: GameSaveData): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Load game state from JSON string.
 */
export function deserializeGameState(json: string): GameSaveData | null {
  try {
    const data = JSON.parse(json) as GameSaveData;
    if (!data.version || !data.character) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Save to localStorage.
 */
export function saveToLocalStorage(state: GameSaveData, key: string = "poeidle_save"): void {
  const json = serializeGameState(state);
  localStorage.setItem(key, json);
}

/**
 * Load from localStorage.
 */
export function loadFromLocalStorage(key: string = "poeidle_save"): GameSaveData | null {
  const json = localStorage.getItem(key);
  if (!json) return null;
  return deserializeGameState(json);
}

/** Top-level save data structure */
export interface GameSaveData {
  readonly version: number;
  readonly character: CharacterState;
  readonly currentZoneId: string;
  readonly rngState: number;
  readonly timestamp: number;
}

/**
 * Create a save data object.
 */
export function createSaveData(
  character: CharacterState,
  currentZoneId: string,
  rngState: number,
): GameSaveData {
  return {
    version: 1,
    character,
    currentZoneId,
    rngState,
    timestamp: Date.now(),
  };
}
