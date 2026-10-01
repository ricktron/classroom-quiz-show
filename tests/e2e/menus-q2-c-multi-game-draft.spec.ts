import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'
import { menusBoardGameJson, importMenusJsonAndPlay } from './helpers/menusGameJson'

/**
 * Q2-C — Populated library / multi-game / draft coexistence under recovery.
 * Matrix: HL-11 NEW/STRENGTHEN; HL-06 partial.
 */

test.describe.configure({ mode: 'serial' })

async function returnHomeFromAuthoring(page: Page): Promise<void> {
  await page.getByTestId('authoring-home').click()
  const discard = page.getByRole('button', { name: /discard unsaved changes/i })
  if (await discard.isVisible().catch(() => false)) {
    await discard.click()
  }
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
}

test('Q2-C: multi playable + draft + unfinished Session — Resume vs Play vs Continue', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })

  // Draft (unfinished) via New Game abandon.
  await page.goto('./')
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await returnHomeFromAuthoring(page)

  // Playable A (demo) + start Class Setup names (unfinished Session).
  await importDemoAndPlay(page)
  await page.getByTestId('readiness-names').click()
  await page.locator('[data-testid^="tnsb-manual-"]').first().fill('Partial Name')
  await page.locator('[data-testid^="tnsb-manual-"]').first().blur()
  await waitForSessionSaved(page)

  // Leave to Home with unfinished Session.
  await page.goto('./')
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 20_000 })

  // Second playable via JSON import (different id) while recovery present.
  await page.getByTestId('home-import-game').click()
  const other = menusBoardGameJson({
    id: 'q2-c-other',
    title: 'Q2-C Other Playable',
    teamCount: 2,
  })
  await page.locator('#home-import-json').fill(other)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible({ timeout: 15_000 })
  // Stay on Home (do not Play yet) — dismiss by navigating status.
  await expect(page.getByTestId('home-status')).toContainText(/saved|imported|ready/i)

  // BEFORE/EFFECT: Resume dominates unfinished Session; library still truthful.
  await expect(page.getByTestId('home-resume')).toBeVisible()
  await expect(page.getByTestId('home-start-fresh')).toBeVisible()
  await expect(page.getByRole('heading', { name: /your games/i })).toBeVisible()
  // Draft still Edit/Continue — not fake Play on unfinished-only cards.
  const library = page.locator('.home__library')
  await expect(library.getByText(/draft|needs content/i).first()).toBeVisible()
  await expect(library.getByRole('button', { name: /^edit$/i }).first()).toBeVisible()

  // CONTINUATION: Resume returns Class Setup; partial name preserved on Names.
  await page.getByTestId('home-resume-session').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toHaveValue('Partial Name')
})

test('Q2-C: library Play of second game after Start fresh keeps draft identity', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByTestId('home-new-game').click()
  await returnHomeFromAuthoring(page)

  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({ id: 'q2-c-play-a', title: 'Q2-C Play A', teamCount: 2 }),
  )
  await fillAllTeamNames(page)
  await waitForSessionSaved(page)
  await page.goto('./')
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('home-discard-session')).toBeVisible()
  await page.getByTestId('home-discard-session').click()
  await expect(page.getByTestId('home-discard-session')).toContainText(/confirm start fresh/i)
  await page.getByTestId('home-discard-session').click()
  await expect(page.getByTestId('home-resume')).toHaveCount(0)

  // Duplicate to create second playable; draft still present.
  await page.getByTestId('home-hero-playable').locator('summary').click()
  await page.getByTestId('home-hero-playable').getByRole('button', { name: /^duplicate$/i }).click()
  await expect(page.getByTestId('home-status')).toContainText(/duplicated/i)
  await expect(page.locator('.home__library').getByText(/draft|needs content/i).first()).toBeVisible()
  await page.locator('.home__library').getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/[?&]play=/)
})
