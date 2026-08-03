import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 14 — the Final Wager round, end to end in a real browser.
 *
 * A host tab and a projector tab in the same browser, synchronized over a real
 * BroadcastChannel. The host imports the built-in board + Final sample, plays a
 * tile to give the teams different scores, then runs a complete Final: private
 * wagers, a response window, the answer reveal, a team-by-team reveal and
 * settlement, and an explicit completion.
 *
 * The projector must show exactly the right thing at every step and must never
 * show a wager, a response, an answer or a correctness verdict before the host
 * has explicitly revealed it.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

/** Private Final content that lives in the built-in sample. */
const PRIVATE_FINAL_CONTENT = [
  'Convection currents',
  'Convection in the mantle',
  'Students often answer',
]

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

/** Import the built-in board + Final sample and land on the board round. */
async function startSample(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load board \+ final-wager sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

/** Award one board tile to Red, so the two teams reach Final on different scores. */
async function scoreOneTile(host: Page) {
  await host.getByTestId('cbh-tile-earth-structure-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await host.getByTestId('cbh-return').click()
}

/** Move on to the Final round. */
async function advanceToFinal(host: Page) {
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
}

async function expectNoPrivateContent(display: Page) {
  const html = (await display.content()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(html, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  for (const secret of PRIVATE_FINAL_CONTENT) {
    expect(html, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  for (const internal of ['final-wager', 'final_wager', 'preFinalScore', 'maxWager', 'fwt-']) {
    expect(html, `DOM must not contain "${internal}"`).not.toContain(internal.toLowerCase())
  }
}

test('a complete classic Final: private wagers, reveal, settlement and completion', async ({
  context,
}) => {
  // Two tabs, dozens of host actions, each round-tripping over a real
  // BroadcastChannel. That is genuinely slow, not stuck.
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startSample(host)
  await scoreOneTile(host)
  await advanceToFinal(host)

  // ── Setup: the projector says Final is coming and nothing else ─────────────
  await expect(display.getByTestId('fwd-setup')).toBeVisible()
  await expectNoPrivateContent(display)

  // ── Begin Final in Classic mode ───────────────────────────────────────────
  await expect(host.getByTestId('fwh-mode-classic')).toBeChecked()
  await host.getByTestId('fwh-begin').click()
  await expect(display.getByTestId('fwd-wager-entry')).toBeVisible()
  await expect(display.getByText(/place your wagers/i)).toBeVisible()

  // Only the team with a positive score qualifies under Classic.
  await expect(host.getByTestId('fwh-cap-basalts')).toBeVisible()
  await expect(host.getByTestId('fwh-cap-rhyolites')).toHaveCount(0)

  // ── Private wagers: the number is on the host and NOWHERE on the projector ─
  await host.getByTestId('fwh-wager-input-basalts').fill('75')
  await expect(host.getByTestId('fwh-committed-wager-basalts')).toContainText(/not saved yet/i)
  await host.getByTestId('fwh-save-wager-basalts').click()
  await expect(host.getByTestId('fwh-committed-wager-basalts')).toContainText('Saved: 75')
  expect((await display.content()).toLowerCase()).not.toContain('75')

  await host.getByTestId('fwh-lock-wagers').click()
  await expect(display.getByTestId('fwd-wagers-locked')).toBeVisible()
  await expectNoPrivateContent(display)

  // ── The response window is what makes the question public ─────────────────
  const questionFragment = 'This process moves heat through the mantle'
  expect(await display.content()).not.toContain(questionFragment)
  await host.getByTestId('fwh-capture-exact-text').check()
  await host.getByTestId('fwh-start-response').click()
  await expect(display.getByTestId('fwd-prompt')).toContainText(questionFragment)
  // …and the answer is still private.
  expect((await display.content()).toLowerCase()).not.toContain('mantle convection')

  // ── Record a response, lock, and reveal the answer ────────────────────────
  await host.getByTestId('fwh-response-input-basalts').fill('Mantle convection')
  await host.getByTestId('fwh-save-exact-basalts').click()
  await host.getByTestId('fwh-lock-responses').click()
  await expect(display.getByTestId('fwd-responses-locked')).toBeVisible()

  await expect(host.getByTestId('fwh-private-answer')).toContainText(/host only/i)
  await host.getByTestId('fwh-reveal-answer').click()
  await expect(display.getByTestId('fwd-answer')).toContainText('Mantle convection')

  // ── Reveal the team: its wager and response become public together ────────
  await host.getByTestId('fwh-reveal-basalts').click()
  await expect(display.getByTestId('fwd-reveal-team')).toContainText('Blue Basalts')
  await expect(display.getByTestId('fwd-reveal-wager')).toContainText('75')
  await expect(display.getByTestId('fwd-reveal-response')).toContainText('Mantle convection')
  // Correctness is NOT public before the host adjudicates.
  await expect(display.getByTestId('fwd-reveal-outcome')).toHaveCount(0)

  // ── Settle: the outcome, the delta and the new total all appear ───────────
  await host.getByTestId('fwh-settle-correct').click()
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText(/correct/i)
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText('+75')
  await expect(display.getByTestId('display-scores')).toContainText('175')

  // ── Explicit completion; settlement alone did not end the game ────────────
  await expect(host.getByTestId('fwh-leader')).toContainText(/blue basalts/i)
  await host.getByTestId('fwh-complete').click()
  await host.getByTestId('fwh-complete-confirm').click()
  await expect(display.getByTestId('fwd-complete')).toBeVisible()
  await expectNoPrivateContent(display)
})

test('an inclusive Final lets a zero-score team wager against a preceding clue value', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startSample(host)
  await scoreOneTile(host)
  await advanceToFinal(host)

  await host.getByTestId('fwh-mode-inclusive').check()
  await host.getByTestId('fwh-begin').click()

  // Both teams now play. The positive team is capped at its own score (the one
  // 100-point tile it won); the ZERO-score team is capped by the highest
  // preceding board clue value instead — the 300-value tile carries
  // multiplier 2, so that value is 600.
  await expect(host.getByTestId('fwh-cap-basalts')).toHaveText('100')
  await expect(host.getByTestId('fwh-cap-rhyolites')).toHaveText('600')

  // An explicit zero wager is a real, saved choice.
  await host.getByTestId('fwh-wager-input-rhyolites').fill('0')
  await host.getByTestId('fwh-save-wager-rhyolites').click()
  await expect(host.getByTestId('fwh-committed-wager-rhyolites')).toContainText('Saved: 0')

  // The lock stays refused until the other team has an explicit wager too.
  await expect(host.getByTestId('fwh-lock-wagers')).toBeDisabled()
  await host.getByTestId('fwh-wager-input-basalts').fill('100')
  await host.getByTestId('fwh-save-wager-basalts').click()
  await expect(host.getByTestId('fwh-lock-wagers')).toBeEnabled()
  await host.getByTestId('fwh-lock-wagers').click()

  // Host-only adjudication: no wording field is offered at all.
  await host.getByTestId('fwh-capture-host-only').check()
  await host.getByTestId('fwh-start-response').click()
  await expect(host.getByTestId('fwh-response-input-basalts')).toHaveCount(0)

  await host.getByTestId('fwh-save-none-rhyolites').click()
  await host.getByTestId('fwh-save-responded-basalts').click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()

  // Default order is lowest score first: the zero-score team is offered as next.
  await expect(host.getByTestId('fwh-reveal-rhyolites')).toContainText(/\(next\)/i)
  await host.getByTestId('fwh-reveal-rhyolites').click()
  await expect(display.getByTestId('fwd-reveal-response')).toContainText(/no response/i)
  // A no-response team can only be settled as a no-response.
  await expect(host.getByTestId('fwh-settle-correct')).toHaveCount(0)
  await host.getByTestId('fwh-settle-no-response').click()
  // A zero wager moves no points, and the settlement is still recorded.
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText('0')
  await expect(display.getByTestId('display-scores')).toContainText('0')
  await expectNoPrivateContent(display)
})

test('undo takes a settlement back, and the projector follows', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startSample(host)
  await scoreOneTile(host)
  await advanceToFinal(host)

  await host.getByTestId('fwh-begin').click()
  await host.getByTestId('fwh-wager-input-basalts').fill('50')
  await host.getByTestId('fwh-save-wager-basalts').click()
  await host.getByTestId('fwh-lock-wagers').click()
  await host.getByTestId('fwh-start-response').click()
  await host.getByTestId('fwh-save-responded-basalts').click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()
  await host.getByTestId('fwh-reveal-basalts').click()
  await host.getByTestId('fwh-settle-incorrect').click()

  await expect(display.getByTestId('display-scores')).toContainText('50')

  await host.getByRole('button', { name: /undo last reversible/i }).click()

  // The score is restored, the reveal survives, and the team can be settled again.
  await expect(display.getByTestId('display-scores')).toContainText('100')
  await expect(display.getByTestId('fwd-reveal-outcome')).toHaveCount(0)
  await expect(host.getByTestId('fwh-settle-correct')).toBeVisible()
})

test('a tied Final presents both choices, and an accepted tie ends the game', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startSample(host)
  await advanceToFinal(host)

  // No tile was played, so both teams are on zero and Classic admits nobody.
  await host.getByTestId('fwh-begin').click()

  // Final resolves immediately on the pre-final scores, and the lead is tied.
  await expect(display.getByTestId('fwd-resolution')).toBeVisible()
  await expect(display.getByTestId('fwd-outcome')).toContainText(/the lead is tied/i)
  await expect(host.getByTestId('fwh-leader')).toContainText(/tied for the lead/i)

  // Both tie choices are offered; neither is taken automatically.
  await expect(host.getByTestId('fwh-sudden-death')).toBeEnabled()
  await expect(host.getByTestId('fwh-accept-tie')).toBeEnabled()

  // Sudden death keeps the game ACTIVE and shows a neutral projector state.
  await host.getByTestId('fwh-sudden-death').click()
  await expect(display.getByTestId('fwd-sudden-death')).toBeVisible()
  await expect(host.getByTestId('fwh-sudden-death-note')).toContainText(/out loud/i)

  // Accepting the tie is two-step and irreversible.
  await host.getByTestId('fwh-accept-tie').click()
  await host.getByTestId('fwh-accept-tie-confirm').click()
  await expect(display.getByTestId('fwd-complete')).toBeVisible()
  await expect(display.getByTestId('fwd-outcome')).toContainText(/a tie/i)
  await expectNoPrivateContent(display)
})

test('a refresh mid-Final resumes every committed wager', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  await openHost(host)
  await startSample(host)
  await scoreOneTile(host)
  await advanceToFinal(host)

  await host.getByTestId('fwh-begin').click()
  // 100 is exactly this team's frozen cap — its whole pre-final score.
  await host.getByTestId('fwh-wager-input-basalts').fill('100')
  await host.getByTestId('fwh-save-wager-basalts').click()
  await expect(host.getByTestId('fwh-committed-wager-basalts')).toContainText('Saved: 100')

  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()

  // Recovery is EXPLICIT: nothing resumes until the host chooses to.
  const resume = host.getByTestId('persistence-resume')
  await expect(resume).toBeVisible()
  await resume.click()

  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
  await expect(host.getByTestId('fwh-committed-wager-basalts')).toContainText('Saved: 100')
  // The unsaved draft is gone, exactly as the panel says it will be.
  await expect(host.getByTestId('fwh-wager-input-basalts')).toHaveValue('')
})

/**
 * REGRESSION (inherited defect, repaired under
 * `AUTHORIZE-CQS-MEDIA-NORMALIZED-PROMPT-REREAD-REPAIR-1`).
 *
 * `caption` and `attribution` are both OPTIONAL on an authored image prompt, and
 * normalization turns an omitted one into an explicit `null`. The trusted
 * re-read used by the sanitizer rejected that `null`, so the whole Final round
 * projected nothing at all — the class saw "This round is not available yet"
 * from the moment the question opened until the game ended, while the host
 * played on unaware.
 *
 * These tests pin the previously-failing combination — BOTH annotations absent —
 * end to end.
 */

const IMAGE_FINAL_PRIVATE = {
  answer: 'IMAGE-FINAL-ANSWER-PRIVATE',
  alternate: 'IMAGE-FINAL-ALTERNATE-PRIVATE',
  notes: 'IMAGE-FINAL-HOST-NOTE-PRIVATE',
}

/** A terminal Final whose image prompt omits BOTH optional annotations. */
function imageFinalGame(path: string) {
  return {
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'e2e-final-image',
    title: 'E2E Final Image',
    teams: [{ id: 'solo', name: 'Solo Team', accent: 'azure' }],
    timer: { responseSeconds: 30 },
    rounds: [
      {
        id: 'final-round',
        type: 'final-wager',
        title: 'Final Wager',
        config: {
          // No `caption`, no `attribution` — the combination that used to break.
          prompt: {
            kind: 'image',
            source: { kind: 'same-origin-path', path },
            alt: 'Teal fixture pixel for the Final round',
          },
          answer: IMAGE_FINAL_PRIVATE.answer,
          alternates: [IMAGE_FINAL_PRIVATE.alternate],
          notes: IMAGE_FINAL_PRIVATE.notes,
        },
      },
    ],
  }
}

async function importAndOpenFinal(host: Page, document: unknown) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByTestId('import-json').fill(JSON.stringify(document, null, 2))
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
}

/** Drive an Inclusive Final with a single zero-wager team up to the answer reveal. */
async function runImageFinalToAnswer(host: Page) {
  await host.getByTestId('fwh-mode-inclusive').check()
  await host.getByTestId('fwh-begin').click()
  await host.getByTestId('fwh-wager-input-solo').fill('0')
  await host.getByTestId('fwh-save-wager-solo').click()
  await host.getByTestId('fwh-lock-wagers').click()
  await host.getByTestId('fwh-capture-host-only').check()
  await host.getByTestId('fwh-start-response').click()
}

test('a Final image prompt with NO caption and NO attribution stays projectable end to end', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  // A path that does not exist, so the image load genuinely fails.
  await importAndOpenFinal(host, imageFinalGame('media-fixtures/missing-final-image.png'))

  await runImageFinalToAnswer(host)

  // The round is AVAILABLE and the Final DTO arrived — this is what regressed.
  await expect(display.getByTestId('fwd-response-entry')).toBeVisible()
  await expect(display.getByTestId('display-game')).not.toContainText(
    /this round is not available yet/i,
  )
  await expect(display.getByTestId('fwd-prompt')).toBeVisible()

  // The image failed to load, so the authored-alt fallback renders — and it can
  // only come from an image DTO that actually reached the projector.
  await expect(display.getByTestId('mcd-image-fallback')).toBeVisible()
  await expect(display.getByTestId('mcd-alt-fallback')).toContainText(
    'Teal fixture pixel for the Final round',
  )
  // Nothing is invented in place of the missing picture.
  await expect(display.getByTestId('mcd-caption')).toHaveCount(0)
  await expect(display.getByTestId('mcd-attribution')).toHaveCount(0)
  await expectNoPrivateContent(display)
  await expect(display.getByTestId('fwd-answer')).toHaveCount(0)

  // …and the round stays available through every remaining stage.
  await host.getByTestId('fwh-save-responded-solo').click()
  await host.getByTestId('fwh-lock-responses').click()
  await expect(display.getByTestId('fwd-responses-locked')).toBeVisible()

  await host.getByTestId('fwh-reveal-answer').click()
  await expect(display.getByTestId('fwd-answer')).toContainText(IMAGE_FINAL_PRIVATE.answer)

  await host.getByTestId('fwh-reveal-solo').click()
  await expect(display.getByTestId('fwd-team-reveal')).toBeVisible()
  await expect(display.getByTestId('fwd-reveal-team')).toContainText('Solo Team')
  await expect(display.getByTestId('fwd-reveal-outcome')).toHaveCount(0)

  await host.getByTestId('fwh-settle-correct').click()
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText(/correct/i)
  await expect(display.getByTestId('fwd-resolution')).toBeVisible()

  // The alternate and the host note never became public at any stage.
  const html = (await display.content()).toLowerCase()
  expect(html).not.toContain(IMAGE_FINAL_PRIVATE.alternate.toLowerCase())
  expect(html).not.toContain(IMAGE_FINAL_PRIVATE.notes.toLowerCase())

  await host.close()
  await display.close()
})

