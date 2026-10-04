import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames } from './helpers/menusClassSetup'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'
import {
  expectAdvancedDiagnosticsUnused,
  expectDisplayPrivate,
  openAudienceFromHost,
} from './helpers/menusQ3'

/**
 * Q6-RP-1 — ordinary Host round progression (G1) + truthful public Display
 * status (G2) on the real Host → Display path.
 *
 * Authorization: AUTHORIZE-CQS-Q6-COURT-LANDING-AND-RP1-REPAIR-1
 *
 * Every step uses ordinary teacher controls on the focused Host. More /
 * Advanced diagnostics is never opened. Nothing is injected into PublicState;
 * the Display is the Host-opened audience window fed by the live sync channel.
 * Keyboard only; physical Sony / projector NOT RUN.
 */

test.describe.configure({ mode: 'serial' })

const STALE_STATUS = 'Waiting for the first round'

/** Two category-board rounds + Final, imported through Home (canonical pipeline). */
function multiRoundGameJson(): string {
  const tile = (id: string, value: number, prompt: string, answer: string) => ({
    id,
    value,
    prompt,
    answer,
    notes: `${id} host-only note — never project`,
  })
  return JSON.stringify({
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'q6-rp1-multi-round',
    title: 'Q6 RP1 Multi Round',
    timer: { responseSeconds: 45 },
    teams: [
      { id: 'alpha', name: 'Alpha Rockets', accent: 'crimson' },
      { id: 'bravo', name: 'Bravo Comets', accent: 'azure' },
    ],
    rounds: [
      {
        id: 'round-one',
        type: 'category-board',
        title: 'Round One',
        config: {
          categories: [
            {
              id: 'r1-science',
              title: 'Science',
              tiles: [
                tile('r1-sci-100', 100, 'RP1 round one prompt A', 'RP1 answer alpha one'),
                tile('r1-sci-200', 200, 'RP1 round one prompt B', 'RP1 answer alpha two'),
              ],
            },
          ],
        },
      },
      {
        id: 'round-two',
        type: 'category-board',
        title: 'Round Two',
        config: {
          categories: [
            {
              id: 'r2-history',
              title: 'History',
              tiles: [tile('r2-his-300', 300, 'RP1 round two prompt', 'RP1 answer bravo')],
            },
          ],
        },
      },
      {
        id: 'final-round',
        type: 'final-wager',
        title: 'Final Wager',
        config: {
          prompt: 'RP1 final prompt: name the closest star.',
          answer: 'The Sun',
          notes: 'RP1 final host-only note — never project',
        },
      },
    ],
  })
}

