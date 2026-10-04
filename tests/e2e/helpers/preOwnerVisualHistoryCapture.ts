/**
 * Playwright helpers for the 2026-10 pre-owner Q6-RP-2 visual historian.
 * Writes PNGs only under docs/design/history/2026-10-pre-owner-q6-rp2/screenshots/.
 *
 * Never retargets the immutable S05 or MENUS archives.
 */

import { expect, type Browser, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareDeterministicCapture } from './visualHistoryCapture'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const PRE_OWNER_VISUAL_HISTORY_ROOT = path.resolve(
  HERE,
  '../../../docs/design/history/2026-10-pre-owner-q6-rp2/screenshots',
)

/** Exact landed Q6-RP-2 product identity this archive binds to. */
export const PRE_OWNER_IMPLEMENTATION_SHA = '9410b6290a6dcb2f971e66da8173c3b44a6f785a'

export type PreOwnerViewport = {
  readonly width: number
  readonly height: number
  readonly label: string
}

export const PRE_OWNER_VIEWPORTS = {
  primary: { width: 1280, height: 720, label: '1280x720' },
  laptop: { width: 1366, height: 768, label: '1366x768' },
  /** D04 Windows 125% Host simulation CSS box (browser sim, not OS zoom). */
  sim125: { width: 1093, height: 542, label: '1093x542-sim125' },
} as const satisfies Record<string, PreOwnerViewport>

export async function newPreOwnerPage(
  browser: Browser,
  info: { project: { use: { baseURL?: string } } },
  viewport: PreOwnerViewport,
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

export async function capturePreOwnerPage(
  page: Page,
  options: {
    readonly folder: string
    readonly basename: string
    readonly waitFor: () => Promise<void>
    readonly scrollTestId?: string
    readonly viewport?: PreOwnerViewport
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
  const out = path.join(PRE_OWNER_VISUAL_HISTORY_ROOT, options.folder, options.basename)
  await page.screenshot({ path: out, fullPage: false })
  return out
}

export async function waitForPreOwnerHome(page: Page) {
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
}

export async function waitForPreOwnerSetup(page: Page) {
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}
