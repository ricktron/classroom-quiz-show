import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import {
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  exposeGamepadAndExpectBuzzersStatus,
  openOptionalBuzzers,
} from './helpers/q7BuzzerTeacherJourney'
import {
  exposeSimulatedWbuzzGamepad,
  installWbuzzHardwareSimulator,
  pressWbuzzButton,
} from './helpers/simulatedWbuzzHardware'
import { waitForSessionSaved } from './helpers/menusSession'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * Court B CB-02 resume notice (owner decision): if CQS knows buzzers were ready
 * before a reload/Resume and readiness has dropped, say so truthfully and
 * without blocking: "Buzzers need reconnecting; keyboard still works."
 *
 * The simulator's default mode does not keep the WebHID grant across reload,
 * which is exactly the "readiness dropped" case. SIMULATED only: whether real
 * Chrome keeps the grant is a Q7 physical item.
 *
 * Fail-first on 9417464: the status line silently fell back to
 * "Buzzers optional · keyboard works".
 */

const NOTICE = 'Buzzers need reconnecting; keyboard still works.'
const statusLine = (page: Page) => page.getByRole('status').filter({ hasText: /Buzzers/ }).first()

test.beforeEach(({ page }, info) => {
  void page
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
})

test('CB-02: readiness lost across reload + Resume shows the reconnect notice; reconnecting clears it', async ({
  page,
}) => {
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)
  for (const slot of [1, 2] as const) await pressWbuzzButton(page, buttonIndexForSlotColor(slot, 'red'))
  await page.getByRole('button', { name: 'Save team mapping' }).click()
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(statusLine(page)).toContainText('Buzzers ready')
  await expect(statusLine(page)).not.toContainText(NOTICE)

  // Reload only once the class session is durably saved (as a teacher would).
  await waitForSessionSaved(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(statusLine(page)).toContainText(NOTICE)
  // Non-blocking: play continues from the keyboard while the notice shows.
  await page.getByRole('button', { name: 'Earth Structure, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await expect(statusLine(page)).toContainText(NOTICE)

  // The teacher reconnects; once a handset is seen again the notice clears.
  await page.getByRole('button', { name: 'Connect buzzers' }).first().click()
  await exposeSimulatedWbuzzGamepad(page)
  await page.getByRole('button', { name: 'Arm clue', exact: true }).click()
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(statusLine(page)).toContainText('Buzzers ready')
  await expect(statusLine(page)).not.toContainText(NOTICE)
})

test('CB-02: a keyboard-only class never shows the reconnect notice after reload', async ({ page }) => {
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await waitForSessionSaved(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(statusLine(page)).toContainText('Buzzers optional')
  await expect(statusLine(page)).not.toContainText(NOTICE)
})

test('CB-02: a receiver restored from a kept grant is not reported as needing reconnection', async ({
  page,
}) => {
  // The browser keeps the exact 054c:1000 grant (SIMULATED), so CQS restores the
  // receiver itself after reload; it only waits for a first press. Nothing needs
  // reconnecting, so the notice must not claim otherwise.
  await installWbuzzHardwareSimulator(page, 'ready', { persistGrantAcrossReload: true })
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)
  for (const slot of [1, 2] as const) await pressWbuzzButton(page, buttonIndexForSlotColor(slot, 'red'))
  await page.getByRole('button', { name: 'Save team mapping' }).click()
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(statusLine(page)).toContainText('Buzzers ready')
  await waitForSessionSaved(page)

  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, { timeout: 10_000 })
  await expect(statusLine(page)).not.toContainText('Buzzers ready')
  await expect(statusLine(page)).not.toContainText(NOTICE)

  // The first press restores readiness; still no notice.
  await page.getByRole('button', { name: 'Earth Structure, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('button', { name: 'Arm clue', exact: true }).click()
  await exposeSimulatedWbuzzGamepad(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(statusLine(page)).toContainText('Buzzers ready')
  await expect(statusLine(page)).not.toContainText(NOTICE)
})
