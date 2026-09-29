/**
 * Browser-only Gamepad simulation for Playwright e2e.
 * Not physical Sony / Windows / projector qualification evidence.
 */

import type { Page } from '@playwright/test'

export type SimulatedGamepadPad = {
  readonly id: string
  readonly buttonCount: number
  readonly axes?: readonly number[]
  readonly mapping?: string
}

/**
 * Patch `navigator.getGamepads` before app code runs.
 * Installs `window.__cqsFakeGamepads` for later press/release helpers.
 */
export async function installSimulatedGamepad(
  page: Page,
  pad: SimulatedGamepadPad,
): Promise<void> {
  const axes = [...(pad.axes ?? [])]
  const mapping = pad.mapping ?? 'standard'
  await page.addInitScript(
    ({ id, buttonCount, axes: axisValues, mapping: map }) => {
      const state = {
        pads: [
          {
            index: 0,
            connected: true,
            mapping: map,
            id,
            buttons: Array.from({ length: buttonCount }, () => ({
              pressed: false,
              value: 0,
              touched: false,
            })),
            axes: axisValues,
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
    },
    {
      id: pad.id,
      buttonCount: pad.buttonCount,
      axes,
      mapping,
    },
  )
}

/** Namtai Wbuzz wireless candidate (`054c:1000`, 20-button topology). */
export async function installSimulatedSupportedWbuzz(page: Page): Promise<void> {
  await installSimulatedGamepad(page, {
    id: 'Vendor: 054c Product: 1000',
    buttonCount: 20,
    axes: [0, 0],
  })
}

/** Wait for Host Gamepad poll owner to observe simulated pad state via rAF. */
export async function settleGamepadPolls(page: Page, frames = 8): Promise<void> {
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
