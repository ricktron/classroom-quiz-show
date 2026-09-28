import { test, expect } from '@playwright/test'

/**
 * S04A teacher Home / import / authoring reachability against the served
 * production preview build.
 */

test('Home can import the demo game and open it for edit', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await page.getByTestId('home-import-game').click()
  await page.getByRole('button', { name: /import demo game/i }).click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await page.getByTestId('home-hero-edit').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByTestId('authoring-save-status')).toBeVisible()
  await expect(page.getByTestId('authoring-goal')).toBeVisible()
  await expect(page.getByRole('button', { name: /preview board/i })).toBeVisible()
  await expect(page.getByTestId('authoring-game-settings')).not.toHaveAttribute('open')
})

test('Host play surface remains reachable via direct Host URL', async ({ page }) => {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('host-more')).toBeVisible()
  await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
})
