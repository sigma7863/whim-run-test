import { describe, expect, test } from 'bun:test';
import { dampingFactor, fibonacciDirection } from './math';

describe('fibonacciDirection', () => {
  test('returns unit vectors', () => {
    const count = 1000;
    for (const i of [0, 1, 250, 499, 999]) {
      const d = fibonacciDirection(i, count);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 5);
    }
  });

  test('is deterministic for the same inputs', () => {
    expect(fibonacciDirection(42, 1000)).toEqual(fibonacciDirection(42, 1000));
  });

  test('spreads points from the top to the bottom of the sphere', () => {
    const count = 1000;
    expect(fibonacciDirection(0, count).z).toBeGreaterThan(0.9);
    expect(fibonacciDirection(count - 1, count).z).toBeLessThan(-0.9);
  });
});

describe('dampingFactor', () => {
  test('is 1 when no time passes', () => {
    expect(dampingFactor(1.2, 0)).toBe(1);
  });

  test('decays into (0, 1) as time passes', () => {
    const f = dampingFactor(1.2, 1 / 60);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });

  test('decays faster over a longer step', () => {
    expect(dampingFactor(1.2, 0.1)).toBeLessThan(dampingFactor(1.2, 0.016));
  });
});
