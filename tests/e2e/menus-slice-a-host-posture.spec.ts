import { test, expect } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * MENUS Slice A — semantic Host posture coverage (not full H matrix).
 */

test.describe.configure({ mode: 'serial' })

test('Start Game focuses Host; Back to setup returns; bare Host default stays play', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('host-chrome-mute')).toBeVisible()

  await page.getByTestId('tnsb-manual-team-1').or(page.locator('[data-testid^="tnsb-manual-"]').first()).waitFor({
    state: 'visible',
  }).catch(() => undefined)

  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  const count = await manuals.count()
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    await input.fill(`Team ${i + 1}`)
    await input.blur()
  }

  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  // Kitchen sink is not ordinary after Start (More closed).
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await expect(page.getByRole('heading', { name: /load a game/i })).toBeHidden()

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
})

test('incomplete-name Back to setup stays enabled in play posture', async ({ page }) => {
  // Bare Host defaults to play posture; with no game, chrome Back is absent.
  await page.goto('#/host')
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)

  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await page.getByRole('button', { name: /load category-board sample file/i }).click()
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)

  // Category-board sample has teams; bare Host stays play. Back must remain enabled
  // even when names are incomplete (L0).
  const back = page.getByTestId('setup-play')
  if (await back.count()) {
    await expect(back).toHaveText(/back to setup/i)
    await expect(back).toBeEnabled()
    await back.click()
    await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
    await expect(page.getByTestId('classroom-setup')).toBeVisible()
  }
})

test('Home has no ordinary Open classroom controls CTA', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
})
