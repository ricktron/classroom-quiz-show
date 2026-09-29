import { test, expect, type Page } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS Slice H — H8 Names / simulated supported-profile Gamepad via authentic ?play=.
 *
 * SIMULATED evidence only. Not physical Sony / Windows / projector qualification.
 */

test.describe.configure({ mode: 'serial' })

/**
 * Install a Namtai Wbuzz wireless candidate (`054c:1000`, 20-button topology)
 * before app code runs. Mirrors gamepad-input.spec.ts instrumentation style.
 */
async function installSimulatedSupportedWbuzz(page: Page) {
  await page.addInitScript(() => {
    const state = {
      pads: [
        {
          index: 0,
          connected: true,
          mapping: 'standard',
          id: 'Vendor: 054c Product: 1000',
          buttons: Array.from({ length: 20 }, () => ({
            pressed: false,
            value: 0,
            touched: false,
          })),
          axes: [0, 0] as number[],
          timestamp: 0,
        },
      ],
    }
    ;(window as unknown as { __cqsFakeGamepads?: typeof state }).__cqsFakeGamepads = state

    const nav = navigator as Navigator & { getGamepads?: () => readonly Gamepad[] | null[] }
    nav.getGamepads = function patched() {
      state.pads[0].timestamp = performance.now()
      return state.pads as unknown as Gamepad[]
    }
  })
}

async function settleGamepadPolls(page: Page, frames = 12): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let remaining = count
        const tick = () => {
          remaining -= 1
          if (remaining <= 0) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    frames,
  )
}

test('H8 SIMULATED: ?play= Names shows colour wording with supported Wbuzz; keyboard remains; one detector', async ({
  page,
}) => {
  await installSimulatedSupportedWbuzz(page)
  await importDemoAndPlay(page)
  await settleGamepadPolls(page)

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

  // Single detector owner on the authentic ?play= path (no second Sony surface).
  await expect(page.getByTestId('gih-summary')).toHaveCount(1)
  await expect(page.getByTestId('sbs-supported-profile')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: /^buzzers$/i })).toHaveCount(1)
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
