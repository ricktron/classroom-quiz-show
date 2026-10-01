import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * Q2-H — Names keyboard-only class (no hardware) → Ready → Start enabled.
 * Matrix: CS-09 STRENGTHEN. CS-10 simulated Sony RETAIN in menus-slice-h-names-sim-sony.
 * PHYSICAL SONY NOT RUN.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-H: keyboard-only Names → Ready → Start Game enabled (no Sony path)', async ({
  page,
}) => {
  await importDemoAndPlay(page)

  // BEFORE: Buzzers-first; no supported receiver → no colour guidance.
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'buzzers')
  await page.getByTestId('setup-skip-buzzers').click()
  await expect(page.getByTestId('readiness-sony')).toContainText(/skipped/i)

  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)

  // INTENT/ACTION: keyboard fill all teams.
  await fillAllTeamNames(page)

  // EFFECT + CONTINUATION: Ready overview; Start sole dominant; still no colour claim UI.
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
  await expect(page.getByTestId('setup-sony-copy')).toHaveCount(0)
  await expect(page.locator('[data-testid^="tnsb-claimed-"]')).toHaveCount(0)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
})
