import { describe, it, expect } from "vitest";
import { applyConversions, getPoolDamage, getPoolTotalDamage } from "../damage/damage-conversion";
import { DamageType } from "../types/damage";
import type { DamageConversion } from "../types/damage";
import type { StatSource } from "../types/stats";

const testSource: StatSource = { kind: "base", id: "test", label: "test" };

function conversion(
  from: DamageType,
  to: DamageType,
  percentage: number,
): DamageConversion {
  return { from, to, percentage, source: testSource };
}

describe("applyConversions", () => {
  it("converts 50% physical to fire correctly", () => {
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 0.50),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // 50 phys remains, 50 fire from phys
    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(50, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(50, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("handles full 100% conversion", () => {
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 1.0),
    ];

    const pool = applyConversions(baseDamage, conversions);

    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(0, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(100, 5);
  });

  it("simulates Avatar of Fire: 50% phys to fire gem + 50% phys to fire AoF", () => {
    // Two sources of 50% phys->fire conversion = 100% total
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 0.50),
      conversion(DamageType.Physical, DamageType.Fire, 0.50),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // All physical should be converted to fire
    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(0, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(100, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("caps total conversion from a type at 100%", () => {
    // 60% + 60% = 120% total conversion from phys — should cap at 100%
    // Each gets scaled: 60/120 = 50% each
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 0.60),
      conversion(DamageType.Physical, DamageType.Lightning, 0.60),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // Total conversion capped at 100%, each scaled proportionally
    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(0, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(50, 5);
    expect(getPoolDamage(pool, DamageType.Lightning)).toBeCloseTo(50, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("maintains conversion chain order: phys -> lightning -> fire", () => {
    // 50% phys to lightning, then 50% lightning to fire
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Lightning, 0.50),
      conversion(DamageType.Lightning, DamageType.Fire, 0.50),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // 50 phys remains
    // 50 phys -> lightning
    // 25 lightning -> fire (50% of 50)
    // 25 lightning remains
    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(50, 5);
    expect(getPoolDamage(pool, DamageType.Lightning)).toBeCloseTo(25, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(25, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("does nothing with no conversions", () => {
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 80],
      [DamageType.Fire, 20],
    ]);

    const pool = applyConversions(baseDamage, []);

    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(80, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(20, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("handles multiple damage types with partial conversion", () => {
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 60],
      [DamageType.Cold, 40],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 0.50),
      conversion(DamageType.Cold, DamageType.Fire, 0.50),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // 30 phys remains, 30 phys -> fire
    // 20 cold remains, 20 cold -> fire
    // total fire = 50
    expect(getPoolDamage(pool, DamageType.Physical)).toBeCloseTo(30, 5);
    expect(getPoolDamage(pool, DamageType.Cold)).toBeCloseTo(20, 5);
    expect(getPoolDamage(pool, DamageType.Fire)).toBeCloseTo(50, 5);
    expect(getPoolTotalDamage(pool)).toBeCloseTo(100, 5);
  });

  it("preserves origin type in the damage pool", () => {
    const baseDamage = new Map<DamageType, number>([
      [DamageType.Physical, 100],
    ]);
    const conversions = [
      conversion(DamageType.Physical, DamageType.Fire, 0.50),
    ];

    const pool = applyConversions(baseDamage, conversions);

    // The fire portion should track that it originated from physical
    const fireOrigins = pool.get(DamageType.Fire)!;
    expect(fireOrigins.get(DamageType.Physical)).toBeCloseTo(50, 5);
  });
});
