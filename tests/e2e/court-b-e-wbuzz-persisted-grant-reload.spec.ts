import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import {
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  exposeGamepadAndExpectBuzzersStatus,
  openOptionalBuzzers,
} from './helpers/q7BuzzerTeacherJourney'
import {
  exposeSimulatedWbuzzGamepad,
  getHidSimSnapshot,
  installWbuzzHardwareSimulator,
  pressWbuzzButton,
} from './helpers/simulatedWbuzzHardware'
import { waitForSessionSaved } from './helpers/menusSession'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * Court B harness (CB-02): Host reload + Resume with a browser that KEEPS the
 * exact 054c:1000 WebHID grant. Proves CQS's own contract (ADR-019: restore the
 * granted receiver via getDevices() on mount, no permission prompt), truthful
 * readiness while the Gamepad is not yet exposed, and that the first RED
 * gameplay press after exposure buzzes in.
 *
 * SIMULATED (navigator.hid + getGamepads) — not physical Chrome/Sony evidence.
 * Whether real Chrome keeps the grant across reload is a Q7 physical item.
 */

test('CB-02 (simulated): reload + Resume restores the granted receiver; first RED press buzzes', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
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
  const status = page.getByRole('status').filter({ hasText: /Buzzers/ }).first()
  await expect(status).toContainText('Buzzers ready')
  // Reload only once the class session (mapping, names, round) is durably saved.
  await waitForSessionSaved(page)

  // Host reload + Resume. The Gamepad is NOT exposed yet (explicit sequencing).
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()

  // Automatic restoration of the supported receiver: no Connect click, no prompt.
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, {
    timeout: 10_000,
  })
  await expect
    .poll(async () => (await getHidSimSnapshot(page)).sendCalls.length, { timeout: 10_000 })
    .toBeGreaterThan(0)
  const afterReload = await getHidSimSnapshot(page)
  expect(afterReload.requestCalls).toBe(0)
  expect(afterReload.openCalls).toBeGreaterThan(0)
  expect(afterReload.violations).toEqual([])

  // Truthful readiness: with no handset seen since reload, CQS does not claim ready.
  await expect(status).not.toContainText('Buzzers ready')

  // First RED gameplay press after the Gamepad appears buzzes the mapped team.
  await page.getByRole('button', { name: 'Earth Structure, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('button', { name: 'Arm clue', exact: true }).click()
  await exposeSimulatedWbuzzGamepad(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(2, 'red'))
  const queue = page.getByRole('heading', { name: 'Response queue' }).locator('..')
  await expect(queue).not.toContainText('Nobody has buzzed yet')
  // Buzzer 2 is mapped to the second team (session name "Team 2" after fillAllTeamNames).
  await expect(queue).toContainText(/Active team\s*Team 2/)
  await expect(status).toContainText('Buzzers ready')
})
