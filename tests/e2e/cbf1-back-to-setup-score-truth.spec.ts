import { test, expect, type Page } from '@playwright/test'
import {
  importPlayNamesDisplayStartRound1,
  COURT_QUALIFICATION_TEAM_NAMES,
} from './helpers/courtQualificationJourney'

/**
 * CB-F1 — "Back to setup" must not report a live class's scores as zero.
 *
 * Court B finding, raised by two blinded testers and reproduced on the
 * unmutated candidate: mid-game, with a team on 200, choosing `Back to setup`
 * showed a surface headed `Scores` reading 0 for every team. The teacher's own
 * state was intact — only this surface lied about it.
 *
 * The surface is the audience-display preview inside Class Setup's Ready
 * overview. It renders the REAL display scoreboard component, whose heading is
 * `Scores` and whose per-team accessible name is `<team>: <n> points`, so a
 * false zero is both read and announced.
 *
 * Route is natural and ordinary: REACH (start a class and play a clue) -> ACT
 * (award a non-zero score) -> VISIBLE EFFECT (Back to setup tells the truth)
 * -> CONTINUATION (returning to gameplay preserves the real score).
 *
 * This asserts the PROJECTED NUMBER, not merely the presence of some text: a
 * misleading-but-differently-worded zero would still fail.
 */

const [GRANITE, NIMBUS] = COURT_QUALIFICATION_TEAM_NAMES

/** The Ready-overview preview of the audience display, by its visible heading. */
function setupScorePreview(page: Page) {
  return page.getByRole('region', { name: 'Class setup' }).getByRole('region', { name: 'Scores' })
}

test('CB-F1: Back to setup reports the live class scores, not zero', async ({ page, context }) => {
  await importPlayNamesDisplayStartRound1(page, context)

  // ACT: award a non-zero score to exactly one team, by the ordinary route.
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${NIMBUS}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${NIMBUS}`) }).click()

  // The teacher's own ledger agrees before leaving gameplay.
  await expect(
    page.getByText(new RegExp(`Last score change: ${NIMBUS} \\+200`)),
  ).toBeVisible()

  // VISIBLE EFFECT: Back to setup must not claim both teams are on zero.
  await page.getByRole('button', { name: 'Back to setup' }).click()
  const preview = setupScorePreview(page)
  await expect(preview).toBeVisible()

  // Assert the projected VALUES, via the accessible names the display emits.
  // `<team>: 200 points` is what a truthful preview of the projector says.
  await expect(
    preview.getByLabel(new RegExp(`^${NIMBUS}: 200 points?$`)),
    'the Back-to-setup preview must show the score this class actually has, not zero',
  ).toBeVisible()
  await expect(
    preview.getByLabel(new RegExp(`^${GRANITE}: 0 points?$`)),
    'the team that scored nothing is still legitimately zero',
  ).toBeVisible()

  // And it must not be announcing a false zero for the team that scored.
  await expect(
    preview.getByLabel(new RegExp(`^${NIMBUS}: 0 points?$`)),
    'a live class on 200 must never be announced as zero on the setup surface',
  ).toHaveCount(0)

  // CONTINUATION: going back into gameplay preserves the real score.
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(
    page.getByText(new RegExp(`Last score change: ${NIMBUS} \\+200`)),
  ).toBeVisible()
})

test('CB-F1: a class that has scored nothing still shows zero on both teams', async ({
  page,
  context,
}) => {
  // The repair must not invent scores: before any award, zero is the truth.
  await importPlayNamesDisplayStartRound1(page, context)
  await page.getByRole('button', { name: 'Back to setup' }).click()

  const preview = setupScorePreview(page)
  await expect(preview).toBeVisible()
  for (const team of [GRANITE, NIMBUS]) {
    await expect(preview.getByLabel(new RegExp(`^${team}: 0 points?$`))).toBeVisible()
  }
})
