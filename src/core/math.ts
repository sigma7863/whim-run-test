/** Small, pure math helpers — kept side-effect free so they can be unit tested. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Unit-length direction of the i-th point of a Fibonacci sphere — an even,
 * spiral distribution over the unit sphere. Used to seed particle home
 * positions. Deterministic for a given (index, count).
 */
export function fibonacciDirection(index: number, count: number): Vec3 {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const inclination = Math.acos(1 - (2 * (index + 0.5)) / count);
  const azimuth = golden * index;
  const sinI = Math.sin(inclination);
  return {
    x: sinI * Math.cos(azimuth),
    y: sinI * Math.sin(azimuth),
    z: Math.cos(inclination),
  };
}

/**
 * Frame-rate-independent exponential damping factor: multiply a velocity by
 * this each frame to decay it at `rate` per second regardless of `dt`.
 */
export function dampingFactor(rate: number, dt: number): number {
  return Math.exp(-rate * dt);
}
