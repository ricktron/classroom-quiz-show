import { expect, type Page } from '@playwright/test'
import type { PublicState } from '../../src/state/publicState'

/** Mirror of SYNC_CHANNEL_NAME in src/sync/protocol.ts (kept in sync by review). */
export const DISPLAY_SYNC_CHANNEL_NAME = 'classroom-quiz-show:sync'

/**
 * Shared Display e2e helpers for S05 projector specs.
 * Extracted so openDisplay / injectPublicState are not duplicated across
 * F1 readability and buzz/active-claim choreography files (Sonar new-code duplication).
 */
export async function openDisplay(page: Page, theme?: 'default' | 'high-contrast') {
  const q = theme ? `?theme=${theme}` : ''
  await page.goto(`#/display${q}`)
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

export async function injectPublicState(page: Page, payload: PublicState) {
  const accepted = await page.evaluate(
    ({ name, payload: p }) => {
      const ch = new BroadcastChannel(name)
      ch.postMessage({
        protocol: 'classroom-quiz-show/sync',
        schemaVersion: 2,
        message: {
          type: 'public-state',
          revision: p.revision,
          sentAt: Date.now(),
          payload: p,
        },
      })
      ch.close()
      return true
    },
    { name: DISPLAY_SYNC_CHANNEL_NAME, payload },
  )
  expect(accepted).toBe(true)
}

const VIEWPORT_TOLERANCE_PX = 2

/**
 * Shared 720p/1080p geometry guard for S05 projector choreography specs.
 * Extracted so overflow asserts are not cloned across board-flow / outcome /
 * buzz e2e files (Sonar new-code duplication).
 */
export async function assertNoHorizontalOverflow(page: Page) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      overflowX: Math.max(0, doc.scrollWidth - window.innerWidth),
      overflowY: Math.max(0, doc.scrollHeight - window.innerHeight),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  })
  expect(report.overflowX, JSON.stringify(report)).toBeLessThanOrEqual(VIEWPORT_TOLERANCE_PX)
  expect(report.overflowY, JSON.stringify(report)).toBeLessThanOrEqual(VIEWPORT_TOLERANCE_PX)
}
