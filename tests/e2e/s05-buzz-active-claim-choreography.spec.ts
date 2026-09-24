import { test, expect, type Page } from '@playwright/test'
import {
  visualStressActiveClaimMaxWaitingSnapshot,
  visualStressArmedWaitingBuzzSnapshot,
  visualStressExhaustedBuzzSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressPromotedActiveClaimSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import { visualStressLongPrompt, visualStressTeams } from '../../src/test/visualStressFixtures'
import {
  assertNoHorizontalOverflow,
  injectPublicState,
  openDisplay,
} from './helpers/displayPublicState'

/**
 * S05 buzz / active-claim choreography — projector comprehension under stress.
 *
 * Injects sanitizer-derived PublicState snapshots (canonical Game → Session →
 * sanitizer). Does not hand-author a second PublicState authority. Physical
 * Sony / projector qualification remains S06.
 */

const CLAIM_CHROME_TOLERANCE_PX = 2

test.describe.configure({ mode: 'serial' })

const TEAM_NAMES = visualStressTeams().map((team) => String(team.name))
const ACTIVE_TEAM = TEAM_NAMES[0]!
const PROMOTED_TEAM = TEAM_NAMES[1]!
const WAITING_TEAM_NAMES = TEAM_NAMES.slice(1)

async function assertNoWaitingIdentities(page: Page) {
  const panel = page.getByTestId('bqd')
  for (const name of WAITING_TEAM_NAMES) {
    await expect(panel).not.toContainText(name)
  }
}

/** Claim chrome must stay inside the panel box (inset; no outward clip). */
async function assertClaimChromeInsidePanel(page: Page) {
  const report = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="bqd"]')
    if (!panel) return null
    const r = panel.getBoundingClientRect()
    const cs = getComputedStyle(panel)
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      transform: cs.transform,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  })
  expect(report, 'claim panel present').not.toBeNull()
  if (!report) return
  expect(report.top).toBeGreaterThanOrEqual(-CLAIM_CHROME_TOLERANCE_PX)
  expect(report.left).toBeGreaterThanOrEqual(-CLAIM_CHROME_TOLERANCE_PX)
  expect(report.bottom).toBeLessThanOrEqual(report.viewport.height + CLAIM_CHROME_TOLERANCE_PX)
  expect(report.right).toBeLessThanOrEqual(report.viewport.width + CLAIM_CHROME_TOLERANCE_PX)
  // Outward outline/scale was the 720p clip failure mode; inset chrome must not use them.
  expect(report.outlineStyle === 'none' || report.outlineWidth === '0px').toBe(true)
  expect(report.transform === 'none' || report.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
}

test.describe('S05 buzz / active-claim choreography', () => {
  test('armed waiting-for-buzz stays compact beside schema-max clue', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(130))
    await expect(page.getByTestId('signal-rail-status')).toHaveText('Waiting for a buzz')
    await expect(page.getByTestId('bqd')).toHaveCount(0)
    await expect(page.getByTestId('cbd-prompt')).toContainText(visualStressLongPrompt().slice(0, 40))
    await assertNoHorizontalOverflow(page)
  })

  test('catch-up remount into already-active does not fabricate a claim', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-status', 'active')
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd-waiting')).toHaveText('No teams waiting')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
    await expect(page.getByTestId('bqd')).not.toHaveClass(/bqd--claim-changed/)
    await assertNoWaitingIdentities(page)
    await assertNoHorizontalOverflow(page)
  })

  test('observed none→active acknowledges without delaying the name', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(130))
    await expect(page.getByTestId('signal-rail-status')).toHaveText('Waiting for a buzz')

    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await expect(page.getByTestId('bqd')).toHaveClass(/bqd--claim-changed/)
    await assertClaimChromeInsidePanel(page)
    await assertNoWaitingIdentities(page)
    await assertNoHorizontalOverflow(page)
  })

  test('active claim + max waiting count never publishes waiting identities', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressActiveClaimMaxWaitingSnapshot(132))
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd-waiting')).toHaveText('7 teams waiting')
    await assertNoWaitingIdentities(page)
    await expect(page.getByTestId('tsb')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('waiting-count update during acknowledgement does not cancel the claim marker', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(130))
    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    await injectPublicState(page, visualStressActiveClaimMaxWaitingSnapshot(132))
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-active-key', 't0')
    await expect(page.getByTestId('bqd-waiting')).toHaveText('7 teams waiting')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await expect(page.getByTestId('bqd')).toHaveClass(/bqd--claim-changed/)
    await assertNoWaitingIdentities(page)
    await assertClaimChromeInsidePanel(page)
    await assertNoHorizontalOverflow(page)
  })

  test('active-team change becomes unmistakable without delaying the new name', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)

    await injectPublicState(page, visualStressPromotedActiveClaimSnapshot(133))
    await expect(page.getByTestId('bqd-active')).toHaveText(PROMOTED_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-active-key', 't1')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await expect(page.getByTestId('bqd')).toHaveClass(/bqd--claim-changed/)
    await expect(page.getByTestId('bqd')).not.toContainText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd-waiting')).toHaveText('No teams waiting')
    await assertClaimChromeInsidePanel(page)
    await assertNoHorizontalOverflow(page)
  })

  test('exhausted is an unmistakable terminal response state', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressExhaustedBuzzSnapshot(134))
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
    await expect(page.getByTestId('bqd-active')).toHaveText('No one left to answer')
    await expect(page.getByTestId('bqd')).toContainText(/response closed/i)
    await assertNoHorizontalOverflow(page)
  })

  test('720p high-contrast active claim keeps text carriers', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'high-contrast')
    await injectPublicState(page, visualStressActiveClaimMaxWaitingSnapshot(132))
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await expect(page.getByTestId('bqd')).toContainText('Answering')
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd-waiting')).toHaveText('7 teams waiting')
    await assertNoWaitingIdentities(page)
    await assertNoHorizontalOverflow(page)
  })

  test('720p reduced-motion promotion keeps inset claim-change meaning', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplay(page)
    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await injectPublicState(page, visualStressPromotedActiveClaimSnapshot(133))
    await expect(page.getByTestId('bqd-active')).toHaveText(PROMOTED_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await expect(page.getByTestId('bqd')).toHaveClass(/bqd--claim-changed/)
    await assertClaimChromeInsidePanel(page)
    await assertNoHorizontalOverflow(page)
  })
})