async function namesAndStart(host: Page): Promise<void> {
  const skip = host.getByTestId('setup-skip-buzzers')
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await fillAllTeamNames(host)
  await expect(host.getByTestId('setup-play')).toBeEnabled()
  await host.getByTestId('setup-play').click()
  await expect(host.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(host).toHaveURL(/[?&]play=/)
}

async function expectDisplayStatusTruthfulInPlay(display: Page): Promise<void> {
  await expect(display.getByTestId('nexus-core')).not.toContainText(STALE_STATUS)
  await expect(display.locator('body')).not.toContainText(STALE_STATUS)
}

test('RP1-A: Start Round 1 → Round 2 → Final with ordinary controls; Display status truthful', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importMenusJsonAndPlay(host, multiRoundGameJson())
  await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await namesAndStart(host)
  const display = await openAudienceFromHost(context, host)

  // Before the first round: the truthful pre-round status, and one required action.
  await expect(display.getByTestId('nexus-detail')).toHaveText(/Waiting for the first round/)
  await expect(host.getByTestId('rph-start')).toBeVisible()
  await expect(host.getByTestId('rph-start')).toHaveText('Start Round 1')
  await expect(host.getByTestId('cbh-grid')).toHaveCount(0)
  await expectAdvancedDiagnosticsUnused(host)

  // G1: ordinary Start Round 1.
  await host.getByTestId('rph-start').click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await expect(host.getByTestId('rph-status')).toHaveText('Round 1 of 3 · 0 of 2 clues played')
  await expect(host.getByTestId('rph-next')).toHaveText('Start Round 2')
  await expect(display.getByTestId('cbd-board')).toContainText('Science')
  // G2: in-round status is truthful on the projector.
  await expect(display.getByTestId('nexus-detail')).toHaveText('Playing')
  await expectDisplayStatusTruthfulInPlay(display)

  // A clue is open → the round cannot change until the teacher returns to the board.
  await host.getByTestId('cbh-tile-r1-sci-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('cbd-prompt')).toContainText('RP1 round one prompt A')
  await expect(host.getByTestId('rph-next')).toBeDisabled()
  await expect(host.getByTestId('rph-blocked-note')).toBeVisible()
  await expectDisplayStatusTruthfulInPlay(display)
  // Reveal the answer, then return: the clue is played (cancel from the prompt
  // would leave it unplayed by design).
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(host.getByTestId('rph-next')).toBeDisabled()
  await host.getByTestId('cbh-return').click()
  await expect(host.getByTestId('rph-status')).toHaveText('Round 1 of 3 · 1 of 2 clues played')

  // Clues remain → explicit confirmation; Keep playing changes nothing.
  await host.getByTestId('rph-next').click()
  await expect(host.getByTestId('rph-confirm')).toContainText('1 clue has not been played')
  await host.getByTestId('rph-cancel').click()
  await expect(host.getByTestId('rph-status')).toContainText('Round 1 of 3')
  await host.getByTestId('rph-next').click()
  await host.getByTestId('rph-next-confirm').click()

  // Round 2 on Host and Display.
  await expect(host.getByTestId('cbh-tile-r2-his-300')).toBeVisible()
  await expect(host.getByTestId('rph-status')).toHaveText('Round 2 of 3 · 0 of 1 clues played')
  await expect(display.getByTestId('cbd-board')).toContainText('History')
  await expectDisplayStatusTruthfulInPlay(display)

  // Play the only clue → board done → the next step is primary and needs no confirm.
  await host.getByTestId('cbh-tile-r2-his-300').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId('cbh-return').click()
  await expect(host.getByTestId('rph-status')).toHaveText('Round 2 of 3 · 1 of 1 clues played')
  await expect(host.getByTestId('rph-next')).toHaveText('Go to the Final')
  await host.getByTestId('rph-next').click()
  await expect(host.getByTestId('rph-confirm')).toHaveCount(0)

  // Final on Host; the progression panel steps aside for the Final panel.
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
  await expect(host.getByTestId('rph')).toHaveCount(0)
  await expect(display.getByTestId('fwd-setup')).toBeVisible()
  await expectDisplayStatusTruthfulInPlay(display)
  await expectDisplayPrivate(display, [
    'RP1 answer alpha one',
    'RP1 answer bravo',
    'The Sun',
    'host-only note',
  ])
  await expectAdvancedDiagnosticsUnused(host)

  await host.close()
  await display.close()
})

test('RP1-B: board-only game ends through the ordinary End the game control', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importMenusJsonAndPlay(
    host,
    menusBoardGameJson({ id: 'q6-rp1-board-only', title: 'Q6 RP1 Board Only', teamCount: 2 }),
  )
  await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await namesAndStart(host)
  const display = await openAudienceFromHost(context, host)

  await host.getByTestId('rph-start').click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await expect(host.getByTestId('rph-status')).toHaveText('Round 1 of 1 · 0 of 4 clues played')
  // No later round and no Final → the ordinary next step is ending the game.
  await expect(host.getByTestId('rph-next')).toHaveCount(0)
  await expect(host.getByTestId('rph-end')).toHaveText('End the game')

  // Irreversible → always confirmed; unplayed clues are named.
  await host.getByTestId('rph-end').click()
  await expect(host.getByTestId('rph-confirm')).toContainText('4 clues have not been played')
  await expect(host.getByTestId('rph-confirm')).toContainText("can't be undone")
  await host.getByTestId('rph-cancel').click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()

  await host.getByTestId('rph-end').click()
  await host.getByTestId('rph-end-confirm').click()

  // Completion: Host summary; Display says the game is complete — truthfully.
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByTestId('rph')).toHaveCount(0)
  await expect(host.getByTestId('cbh-grid')).toHaveCount(0)
  await expect(display.getByTestId('nexus-stage')).toHaveText('Game complete')
  await expectDisplayStatusTruthfulInPlay(display)
  await expect(display.getByTestId('session-summary-panel')).toHaveCount(0)
  await expectAdvancedDiagnosticsUnused(host)

  await host.close()
  await display.close()
})
