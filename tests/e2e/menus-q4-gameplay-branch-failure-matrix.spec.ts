import { test, expect } from '@playwright/test'
import {
  advanceToBoard,
  advanceToFinal,
  armAndStartTimer,
  expectAdvancedDiagnosticsUnused,
  expectDisplayPrivate,
  importQ3GameToClassSetup,
  keyboardNamesReadyStart,
  openAudienceFromHost,
  openBoardClue,
  Q3_SESSION_NAME_ALPHA,
  Q3_SESSION_NAME_BRAVO,
  Q3_TEAM_ALPHA,
  Q3_TEAM_BRAVO,
  adjudicateAlphaFullHundred,
} from './helpers/menusQ3'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * Pre-owner Q4 — gameplay branch / failure matrix (HG-13).
 *
 * Authorization: AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1
 *
 * This is intentionally not a second golden-path pack. It composes only the
 * material off-spine branches that existing domain suites prove in isolation:
 *
 * Q4-A incorrect claim -> queue promotion -> ORDINARY live Undo (Q6-RP-2; More
 *      closed) -> explicit mid-game Resume -> Host/Display reconvergence +
 *      privacy -> continued adjudication -> Final -> safe completion.
 * Q4-B an authentic Session rejects a stale timer expiry after the teacher
 *      resets/closes the response opportunity.
 * Q4-C mid-Final explicit Resume -> incorrect settlement -> tied Final branch
 *      -> explicit completion + Host-only summary.
 *
 * Existing category-board, buzz-in, timers-arming, final-wager,
 * persistence-recovery, sync, session-summary, and Q3 golden-path suites remain
 * RETAIN evidence for their domain invariants.
 */

test.describe.configure({ mode: 'serial' })

test('Q4-A: incorrect queue branch survives undo + explicit Resume and reconverges Display safely', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importQ3GameToClassSetup(host, 'q4-recovery-queue')
  await keyboardNamesReadyStart(host)
  const display = await openAudienceFromHost(context, host)

  await advanceToBoard(host)
  await openBoardClue(host)
  await armAndStartTimer(host)

  // Two teams enter the response opportunity. The first miss promotes Team 2.
  await host.keyboard.press('Digit1')
  await host.keyboard.press('Digit2')
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${Q3_SESSION_NAME_BRAVO}`)
  await host.getByTestId('lih-incorrect').click()
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_BRAVO)
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_BRAVO)

  // Q6-RP-2 (G3): the ORDINARY live Undo names what it will reverse and is
  // reachable with More / Advanced diagnostics closed. It dispatches the
  // canonical UNDO, so replay restores the prior claimant and queue exactly.
  await expectAdvancedDiagnosticsUnused(host)
  const undo = host.getByTestId('host-undo')
  await expect(undo).toBeVisible()
  await expect(undo).toHaveText(`Undo Incorrect (${Q3_SESSION_NAME_ALPHA})`)
  await undo.click()
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${Q3_SESSION_NAME_BRAVO}`)
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')
  // The next undo target is now the earlier buzz — the undone Incorrect is gone.
  await expect(undo).toHaveText(`Undo buzz-in (${Q3_SESSION_NAME_BRAVO})`)
  await expectDisplayPrivate(display)
  await expectAdvancedDiagnosticsUnused(host)

  await waitForSessionSaved(host, { timeout: 15_000 })
  await host.reload()

  // Recovery is explicit. Nothing silently resumes before the teacher chooses.
  await expect(host.getByTestId('persistence-recovery')).toBeVisible()
  await expect(host.getByTestId('classroom-setup')).toHaveCount(0)
  await host.getByTestId('persistence-resume').click()

  // The resumed Host and still-open Display reconverge on the replayed branch:
  // the Incorrect stays undone (the persisted tail includes the undo marker).
  await expect(host.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${Q3_SESSION_NAME_BRAVO}`)
  await expect(host.getByTestId('host-undo')).toHaveText(`Undo buzz-in (${Q3_SESSION_NAME_BRAVO})`)
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')
  await expectDisplayPrivate(display)

  // The teacher continues from the recovered branch without replacing the
  // Session. Passing promotes Team 2; adjudication remains authoritative and
  // publishes live to the Display.
  await host.getByTestId('lih-pass').click()
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_BRAVO)
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_BRAVO)
  await host.getByTestId('lih-correct').click()
  await expect(host.getByTestId('lih-board-outcome')).toContainText(
    `${Q3_SESSION_NAME_BRAVO} — Correct`,
  )
  await expect(display.getByTestId('board-outcome')).toContainText(Q3_SESSION_NAME_BRAVO)

  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId(`tsp-target-${Q3_TEAM_BRAVO}`).click()
  await host.getByTestId('tsp-award-full').click()
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_BRAVO}`)).toHaveText('100')
  await expect(display.getByTestId('display-scores')).toContainText('100')
  await host.getByTestId('cbh-return').click()
  await expect(host.getByTestId('cbh-tile-science-100')).toBeDisabled()
  await expectDisplayPrivate(display)

  // Safe completion remains possible on the recovered Session, ordinary path only.
  await advanceToFinal(host)
  await host.getByTestId('fwh-begin').click()
  await host.getByTestId(`fwh-wager-input-${Q3_TEAM_BRAVO}`).fill('50')
  await host.getByTestId(`fwh-save-wager-${Q3_TEAM_BRAVO}`).click()
  await host.getByTestId('fwh-lock-wagers').click()
  await host.getByTestId('fwh-start-response').click()
  await host.getByTestId(`fwh-save-responded-${Q3_TEAM_BRAVO}`).click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()
  await host.getByTestId(`fwh-reveal-${Q3_TEAM_BRAVO}`).click()
  await host.getByTestId('fwh-settle-correct').click()
  await host.getByTestId('fwh-complete').click()
  await host.getByTestId('fwh-complete-confirm').click()
  await expect(display.getByTestId('fwd-complete')).toBeVisible()
  await expect(display.getByTestId('fwd-winner')).toContainText(Q3_SESSION_NAME_BRAVO)
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  // Completed game: the planner refuses undo, so the ordinary control is gone.
  await expect(host.getByTestId('host-undo')).toHaveCount(0)
  await expectDisplayPrivate(display)
  await expectAdvancedDiagnosticsUnused(host)

  await host.close()
  await display.close()
})

