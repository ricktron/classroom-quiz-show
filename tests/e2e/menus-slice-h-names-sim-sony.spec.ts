import { test, expect } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import {
  installSimulatedSupportedWbuzz,
  settleGamepadPolls,
} from './helpers/simulatedGamepad'

/**
 * MENUS Slice H — H8 Names / simulated supported-profile Gamepad via authentic ?play=.
 *
 * SIMULATED evidence only. Not physical Sony / Windows / projector qualification.
 */

test.describe.configure({ mode: 'serial' })

test('H8 SIMULATED: ?play= Names shows colour wording with supported Wbuzz; keyboard remains; one detector', async ({
  page,
}) => {
  await installSimulatedSupportedWbuzz(page)
  await importDemoAndPlay(page)
  await settleGamepadPolls(page, 12)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page).toHaveURL(/[?&]play=/)

  // Colour-button guidance appears only when supported profile is present.
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('setup-sony-copy')).toContainText(
    /Blue, Orange, Green, or Yellow/i,
  )
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/keyboard always works/i)

  // Keyboard/manual path remains operable.
  const firstManual = page.locator('[data-testid^="tnsb-manual-"]').first()
  await expect(firstManual).toBeVisible()
  await firstManual.fill('Sim Keyboard Name')
  await firstManual.blur()
  await expect(firstManual).toHaveValue('Sim Keyboard Name')

  // Single detector owner on the authentic ?play= path (one Gamepad panel /
  // one supported-profile section — not a second independent Sony surface).
  await expect(page.getByTestId('gih-summary')).toHaveCount(1)
  await expect(page.getByTestId('sbs-supported-profile')).toHaveCount(1)
  await expect(page.locator('[data-testid="gih-summary"]')).toHaveCount(1)
})

test('H8 without receiver: authentic ?play= Names stays keyboard-only (no colour wording)', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toBeVisible()
})
