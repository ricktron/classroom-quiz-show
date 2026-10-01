import { test, expect } from '@playwright/test'
import { q2MinimalPlayableJson } from './helpers/menusQ2'
import { importMenusJsonAndPlay } from './helpers/menusGameJson'

/**
 * Q2-B — Import → valid Game → Play → Class Setup (+ fail-closed invalid)
 * Matrix: HL-03 STRENGTHEN (Home surface). Host import-pipeline RETAIN separately.
 * Do not mutate PR #110.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-B: Home valid JSON import → Play → Class Setup with ?play=', async ({ page }) => {
  const json = q2MinimalPlayableJson('q2-b-valid', 'Q2-B Valid Import', 2)
  await importMenusJsonAndPlay(page, json)

  await expect(page).toHaveURL(/[?&]play=/)
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('setup-row-buzzers')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
})

test('Q2-B: Home invalid JSON fail-closed — library unchanged', async ({ page }) => {
  // BEFORE: one playable in library via demo.
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  const heroTitle = (await page.getByTestId('home-hero-playable').innerText()).trim()

  // INTENT/ACTION: paste malformed JSON on Home Import.
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill('{ not-valid-json')
  await page.getByTestId('home-import-json').click()

  // EFFECT: fail-closed salvage; no second playable invent.
  await expect(page.getByTestId('import-salvage')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('import-salvage')).toContainText(/could not|failed|not|invalid|nothing/i)
  await page.getByTestId('import-salvage-dismiss').click()
  await expect(page.getByTestId('import-salvage')).toHaveCount(0)

  // CONTINUATION: prior library game still Play-able.
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await expect(page.getByTestId('home-hero-playable')).toContainText(heroTitle.slice(0, 8))
  await page.getByTestId('home-hero-play').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
})
