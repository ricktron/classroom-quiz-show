import { expect, type Page } from '@playwright/test'

/**
 * Shared MENUS Class Setup e2e helpers (Slice A / B+F).
 * Kept here so readiness, posture, and viewport specs do not triplicate journey glue.
 */

export async function importDemoAndPlay(page: Page): Promise<void> {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

async function ensureNamesManualsVisible(page: Page) {
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  // I-REPAIR-1: ordinary Class Setup may open Buzzers first; open Names when needed.
  if ((await manuals.count()) === 0) {
    await page.getByTestId('readiness-names').click()
  } else if (!(await manuals.first().isVisible())) {
    await page.getByTestId('readiness-names').click()
  }
  await manuals.first().waitFor({ state: 'visible' })
  return manuals
}

export async function fillAllTeamNames(page: Page): Promise<void> {
  const manuals = await ensureNamesManualsVisible(page)
  const count = await manuals.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    await input.fill(`Team ${i + 1}`)
    await input.blur()
  }
}

/** Fill only blank name fields (preserves already-entered names). */
export async function fillEmptyTeamNames(page: Page): Promise<void> {
  const manuals = await ensureNamesManualsVisible(page)
  const count = await manuals.count()
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    if (!(await input.inputValue()).trim()) {
      await input.fill(`Team ${i + 1}`)
      await input.blur()
    }
  }
}

export async function importDemoToReady(page: Page): Promise<void> {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
}
