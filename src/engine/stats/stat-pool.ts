import type { StatId, StatModifier, StatSource, StatCondition } from "../types/stats";
import { ModifierType } from "../types/stats";

/**
 * Builder for accumulating StatModifiers from multiple sources.
 * Immutable: each method returns a new StatPool.
 */
export class StatPool {
  private constructor(
    private readonly _modifiers: readonly StatModifier[] = [],
  ) {}

  static create(): StatPool {
    return new StatPool([]);
  }

  static from(modifiers: readonly StatModifier[]): StatPool {
    return new StatPool(modifiers);
  }

  /** Add a single modifier */
  add(modifier: StatModifier): StatPool {
    return new StatPool([...this._modifiers, modifier]);
  }

  /** Add multiple modifiers */
  addAll(modifiers: readonly StatModifier[]): StatPool {
    if (modifiers.length === 0) return this;
    return new StatPool([...this._modifiers, ...modifiers]);
  }

  /** Convenience: add a flat modifier */
  addFlat(statId: StatId, value: number, source: StatSource, condition?: StatCondition): StatPool {
    return this.add({ statId, type: ModifierType.Flat, value, source, condition });
  }

  /** Convenience: add an increased modifier */
  addIncreased(statId: StatId, value: number, source: StatSource, condition?: StatCondition): StatPool {
    return this.add({ statId, type: ModifierType.Increased, value, source, condition });
  }

  /** Convenience: add a more modifier */
  addMore(statId: StatId, value: number, source: StatSource, condition?: StatCondition): StatPool {
    return this.add({ statId, type: ModifierType.More, value, source, condition });
  }

  /** Merge another pool into this one */
  merge(other: StatPool): StatPool {
    return this.addAll(other._modifiers);
  }

  /** Get all modifiers */
  get modifiers(): readonly StatModifier[] {
    return this._modifiers;
  }

  /** Get modifiers for a specific stat */
  forStat(statId: StatId): readonly StatModifier[] {
    return this._modifiers.filter(m => m.statId === statId);
  }

  /** Get all unique stat IDs in this pool */
  get statIds(): Set<StatId> {
    const ids = new Set<StatId>();
    for (const mod of this._modifiers) {
      ids.add(mod.statId);
    }
    return ids;
  }

  get size(): number {
    return this._modifiers.length;
  }
}
