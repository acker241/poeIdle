/**
 * Seeded pseudo-random number generator (mulberry32).
 * Deterministic: same seed always produces same sequence.
 * Used for reproducible combat simulation and testing.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] (inclusive) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max] */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Returns true with the given probability (0-1) */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a random value from a NumericRange */
  rollRange(min: number, max: number): number {
    if (min === max) return min;
    return this.nextFloat(min, max);
  }

  /** Get current state for serialization */
  getState(): number {
    return this.state;
  }

  /** Create from saved state */
  static fromState(state: number): SeededRng {
    const rng = new SeededRng(0);
    rng.state = state;
    return rng;
  }
}
