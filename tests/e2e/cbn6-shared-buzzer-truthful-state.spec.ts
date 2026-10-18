import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import {
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  exposeGamepadAndExpectBuzzersStatus,
  openOptionalBuzzers,
  runFourHandsetRedCheck,
} from './helpers/q7BuzzerTeacherJourney'
import { installWbuzzHardwareSimulator, pressWbuzzButton } from './helpers/simulatedWbuzzHardware'
import { armAndStartTimer } from './helpers/menusQ3'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * CBN-6: visible Buzzer assignment state and the live gameplay mapping must
 * agree IMMEDIATELY, and "ready" must mean the mapping can actually be used.
 *
 * A Buzzer the teacher has unassigned must not keep buzzing through a stale
 * live mapping until a reload. Natural route only, on the same simulated
 * 054c:1000 hardware boundary CBN-1 uses (not physical evidence).
 */

type Slot = 1 | 2 | 3 | 4

const slotLabel = (slot: Slot) =>
  slot === 4 ? 'Buzzer 4 (optional fourth)' : `Buzzer ${slot}`

async function setUpBuzzers(page: Page, assign: Partial<Record<Slot, string>>) {
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)
  await runFourHandsetRedCheck(page)
  for (const [slot, team] of Object.entries(assign)) {
    await page.getByLabel(slotLabel(Number(slot) as Slot), { exact: true }).selectOption({
      label: team,
    })
  }
  await page.getByRole('button', { name: 'Save team mapping' }).click()
}

async function startGameToBoard(page: Page) {
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
}

test('CBN-6: a Buzzer unassigned in the mapping UI stops buzzing at once, without a reload', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
  test.setTimeout(120_000)
  await installWbuzzHardwareSimulator(page, 'ready')
  // Two Buzzers on one team, the shared-team mapping CBN-1 established.
  await setUpBuzzers(page, { 3: 'Blue Basalts' })
  await expect(page.getByTestId('sbs-mapping-layer')).toHaveText('Team mapping saved')
  await expect(page.getByTestId('sbs-teacher-summary')).toContainText('Buzzers ready')

  // Once the mapping is ready the assignments collapse, so reopen them the way
  // a teacher would before changing a Buzzer.
  await page.getByTestId('sbs-toggle-advanced').click()
  await expect(page.getByTestId('sbs-ordinary-assignments')).toBeVisible()

  // Unassign every Buzzer through the ordinary mapping controls.
  for (const slot of [1, 2, 3, 4] as const) {
    await page.getByTestId(`sbs-slot-${slot}`).selectOption('')
  }
  // Readiness must stop claiming a mapping that now maps nothing.
  await expect(page.getByTestId('sbs-teacher-summary')).not.toContainText('Buzzers ready')

  await startGameToBoard(page)
  await page.locator('[data-testid^="cbh-tile-"]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await armAndStartTimer(page)

  // Nothing is assigned, so nothing may buzz — not the Buzzer that was shared,
  // and not the one that was assigned by default.
  await pressWbuzzButton(page, buttonIndexForSlotColor(3, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText(/Nobody has buzzed/i)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText(/Nobody has buzzed/i)
})

/*
  The generic per-team Assign/Clear refusal is NOT proved here. Those controls
  live in GamepadInputHostPanel, which Q7-R1 keeps out of the first gameplay
  viewport after Start, so they are not reachable on this natural route. They
  are covered instead by two mutation-proven component detectors against the
  real panel in src/host/GamepadInputHostPanel.test.tsx ("CBN-6a"). Recorded
  rather than papered over with an unnatural route.
*/
