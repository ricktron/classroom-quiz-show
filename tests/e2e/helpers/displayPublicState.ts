import { expect, type Locator, type Page } from '@playwright/test'
import type { PublicState } from '../../../src/state/publicState'
import { visualStressArmedWaitingBuzzSnapshot } from '../../../src/test/visualStressDisplaySnapshots'

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

/**
 * Freeze the page clock before navigation so S05 presentation acknowledgements
 * (buzz claim, board outcome, board flow, Final stage) are held open until the
 * test advances time.
 *
 * Every S05 acknowledgement is a transient marker cleared by a ~420ms
 * `window.setTimeout`. Polling that marker against the wall clock races CPU
 * load: under oversubscription or CPU throttling the hold expired before the
 * assertion polled. With the clock paused, an acknowledgement that happened
 * stays observable until {@link expectAcknowledgementExpires} advances time,
 * and one that never happened is never observable — so a missing or cancelled
 * acknowledgement still fails, and remount / seed `false` checks are no longer
 * satisfied by a hold that merely expired.
 *
 * Playwright fakes `setTimeout`/`setInterval`, `requestAnimationFrame`,
 * `requestIdleCallback`, `Date` and `performance.now`; Display rendering
 * depends on none of them (React schedules on MessageChannel). CSS animations
 * still run on real time. Reloads replay the paused clock.
 */
export async function holdPresentationAckClock(page: Page) {
  const now = Date.now()
  // Install a minute in the past and pause at "now": the fast-forward happens
  // on the still-blank page (nothing there owns timers), the pause target can
  // never be behind the page clock, and frozen page time starts at Node's
  // current time (Node time keeps moving; page time does not).
  await page.clock.install({ time: now - 60_000 })
  await page.clock.pauseAt(now)
}

/** {@link openDisplay} on a paused clock (see {@link holdPresentationAckClock}). */
export async function openDisplayWithHeldAcks(page: Page, theme?: 'default' | 'high-contrast') {
  await holdPresentationAckClock(page)
  await openDisplay(page, theme)
}

/** Hold length mirrored from PRESENTATION_ACK_HOLD_MS / CLAIM_CHANGE_HOLD_MS (420ms). */
export const PRESENTATION_ACK_HOLD_STEP_MS = 420

/**
 * At most this many hold-sized steps of paused time may pass before the marker
 * clears. One extra step tolerates a hold timer registered after the DOM marker
 * was first observed (React passive effect still pending when time advanced);
 * the third is margin. A hold regressing past ~1.26s fails here; the exact
 * 420ms length is pinned by the component unit tests with fake timers.
 */
const MAX_ACK_EXPIRY_STEPS = 3

/**
 * Advance the paused clock in hold-sized steps until the acknowledgement
 * marker clears. Fails if the marker is stuck or outlives the step bound.
 */
export async function expectAcknowledgementExpires(
  page: Page,
  marker: Locator,
  attribute: string,
) {
  // The hold timer fires inside runFor; React re-renders in a later task, so
  // each step waits briefly (real time) for the cleared marker to commit.
  for (let step = 1; step < MAX_ACK_EXPIRY_STEPS; step += 1) {
    await page.clock.runFor(PRESENTATION_ACK_HOLD_STEP_MS)
    try {
      await expect(marker).toHaveAttribute(attribute, 'false', { timeout: 1_000 })
      return
    } catch {
      // Not cleared yet (timer registered late, or render pending): step again.
    }
  }
  await page.clock.runFor(PRESENTATION_ACK_HOLD_STEP_MS)
  await expect(
    marker,
    `${attribute} still set after ${MAX_ACK_EXPIRY_STEPS} × ${PRESENTATION_ACK_HOLD_STEP_MS}ms of paused time`,
  ).toHaveAttribute(attribute, 'false')
}

/**
 * Inject the armed / waiting-for-buzz snapshot and wait until Display has
 * rendered it. Back-to-back injections can be batched into one React render,
 * so a following "observed transition" would otherwise be seen as a first
 * observation (seed, no acknowledgement) instead of a transition.
 */
export async function injectRenderedArmedWaitingBuzz(page: Page, revision: number) {
  await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(revision))
  await expect(page.getByTestId('signal-rail-status')).toHaveText('Waiting for a buzz')
}

export async function injectPublicState(page: Page, payload: PublicState) {
  const accepted = await page.evaluate(
    ({ name, payload: p }) => {
      const ch = new BroadcastChannel(name)
      ch.postMessage({
        protocol: 'classroom-quiz-show/sync',
        schemaVersion: 3,
        message: {
          type: 'public-state',
          hostStreamId: 'e2e-test-stream',
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
