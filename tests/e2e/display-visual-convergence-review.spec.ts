/**
 * Gated Display visual-convergence review captures.
 *
 * Writes under test-results/display-visual-review/<family>/ — never into the
 * immutable S05 historian archive. Enable with CQS_DISPLAY_VISUAL_REVIEW=1.
 */

import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import {
  visualStressActiveClaimMaxWaitingSnapshot,
  visualStressAnswerRevealSnapshot,
  visualStressArmedWaitingBuzzSnapshot,
  visualStressBoardCorrectOutcomeSnapshot,
  visualStressBoardIncorrectWithActiveSnapshot,
  visualStressBoardPassedOutcomeSnapshot,
  visualStressBoardSnapshot,
  visualStressCategoryClearedBoardSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressFreshBoardSnapshot,
  visualStressImagePromptSnapshot,
  visualStressLongPromptSnapshot,
  visualStressPromptOnlySnapshot,
  visualStressPromotedActiveClaimSnapshot,
  visualStressSelectedSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import {
  visualHistoryFinalAnswerRevealedSnapshot,
  visualHistoryFinalCompleteGenericSafeSnapshot,
  visualHistoryFinalCompleteTiedSnapshot,
  visualHistoryFinalCompleteWinnerSnapshot,
  visualHistoryFinalResolutionTiedSnapshot,
  visualHistoryFinalResolutionUniqueLeaderSnapshot,
  visualHistoryFinalResponseEntrySnapshot,
  visualHistoryFinalResponsesLockedSnapshot,
  visualHistoryFinalSettlementCorrectSnapshot,
  visualHistoryFinalSettlementIncorrectSnapshot,
  visualHistoryFinalSettlementNoResponseSnapshot,
  visualHistoryFinalSetupSnapshot,
  visualHistoryFinalSuddenDeathSnapshot,
  visualHistoryFinalTeamRevealPendingSnapshot,
  visualHistoryFinalWagerEntrySnapshot,
  visualHistoryFinalWagersLockedSnapshot,
} from '../../src/test/visualHistoryFinalSnapshots'
import {
  visualHistoryBoardDepletedSnapshot,
  visualHistoryDisplayWaitingSnapshot,
  visualHistoryRoundUnavailableSnapshot,
  visualHistoryScoresUnavailableSnapshot,
} from '../../src/test/visualHistoryRecoverySnapshots'
import {
  openDisplay,
  injectPublicState,
  assertNoHorizontalOverflow,
} from './helpers/displayPublicState'
import { prepareDeterministicCapture } from './helpers/visualHistoryCapture'
import { PUBLIC_STATE_SCHEMA_VERSION, type PublicState } from '../../src/state/publicState'

const ENABLED = process.env.CQS_DISPLAY_VISUAL_REVIEW === '1'

type Shot = {
  readonly family: string
  readonly basename: string
  readonly state: PublicState | null
  readonly waitForTestId: string
  readonly theme?: 'default' | 'high-contrast'
  readonly reducedMotion?: boolean
}

async function capture(
  page: Parameters<typeof openDisplay>[0],
  projectName: string,
  shot: Shot,
  /** Monotonic revision so later injects are never rejected as stale. */
  revision: number,
) {
  if (shot.reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  } else {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  }
  if (shot.state === null) {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
    await openDisplay(page, shot.theme)
    await page.reload()
    await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  } else {
    await openDisplay(page, shot.theme)
  }
  await prepareDeterministicCapture(page)
  if (shot.state !== null) {
    await injectPublicState(page, { ...shot.state, revision })
  }
  await expect(page.getByTestId(shot.waitForTestId)).toBeVisible({ timeout: 15_000 })
  await assertNoHorizontalOverflow(page)
  await page.waitForTimeout(150)
  const outDir = path.resolve('test-results/display-visual-review', projectName, shot.family)
  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: path.join(outDir, shot.basename), fullPage: false })
}

/** Column / Strip / Deck stress boards with 1 / 4 / 6 / 8 teams via public wire. */
function scoreLayoutBoard(revision: number, teamCount: 1 | 4 | 6 | 8): PublicState {
  const base = visualStressBoardSnapshot(revision)
  if (!base.teams || base.teams.status !== 'available') return base
  return {
    ...base,
    revision,
    teams: {
      status: 'available',
      teams: base.teams.teams.slice(0, teamCount),
    },
  }
}

/** Public paused-timer prompt for Nexus/Signal Rail review (no Host invention). */
function pausedTimerPromptSnapshot(revision: number): PublicState {
  const base = visualStressPromptOnlySnapshot(revision)
  return {
    ...base,
    revision,
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    round: {
      kind: 'board',
      stage: 'prompt',
      selection: {
        categoryTitle: 'Science',
        value: 100,
        prompt: { kind: 'text', text: 'Paused timer prompt for projector review.' },
        answer: null,
      },
    },
    response: {
      armed: true,
      timer: { status: 'paused', durationMs: 20_000, remainingMs: 12_500 },
      buzz: { status: 'none' },
      boardOutcome: { status: 'none' },
    },
  }
}

