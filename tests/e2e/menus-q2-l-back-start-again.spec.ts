import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * Q2-L — Back to setup → return to play (HG-02 STRENGTHEN).
 * Proves Start → Back → Start again → focused Host; names/Game preserved.
 * Does not invent Session events; stops at Host boundary (not Q3 board play).
 */

test.describe.configure({ mode: 'serial' })

test('Q2-L: Start → Back to setup → Start again preserves names and focused Host', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await waitForSessionSaved(page)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)

  // INTENT: Back to setup.
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-names-summary')).toContainText(/Team 1/)

  // CONTINUATION: Start again → focused Host; no invented ROUND_ADVANCED.
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
})
