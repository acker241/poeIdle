import { describe, it, expect } from "vitest";
import { createCharacter } from "../character/character-factory";
import { resolveCharacter } from "../character/character-stats";
import { CharacterClass } from "../types/character";
import { ACTIVE_SKILL_MAP } from "../data/skills/active-skills";
import { SUPPORT_GEM_MAP } from "../data/skills/support-gems";
import { ACT1_ENEMY_MAP } from "../data/enemies/act1-enemies";
import { resolveSkillLink } from "../skills/skill-resolver";
import { runEncounter } from "../combat/combat-loop";
import { SeededRng } from "../utils/rng";
import type { TreeGraph } from "../types/skilltree";

/** Minimal empty tree for testing (no allocated passives). */
const EMPTY_TREE: TreeGraph = {
  nodes: new Map(),
  classStartNodes: new Map(),
};

describe("combat integration", () => {
  it("a level 1 witch with fireball defeats the weakest enemy and gains XP", () => {
    // Fireball is a spell with its own base damage (9-14 fire) — no weapon needed
    const charState = createCharacter("TestWitch", CharacterClass.Witch);

    const charWithSkill = {
      ...charState,
      skillLinks: [{ activeSkillId: "fireball", supportGemIds: [] }],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      { activeSkillId: "fireball", supportGemIds: [] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );
    expect(skill).not.toBeNull();

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    expect(enemy).toBeDefined();

    const rng = new SeededRng(42);
    const result = runEncounter(enemy!, resolved, skill!, rng);

    expect(result.won).toBe(true);
    expect(result.xpGained).toBe(enemy!.experienceReward);
    expect(result.xpGained).toBeGreaterThan(0);
    expect(result.ticksElapsed).toBeGreaterThan(0);
    expect(result.timeElapsedMs).toBeGreaterThan(0);
  });

  it("a level 1 witch with fireball defeats the weakest enemy", () => {
    const charState = createCharacter("TestWitch", CharacterClass.Witch);
    const charWithSkill = {
      ...charState,
      skillLinks: [{ activeSkillId: "fireball", supportGemIds: [] }],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      { activeSkillId: "fireball", supportGemIds: [] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );
    expect(skill).not.toBeNull();

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    expect(enemy).toBeDefined();

    const rng = new SeededRng(123);
    const result = runEncounter(enemy!, resolved, skill!, rng);

    expect(result.won).toBe(true);
    expect(result.xpGained).toBe(8);
  });

  it("enemy_defeated event is emitted when enemy dies", () => {
    const charState = createCharacter("TestSlayer", CharacterClass.Witch);
    const charWithSkill = {
      ...charState,
      skillLinks: [{ activeSkillId: "arc", supportGemIds: [] }],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      { activeSkillId: "arc", supportGemIds: [] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    const rng = new SeededRng(99);
    const result = runEncounter(enemy!, resolved, skill!, rng);

    expect(result.won).toBe(true);
    const defeatEvent = result.events.find(e => e.type === "enemy_defeated");
    expect(defeatEvent).toBeDefined();
    if (defeatEvent && defeatEvent.type === "enemy_defeated") {
      expect(defeatEvent.xp).toBe(enemy!.experienceReward);
    }
  });

  it("resolved character has positive life and mana", () => {
    const charState = createCharacter("StatsCheck", CharacterClass.Marauder);
    const resolved = resolveCharacter(
      charState,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    expect(resolved.maxLife).toBeGreaterThan(0);
    expect(resolved.maxMana).toBeGreaterThan(0);
    expect(resolved.attacksPerSecond).toBeGreaterThan(0);
    expect(resolved.castsPerSecond).toBeGreaterThan(0);
  });

  it("combat with supports: fireball + added fire damage wins", () => {
    const charState = createCharacter("Supported", CharacterClass.Witch);
    const charWithSkill = {
      ...charState,
      skillLinks: [
        {
          activeSkillId: "fireball",
          supportGemIds: ["added_fire_damage", "faster_casting"],
        },
      ],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      {
        activeSkillId: "fireball",
        supportGemIds: ["added_fire_damage", "faster_casting"],
      },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );
    expect(skill).not.toBeNull();
    expect(skill!.supports).toHaveLength(2);

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    const rng = new SeededRng(7);
    const result = runEncounter(enemy!, resolved, skill!, rng);

    expect(result.won).toBe(true);
  });

  it("encounter produces hit or miss events", () => {
    const charState = createCharacter("EventCheck", CharacterClass.Ranger);
    const charWithSkill = {
      ...charState,
      skillLinks: [{ activeSkillId: "split_arrow", supportGemIds: [] }],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      { activeSkillId: "split_arrow", supportGemIds: [] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    const rng = new SeededRng(55);
    const result = runEncounter(enemy!, resolved, skill!, rng);

    // Should have at least one player action (hit or miss)
    const playerActions = result.events.filter(
      e => e.type === "player_hit" || e.type === "player_miss",
    );
    expect(playerActions.length).toBeGreaterThan(0);
  });

  it("encounter finishes within the tick limit", () => {
    const charState = createCharacter("TimerCheck", CharacterClass.Marauder);
    const charWithSkill = {
      ...charState,
      skillLinks: [{ activeSkillId: "ground_slam", supportGemIds: [] }],
    };

    const resolved = resolveCharacter(
      charWithSkill,
      EMPTY_TREE,
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const skill = resolveSkillLink(
      { activeSkillId: "ground_slam", supportGemIds: [] },
      ACTIVE_SKILL_MAP,
      SUPPORT_GEM_MAP,
    );

    const enemy = ACT1_ENEMY_MAP.get("zombie_1");
    const rng = new SeededRng(1);
    const result = runEncounter(enemy!, resolved, skill!, rng, 3000);

    // Should finish well before 3000 ticks for a weak enemy
    expect(result.ticksElapsed).toBeLessThan(3000);
  });
});
