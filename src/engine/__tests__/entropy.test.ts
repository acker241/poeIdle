import { describe, it, expect } from "vitest";
import { createEntropyState, resolveEntropy } from "../utils/entropy";

describe("resolveEntropy", () => {
  it("50% chance produces alternating results", () => {
    let entropy = createEntropyState();
    const results: boolean[] = [];

    for (let i = 0; i < 10; i++) {
      const { success, newEntropy } = resolveEntropy(50, entropy);
      results.push(success);
      entropy = newEntropy;
    }

    // With 50% chance, every other check should succeed
    // First check: counter 0 + 50 = 50 < 100 => fail
    // Second check: counter 50 + 50 = 100 >= 100 => success, counter = 0
    // Pattern: fail, success, fail, success, ...
    expect(results).toEqual([false, true, false, true, false, true, false, true, false, true]);
  });

  it("100% chance always succeeds", () => {
    let entropy = createEntropyState();
    const results: boolean[] = [];

    for (let i = 0; i < 10; i++) {
      const { success, newEntropy } = resolveEntropy(100, entropy);
      results.push(success);
      entropy = newEntropy;
    }

    expect(results.every(r => r === true)).toBe(true);
  });

  it("0% chance always fails", () => {
    let entropy = createEntropyState();
    const results: boolean[] = [];

    for (let i = 0; i < 10; i++) {
      const { success, newEntropy } = resolveEntropy(0, entropy);
      results.push(success);
      entropy = newEntropy;
    }

    expect(results.every(r => r === false)).toBe(true);
  });

  it("25% chance succeeds once every 4 checks", () => {
    let entropy = createEntropyState();
    const results: boolean[] = [];

    for (let i = 0; i < 8; i++) {
      const { success, newEntropy } = resolveEntropy(25, entropy);
      results.push(success);
      entropy = newEntropy;
    }

    // counter: 0->25->50->75->100 (success, reset to 0) => fail, fail, fail, success
    expect(results).toEqual([false, false, false, true, false, false, false, true]);
  });

  it("75% chance succeeds 3 out of every 4 checks", () => {
    let entropy = createEntropyState();
    let successes = 0;
    const total = 20;

    for (let i = 0; i < total; i++) {
      const { success, newEntropy } = resolveEntropy(75, entropy);
      if (success) successes++;
      entropy = newEntropy;
    }

    // 75% of 20 = 15
    expect(successes).toBe(15);
  });

  it("starts with counter at 0", () => {
    const entropy = createEntropyState();
    expect(entropy.counter).toBe(0);
  });

  it("returns updated entropy state", () => {
    const entropy = createEntropyState();
    const { newEntropy } = resolveEntropy(30, entropy);
    expect(newEntropy.counter).toBe(30);
  });

  it("wraps counter on success", () => {
    const entropy = createEntropyState();
    // First: 0 + 60 = 60 (fail)
    const r1 = resolveEntropy(60, entropy);
    expect(r1.success).toBe(false);
    expect(r1.newEntropy.counter).toBe(60);

    // Second: 60 + 60 = 120 >= 100 (success), counter = 20
    const r2 = resolveEntropy(60, r1.newEntropy);
    expect(r2.success).toBe(true);
    expect(r2.newEntropy.counter).toBe(20);
  });
});