test('the same annotation-free Final renders the real image when it loads', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await importAndOpenFinal(host, imageFinalGame('media-fixtures/slice-11-clue.png'))

  await runImageFinalToAnswer(host)

  await expect(display.getByTestId('fwd-response-entry')).toBeVisible()
  const image = display.getByTestId('fwd-prompt').locator('img')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('alt', 'Teal fixture pixel for the Final round')
  await expect(display.getByTestId('mcd-image-fallback')).toHaveCount(0)
  await expectNoPrivateContent(display)

  await host.close()
  await display.close()
})

test('a category-board image tile with NO caption and NO attribution still projects', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByTestId('import-json').fill(
    JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'e2e-board-image-bare',
      title: 'E2E Board Image Bare',
      rounds: [
        {
          id: 'board-round',
          type: 'category-board',
          title: 'Image Board',
          config: {
            categories: [
              {
                id: 'c',
                title: 'Clues',
                tiles: [
                  {
                    id: 'c-100',
                    value: 100,
                    prompt: {
                      kind: 'image',
                      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                      alt: 'Teal fixture pixel with no annotations',
                    },
                    answer: 'BOARD-IMAGE-ANSWER-PRIVATE',
                  },
                ],
              },
            ],
          },
        },
      ],
    }),
  )
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()

  await host.getByTestId('cbh-tile-c-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()

  await expect(display.getByTestId('display-game')).not.toContainText(
    /this round is not available yet/i,
  )
  const image = display.locator('img')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('alt', 'Teal fixture pixel with no annotations')
  expect((await display.content()).toLowerCase()).not.toContain('board-image-answer-private')

  await host.close()
  await display.close()
})
