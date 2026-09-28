import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * MENUS Slice A — semantic Host posture coverage (not full H matrix).
 */

test.describe.configure({ mode: 'serial' })

async function importDemoAndPlay(page: Page): Promise<void> {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

async function fillAllTeamNames(page: Page): Promise<void> {
  await page
    .getByTestId('tnsb-manual-team-1')
    .or(page.locator('[data-testid^="tnsb-manual-"]').first())
    .waitFor({ state: 'visible' })
    .catch(() => undefined)

  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  const count = await manuals.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    await input.fill(`Team ${i + 1}`)
    await input.blur()
  }
}

async function waitForSessionSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|saved locally|ready/i,
  )
}

async function resumeAfterReload(page: Page): Promise<void> {
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  await page.getByTestId('persistence-resume').click()
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
}

test('Start Game focuses Host; Back to setup returns; bare Host default stays play', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('host-chrome-mute')).toBeVisible()

  // Ordinary ?play= preparation: More closed; kitchen-sink not ordinary.
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await expect(page.getByRole('heading', { name: /load a game/i })).toBeHidden()
  await expect(page.getByRole('group', { name: 'Theme' })).toBeHidden()

  await fillAllTeamNames(page)

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
  // Back to setup keeps More closed unless the teacher opened it.
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
})

test('incomplete-name Back to setup stays enabled in play posture', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')

  // Return to setup and clear one name so Start is blocked — then enter play
  // with incomplete names via the same onPlay path (L0: chrome Back never gated).
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  const firstName = page.locator('[data-testid^="tnsb-manual-"]').first()
  await firstName.fill('')
  await firstName.blur()
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  await page.getByTestId('setup-play').evaluate((el: HTMLButtonElement) => {
    el.disabled = false
    el.click()
  })

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('host-play-status')).toContainText(/names incomplete/i)
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)

  const back = page.getByTestId('setup-play')
  await expect(back).toHaveCount(1)
  await expect(back).toHaveText(/back to setup/i)
  await expect(back).toBeEnabled()
  await back.click()

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByRole('heading', { name: /class setup/i })).toBeVisible()
})

test('Home has no ordinary Open classroom controls CTA', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
})

test('hydration A: mid-setup refresh Resume lands setup', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await waitForSessionSaved(page)
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')

  await resumeAfterReload(page)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
})

test('hydration B: Start + gameplay Resume lands play', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')

  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /advance to next round/i }).click()
  await waitForSessionSaved(page)

  await resumeAfterReload(page)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
})

test('hydration C: Start without gameplay Resume lands residual setup', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await waitForSessionSaved(page)

  await resumeAfterReload(page)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
})

test('hydration D: Back to setup keeps Session', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')

  await ensureHostMoreOpen(page)
  const title = (await page.getByTestId('game-title').innerText()).trim()
  expect(title.length).toBeGreaterThan(0)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()

  await ensureHostMoreOpen(page)
  await expect(page.getByTestId('game-title')).toHaveText(title)
  await expect(page.getByTestId('game-lifecycle')).not.toHaveText(/ended/i)
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toHaveValue(/Team /)
})
