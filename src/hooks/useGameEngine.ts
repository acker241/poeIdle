import { useEffect, useRef, useState, useCallback } from "react";
import { addExperience } from "@/engine/character";
import { resolveCharacter } from "@/engine/character";
import { ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP, ACT1_ENEMY_MAP } from "@/engine/data";
import { ACT1_ZONES, getEnemiesForZone, type ZoneDef } from "@/engine/data/zones/act1-zones";
import { resolveSkillLink } from "@/engine/skills";
import { SeededRng } from "@/engine/utils/rng";
import { createCombatState } from "@/engine/combat/enemy-factory";
import { combatTick, TICK_DURATION } from "@/engine/combat/combat-tick";
import { CharacterClass } from "@/engine/types/character";
import type { CombatEvent, CombatState, EnemyDef } from "@/engine/types/combat";
import type { ResolvedCharacter } from "@/engine/types/character";
import type { ResolvedSkill } from "@/engine/types/skills";
import type { TreeGraph } from "@/engine/types/skilltree";
import type { CharacterState } from "@/engine/types/character";
import {
  createInitialGameState,
  completeEncounter,
  startBossFight,
  markBossKilled,
  processQuestTriggers,
  advanceZone,
  applyDeath,
  canProgressToNextZone,
  recordLevelUp,
  DEFAULT_SKILL_PER_CLASS,
  type IdleGameState,
} from "@/engine/game/game-state";

const emptyTree: TreeGraph = {
  nodes: new Map(),
  classStartNodes: new Map(),
};

/** Max combat events kept in the log */
const MAX_EVENTS = 50;

// ---------------------------------------------------------------------------
// Public hook API
// ---------------------------------------------------------------------------

