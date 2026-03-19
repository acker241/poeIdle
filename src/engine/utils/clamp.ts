/** Clamp a value between min and max (inclusive) */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to N decimal places */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Linearly interpolate between min and max */
export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * clamp(t, 0, 1);
}
