import { test, expect } from '@playwright/test'
import { openHomeImport, expectClassSetup } from './helpers/menusQ2'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * Q2-B — Import → valid Game → Play → Class Setup (+ fail-closed invalid)
 * Matrix: HL-03 STRENGTHEN (Home surface). Do not mutate PR #110.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-B: Home valid JSON import → Play → Class Setup with ?play=', async ({ page }) => {
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({ id: 'q2-b-valid', title: 'Q2-B Valid Import', teamCount: 2 }),
  )

  await expect(page).toHaveURL(/[?&]play=/)
  await expectClassSetup(page)
  await expect(page.getByTestId('setup-row-buzzers')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
})

test('Q2-B: Home invalid JSON fail-closed — library unchanged', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  const heroTitle = (await page.getByTestId('home-hero-playable').innerText()).trim()

  await openHomeImport(page)
  await page.locator('#home-import-json').fill('{ not-valid-json')
  await page.getByTestId('home-import-json').click()

  await expect(page.getByTestId('import-salvage')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('import-salvage')).toContainText(/could not|failed|not|invalid|nothing/i)
  const dismiss = page.getByTestId('import-salvage-dismiss')
  if ((await dismiss.count()) > 0) {
    await dismiss.click()
  } else {
    await page.getByTestId('import-salvage-discard').click()
  }
  await expect(page.getByTestId('import-salvage')).toHaveCount(0)

  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await expect(page.getByTestId('home-hero-playable')).toContainText(heroTitle.slice(0, 8))
  await page.getByTestId('home-hero-play').click()
  await expectClassSetup(page)
})
