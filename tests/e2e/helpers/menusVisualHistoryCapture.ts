/**
 * Playwright helpers for the MENUS pre-owner-gate visual historian capture run.
 * Writes PNGs under docs/design/history/2026-09-menus-pre-owner-gate/screenshots/.
 *
 * Distinct from the S05 helper (visualHistoryCapture.ts) — never changes the
 * S05 archive root as a side effect.
 */

import { expect, type Browser, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareDeterministicCapture } from './visualHistoryCapture'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const MENUS_VISUAL_HISTORY_ROOT = path.resolve(
  HERE,
  '../../../docs/design/history/2026-09-menus-pre-owner-gate/screenshots',
)

export type MenusViewport = {
  readonly width: number
  readonly height: number
  readonly label: string
}

export const MENUS_VIEWPORTS = {
  primary: { width: 1280, height: 720, label: '1280x720' },
  laptop: { width: 1366, height: 768, label: '1366x768' },
  /** D04 Windows 125% Host simulation CSS box (browser sim, not OS zoom). */
  sim125: { width: 1093, height: 542, label: '1093x542-sim125' },
} as const satisfies Record<string, MenusViewport>

export async function newMenusPage(
  browser: Browser,
  info: { project: { use: { baseURL?: string } } },
  viewport: MenusViewport,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    baseURL: info.project.use.baseURL,
  })
  const page = await context.newPage()
  return {
    page,
    close: async () => {
      await context.close().catch(() => undefined)
    },
  }
}

export async function captureMenusPage(
  page: Page,
  options: {
    readonly folder: string
    readonly basename: string
    readonly waitFor: () => Promise<void>
    readonly scrollTestId?: string
    readonly viewport?: MenusViewport
  },
) {
  if (options.viewport) {
    await page.setViewportSize({
      width: options.viewport.width,
      height: options.viewport.height,
    })
  }
  await prepareDeterministicCapture(page)
  await options.waitFor()
  if (options.scrollTestId) {
    await page.getByTestId(options.scrollTestId).scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(150)
  const out = path.join(MENUS_VISUAL_HISTORY_ROOT, options.folder, options.basename)
  await page.screenshot({ path: out, fullPage: false })
  return out
}

export async function waitForMenusHome(page: Page) {
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
}

export async function waitForMenusSetup(page: Page) {
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}
