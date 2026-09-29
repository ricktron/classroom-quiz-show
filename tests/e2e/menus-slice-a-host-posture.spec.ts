import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS Slice A — semantic Host posture coverage (not full H matrix).
 */

test.describe.configure({ mode: 'serial' })

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

test('Start Game focuses Host; Back to setup returns', async ({ page }) => {
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
  await expect(page.getByTestId('host-play-status')).toContainText(/Sound (muted|tested|not tested)/)
  await expect(page.getByTestId('host-play-status')).not.toContainText(/Sound ready|Sound not checked|Sound is ready/i)
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

test('H16 bare #/host default stays play with More open; Home does not advertise it', async ({
  page,
}) => {
  await page.goto('./#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('host-more')).toHaveAttribute('open')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)

  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
  await expect(page.locator('a[href*="#/host"]')).toHaveCount(0)
})

test('incomplete-name Back to setup stays enabled in play posture', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')

  // Return to setup and clear one name so Start is blocked — then enter play
  // with incomplete names via the same onPlay handler (L0: chrome Back never gated).
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await page.getByTestId('setup-revisit-names').click()
  await page.locator('[data-testid^="tnsb-reset-"]').first().click()
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  // Disabled Start still owns onPlay; invoke it directly so we reach play with
  // incomplete names without a Session/schema change.
  await page.getByTestId('setup-play').evaluate((el: HTMLButtonElement) => {
    const propsKey = Object.keys(el).find((key) => key.startsWith('__reactProps$'))
    const props = propsKey ? (el as unknown as Record<string, { onClick?: (event: Event) => void }>)[propsKey] : null
    if (!props?.onClick) throw new Error('setup-play React onClick missing')
    props.onClick(new MouseEvent('click', { bubbles: true, cancelable: true }))
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
  await page.getByRole('button', { name: /^advance to next round$/i }).click()
  await expect(page.getByTestId('event-history')).toContainText('ROUND_ADVANCED')
  await waitForSessionSaved(page)

  await resumeAfterReload(page)

  await ensureHostMoreOpen(page)
  await expect(page.getByTestId('event-history')).toContainText('ROUND_ADVANCED')
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
  await expect(page.getByTestId('setup-names-summary')).toContainText(/Team 1/)
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
})
