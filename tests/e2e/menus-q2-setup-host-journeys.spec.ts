import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * Q2 host/setup journeys sharing Class Setup entry glue (H / I / L).
 * Keyboard Names, Sound Test, Back→Start again — stop at focused Host (not Q3).
 */

test.describe.configure({ mode: 'serial' })

test('Q2-H: keyboard-only Names → Ready → Start Game enabled (no Sony path)', async ({
  page,
}) => {
  await importDemoAndPlay(page)

  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'buzzers')
  await page.getByTestId('setup-skip-buzzers').click()
  await expect(page.getByTestId('readiness-sony')).toContainText(/skipped/i)

  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)

  await fillAllTeamNames(page)

  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
  await expect(page.getByTestId('setup-sony-copy')).toHaveCount(0)
  await expect(page.locator('[data-testid^="tnsb-claimed-"]')).toHaveCount(0)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
})

test('Q2-I: Class Setup Test sound → Sound tested fact; Start remains enabled', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  await page.getByTestId('readiness-audio').click()
  await expect(page.getByTestId('setup-sound-task')).toBeVisible()
  await expect(page.getByTestId('setup-sound-fact')).toContainText(/not tested|muted/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  await page.getByTestId('setup-audio-test').click()
  await expect(page.getByTestId('setup-sound-fact')).toContainText(/Sound tested/i, {
    timeout: 15_000,
  })
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  await page.getByTestId('setup-back-to-ready').click()
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('host-play-status')).toContainText(/Sound tested/i)
})

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

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-names-summary')).toContainText(/Team 1/)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
})
