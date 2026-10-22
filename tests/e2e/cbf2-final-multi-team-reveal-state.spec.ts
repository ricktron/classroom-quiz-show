import { test, expect, type Page } from '@playwright/test'
import {
  importPlayNamesDisplayStartRound1,
  COURT_QUALIFICATION_TEAM_NAMES,
} from './helpers/courtQualificationJourney'

/**
 * CB-F2 — each Final team's projector status must stand on its own.
 *
 * Court B finding, reported independently by two blinded testers on different
 * builds and reproduced on the unmutated candidate: after team A was revealed
 * AND judged, revealing team B flipped A's projector channel back to `Ready` —
 * the badge for a team the class had already watched be adjudicated.
 *
 * The cause is a state-derivation one, not styling: the rail decided every
 * badge from a single "currently revealed team" value, so any team that was not
 * the current one fell through to `Ready`. These tests therefore assert the
 * DERIVED STATUS (`data-channel-status`), not the rendered word, and they check
 * A both before and after B's judgment so a repair that merely freezes the last
 * reveal cannot pass.
 */

const [GRANITE, NIMBUS] = COURT_QUALIFICATION_TEAM_NAMES

const finalPanel = (page: Page) => page.getByRole('region', { name: 'Final wager' })

/** The projector channel for one team, addressed by its positional key. */
function channel(display: Page, key: string) {
  return display.getByTestId(`signal-rail-channel-${key}`)
}

async function statusOf(display: Page, key: string): Promise<string | null> {
  return channel(display, key).getAttribute('data-channel-status')
}

/** Board scoring so both teams carry a positive score (Classic Final needs it). */
async function scoreTile(page: Page, tile: string, team: string) {
  await page.getByRole('button', { name: tile }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

test('CB-F2: a judged Final team keeps its status when the next team is revealed', async ({
  page,
  context,
}) => {
  const display = await importPlayNamesDisplayStartRound1(page, context)

  await scoreTile(page, 'Rocks, 100 points', GRANITE)
  await scoreTile(page, 'Rocks, 200 points', NIMBUS)

  // Reach the Final by the ordinary route.
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  const confirm = page.getByRole('button', { name: 'Go to the Final now' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await page.getByRole('button', { name: 'Begin Final' }).click()

  const wagers = page.getByRole('group', { name: 'Team wagers' })
  // Each team has its own wager field; saving one relabels its button to
  // "Correct wager", so the remaining "Save wager" is the other team's.
  const spin = wagers.getByRole('spinbutton')
  await spin.nth(0).fill('50')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await spin.nth(1).fill('50')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()
  await page.getByRole('button', { name: 'Answered (no wording)' }).first().click()
  await page.getByRole('button', { name: 'Answered (no wording)' }).last().click()
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()

  // Before any team reveal, nobody is revealed.
  await expect(channel(display, 't0')).toBeVisible()
  expect(await statusOf(display, 't0')).toBe('ready')
  expect(await statusOf(display, 't1')).toBe('ready')

  // Reveal and judge team A (Granite, key t0).
  await page.getByRole('button', { name: new RegExp(`^Reveal ${GRANITE}`) }).click()
  await expect
    .poll(() => statusOf(display, 't0'))
    .not.toBe('ready')
  const aAfterReveal = await statusOf(display, 't0')
  await finalPanel(page).getByRole('button', { name: /^Correct \(/ }).click()
  await expect
    .poll(() => statusOf(display, 't0'))
    .not.toBe('ready')
  const aAfterJudgment = await statusOf(display, 't0')

  // The team whose turn has NOT come must still read "ready". Without this a
  // rail that marks every team revealed the moment anyone settles passes every
  // other assertion here, because they are all `not.toBe('ready')`.
  //
  // Wait for a POSITIVE signal that the settlement reached the projector before
  // reading the other channel. Polling t0 for `not 'ready'` would not do: it
  // already read `revealed` before the judgment, so it passes instantly and the
  // read below would race the snapshot rather than test it.
  await expect(
    display.getByLabel(new RegExp(`^${GRANITE}: 150 points?$`)),
    'the settlement must have reached the projector before the next check means anything',
  ).toBeVisible({ timeout: 10_000 })
  expect(
    await statusOf(display, 't1'),
    `${NIMBUS} has not been revealed yet, so settling ${GRANITE} must not mark it`,
  ).toBe('ready')

  // Now reveal team B. A has already been adjudicated in front of the class.
  await page.getByRole('button', { name: new RegExp(`^Reveal ${NIMBUS}`) }).click()
  await expect.poll(() => statusOf(display, 't1')).not.toBe('ready')

  expect(
    await statusOf(display, 't0'),
    `${GRANITE} was revealed (${aAfterReveal}) and judged (${aAfterJudgment}); revealing ${NIMBUS} must not return it to "ready"`,
  ).not.toBe('ready')

  // And judging B must not regress A either.
  await finalPanel(page).getByRole('button', { name: /^Correct \(/ }).click()
  await expect.poll(() => statusOf(display, 't1')).not.toBe('ready')
  expect(
    await statusOf(display, 't0'),
    `judging ${NIMBUS} must not return ${GRANITE} to "ready"`,
  ).not.toBe('ready')

  // With both teams adjudicated, neither channel may have fallen back to
  // "ready". (Host/Display agreement on the settled SET is pinned at the wire
  // layer by finalMultiTeamRevealState.test.ts, which reads the real store's
  // public projection rather than host prose.)
  expect(await statusOf(display, 't0')).not.toBe('ready')
  expect(await statusOf(display, 't1')).not.toBe('ready')

  // The projector still shows the class the correct scores alongside it.
  await expect(display.getByRole('region', { name: 'Scores' })).toBeVisible()
})