test.describe('Display visual convergence review captures', () => {
  test.skip(!ENABLED, 'Set CQS_DISPLAY_VISUAL_REVIEW=1 for review captures')

  test('captures material 1080p visual families', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p review project only')

    const shots: Shot[] = [
      // Shell / board
      { family: 'shell', basename: 'waiting.png', state: null, waitForTestId: 'audience-waiting-copy' },
      {
        family: 'board',
        basename: 'pristine.png',
        state: visualStressFreshBoardSnapshot(900),
        waitForTestId: 'cbd-board',
      },
      {
        family: 'board',
        basename: 'partial-used.png',
        state: visualStressBoardSnapshot(901),
        waitForTestId: 'cbd-board',
      },
      {
        family: 'board',
        basename: 'category-cleared.png',
        state: visualStressCategoryClearedBoardSnapshot(902),
        waitForTestId: 'cbd-board',
      },
      {
        family: 'board',
        basename: 'depleted.png',
        state: visualHistoryBoardDepletedSnapshot(903),
        waitForTestId: 'cbd-board',
      },
      {
        family: 'clue',
        basename: 'selected.png',
        state: visualStressSelectedSnapshot(910),
        waitForTestId: 'cbd-open',
      },
      {
        family: 'clue',
        basename: 'prompt.png',
        state: visualStressPromptOnlySnapshot(911),
        waitForTestId: 'cbd-prompt',
      },
      {
        family: 'clue',
        basename: 'prompt-long.png',
        state: visualStressLongPromptSnapshot(912),
        waitForTestId: 'cbd-prompt',
      },
      {
        family: 'clue',
        basename: 'prompt-image.png',
        state: visualStressImagePromptSnapshot(913),
        waitForTestId: 'mcd-img',
      },
      {
        family: 'clue',
        basename: 'timer-paused.png',
        state: pausedTimerPromptSnapshot(915),
        waitForTestId: 'nexus-timer',
      },
      {
        family: 'clue',
        basename: 'answer-reveal.png',
        state: visualStressAnswerRevealSnapshot(914),
        waitForTestId: 'cbd-answer',
      },
      // Buzz / outcomes
      {
        family: 'buzz',
        basename: 'armed.png',
        state: visualStressArmedWaitingBuzzSnapshot(920),
        waitForTestId: 'signal-rail-status',
      },
      {
        family: 'buzz',
        basename: 'active-claim.png',
        state: visualStressFirstActiveClaimSnapshot(921),
        waitForTestId: 'bqd-active',
      },
      {
        family: 'buzz',
        basename: 'max-waiting.png',
        state: visualStressActiveClaimMaxWaitingSnapshot(923),
        waitForTestId: 'bqd-waiting',
      },
      {
        family: 'buzz',
        basename: 'promoted-claim.png',
        state: visualStressPromotedActiveClaimSnapshot(922),
        waitForTestId: 'bqd-active',
      },
      {
        family: 'outcome',
        basename: 'correct.png',
        state: visualStressBoardCorrectOutcomeSnapshot(930),
        waitForTestId: 'board-outcome',
      },
      {
        family: 'outcome',
        basename: 'incorrect-with-active.png',
        state: visualStressBoardIncorrectWithActiveSnapshot(931),
        waitForTestId: 'board-outcome',
      },
      {
        family: 'outcome',
        basename: 'passed.png',
        state: visualStressBoardPassedOutcomeSnapshot(932),
        waitForTestId: 'board-outcome',
      },
      // Scores
      {
        family: 'scores',
        basename: 'column-1.png',
        state: scoreLayoutBoard(939, 1),
        waitForTestId: 'tsb',
      },
      {
        family: 'scores',
        basename: 'column-4.png',
        state: scoreLayoutBoard(940, 4),
        waitForTestId: 'tsb',
      },
      {
        family: 'scores',
        basename: 'strip-6.png',
        state: scoreLayoutBoard(941, 6),
        waitForTestId: 'tsb',
      },
      {
        family: 'scores',
        basename: 'deck-8-stress.png',
        state: visualStressBoardSnapshot(942),
        waitForTestId: 'tsb',
      },
      // Final / completion
      {
        family: 'final',
        basename: 'setup.png',
        state: visualHistoryFinalSetupSnapshot(950),
        waitForTestId: 'fwd-setup',
      },
      {
        family: 'final',
        basename: 'wager-entry.png',
        state: visualHistoryFinalWagerEntrySnapshot(951),
        waitForTestId: 'fwd-wager-entry',
      },
      {
        family: 'final',
        basename: 'wagers-locked.png',
        state: visualHistoryFinalWagersLockedSnapshot(952),
        waitForTestId: 'audience-final',
      },
      {
        family: 'final',
        basename: 'response-entry.png',
        state: visualHistoryFinalResponseEntrySnapshot(953),
        waitForTestId: 'fwd-prompt',
      },
      {
        family: 'final',
        basename: 'responses-locked.png',
        state: visualHistoryFinalResponsesLockedSnapshot(954),
        waitForTestId: 'fwd-prompt',
      },
      {
        family: 'final',
        basename: 'answer-revealed.png',
        state: visualHistoryFinalAnswerRevealedSnapshot(955),
        waitForTestId: 'fwd-answer',
      },
      {
        family: 'final',
        basename: 'team-reveal.png',
        state: visualHistoryFinalTeamRevealPendingSnapshot(956),
        waitForTestId: 'fwd-reveal-team',
      },
      {
        family: 'final',
        basename: 'settlement-correct.png',
        state: visualHistoryFinalSettlementCorrectSnapshot(957),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        family: 'final',
        basename: 'settlement-incorrect.png',
        state: visualHistoryFinalSettlementIncorrectSnapshot(958),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        family: 'final',
        basename: 'settlement-no-response.png',
        state: visualHistoryFinalSettlementNoResponseSnapshot(959),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        family: 'final',
        basename: 'resolution-unique.png',
        state: visualHistoryFinalResolutionUniqueLeaderSnapshot(960),
        waitForTestId: 'fwd-outcome',
      },
      {
        family: 'final',
        basename: 'resolution-tied.png',
        state: visualHistoryFinalResolutionTiedSnapshot(961),
        waitForTestId: 'fwd-outcome',
      },
      {
        family: 'final',
        basename: 'sudden-death.png',
        state: visualHistoryFinalSuddenDeathSnapshot(962),
        waitForTestId: 'fwd-sudden-death',
      },
      {
        family: 'completion',
        basename: 'winner.png',
        state: visualHistoryFinalCompleteWinnerSnapshot(960),
        waitForTestId: 'fwd-winner',
      },
      {
        family: 'completion',
        basename: 'tied.png',
        state: visualHistoryFinalCompleteTiedSnapshot(961),
        waitForTestId: 'fwd-outcome',
      },
      {
        family: 'completion',
        basename: 'generic-safe.png',
        state: visualHistoryFinalCompleteGenericSafeSnapshot(962),
        waitForTestId: 'fwd-outcome',
      },
      // Recovery / a11y
      {
        family: 'recovery',
        basename: 'round-unavailable.png',
        state: visualHistoryRoundUnavailableSnapshot(970),
        waitForTestId: 'audience-shell',
      },
      {
        family: 'recovery',
        basename: 'scores-unavailable.png',
        state: visualHistoryScoresUnavailableSnapshot(971),
        waitForTestId: 'tsb-unavailable',
      },
      {
        family: 'a11y',
        basename: 'board-high-contrast.png',
        state: visualStressBoardSnapshot(980),
        waitForTestId: 'cbd-board',
        theme: 'high-contrast',
      },
      {
        family: 'a11y',
        basename: 'armed-reduced-motion.png',
        state: visualStressArmedWaitingBuzzSnapshot(981),
        waitForTestId: 'signal-rail-status',
        reducedMotion: true,
      },
      // Silence unused import warning path — waiting snapshot factory kept for matrix docs
      {
        family: 'shell',
        basename: 'waiting-ready-wire.png',
        state: visualHistoryDisplayWaitingSnapshot(),
        waitForTestId: 'audience-shell',
      },
    ]

    let revision = 2000
    for (const shot of shots) {
      await capture(page, info.project.name, shot, revision)
      revision += 1
    }
  })

  test('captures material 720p visual families', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p review project only')
    const shots: Shot[] = [
      {
        family: 'board',
        basename: 'partial-720p.png',
        state: visualStressBoardSnapshot(990),
        waitForTestId: 'cbd-board',
      },
      {
        family: 'clue',
        basename: 'prompt-long-720p.png',
        state: visualStressLongPromptSnapshot(991),
        waitForTestId: 'cbd-prompt',
      },
      {
        family: 'scores',
        basename: 'deck-8-720p.png',
        state: visualStressBoardSnapshot(992),
        waitForTestId: 'tsb',
      },
      {
        family: 'buzz',
        basename: 'active-claim-720p.png',
        state: visualStressFirstActiveClaimSnapshot(993),
        waitForTestId: 'bqd-active',
      },
      {
        family: 'completion',
        basename: 'winner-720p.png',
        state: visualHistoryFinalCompleteWinnerSnapshot(994),
        waitForTestId: 'fwd-winner',
      },
      {
        family: 'a11y',
        basename: 'board-hc-720p.png',
        state: visualStressBoardSnapshot(995),
        waitForTestId: 'cbd-board',
        theme: 'high-contrast',
      },
    ]
    let revision = 3000
    for (const shot of shots) {
      await capture(page, info.project.name, shot, revision)
      revision += 1
    }
  })
})
