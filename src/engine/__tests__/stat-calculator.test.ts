import { describe, it, expect } from "vitest";
import { calculateStat, calculateAllStats, getStatValue } from "../stats/stat-calculator";
import { ModifierType } from "../types/stats";
import type { StatModifier, StatSource } from "../types/stats";

const testSource: StatSource = { kind: "base", id: "test", label: "test" };

function mod(
  statId: string,
  type: ModifierType,
  value: number,
): StatModifier {
  return { statId, type, value, source: testSource };
}

describe("calculateStat", () => {
  it("applies the PoE formula: (base + flat) * (1 + inc) * prod(1 + more)", () => {
    // base 100, +50 flat, 20% increased, 30% more
    // => (100 + 50) * (1 + 0.20) * (1 + 0.30) = 150 * 1.2 * 1.3 = 234
    const mods: StatModifier[] = [
      mod("life", ModifierType.Flat, 50),
      mod("life", ModifierType.Increased, 0.20),
      mod("life", ModifierType.More, 0.30),
    ];
    const result = calculateStat(100, mods);
    expect(result.base).toBe(100);
    expect(result.flatTotal).toBe(50);
    expect(result.increasedTotal).toBe(0.20);
    expect(result.moreMultipliers).toEqual([0.30]);
    expect(result.finalValue).toBeCloseTo(234, 5);
  });

  it("returns base when no modifiers are provided", () => {
    const result = calculateStat(100, []);
    expect(result.finalValue).toBe(100);
    expect(result.flatTotal).toBe(0);
    expect(result.increasedTotal).toBe(0);
    expect(result.moreMultipliers).toEqual([]);
  });

  it("handles zero base with flat modifiers", () => {
    const mods: StatModifier[] = [
      mod("es", ModifierType.Flat, 40),
      mod("es", ModifierType.Increased, 0.50),
    ];
    const result = calculateStat(0, mods);
    // (0 + 40) * (1 + 0.50) = 60
    expect(result.finalValue).toBeCloseTo(60, 5);
  });

  it("handles negative increased (reduced)", () => {
    const mods: StatModifier[] = [
      mod("speed", ModifierType.Increased, -0.30),
    ];
    const result = calculateStat(100, mods);
    // 100 * (1 + (-0.30)) = 100 * 0.70 = 70
    expect(result.finalValue).toBeCloseTo(70, 5);
  });

  it("stacks multiple more multipliers multiplicatively", () => {
    const mods: StatModifier[] = [
      mod("dmg", ModifierType.More, 0.50),
      mod("dmg", ModifierType.More, 0.30),
      mod("dmg", ModifierType.More, 0.20),
    ];
    const result = calculateStat(100, mods);
    // 100 * 1.50 * 1.30 * 1.20 = 234
    expect(result.finalValue).toBeCloseTo(234, 5);
    expect(result.moreMultipliers).toEqual([0.50, 0.30, 0.20]);
  });

  it("handles negative more (less) multipliers", () => {
    const mods: StatModifier[] = [
      mod("dmg", ModifierType.More, 0.50),
      mod("dmg", ModifierType.More, -0.20), // 20% less
    ];
    const result = calculateStat(100, mods);
    // 100 * 1.50 * 0.80 = 120
    expect(result.finalValue).toBeCloseTo(120, 5);
  });

  it("sums multiple increased modifiers additively", () => {
    const mods: StatModifier[] = [
      mod("fire", ModifierType.Increased, 0.20),
      mod("fire", ModifierType.Increased, 0.30),
      mod("fire", ModifierType.Increased, 0.10),
    ];
    const result = calculateStat(100, mods);
    // 100 * (1 + 0.60) = 160
    expect(result.increasedTotal).toBeCloseTo(0.60, 5);
    expect(result.finalValue).toBeCloseTo(160, 5);
  });

  it("sums multiple flat modifiers", () => {
    const mods: StatModifier[] = [
      mod("life", ModifierType.Flat, 10),
      mod("life", ModifierType.Flat, 20),
      mod("life", ModifierType.Flat, 30),
    ];
    const result = calculateStat(50, mods);
    // (50 + 60) * 1 = 110
    expect(result.flatTotal).toBe(60);
    expect(result.finalValue).toBe(110);
  });

  it("produces zero when base is zero and there are no flat mods", () => {
    const mods: StatModifier[] = [
      mod("x", ModifierType.Increased, 1.0),
      mod("x", ModifierType.More, 0.50),
    ];
    const result = calculateStat(0, mods);
    // (0 + 0) * 2.0 * 1.5 = 0
    expect(result.finalValue).toBe(0);
  });
});

describe("calculateAllStats", () => {
  it("groups modifiers by statId and computes each stat", () => {
    const baseStats = new Map<string, number>([
      ["life", 50],
      ["mana", 40],
    ]);
    const mods: StatModifier[] = [
      mod("life", ModifierType.Flat, 10),
      mod("mana", ModifierType.Increased, 0.25),
      mod("life", ModifierType.Increased, 0.20),
    ];
    const result = calculateAllStats(baseStats, mods);

    // life: (50 + 10) * (1 + 0.20) = 72
    expect(result.values.get("life")).toBeCloseTo(72, 5);
    // mana: 40 * (1 + 0.25) = 50
    expect(result.values.get("mana")).toBeCloseTo(50, 5);
  });

  it("computes stats with no base value (modifier-only stats)", () => {
    const baseStats = new Map<string, number>();
    const mods: StatModifier[] = [
      mod("fire_res", ModifierType.Flat, 0.30),
      mod("fire_res", ModifierType.Flat, 0.15),
    ];
    const result = calculateAllStats(baseStats, mods);
    // (0 + 0.45) * 1 = 0.45
    expect(result.values.get("fire_res")).toBeCloseTo(0.45, 5);
  });

  it("includes breakdowns for each stat", () => {
    const baseStats = new Map<string, number>([["life", 100]]);
    const mods: StatModifier[] = [
      mod("life", ModifierType.Flat, 20),
      mod("life", ModifierType.Increased, 0.10),
      mod("life", ModifierType.More, 0.50),
    ];
    const result = calculateAllStats(baseStats, mods);
    const breakdown = result.breakdowns.get("life");
    expect(breakdown).toBeDefined();
    expect(breakdown!.base).toBe(100);
    expect(breakdown!.flatTotal).toBe(20);
    expect(breakdown!.increasedTotal).toBe(0.10);
    expect(breakdown!.moreMultipliers).toEqual([0.50]);
    // (100 + 20) * 1.10 * 1.50 = 198
    expect(breakdown!.finalValue).toBeCloseTo(198, 5);
  });

  it("handles empty inputs", () => {
    const result = calculateAllStats(new Map(), []);
    expect(result.values.size).toBe(0);
    expect(result.breakdowns.size).toBe(0);
  });
});

describe("getStatValue", () => {
  it("returns 0 for missing stats", () => {
    const stats = calculateAllStats(new Map(), []);
    expect(getStatValue(stats, "nonexistent")).toBe(0);
  });

  it("returns the computed value for existing stats", () => {
    const stats = calculateAllStats(
      new Map([["life", 100]]),
      [mod("life", ModifierType.Flat, 50)],
    );
    expect(getStatValue(stats, "life")).toBe(150);
  });
});
