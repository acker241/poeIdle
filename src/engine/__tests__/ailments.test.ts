import { describe, it, expect } from "vitest";
import { calculateIgnite, resolveIgnite } from "../ailments/ignite";
import { calculatePoison, totalPoisonDps } from "../ailments/poison";
import { calculateBleed, effectiveBleedDps } from "../ailments/bleed";
import { calculateChill } from "../ailments/chill-freeze";
import { calculateShock } from "../ailments/shock";
import { calculateAllStats } from "../stats/stat-calculator";
import type { ComputedStats } from "../types/stats";
import {
  IGNITE_BASE_DAMAGE_MULTIPLIER,
  BLEED_BASE_DAMAGE_MULTIPLIER,
  BLEED_MOVING_MORE_MULTIPLIER,
  POISON_BASE_DAMAGE_MULTIPLIER,
  CHILL_MIN_EFFECT,
  CHILL_MAX_EFFECT,
  SHOCK_MIN_EFFECT,
  SHOCK_MAX_EFFECT,
  AilmentType,
} from "../types/ailments";

/** Empty computed stats (no modifiers) for baseline tests. */
function emptyStats(): ComputedStats {
  return calculateAllStats(new Map(), []);
}

describe("ignite", () => {
  it("calculates ignite DPS as baseDamage * 0.5", () => {
    const ignite = calculateIgnite(100, emptyStats(), "fireball", 0);
    expect(ignite).not.toBeNull();
    expect(ignite!.dps).toBeCloseTo(100 * IGNITE_BASE_DAMAGE_MULTIPLIER, 5);
  });

  it("returns null for zero base damage", () => {
    const ignite = calculateIgnite(0, emptyStats(), "fireball", 0);
    expect(ignite).toBeNull();
  });

  it("has correct type and duration", () => {
    const ignite = calculateIgnite(100, emptyStats(), "fireball", 1000);
    expect(ignite!.type).toBe(AilmentType.Ignite);
    expect(ignite!.duration).toBe(4000); // base 4s
    expect(ignite!.appliedAtMs).toBe(1000);
    expect(ignite!.sourceSkillId).toBe("fireball");
  });

  it("resolves to the stronger ignite", () => {
    const weak = calculateIgnite(50, emptyStats(), "fireball", 0);
    const strong = calculateIgnite(200, emptyStats(), "fireball", 100);
    expect(resolveIgnite(weak, strong!)).toBe(strong);
    expect(resolveIgnite(strong, weak!)).toBe(strong);
  });

  it("resolves incoming if no current ignite", () => {
    const incoming = calculateIgnite(100, emptyStats(), "fireball", 0);
    expect(resolveIgnite(null, incoming!)).toBe(incoming);
  });
});

describe("poison", () => {
  it("calculates poison DPS as (phys + chaos) * 0.20", () => {
    const poison = calculatePoison(60, 40, emptyStats(), "viper_strike", 0);
    expect(poison).not.toBeNull();
    expect(poison!.dps).toBeCloseTo(100 * POISON_BASE_DAMAGE_MULTIPLIER, 5);
  });

  it("stacks: multiple poison instances accumulate DPS", () => {
    const p1 = calculatePoison(50, 0, emptyStats(), "viper_strike", 0);
    const p2 = calculatePoison(50, 0, emptyStats(), "viper_strike", 100);
    const p3 = calculatePoison(100, 0, emptyStats(), "viper_strike", 200);

    const total = totalPoisonDps([p1!, p2!, p3!]);
    const expected =
      50 * POISON_BASE_DAMAGE_MULTIPLIER * 2 +
      100 * POISON_BASE_DAMAGE_MULTIPLIER;
    expect(total).toBeCloseTo(expected, 5);
  });

  it("returns null for zero base damage", () => {
    const poison = calculatePoison(0, 0, emptyStats(), "viper_strike", 0);
    expect(poison).toBeNull();
  });

  it("has correct type and duration", () => {
    const poison = calculatePoison(100, 0, emptyStats(), "viper_strike", 500);
    expect(poison!.type).toBe(AilmentType.Poison);
    expect(poison!.duration).toBe(2000); // base 2s
    expect(poison!.appliedAtMs).toBe(500);
  });

  it("totalPoisonDps returns 0 for empty array", () => {
    expect(totalPoisonDps([])).toBe(0);
  });
});

