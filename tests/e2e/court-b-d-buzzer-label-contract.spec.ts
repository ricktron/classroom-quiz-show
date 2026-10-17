import { test, expect, type Page } from '@playwright/test'
import { importDemoAndPlay, fillAllTeamNames } from './helpers/menusClassSetup'
import {
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  exposeGamepadAndExpectBuzzersStatus,
  openOptionalBuzzers,
} from './helpers/q7BuzzerTeacherJourney'
import { installWbuzzHardwareSimulator, pressWbuzzButton } from './helpers/simulatedWbuzzHardware'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * Court B repair D (CB-04) — one canonical buzzer label across teacher surfaces.
 *
 * Owner contract: individual handsets are "Buzzer 1".."Buzzer 4" everywhere a
 * teacher sees them (Class Setup, Buzzer Check, mapping, gameplay), e.g.
 * "Buzzer 2 · Red · Magma". Colours are named, never "Secondary action N".
 * Raw Gamepad/controller number and raw button index live only in Advanced.
 *
 * Fail-first on beeacd33: Buzzer Check printed "Red Rhyolites · Buzz ·
 * Controller 1 · button 6" for the handset the mapping list called "Controller 2".
 *
 * SIMULATED hardware (navigator.hid + getGamepads) — not physical evidence.
 */

const DEMO_TEAMS = ['Blue Basalts', 'Red Rhyolites'] as const
const RAW_IDENTITY = /Controller \d|button \d+|Secondary action/

/** Visible teacher text only (hidden/closed Advanced content is not rendered). */
async function ordinaryText(page: Page): Promise<string> {
  return page.locator('main').innerText()
}

test('CB-04: every handset keeps one "Buzzer N" identity from Buzzer Check to gameplay', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'simulated hardware journey runs once (1080p)')
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)

  const outcome = page.getByTestId('sbs-test-outcome')
  for (const slot of [1, 2, 3, 4] as const) {
    await pressWbuzzButton(page, buttonIndexForSlotColor(slot, 'red'))
    const team = DEMO_TEAMS[slot - 1] ?? 'no team yet'
    await expect(outcome).toHaveText(`Buzzer Check: Buzzer ${slot} · Red · ${team}`)
    await expect(page.getByTestId('sbs-controller-layer')).toHaveText(
      slot === 1 ? '1 buzzer responding' : `${slot} buzzers responding`,
    )
    expect(await ordinaryText(page)).not.toMatch(RAW_IDENTITY)
  }

  // Colours are named, and the same handset keeps its number.
  await pressWbuzzButton(page, buttonIndexForSlotColor(2, 'yellow'))
  await expect(outcome).toHaveText('Buzzer Check: Buzzer 2 · Yellow · Red Rhyolites')
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'blue'))
  await expect(outcome).toHaveText('Buzzer Check: Buzzer 1 · Blue · Blue Basalts')

  // Mapping uses the same identity for all four slots.
  for (const slot of [1, 2, 3] as const) {
    await expect(page.getByRole('combobox', { name: `Buzzer ${slot}`, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('combobox', { name: 'Buzzer 4 (optional fourth)' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: /^Controller/ })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Buzzer 2', exact: true })).toHaveValue(/.+/)
  await page.getByRole('button', { name: 'Save team mapping' }).click()
  expect(await ordinaryText(page)).not.toMatch(RAW_IDENTITY)

  // Raw identity is not deleted: it lives in Advanced diagnostics only.
  await page.getByRole('button', { name: 'Advanced diagnostics' }).first().click()
  await page.getByText('Advanced button capture').first().click()
  await expect(page.locator('main')).toContainText(/Controller 1/)
  await page.getByRole('button', { name: 'Hide advanced diagnostics' }).first().click()
  await page.getByText('Advanced button capture').first().click()

  // Gameplay: Buzzer 2 still buzzes for its team (mapping semantics unchanged).
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await page.getByRole('button', { name: 'Earth Structure, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('button', { name: 'Arm clue', exact: true }).click()
  await pressWbuzzButton(page, buttonIndexForSlotColor(2, 'red'))
  const queue = page.getByRole('heading', { name: 'Response queue' }).locator('..')
  await expect(queue).toContainText('Active team')
  await expect(queue).not.toContainText('Nobody has buzzed yet')
  expect(await ordinaryText(page)).not.toMatch(/Controller \d · button|Secondary action/)
})
