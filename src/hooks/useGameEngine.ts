import { useEffect, useRef, useState, useCallback } from "react";
import { createCharacter, addExperience } from "@/engine/character";
import { resolveCharacter } from "@/engine/character";
import { ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP, ACT1_ENEMIES } from "@/engine/data";
import { resolveSkillLink } from "@/engine/skills";
import { SeededRng } from "@/engine/utils/rng";
import { createCombatState } from "@/engine/combat/enemy-factory";
import { combatTick, TICK_DURATION } from "@/engine/combat/combat-tick";
import { CharacterClass } from "@/engine/types/character";
import type { CombatEvent, CombatState } from "@/engine/types/combat";
import type { ResolvedCharacter } from "@/engine/types/character";
import type { ResolvedSkill } from "@/engine/types/skills";
import type { TreeGraph } from "@/engine/types/skilltree";
import type { CharacterState } from "@/engine/types/character";

const emptyTree: TreeGraph = {
  nodes: new Map(),
  classStartNodes: new Map(),
};

/** Max events kept in the log */
const MAX_EVENTS = 50;

export interface GameState {
  character: ResolvedCharacter | null;
  characterState: CharacterState | null;
  skill: ResolvedSkill | null;
  combatState: CombatState | null;
  events: CombatEvent[];
  elapsedMs: number;
  totalXp: number;
  killCount: number;
  running: boolean;
}

function pickRandomEnemy(rng: SeededRng) {
  const idx = rng.nextInt(0, ACT1_ENEMIES.length - 1);
  return ACT1_ENEMIES[idx];
}

export function useGameEngine(config: {
  characterName: string;
  characterClass: CharacterClass;
}) {
  const [gameState, setGameState] = useState<GameState>({
    character: null,
    characterState: null,
    skill: null,
    combatState: null,
    events: [],
    elapsedMs: 0,
    totalXp: 0,
    killCount: 0,
    running: false,
  });

  // Mutable refs for the game loop - these are the "live" state that the
  // interval callback mutates. We sync snapshots to React state periodically.
  const rngRef = useRef<SeededRng>(new SeededRng(Date.now()));
  const combatRef = useRef<CombatState | null>(null);
  const charStateRef = useRef<CharacterState | null>(null);
  const resolvedCharRef = useRef<ResolvedCharacter | null>(null);
  const skillRef = useRef<ResolvedSkill | null>(null);
  const eventsRef = useRef<CombatEvent[]>([]);
  const elapsedRef = useRef(0);
  const totalXpRef = useRef(0);
  const killCountRef = useRef(0);

  // Resolve a character from its mutable state
  const resolveChar = useCallback((charState: CharacterState): ResolvedCharacter => {
    return resolveCharacter(charState, emptyTree, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
  }, []);

  // Spawn a new enemy and create fresh combat state
  const spawnEnemy = useCallback(() => {
    const enemy = pickRandomEnemy(rngRef.current);
    const resolved = resolvedCharRef.current;
    if (!resolved) return;
    combatRef.current = createCombatState(enemy, resolved);
  }, []);

  // Initialize the engine
  useEffect(() => {
    // Create character from config
    const charState = createCharacter(config.characterName, config.characterClass);
    charStateRef.current = charState;

    // Resolve stats
    const resolved = resolveChar(charState);
    resolvedCharRef.current = resolved;

    // Set up Fireball + Added Fire Damage
    const skill = resolveSkillLink(
      { activeSkillId: "fireball", supportGemIds: ["added_fire_damage"] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );
    skillRef.current = skill;

    // Spawn the first enemy
    const enemy = pickRandomEnemy(rngRef.current);
    combatRef.current = createCombatState(enemy, resolved);

    // Push initial state to React
    setGameState({
      character: resolved,
      characterState: charState,
      skill,
      combatState: combatRef.current,
      events: [],
      elapsedMs: 0,
      totalXp: 0,
      killCount: 0,
      running: true,
    });

    // Start the combat loop
    const intervalId = setInterval(() => {
      const combat = combatRef.current;
      const player = resolvedCharRef.current;
      const activeSkill = skillRef.current;
      if (!combat || !player || !activeSkill) return;

      const result = combatTick(combat, player, activeSkill, rngRef.current);
      combatRef.current = result.newState;
      elapsedRef.current += TICK_DURATION;

      // Append events (keep last MAX_EVENTS)
      if (result.events.length > 0) {
        const newEvents = [...eventsRef.current, ...result.events];
        eventsRef.current = newEvents.slice(-MAX_EVENTS);
      }

      // Handle enemy defeat
      if (result.enemyDefeated) {
        // Tally XP + kills
        const xpEvent = result.events.find((e): e is Extract<CombatEvent, { type: "enemy_defeated" }> =>
          e.type === "enemy_defeated",
        );
        if (xpEvent) {
          totalXpRef.current += xpEvent.xp;
          // Apply XP to character
          const updatedChar = addExperience(
            charStateRef.current!,
            xpEvent.xp,
            combat.enemy.level,
          );
          charStateRef.current = updatedChar;
          // Re-resolve if leveled up
          if (updatedChar.level !== resolvedCharRef.current!.state.level) {
            resolvedCharRef.current = resolveChar(updatedChar);
          }
        }
        killCountRef.current += 1;

        // Spawn next enemy
        spawnEnemy();
      }

      // Handle player defeat - respawn with full health after a brief pause
      if (result.playerDefeated) {
        // Re-resolve to get full health
        const currentChar = charStateRef.current!;
        resolvedCharRef.current = resolveChar(currentChar);
        spawnEnemy();
      }

      // Sync to React state (every tick for smooth UI)
      setGameState({
        character: resolvedCharRef.current,
        characterState: charStateRef.current,
        skill: skillRef.current,
        combatState: combatRef.current,
        events: [...eventsRef.current],
        elapsedMs: elapsedRef.current,
        totalXp: totalXpRef.current,
        killCount: killCountRef.current,
        running: true,
      });
    }, TICK_DURATION);

    return () => clearInterval(intervalId);
  }, [config.characterName, config.characterClass, resolveChar, spawnEnemy]);

  return gameState;
}
