import { describe, it, expect } from "vitest";
import { resolveSkillLink } from "../skills/skill-resolver";
import { ACTIVE_SKILL_MAP } from "../data/skills/active-skills";
import { SUPPORT_GEM_MAP } from "../data/skills/support-gems";
import { GemTag } from "../types/skills";
import type { SkillLink } from "../types/skills";

describe("resolveSkillLink", () => {
  it("returns null for unknown active skill", () => {
    const link: SkillLink = {
      activeSkillId: "nonexistent_skill",
      supportGemIds: [],
    };
    expect(resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP)).toBeNull();
  });

  it("resolves a skill with no supports", () => {
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: [],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.active.id).toBe("fireball");
    expect(result!.supports).toHaveLength(0);
    expect(result!.effectiveManaCost).toBe(6); // fireball base mana
  });

  it("does not apply Faster Attacks (requires Attack tag) to a spell", () => {
    // Fireball is a spell, Faster Attacks requires Attack tag
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["faster_attacks"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(0);
    // Mana cost unchanged since support didn't apply
    expect(result!.effectiveManaCost).toBe(6);
  });

  it("applies Faster Attacks to an attack skill", () => {
    const link: SkillLink = {
      activeSkillId: "ground_slam",
      supportGemIds: ["faster_attacks"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(1);
    expect(result!.supports[0].id).toBe("faster_attacks");
  });

  it("does not apply Faster Casting (requires Spell tag) to an attack", () => {
    const link: SkillLink = {
      activeSkillId: "ground_slam",
      supportGemIds: ["faster_casting"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(0);
  });

  it("applies Faster Casting to a spell", () => {
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["faster_casting"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(1);
    expect(result!.supports[0].id).toBe("faster_casting");
  });

  it("stacks mana cost multipliers from multiple supports", () => {
    // Ground Slam (attack, melee, AoE) + Faster Attacks (1.15) + Concentrated Effect (1.40)
    const link: SkillLink = {
      activeSkillId: "ground_slam",
      supportGemIds: ["faster_attacks", "concentrated_effect"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(2);
    // 6 * 1.15 * 1.40 = 9.66, rounded to 10
    expect(result!.effectiveManaCost).toBe(Math.round(6 * 1.15 * 1.40));
  });

  it("filters out inapplicable supports while keeping applicable ones", () => {
    // Fireball (spell, projectile, AoE, fire) + Faster Attacks (attack-only) + Added Cold (no req)
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["faster_attacks", "added_cold_damage"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    // Only Added Cold should apply (no required tags)
    expect(result!.supports).toHaveLength(1);
    expect(result!.supports[0].id).toBe("added_cold_damage");
  });

  it("combines added damage from supports", () => {
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["added_cold_damage", "added_lightning_damage"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.totalAddedDamage).toHaveLength(2);
  });

  it("combines stat modifiers from active skill and supports", () => {
    const link: SkillLink = {
      activeSkillId: "heavy_strike",
      supportGemIds: ["melee_physical_damage"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    // Heavy Strike has 1 mod, Melee Phys Dmg support has 2 mods
    expect(result!.totalStatModifiers.length).toBe(3);
  });

  it("adds tags from supports to the final skill", () => {
    // Fireball + Added Cold Damage (adds Cold tag)
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["added_cold_damage"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.finalTags).toContain(GemTag.Cold);
    // Original tags preserved
    expect(result!.finalTags).toContain(GemTag.Fire);
    expect(result!.finalTags).toContain(GemTag.Spell);
  });

  it("limits supports to 5 maximum", () => {
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: [
        "added_cold_damage",
        "added_lightning_damage",
        "added_fire_damage",
        "faster_casting",
        "onslaught",
        "lesser_multiple_projectiles", // 6th support, should be ignored
      ],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    // All 5 should apply (fireball has tags matching all of these)
    expect(result!.supports.length).toBeLessThanOrEqual(5);
  });

  it("Minion Damage support requires Minion tag", () => {
    // Fireball has no Minion tag => Minion Damage should not apply
    const link: SkillLink = {
      activeSkillId: "fireball",
      supportGemIds: ["minion_damage"],
    };
    const result = resolveSkillLink(link, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result).not.toBeNull();
    expect(result!.supports).toHaveLength(0);

    // Raise Zombie has Minion tag => should apply
    const link2: SkillLink = {
      activeSkillId: "raise_zombie",
      supportGemIds: ["minion_damage"],
    };
    const result2 = resolveSkillLink(link2, ACTIVE_SKILL_MAP, SUPPORT_GEM_MAP);
    expect(result2).not.toBeNull();
    expect(result2!.supports).toHaveLength(1);
  });
});
