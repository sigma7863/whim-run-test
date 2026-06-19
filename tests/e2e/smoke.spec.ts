import { expect, test } from '@playwright/test';

test('renders the particle field with WebGL2 and no errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto('/');

  const canvas = page.locator('#scene');
  await expect(canvas).toBeVisible();

  const size = await canvas.evaluate((el) => ({
    w: (el as HTMLCanvasElement).width,
    h: (el as HTMLCanvasElement).height,
  }));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);

  const state = await page.evaluate(() => ({
    webgl2: document.createElement('canvas').getContext('webgl2') !== null,
    fallback: document.querySelector('.fallback') !== null,
  }));
  expect(state.webgl2).toBe(true);
  expect(state.fallback).toBe(false);

  // Let several simulation frames run, then assert a clean console.
  await page.waitForTimeout(3000);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
