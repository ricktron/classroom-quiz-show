import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import {
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  exposeGamepadAndExpectBuzzersStatus,
  openOptionalBuzzers,
  runFourHandsetRedCheck,
} from './helpers/q7BuzzerTeacherJourney'
import {
  exposeSimulatedWbuzzGamepad,
  installWbuzzHardwareSimulator,
  pressWbuzzButton,
} from './helpers/simulatedWbuzzHardware'
import { armAndStartTimer } from './helpers/menusQ3'
import { waitForSessionSaved } from './helpers/menusSession'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * CBN-1 (Court A/B recertification 2026-10-17): several Buzzers may belong to
 * one team. The supported-profile mapping is Buzzer slot → team, many-to-one.
 *
 * Natural route only: Home demo import → Play → buzzer setup through the
 * ordinary Class Setup controls → Save team mapping → Start Game → board
 * clues. No state injection; the receiver and handsets are the simulated
 * 054c:1000 hardware boundary (not physical evidence).
 */

type Slot = 1 | 2 | 3 | 4

async function setUpBuzzers(page: Page, assign: Partial<Record<Slot, string>>) {
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)
  await runFourHandsetRedCheck(page)
  for (const [slot, team] of Object.entries(assign)) {
    await page.getByLabel(slot === '4' ? 'Buzzer 4 (optional fourth)' : `Buzzer ${slot}`, { exact: true }).selectOption({
      label: team,
    })
  }
  await page.getByRole('button', { name: 'Save team mapping' }).click()
}

async function expectCheckLabel(page: Page, slot: Slot, label: string) {
  await pressWbuzzButton(page, buttonIndexForSlotColor(slot, 'red'))
  await expect(page.getByTestId('sbs-test-outcome')).toHaveText(
    `Buzzer Check: Buzzer ${slot} · Red · ${label}`,
    { timeout: 10_000 },
  )
}

async function startGameToBoard(page: Page) {
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
}

/** Open the first clue, show it, arm it, press one handset's RED, then read who buzzed. */
async function buzzOnFreshClue(page: Page, slot: Slot): Promise<string> {
  await page.locator('[data-testid^="cbh-tile-"]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await armAndStartTimer(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(slot, 'red'))
  await expect(page.getByTestId('lih-active')).not.toContainText(/Nobody has buzzed/i, {
    timeout: 10_000,
  })
  const who = (await page.getByTestId('lih-active').innerText()).trim()
  await page.getByRole('button', { name: 'Cancel and return to board' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  return who
}

test('CBN-1: Buzzers 1, 3 and 4 all buzz Team 1; Buzzer 2 buzzes Team 2; mapping survives reload', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
  test.setTimeout(120_000)
  await installWbuzzHardwareSimulator(page, 'ready', { persistGrantAcrossReload: true })
  await setUpBuzzers(page, { 3: 'Blue Basalts', 4: 'Blue Basalts' })

  // Truthful saved / ready state, and every Buzzer names its own team.
  await expect(page.getByTestId('sbs-mapping-layer')).toHaveText('Team mapping saved')
  await expect(page.getByTestId('sbs-teacher-summary')).toContainText('Buzzers ready')
  await expectCheckLabel(page, 1, 'Blue Basalts')
  await expectCheckLabel(page, 2, 'Red Rhyolites')
  await expectCheckLabel(page, 3, 'Blue Basalts')
  await expectCheckLabel(page, 4, 'Blue Basalts')

  await startGameToBoard(page)
  expect(await buzzOnFreshClue(page, 1)).toContain('Team 1')
  expect(await buzzOnFreshClue(page, 3)).toContain('Team 1')
  expect(await buzzOnFreshClue(page, 4)).toContain('Team 1')
  expect(await buzzOnFreshClue(page, 2)).toContain('Team 2')

  // Ordinary persistence route: the saved mapping comes back after Host reload.
  await waitForSessionSaved(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, {
    timeout: 10_000,
  })
  await exposeSimulatedWbuzzGamepad(page)
  expect(await buzzOnFreshClue(page, 4)).toContain('Team 1')
  expect(await buzzOnFreshClue(page, 3)).toContain('Team 1')
  expect(await buzzOnFreshClue(page, 2)).toContain('Team 2')
})

test('CBN-1: an unassigned Buzzer stays silent while a second Buzzer for a team still buzzes', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
  test.setTimeout(120_000)
  await installWbuzzHardwareSimulator(page, 'ready')
  await setUpBuzzers(page, { 4: 'Red Rhyolites' })
  await expect(page.getByTestId('sbs-mapping-layer')).toHaveText('Team mapping saved')
  await expectCheckLabel(page, 3, 'no team yet')
  await expectCheckLabel(page, 4, 'Red Rhyolites')

  await startGameToBoard(page)
  await page.locator('[data-testid^="cbh-tile-"]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await armAndStartTimer(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(3, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText(/Nobody has buzzed/i)
  await pressWbuzzButton(page, buttonIndexForSlotColor(4, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText('Team 2', { timeout: 10_000 })
})
