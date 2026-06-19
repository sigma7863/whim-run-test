import { expect, test } from 'bun:test';
import { prefersReducedMotion, supportsWebGL2 } from './capabilities';

// The bun test runtime has no DOM (`window`/`document` are undefined). These
// guards must therefore return false rather than throwing.
test('supportsWebGL2 returns false without a DOM', () => {
  expect(supportsWebGL2()).toBe(false);
});

test('prefersReducedMotion returns false without a DOM', () => {
  expect(prefersReducedMotion()).toBe(false);
});
