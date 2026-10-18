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
 * FRC-3: visible Buzzer assignment state and the live gameplay mapping must
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

test('FRC-3: a Buzzer unassigned in the mapping UI stops buzzing at once, without a reload', async ({
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

test('FRC-3: a singular generic Clear refuses to unassign a team’s other Buzzers', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
  test.setTimeout(120_000)
  await installWbuzzHardwareSimulator(page, 'ready')
  await setUpBuzzers(page, { 3: 'Blue Basalts' })
  await expect(page.getByTestId('sbs-mapping-layer')).toHaveText('Team mapping saved')

  await startGameToBoard(page)

  // The generic per-team controls sit behind the "Controller assignments"
  // disclosure, the same way gamepad-input.spec.ts and
  // q7-r1-buzzer-certification-blockers.spec.ts reach them.
  const disclosure = page.getByTestId('gih-advanced-generic')
  if ((await disclosure.getAttribute('open')) === null) {
    await page.getByText('Controller assignments', { exact: true }).click()
  }

  // Each control expresses ONE button per team, so beside a shared mapping Clear
  // must fail closed and say where to change it, not silently drop the team's
  // other Buzzers.
  // The PER-TEAM Clear, by its own accessible name — not `gih-clear-all`, which
  // is a different, explicitly plural control.
  const clearShared = page
    .getByRole('button', { name: /^Clear the controller button for/ })
    .first()
  await clearShared.scrollIntoViewIfNeeded()
  await clearShared.click()
  const status = page.getByTestId('gih-capture-status')
  await expect(status).toContainText(/has 2 buzzers assigned/i)
  await expect(status).toContainText(/Buzzer setup/i)
  await expect(status).not.toContainText(/cleared/i)

  // Both of the team's Buzzers still buzz it.
  await page.locator('[data-testid^="cbh-tile-"]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await armAndStartTimer(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(3, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText('Team 1', { timeout: 10_000 })
})
