import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * Q2-I — Ready / optionals / Sound Test semantic (CS-12 STRENGTHEN).
 * Display optional RETAIN via menus-bf-readiness. Stops before Q3 gameplay spine.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-I: Class Setup Test sound → Sound tested fact; Start remains enabled', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  // BEFORE: Sound optional / not tested.
  await page.getByTestId('readiness-audio').click()
  await expect(page.getByTestId('setup-sound-task')).toBeVisible()
  await expect(page.getByTestId('setup-sound-fact')).toContainText(/not tested/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  // INTENT/ACTION: Test sound.
  await page.getByTestId('setup-audio-test').click()

  // EFFECT: teacher-visible Sound tested.
  await expect(page.getByTestId('setup-sound-fact')).toContainText(/tested/i)
  await expect(page.getByTestId('setup-play')).toBeEnabled()

  // CONTINUATION: back to Ready → Start → focused Host shows tested.
  await page.getByTestId('setup-back-to-ready').click()
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('host-play-status')).toContainText(/Sound tested/i)
})