describe("bleed", () => {
  it("calculates bleed DPS as physDamage * 0.70", () => {
    const bleed = calculateBleed(100, emptyStats(), "lacerate", 0);
    expect(bleed).not.toBeNull();
    expect(bleed!.dps).toBeCloseTo(100 * BLEED_BASE_DAMAGE_MULTIPLIER, 5);
  });

  it("applies moving bonus: DPS * 2.5 when target is moving", () => {
    const bleed = calculateBleed(100, emptyStats(), "lacerate", 0);
    const baseDps = bleed!.dps!;
    const movingDps = effectiveBleedDps(bleed!, true);
    const standingDps = effectiveBleedDps(bleed!, false);

    expect(standingDps).toBeCloseTo(baseDps, 5);
    expect(movingDps).toBeCloseTo(baseDps * (1 + BLEED_MOVING_MORE_MULTIPLIER), 5);
    // 1 + 1.5 = 2.5
    expect(movingDps).toBeCloseTo(baseDps * 2.5, 5);
  });

  it("returns null for zero physical damage", () => {
    const bleed = calculateBleed(0, emptyStats(), "lacerate", 0);
    expect(bleed).toBeNull();
  });

  it("has correct type and duration", () => {
    const bleed = calculateBleed(100, emptyStats(), "lacerate", 0);
    expect(bleed!.type).toBe(AilmentType.Bleed);
    expect(bleed!.duration).toBe(5000); // base 5s
  });
});

describe("chill", () => {
  it("clamps chill effect to minimum 5%", () => {
    // Very small cold damage relative to enemy life
    const chill = calculateChill(6, 100, 0, "ice_nova");
    expect(chill).not.toBeNull();
    expect(chill!.effect).toBeGreaterThanOrEqual(CHILL_MIN_EFFECT);
  });

  it("clamps chill effect to maximum 30%", () => {
    // Massive cold damage relative to enemy life
    const chill = calculateChill(500, 100, 0, "ice_nova");
    expect(chill).not.toBeNull();
    expect(chill!.effect).toBe(CHILL_MAX_EFFECT);
  });

  it("returns null when effect would be below minimum threshold", () => {
    // 1 cold damage vs 1000 life = 0.1%, below 5% minimum
    const chill = calculateChill(1, 1000, 0, "ice_nova");
    expect(chill).toBeNull();
  });

  it("returns null for zero cold damage", () => {
    expect(calculateChill(0, 100, 0, "ice_nova")).toBeNull();
  });

  it("scales effect with damage/life ratio", () => {
    const small = calculateChill(10, 100, 0, "ice_nova");
    const big = calculateChill(25, 100, 0, "ice_nova");
    expect(small).not.toBeNull();
    expect(big).not.toBeNull();
    expect(big!.effect!).toBeGreaterThan(small!.effect!);
  });

  it("has correct type", () => {
    const chill = calculateChill(20, 100, 0, "ice_nova");
    expect(chill!.type).toBe(AilmentType.Chill);
  });
});

describe("shock", () => {
  it("clamps shock effect to minimum 5%", () => {
    const shock = calculateShock(6, 100, 0, "arc");
    expect(shock).not.toBeNull();
    expect(shock!.effect).toBeGreaterThanOrEqual(SHOCK_MIN_EFFECT);
  });

  it("clamps shock effect to maximum 50%", () => {
    const shock = calculateShock(500, 100, 0, "arc");
    expect(shock).not.toBeNull();
    expect(shock!.effect).toBe(SHOCK_MAX_EFFECT);
  });

  it("returns null when effect would be below minimum threshold", () => {
    const shock = calculateShock(1, 1000, 0, "arc");
    expect(shock).toBeNull();
  });

  it("returns null for zero lightning damage", () => {
    expect(calculateShock(0, 100, 0, "arc")).toBeNull();
  });

  it("has correct type", () => {
    const shock = calculateShock(20, 100, 0, "arc");
    expect(shock!.type).toBe(AilmentType.Shock);
  });

  it("scales effect with damage/life ratio", () => {
    const small = calculateShock(10, 100, 0, "arc");
    const big = calculateShock(40, 100, 0, "arc");
    expect(small).not.toBeNull();
    expect(big).not.toBeNull();
    expect(big!.effect!).toBeGreaterThan(small!.effect!);
  });
});
