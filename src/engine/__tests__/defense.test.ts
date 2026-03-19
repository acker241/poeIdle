import { describe, it, expect } from "vitest";
import { calculateArmourReduction, applyArmour } from "../defense/armour";
import {
  calculateEffectiveResistance,
  applyResistance,
  DEFAULT_RESISTANCE_CAP,
} from "../defense/resistances";

describe("calculateArmourReduction", () => {
  it("applies the PoE armour formula: armour / (armour + 5 * damage)", () => {
    // 100 armour vs 100 damage: 100 / (100 + 500) = 100/600 = ~0.1667
    const reduction = calculateArmourReduction(100, 100);
    expect(reduction).toBeCloseTo(1 / 6, 4);
  });

  it("caps reduction at 90%", () => {
    // Extremely high armour vs tiny damage
    const reduction = calculateArmourReduction(100000, 1);
    expect(reduction).toBe(0.90);
  });

  it("returns 0 for zero armour", () => {
    expect(calculateArmourReduction(0, 100)).toBe(0);
  });

  it("returns 0 for zero damage", () => {
    expect(calculateArmourReduction(100, 0)).toBe(0);
  });

  it("returns 0 for negative armour", () => {
    expect(calculateArmourReduction(-10, 100)).toBe(0);
  });

  it("is more effective against small hits", () => {
    const reductionSmall = calculateArmourReduction(500, 10);
    const reductionLarge = calculateArmourReduction(500, 200);
    expect(reductionSmall).toBeGreaterThan(reductionLarge);
  });
});

describe("applyArmour", () => {
  it("reduces physical damage according to armour formula", () => {
    // 100 armour, 100 damage => reduction ~16.67% => ~83.33 damage
    const result = applyArmour(100, 100);
    const expectedReduction = 100 / (100 + 500);
    expect(result).toBeCloseTo(100 * (1 - expectedReduction), 4);
  });

  it("never returns negative damage", () => {
    expect(applyArmour(1, 100000)).toBeGreaterThanOrEqual(0);
  });

  it("returns full damage with zero armour", () => {
    expect(applyArmour(100, 0)).toBe(100);
  });
});

describe("calculateEffectiveResistance", () => {
  it("caps resistance at the default cap (75%)", () => {
    const effective = calculateEffectiveResistance(0.90);
    expect(effective).toBe(DEFAULT_RESISTANCE_CAP);
  });

  it("does not cap resistance below the cap", () => {
    const effective = calculateEffectiveResistance(0.50);
    expect(effective).toBe(0.50);
  });

  it("applies penetration to reduce effective resistance", () => {
    const effective = calculateEffectiveResistance(0.75, 0.75, 0.20);
    // 0.75 capped at 0.75, minus 0.20 pen = 0.55
    expect(effective).toBeCloseTo(0.55, 5);
  });

  it("penetration can make effective resistance negative", () => {
    const effective = calculateEffectiveResistance(0.10, 0.75, 0.30);
    // 0.10 (below cap) - 0.30 = -0.20
    expect(effective).toBeCloseTo(-0.20, 5);
  });

  it("handles negative base resistance", () => {
    const effective = calculateEffectiveResistance(-0.20);
    // -0.20 is below cap, stays -0.20
    expect(effective).toBe(-0.20);
  });
});

describe("applyResistance", () => {
  it("reduces damage by effective resistance", () => {
    // 75% resistance => 25% of damage taken
    const result = applyResistance(100, 0.75);
    expect(result).toBeCloseTo(25, 5);
  });

  it("amplifies damage with negative resistance", () => {
    // -50% resistance => 150% of damage taken
    const result = applyResistance(100, -0.50);
    expect(result).toBeCloseTo(150, 5);
  });

  it("passes full damage with 0% resistance", () => {
    expect(applyResistance(100, 0)).toBe(100);
  });

  it("never returns negative damage", () => {
    // Even with very high resistance, damage floors at 0
    const result = applyResistance(100, 1.5);
    expect(result).toBe(0);
  });

  it("halves damage at 50% resistance", () => {
    expect(applyResistance(200, 0.50)).toBeCloseTo(100, 5);
  });
});
