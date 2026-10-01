import { test, expect } from '@playwright/test'
import { fillAllTeamNames } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'
import { menusBoardGameJson } from './helpers/menusGameJson'
import {
  createAbandonedDraftOnHome,
  expectClassSetup,
  importHomeJsonExpectSaved,
} from './helpers/menusQ2'

/**
 * Q2-C — Populated library / multi-game / draft coexistence under recovery.
 * Matrix: HL-11 NEW/STRENGTHEN; HL-06 partial.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-C: multi playable + draft + unfinished Session — Resume vs Play vs Continue', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await createAbandonedDraftOnHome(page)

  // Playable A (demo) — stay on Home.
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i, { timeout: 20_000 })
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()

  // Playable B (JSON) before any Session — avoids Host→Home lease follower race.
  await importHomeJsonExpectSaved(
    page,
    menusBoardGameJson({ id: 'q2-c-other', title: 'Q2-C Other Playable', teamCount: 2 }),
  )

  await expect(page.getByTestId('home-hero-playable')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: /your games/i })).toBeVisible()
  const library = page.locator('.home__library')
  await expect(library.getByRole('button', { name: /^play$/i }).first()).toBeVisible()
  await expect(library.getByText(/draft|needs content/i).first()).toBeVisible()
  await expect(library.getByRole('button', { name: /^edit$/i }).first()).toBeVisible()

  await page.getByTestId('home-hero-play').click()
  await expectClassSetup(page)
  await page.getByTestId('readiness-names').click()
  await page.locator('[data-testid^="tnsb-manual-"]').first().fill('Partial Name')
  await page.locator('[data-testid^="tnsb-manual-"]').first().blur()
  await waitForSessionSaved(page)

  await page.goto('./')
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('home-resume-session')).toBeVisible()
  await expect(page.getByTestId('home-discard-session')).toBeVisible()
  await expect(page.getByRole('heading', { name: /your games/i })).toBeVisible()
  await expect(library.getByText(/draft|needs content/i).first()).toBeVisible()

  await page.getByTestId('home-resume-session').click()
  await expectClassSetup(page)
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toHaveValue('Partial Name')
})

test('Q2-C: library Play of second game after Start fresh keeps draft identity', async ({
  page,
}) => {
  await createAbandonedDraftOnHome(page)

  await importHomeJsonExpectSaved(
    page,
    menusBoardGameJson({ id: 'q2-c-play-a', title: 'Q2-C Play A', teamCount: 2 }),
  )
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expectClassSetup(page)
  await fillAllTeamNames(page)
  await waitForSessionSaved(page)

  await page.getByTestId('host-change-game').click()
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('home-discard-session')).toBeVisible()
  await page.getByTestId('home-discard-session').click()
  await expect(page.getByTestId('home-discard-session')).toContainText(/confirm start fresh/i)
  await page.getByTestId('home-discard-session').click()
  await expect(page.getByTestId('home-resume')).toHaveCount(0)

  await page.getByTestId('home-hero-playable').locator('summary').click()
  await page.getByTestId('home-hero-playable').getByRole('button', { name: /^duplicate$/i }).click()
  await expect(page.getByTestId('home-status')).toContainText(/duplicated/i)
  await expect(page.locator('.home__library').getByText(/draft|needs content/i).first()).toBeVisible()
  await page.locator('.home__library').getByRole('button', { name: /^play$/i }).first().click()
  await expectClassSetup(page)
  await expect(page).toHaveURL(/[?&]play=/)
})