export interface UseGameEngineReturn {
  gameState: IdleGameState;
  resolvedCharacter: ResolvedCharacter | null;
  combatState: CombatState | null;
  combatEvents: CombatEvent[];
  currentZone: ZoneDef;
  currentEnemy: EnemyDef | null;
  skill: ResolvedSkill | null;
  running: boolean;
  setView: (view: "combat" | "tree" | "town") => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameEngine(config: {
  characterName: string;
  characterClass: CharacterClass;
}): UseGameEngineReturn {
  // --- React state (snapshot for rendering) ---
  const [snapshot, setSnapshot] = useState<{
    gameState: IdleGameState;
    resolvedCharacter: ResolvedCharacter | null;
    combatState: CombatState | null;
    combatEvents: CombatEvent[];
    currentZone: ZoneDef;
    currentEnemy: EnemyDef | null;
    skill: ResolvedSkill | null;
    running: boolean;
  }>({
    gameState: createInitialGameState(config.characterName, config.characterClass),
    resolvedCharacter: null,
    combatState: null,
    combatEvents: [],
    currentZone: ACT1_ZONES[0],
    currentEnemy: null,
    skill: null,
    running: false,
  });

  // --- Mutable refs for the hot loop ---
  const rngRef = useRef(new SeededRng(Date.now()));
  const combatRef = useRef<CombatState | null>(null);
  const charStateRef = useRef<CharacterState | null>(null);
  const resolvedCharRef = useRef<ResolvedCharacter | null>(null);
  const skillRef = useRef<ResolvedSkill | null>(null);
  const eventsRef = useRef<CombatEvent[]>([]);
  const gameStateRef = useRef<IdleGameState>(
    createInitialGameState(config.characterName, config.characterClass),
  );
  const currentEnemyRef = useRef<EnemyDef | null>(null);

  // --- Helpers (stable references) ---

  const resolveChar = useCallback(
    (charState: CharacterState): ResolvedCharacter =>
      resolveCharacter(charState, emptyTree, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP),
    [],
  );

  const pickZoneEnemy = useCallback((zone: ZoneDef): EnemyDef => {
    const pool = getEnemiesForZone(zone);
    if (pool.length === 0) {
      // Fallback: first non-boss enemy
      return {
        id: "fallback",
        name: "Wandering Exile",
        level: zone.level,
        baseLife: 20 + zone.level * 8,
        armour: zone.level * 5,
        evasion: 30 + zone.level * 3,
        accuracy: 20 + zone.level * 4,
        resistances: { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 } as any,
        damagePerHit: [{ type: 0 as any, min: 2 + zone.level, max: 4 + zone.level * 2 }],
        attackTime: 1400,
        isMoving: true,
        experienceReward: 8 + zone.level * 3,
        isBoss: false,
      };
    }
    const idx = rngRef.current.nextInt(0, pool.length - 1);
    return pool[idx];
  }, []);

  const spawnEnemy = useCallback(
    (zone: ZoneDef, player: ResolvedCharacter): EnemyDef => {
      const enemy = pickZoneEnemy(zone);
      combatRef.current = createCombatState(enemy, player);
      currentEnemyRef.current = enemy;
      return enemy;
    },
    [pickZoneEnemy],
  );

  const spawnBoss = useCallback(
    (zone: ZoneDef, player: ResolvedCharacter): EnemyDef | null => {
      if (!zone.boss) return null;
      const bossDef = ACT1_ENEMY_MAP.get(zone.boss.enemyId);
      if (!bossDef) return null;
      combatRef.current = createCombatState(bossDef, player);
      currentEnemyRef.current = bossDef;
      return bossDef;
    },
    [],
  );

  // --- setView callback (exposed to UI) ---
  const setView = useCallback((view: "combat" | "tree" | "town") => {
    gameStateRef.current = { ...gameStateRef.current, currentView: view };
  }, []);

  // --- Initialize + run the game loop ---
  useEffect(() => {
    const gs = createInitialGameState(config.characterName, config.characterClass);
    gameStateRef.current = gs;

    const charState = gs.character;
    charStateRef.current = charState;

    const resolved = resolveChar(charState);
    resolvedCharRef.current = resolved;

    // Set up class-appropriate skill
    const skillCfg = DEFAULT_SKILL_PER_CLASS[config.characterClass];
    const skill = resolveSkillLink(
      { activeSkillId: skillCfg.activeSkillId, supportGemIds: skillCfg.supportGemIds },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );
    skillRef.current = skill;

    // Spawn first enemy
    const zone = ACT1_ZONES[gs.currentZoneIndex];
    spawnEnemy(zone, resolved);

    // Push initial snapshot
    setSnapshot({
      gameState: gs,
      resolvedCharacter: resolved,
      combatState: combatRef.current,
      combatEvents: [],
      currentZone: zone,
      currentEnemy: currentEnemyRef.current,
      skill,
      running: true,
    });

    // -----------------------------------------------------------------------
    // Main tick loop
    // -----------------------------------------------------------------------
    const intervalId = setInterval(() => {
      let gs = gameStateRef.current;
      const zone = ACT1_ZONES[gs.currentZoneIndex];

      // If act 1 is complete, idle at the last zone
      if (gs.act1Complete) {
        syncSnapshot();
        return;
      }

      // --- Town: auto-advance (no combat) ---
      if (zone.isTown) {
        gs = advanceZone(gs);
        gameStateRef.current = gs;

        const newZone = ACT1_ZONES[gs.currentZoneIndex];
        if (newZone && !newZone.isTown) {
          const player = resolvedCharRef.current!;
          spawnEnemy(newZone, player);
        }
        syncSnapshot();
        return;
      }

      // --- Combat tick ---
      const combat = combatRef.current;
      const player = resolvedCharRef.current;
      const activeSkill = skillRef.current;
      if (!combat || !player || !activeSkill) return;

      const result = combatTick(combat, player, activeSkill, rngRef.current);
      combatRef.current = result.newState;

      // Append events
      if (result.events.length > 0) {
        const combined = [...eventsRef.current, ...result.events];
        eventsRef.current = combined.slice(-MAX_EVENTS);
      }

      // --- Enemy defeated ---
      if (result.enemyDefeated) {
        const xpEvent = result.events.find(
          (e): e is Extract<CombatEvent, { type: "enemy_defeated" }> =>
            e.type === "enemy_defeated",
        );
        const xpGained = xpEvent?.xp ?? 0;

        // Apply XP to character
        if (xpGained > 0) {
          const prevLevel = charStateRef.current!.level;
          const updatedChar = addExperience(
            charStateRef.current!,
            xpGained,
            zone.level,
          );
          charStateRef.current = updatedChar;

          if (updatedChar.level !== prevLevel) {
            resolvedCharRef.current = resolveChar(updatedChar);
            gs = recordLevelUp(gs, updatedChar.level);
          }
        }

        if (gs.isFightingBoss) {
          // Boss killed
          gs = markBossKilled(gs);
          gs = completeEncounter(gs, xpGained);
          gs = processQuestTriggers(gs, "on_boss_kill");
        } else {
          // Regular encounter
          gs = completeEncounter(gs, xpGained);
        }

        gameStateRef.current = gs;

        // Decide what happens next
        if (canProgressToNextZone(gs)) {
          // Process on_clear triggers before advancing
          gs = processQuestTriggers(gs, "on_clear");
          gs = advanceZone(gs);
          gameStateRef.current = gs;

          const newZone = ACT1_ZONES[gs.currentZoneIndex];
          if (newZone && !newZone.isTown && !gs.act1Complete) {
            spawnEnemy(newZone, resolvedCharRef.current!);
          }
        } else if (gs.encountersRemaining <= 0 && zone.boss && !gs.bossKilled) {
          // All encounters done, time for boss
          gs = startBossFight(gs);
          gameStateRef.current = gs;
          spawnBoss(zone, resolvedCharRef.current!);
        } else {
          // More encounters remaining
          spawnEnemy(zone, resolvedCharRef.current!);
        }
      }

      // --- Player defeated ---
      if (result.playerDefeated) {
        gs = applyDeath(gs);
        gameStateRef.current = gs;

        // Respawn with full HP, continue same zone/encounter
        resolvedCharRef.current = resolveChar(charStateRef.current!);

        // Re-spawn same type of enemy (boss or regular)
        if (gs.isFightingBoss) {
          spawnBoss(zone, resolvedCharRef.current!);
        } else {
          spawnEnemy(zone, resolvedCharRef.current!);
        }
      }

      syncSnapshot();
    }, TICK_DURATION);

    function syncSnapshot() {
      setSnapshot({
        gameState: { ...gameStateRef.current },
        resolvedCharacter: resolvedCharRef.current,
        combatState: combatRef.current,
        combatEvents: [...eventsRef.current],
        currentZone: ACT1_ZONES[gameStateRef.current.currentZoneIndex],
        currentEnemy: currentEnemyRef.current,
        skill: skillRef.current,
        running: true,
      });
    }

    return () => clearInterval(intervalId);
  }, [config.characterName, config.characterClass, resolveChar, spawnEnemy, spawnBoss]);

  return {
    ...snapshot,
    setView,
  };
}
