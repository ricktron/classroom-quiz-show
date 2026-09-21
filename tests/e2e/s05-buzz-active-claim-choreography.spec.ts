import { test, expect, type Page } from '@playwright/test'
import type { PublicState } from '../../src/state/publicState'
import {
  visualStressActiveClaimMaxWaitingSnapshot,
  visualStressArmedWaitingBuzzSnapshot,
  visualStressExhaustedBuzzSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressPromotedActiveClaimSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import { visualStressLongPrompt, visualStressTeams } from '../../src/test/visualStressFixtures'

/**
 * S05 buzz / active-claim choreography — projector comprehension under stress.
 *
 * Injects sanitizer-derived PublicState snapshots (canonical Game → Session →
 * sanitizer). Does not hand-author a second PublicState authority. Physical
 * Sony / projector qualification remains S06.
 */

const CHANNEL_NAME = 'classroom-quiz-show:sync'
const VIEWPORT_TOLERANCE_PX = 2

test.describe.configure({ mode: 'serial' })

const TEAM_NAMES = visualStressTeams().map((team) => String(team.name))
const ACTIVE_TEAM = TEAM_NAMES[0]!
const PROMOTED_TEAM = TEAM_NAMES[1]!
const WAITING_TEAM_NAMES = TEAM_NAMES.slice(1)

async function openDisplay(page: Page, theme?: 'default' | 'high-contrast') {
  const q = theme ? `?theme=${theme}` : ''
  await page.goto(`#/display${q}`)
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function injectPublicState(page: Page, payload: PublicState) {
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
    { name: CHANNEL_NAME, payload },
  )
  expect(accepted).toBe(true)
}

async function assertNoHorizontalOverflow(page: Page) {
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

async function assertNoWaitingIdentities(page: Page) {
  const panel = page.getByTestId('bqd')
  for (const name of WAITING_TEAM_NAMES) {
    await expect(panel).not.toContainText(name)
  }
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

  test('first active claim names the floor holder immediately', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressFirstActiveClaimSnapshot(131))
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-status', 'active')
    await expect(page.getByTestId('bqd-active')).toHaveText(ACTIVE_TEAM)
    await expect(page.getByTestId('bqd-waiting')).toHaveText('No teams waiting')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
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

  test('720p reduced-motion promotion keeps claim-change outline meaning', async ({
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
    await assertNoHorizontalOverflow(page)
  })
})
