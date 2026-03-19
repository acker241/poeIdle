// Shared primitive types used across the engine

/** A percentage expressed as a decimal (0.20 = 20%) */
export type Percentage = number;

/** Duration in milliseconds */
export type DurationMs = number;

/** A numeric range with min and max */
export interface NumericRange {
  readonly min: number;
  readonly max: number;
}
