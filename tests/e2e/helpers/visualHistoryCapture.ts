/**
 * Playwright helpers for the S05 visual historian capture run.
 * Writes PNGs under docs/design/history/2026-09-s05-complete/screenshots/.
 */

import { expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PublicState } from '../../../src/state/publicState'
import { injectPublicState, openDisplay } from './displayPublicState'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const VISUAL_HISTORY_ROOT = path.resolve(
  HERE,
  '../../../docs/design/history/2026-09-s05-complete/screenshots',
)

export type DisplayCaptureShot = {
  readonly folder: string
  readonly basename: string
  /** Null keeps the fail-closed waiting Display (no host publish). */
  readonly state: PublicState | null
  readonly theme?: 'default' | 'high-contrast'
  readonly reducedMotion?: boolean
  readonly waitForTestId?: string
}


/** Stabilize fonts/animations before historical screenshot. */
export async function prepareDeterministicCapture(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  })
}

export async function captureDisplayState(page: Page, options: DisplayCaptureShot) {
  if (options.reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  if (options.state === null) {
    // Hash SPA navigation alone does not remount Display; leave and reload so
    // BroadcastChannel memory and React public-state hooks reset to waiting.
    await page.goto('./')
    await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
    await openDisplay(page, options.theme)
    await page.reload()
    await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  } else {
    await openDisplay(page, options.theme)
  }
  await prepareDeterministicCapture(page)
  if (options.state !== null) {
    await injectPublicState(page, options.state)
  }
  if (options.waitForTestId) {
    await expect(page.getByTestId(options.waitForTestId)).toBeVisible({ timeout: 15_000 })
  } else {
    await expect(page.getByTestId('audience-shell')).toBeVisible({ timeout: 15_000 })
  }
  // Allow one paint after state injection / theme apply.
  await page.waitForTimeout(150)
  const out = path.join(VISUAL_HISTORY_ROOT, options.folder, options.basename)
  await page.screenshot({ path: out, fullPage: false })
  return out
}

export async function capturePage(
  page: Page,
  options: {
    readonly folder: string
    readonly basename: string
    readonly waitFor: () => Promise<void>
    /** Optional locator to scroll into view before the shot (Host long pages). */
    readonly scrollTestId?: string
  },
) {
  await prepareDeterministicCapture(page)
  await options.waitFor()
  if (options.scrollTestId) {
    await page.getByTestId(options.scrollTestId).scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(150)
  const out = path.join(VISUAL_HISTORY_ROOT, options.folder, options.basename)
  await page.screenshot({ path: out, fullPage: false })
  return out
}
