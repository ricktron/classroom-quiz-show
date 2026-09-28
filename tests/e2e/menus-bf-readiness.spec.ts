import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS B+F — Ready workspace + sole-dominant Start Game (minimum semantic journey).
 * Does not replace Slice A posture e2e; pairs with it.
 */

test.describe.configure({ mode: 'serial' })

test('Ready with optionals unresolved keeps Start Game sole dominant then enters focused Host', async ({
  page,
}) => {
  await importDemoAndPlay(page)

  for (const id of ['teams', 'names', 'buzzers', 'display', 'sound'] as const) {
    await expect(page.getByTestId(`setup-row-${id}`)).toBeVisible()
  }
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('readiness-names')).toContainText(/needs attention/i)

  await fillAllTeamNames(page)

  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-ready-heading')).toContainText(/ready/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'play')
  await expect(page.getByTestId('setup-buzzers-task')).toHaveCount(0)
  await expect(page.getByTestId('setup-display-task')).toHaveCount(0)
  await expect(page.getByTestId('setup-sound-task')).toHaveCount(0)
  await expect(page.getByTestId('setup-open-display-secondary')).toBeVisible()
  await expect(page.getByTestId('readiness-sony')).toContainText(/optional/i)
  await expect(page.getByTestId('readiness-display')).not.toContainText(/needs attention/i)
  await expect(page.getByTestId('readiness-audio')).toContainText(/muted|tested|not tested|optional|complete/i)
  await expect(page.getByTestId('readiness-audio')).not.toContainText(/sound is ready/i)

  const body = await page.locator('[data-testid="classroom-setup"]').innerText()
  expect(body).not.toMatch(/Display ready/i)
  expect(body).not.toMatch(/Sound is ready/i)
  expect(body).not.toMatch(/\bCurrent\b/)

  const popupPromise = page.context().waitForEvent('page')
  await page.getByTestId('setup-open-display-secondary').click()
  const popup = await popupPromise
  await popup.close()
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  await page.getByTestId('readiness-sony').click()
  await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
  await expect(page.getByTestId('setup-optional-tag')).toContainText(/optional/i)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  await page.getByTestId('readiness-display').click()
  await expect(page.getByTestId('setup-display-task')).toBeVisible()
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
  const expandedDisplay = page.getByTestId('setup-open-display')
  await expect(expandedDisplay).toBeVisible()
  await expect(expandedDisplay).toHaveClass(/btn--secondary/)

  await page.getByTestId('setup-skip-buzzers').click()
  await expect(page.getByTestId('readiness-sony')).toContainText(/skipped/i)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')

  const playStatus = await page.getByTestId('host-play-status').innerText()
  expect(playStatus).toMatch(/Sound (muted|tested|not tested)/)
  expect(playStatus).not.toMatch(/Sound ready|Sound not checked|Sound is ready/i)
})