test('Q4-B: authentic Session rejects a stale timer expiry after reset and clue close', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importQ3GameToClassSetup(host, 'q4-stale-timer')
  await keyboardNamesReadyStart(host)
  const display = await openAudienceFromHost(context, host)

  await advanceToBoard(host)
  await openBoardClue(host)

  // The canonical timer suite proves stale-callback rejection in isolation.
  // Q4 binds that invariant to an authentic Home -> Setup -> started Session.
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')
  await host.getByTestId('rth-reset').click()
  await host.getByTestId('rth-start').click()
  await host.getByTestId('cbh-return').click()

  await host.waitForTimeout(6_500)
  await expect(
    host.getByTestId('event-history').getByText('RESPONSE_TIMER_EXPIRED'),
  ).toHaveCount(0)
  await expect(display.getByTestId('display-response')).toHaveCount(0)
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('0')
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_BRAVO}`)).toHaveText('0')
  await expectDisplayPrivate(display)

  await host.close()
  await display.close()
})

test('Q4-C: mid-Final Resume reaches tied branch and completes safely with Host-only summary', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importQ3GameToClassSetup(host, 'q4-final-recovery-tie')
  await keyboardNamesReadyStart(host)
  const display = await openAudienceFromHost(context, host)

  // Establish one positive-score finalist through the real board adjudication.
  await advanceToBoard(host)
  await openBoardClue(host)
  await armAndStartTimer(host)
  await host.keyboard.press('Digit1')
  await adjudicateAlphaFullHundred(host, display)
  await advanceToFinal(host)

  await host.getByTestId('fwh-begin').click()
  await host.getByTestId(`fwh-wager-input-${Q3_TEAM_ALPHA}`).fill('100')
  await host.getByTestId(`fwh-save-wager-${Q3_TEAM_ALPHA}`).click()
  await expect(host.getByTestId(`fwh-committed-wager-${Q3_TEAM_ALPHA}`)).toContainText(
    'Saved: 100',
  )
  await waitForSessionSaved(host, { timeout: 15_000 })

  await host.reload()
  await expect(host.getByTestId('persistence-recovery')).toBeVisible()
  await host.getByTestId('persistence-resume').click()

  // Final durable facts survive; Display receives only the public phase.
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
  await expect(host.getByTestId(`fwh-committed-wager-${Q3_TEAM_ALPHA}`)).toContainText(
    'Saved: 100',
  )
  await expect(display.getByTestId('fwd-wager-entry')).toBeVisible()
  await expectDisplayPrivate(display)

  await host.getByTestId('fwh-lock-wagers').click()
  await host.getByTestId('fwh-start-response').click()
  await host.getByTestId(`fwh-save-responded-${Q3_TEAM_ALPHA}`).click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()
  await host.getByTestId(`fwh-reveal-${Q3_TEAM_ALPHA}`).click()
  await host.getByTestId('fwh-settle-incorrect').click()

  // 100 - 100 ties Team 1 with the zero-score non-finalist Team 2.
  await expect(display.getByTestId('display-scores')).toContainText('0')
  await expect(display.getByTestId('fwd-resolution')).toBeVisible()
  await expect(display.getByTestId('fwd-outcome')).toContainText(/the lead is tied/i)
  await expect(host.getByTestId('fwh-sudden-death')).toBeEnabled()
  await expect(host.getByTestId('fwh-accept-tie')).toBeEnabled()

  // Exercise the divergent tie branch before the explicit terminal decision.
  await host.getByTestId('fwh-sudden-death').click()
  await expect(display.getByTestId('fwd-sudden-death')).toBeVisible()
  await host.getByTestId('fwh-accept-tie').click()
  await host.getByTestId('fwh-accept-tie-confirm').click()

  await expect(display.getByTestId('fwd-complete')).toBeVisible()
  await expect(display.getByTestId('fwd-outcome')).toContainText(/a tie/i)
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Session summary' })).toBeVisible()
  await expect(display.getByTestId('session-summary-panel')).toHaveCount(0)
  await expectDisplayPrivate(display)

  await host.close()
  await display.close()
})
