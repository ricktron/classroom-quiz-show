import { test, expect } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import {
  installSimulatedSupportedWbuzz,
  pressSimulatedGamepadButton,
  settleGamepadPolls,
} from './helpers/simulatedGamepad'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * MENUS Slice H / Q1 — H8 Names / simulated supported-profile Gamepad via authentic ?play=.
 *
 * SIMULATED evidence only. Not physical Sony / Windows / projector qualification.
 *
 * Q1-C strengthens colour-button naming via the authentic Gamepad poll path
 * (reuse simulatedGamepad helpers — same owner as production). Colour claim
 * requires a Game-owned name bank; seed it via Class Setup → Game settings.
 */

test.describe.configure({ mode: 'serial' })

test('H8 SIMULATED: colour-button naming via authentic Gamepad; keyboard remains; one detector', async ({
  page,
}) => {
  await installSimulatedSupportedWbuzz(page)
  await importDemoAndPlay(page)
  await settleGamepadPolls(page, 12)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page).toHaveURL(/[?&]play=/)

  // Seed Game-owned name bank so colour claims have candidates (demo bank is empty).
  await page.getByTestId('readiness-teams').click()
  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await page.getByTestId('team-name-bank').fill(
    ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].join('\n'),
  )
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })

  await page.getByTestId('readiness-names').click()

  // Colour-button guidance appears only when supported profile is present.
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('setup-sony-copy')).toContainText(
    /Blue, Orange, Green, or Yellow/i,
  )
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/keyboard always works/i)
  // Valid teams → no stale Fix on Names.
  await expect(page.getByTestId('setup-names-blocked-copy')).toHaveCount(0)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)

  // BEFORE: bank choices visible; no claimed name yet.
  const firstTeam = page.locator('[data-testid^="tnsb-team-"]').first()
  await expect(firstTeam).toBeVisible()
  const firstTeamId = (await firstTeam.getAttribute('data-testid'))?.replace('tnsb-team-', '') ?? ''
  expect(firstTeamId.length).toBeGreaterThan(0)
  await expect(page.getByTestId(`tnsb-choice-${firstTeamId}-3`)).not.toHaveText('—')
  await expect(page.getByTestId(`tnsb-claimed-${firstTeamId}`)).toHaveCount(0)

  // INTENT/ACTION: simulated colour-button claim via authentic Gamepad path.
  // Slot 1 / first team → blue (secondary1 → claim choiceIndex 3).
  await settleGamepadPolls(page, 12)
  await pressSimulatedGamepadButton(page, buttonIndexForSlotColor(1, 'blue'))

  // EFFECT: teacher-visible claimed name on the Names board.
  await expect(page.getByTestId(`tnsb-claimed-${firstTeamId}`)).toBeVisible({ timeout: 10_000 })

  // Keyboard/manual path remains operable for another team (before Ready compact).
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  await expect(manuals).toHaveCount(2)
  const secondManual = manuals.nth(1)
  await expect(secondManual).toBeVisible()
  await secondManual.fill('Sim Keyboard Name')
  await expect(secondManual).toHaveValue('Sim Keyboard Name')
  await secondManual.blur()
  // Both named → Ready overview; keyboard path proved by durable fill above.
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible({ timeout: 10_000 })

  // Single detector owner on the authentic ?play= path.
  await expect(page.getByTestId('gih-summary')).toHaveCount(1)
  await expect(page.getByTestId('sbs-supported-profile')).toHaveCount(1)
  await expect(page.locator('[data-testid="gih-summary"]')).toHaveCount(1)
})

test('H8 without receiver: authentic ?play= Names stays keyboard-only (no colour wording)', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toBeVisible()
})
