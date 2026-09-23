import { test, expect, type Page } from '@playwright/test'
import {
  visualStressArmedWaitingBuzzSnapshot,
  visualStressBoardCorrectOutcomeSnapshot,
  visualStressBoardIncorrectWithActiveSnapshot,
  visualStressBoardPassedOutcomeSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import { visualStressTeams } from '../../src/test/visualStressFixtures'
import { injectPublicState, openDisplay } from './helpers/displayPublicState'
import type { PublicState } from '../../src/state/publicState'

/**
 * S05 board-outcome presentation choreography — projector acknowledgement
 * around already-visible Correct / Incorrect / Passed truth.
 *
 * Injects sanitizer-derived PublicState snapshots. No PublicState / schema
 * expansion. Physical Sony / projector qualification remains S06.
 */

const VIEWPORT_TOLERANCE_PX = 2
const OUTCOME_CHROME_TOLERANCE_PX = 2

test.describe.configure({ mode: 'serial' })

const TEAM_NAMES = visualStressTeams().map((team) => String(team.name))
const FIRST_TEAM = TEAM_NAMES[0]!
const SECOND_TEAM = TEAM_NAMES[1]!

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

/** Outcome ack chrome must stay inside the element box (inset; no outward clip). */
async function assertOutcomeChromeInsideBox(page: Page) {
  const report = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="board-outcome"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
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
  expect(report, 'board-outcome present').not.toBeNull()
  if (!report) return
  expect(report.top).toBeGreaterThanOrEqual(-OUTCOME_CHROME_TOLERANCE_PX)
  expect(report.left).toBeGreaterThanOrEqual(-OUTCOME_CHROME_TOLERANCE_PX)
  expect(report.bottom).toBeLessThanOrEqual(report.viewport.height + OUTCOME_CHROME_TOLERANCE_PX)
  expect(report.right).toBeLessThanOrEqual(report.viewport.width + OUTCOME_CHROME_TOLERANCE_PX)
  expect(report.outlineStyle === 'none' || report.outlineWidth === '0px').toBe(true)
  expect(report.transform === 'none' || report.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
}

test.describe('S05 board-outcome presentation choreography', () => {
  test('remount into Correct seeds truth without fabricating acknowledgement', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(150))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toBeVisible()
    await expect(outcome).toHaveAttribute('data-outcome-kind', 'correct')
    await expect(outcome).toHaveAttribute('data-seeded', 'true')
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    await expect(outcome).not.toHaveClass(/bod--outcome-changed/)
    await expect(outcome).toContainText('Correct')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-motion-owner', 'outcome')
    await assertNoHorizontalOverflow(page)
  })

  test('observed none→Correct acknowledges without delaying authoritative text', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    await expect(page.getByTestId('board-outcome')).toHaveCount(0)

    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(150))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Correct')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'true')
    await expect(outcome).toHaveClass(/bod--outcome-changed/)
    await assertOutcomeChromeInsideBox(page)
    await assertNoHorizontalOverflow(page)
  })

  test('Incorrect + promoted active: buzz owns motion; outcome is static secondary', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    await injectPublicState(page, visualStressBoardIncorrectWithActiveSnapshot(151))

    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Incorrect')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    await expect(outcome).not.toHaveClass(/bod--outcome-changed/)
    await expect(outcome).toHaveClass(/bod--secondary/)
    await expect(outcome).toHaveAttribute('data-motion-owner', 'buzz')
    await expect(outcome).toHaveAttribute('data-composition', 'static-secondary')

    await expect(page.getByTestId('bqd-active')).toContainText(SECOND_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await assertNoHorizontalOverflow(page)
  })

  test('remount into Incorrect + active stays seeded static secondary (no transient ack)', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressBoardIncorrectWithActiveSnapshot(151))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    await expect(outcome).toHaveAttribute('data-motion-owner', 'buzz')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
    await expect(outcome).toContainText('Incorrect')
    await expect(page.getByTestId('bqd-active')).toContainText(SECOND_TEAM)
    await assertNoHorizontalOverflow(page)
  })

  test('Passed + exhausted may own outcome acknowledgement on observed transition', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    await injectPublicState(page, visualStressBoardPassedOutcomeSnapshot(152))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Passed')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'true')
    await expect(outcome).toHaveClass(/bod--outcome-changed/)
    await expect(outcome).toHaveAttribute('data-motion-owner', 'outcome')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
    await assertOutcomeChromeInsideBox(page)
    await assertNoHorizontalOverflow(page)
  })

  test('Path S-C: scoreboard score refresh does not restart outcome acknowledgement', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    const correct = visualStressBoardCorrectOutcomeSnapshot(150)
    await injectPublicState(page, correct)
    await expect(page.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')

    // Same outcome identity; only public team totals change (Path S-C static scores).
    const scored: PublicState = structuredClone(correct)
    scored.revision = 153
    if (scored.teams?.status === 'available') {
      scored.teams = {
        status: 'available',
        teams: scored.teams.teams.map((team, index) =>
          index === 0 ? { ...team, score: team.score + 400 } : team,
        ),
      }
    }
    await injectPublicState(page, scored)
    await expect(page.getByTestId('board-outcome')).toContainText('Correct')
    await expect(page.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')
    await expect(page.getByTestId('board-outcome')).toHaveClass(/bod--outcome-changed/)
    await assertNoHorizontalOverflow(page)
  })

  test('720p reduced-motion Correct acknowledgement disables animation; static cue remains', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(150))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Correct')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'true')
    await expect(outcome).toHaveClass(/bod--outcome-changed/)

    const motionProof = await outcome.evaluate((el) => {
      const cs = getComputedStyle(el)
      const kind = el.querySelector('.bod__kind')
      const kindCs = kind ? getComputedStyle(kind) : null
      return {
        animationName: cs.animationName,
        boxShadow: cs.boxShadow,
        textDecorationLine: kindCs?.textDecorationLine ?? null,
      }
    })
    expect(motionProof.animationName, JSON.stringify(motionProof)).toBe('none')
    // Static inset + underline carriers remain under reduce.
    expect(motionProof.boxShadow === 'none' || motionProof.boxShadow === '').toBe(false)
    expect(motionProof.textDecorationLine).toMatch(/underline/)

    await assertOutcomeChromeInsideBox(page)
    await assertNoHorizontalOverflow(page)
  })

  test('720p no-preference Correct acknowledgement runs bounded non-none animation', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))
    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(150))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'true')
    const animationName = await outcome.evaluate((el) => getComputedStyle(el).animationName)
    expect(animationName).not.toBe('none')
    expect(animationName.toLowerCase()).toContain('bod-ack')
    await assertOutcomeChromeInsideBox(page)
  })

  test('F-HANDOFF: Incorrect exhausted→late active yields motion to buzz', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))

    // Exhausted Incorrect (single respondent) — outcome may own ack.
    const exhausted = structuredClone(visualStressBoardPassedOutcomeSnapshot(160))
    if (exhausted.response) {
      exhausted.response.boardOutcome = {
        status: 'resolved',
        teamKey: 't0',
        kind: 'incorrect',
      }
    }
    await injectPublicState(page, exhausted)
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Incorrect')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'true')
    await expect(outcome).toHaveAttribute('data-motion-owner', 'outcome')
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')

    // Late B buzz while armed / hold active — same outcome identity.
    const lateBuzz: PublicState = structuredClone(exhausted)
    lateBuzz.revision = 161
    if (lateBuzz.response) {
      lateBuzz.response.buzz = {
        status: 'active',
        activeTeamKey: 't1',
        waitingCount: 0,
      }
    }
    await injectPublicState(page, lateBuzz)
    await expect(outcome).toContainText('Incorrect')
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    await expect(outcome).not.toHaveClass(/bod--outcome-changed/)
    await expect(outcome).toHaveClass(/bod--secondary/)
    await expect(outcome).toHaveAttribute('data-motion-owner', 'buzz')
    await expect(outcome).toHaveAttribute('data-composition', 'static-secondary')
    await expect(page.getByTestId('bqd-active')).toContainText(SECOND_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await assertNoHorizontalOverflow(page)
  })

  test('F-PASSED-ACTIVE: Passed + promoted active is static secondary', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressArmedWaitingBuzzSnapshot(149))

    const passedActive: PublicState = structuredClone(
      visualStressBoardIncorrectWithActiveSnapshot(162),
    )
    if (passedActive.response?.boardOutcome.status === 'resolved') {
      passedActive.response.boardOutcome = {
        ...passedActive.response.boardOutcome,
        kind: 'passed',
      }
    }
    await injectPublicState(page, passedActive)

    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toContainText('Passed')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    await expect(outcome).toHaveClass(/bod--secondary/)
    await expect(outcome).toHaveClass(/bod--passed/)
    await expect(outcome).not.toHaveClass(/bod--incorrect/)
    await expect(outcome).toHaveAttribute('data-motion-owner', 'buzz')
    await expect(page.getByTestId('bqd-active')).toContainText(SECOND_TEAM)
    await expect(page.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    await assertNoHorizontalOverflow(page)
  })

  test('720p high-contrast Correct keeps kind + team readable', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'high-contrast')
    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(150))
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await expect(page.getByTestId('board-outcome')).toContainText('Correct')
    await expect(page.getByTestId('board-outcome')).toContainText(FIRST_TEAM)
    await assertNoHorizontalOverflow(page)
  })
})
