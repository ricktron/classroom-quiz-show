import { test, expect, type Page } from '@playwright/test'
import {
  visualStressAnswerRevealSnapshot,
  visualStressArmedWaitingBuzzSnapshot,
  visualStressActiveClaimMaxWaitingSnapshot,
  visualStressBoardCorrectOutcomeSnapshot,
  visualStressBoardIncorrectWithActiveSnapshot,
  visualStressBoardPassedOutcomeSnapshot,
  visualStressBoardSnapshot,
  visualStressCategoryClearedBoardSnapshot,
  visualStressFinalSetupFromBoardSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressFreshBoardSnapshot,
  visualStressImagePromptSnapshot,
  visualStressLongPromptSnapshot,
  visualStressPromptOnlySnapshot,
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
  visualHistoryRoundUnavailableSnapshot,
  visualHistoryScoresUnavailableSnapshot,
} from '../../src/test/visualHistoryRecoverySnapshots'
import {
  captureDisplayState,
  capturePage,
} from './helpers/visualHistoryCapture'

/**
 * S05 visual historian — deterministic browser captures into
 * docs/design/history/2026-09-s05-complete/screenshots/.
 *
 * Gated by CQS_VISUAL_HISTORY_CAPTURE=1 so ordinary `npm run test:e2e` does not
 * rewrite historical PNGs. Regenerate with:
 *   npm run capture:visual-history
 *
 * Browser captures are not Electron / Windows / projector / Sidecar evidence.
 */

const ENABLED = process.env.CQS_VISUAL_HISTORY_CAPTURE === '1'

test.describe.configure({ mode: 'serial' })

test.describe('S05 visual historian capture', () => {
  test.skip(!ENABLED, 'Set CQS_VISUAL_HISTORY_CAPTURE=1 to regenerate historical screenshots')

  test('audience Display surfaces (1080p + selected stress)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p historian primary viewport')

    const shots: Array<{
      folder: string
      basename: string
      state: ReturnType<typeof visualStressFreshBoardSnapshot> | null
      waitForTestId?: string
      theme?: 'default' | 'high-contrast'
      reducedMotion?: boolean
    }> = [
      {
        folder: 'audience',
        basename: 'audience-board-pristine-1920x1080.png',
        state: visualStressFreshBoardSnapshot(500),
        waitForTestId: 'cbd-board',
      },
      {
        folder: 'audience',
        basename: 'audience-board-partial-1920x1080.png',
        state: visualStressBoardSnapshot(501),
        waitForTestId: 'cbd-board',
      },
      {
        folder: 'audience',
        basename: 'audience-board-depleted-1920x1080.png',
        state: visualHistoryBoardDepletedSnapshot(502),
        waitForTestId: 'cbd-board',
      },
      {
        folder: 'round-flow',
        basename: 'audience-board-category-cleared-1920x1080.png',
        state: visualStressCategoryClearedBoardSnapshot(503),
        waitForTestId: 'cbd-board',
      },
      {
        folder: 'scoreboard',
        basename: 'audience-scoreboard-stress-1920x1080.png',
        state: visualStressBoardSnapshot(504),
        waitForTestId: 'display-scores',
      },
      {
        folder: 'clue',
        basename: 'audience-clue-selected-1920x1080.png',
        state: visualStressSelectedSnapshot(510),
        waitForTestId: 'cbd-open',
      },
      {
        folder: 'clue',
        basename: 'audience-clue-prompt-1920x1080.png',
        state: visualStressPromptOnlySnapshot(511),
        waitForTestId: 'cbd-prompt',
      },
      {
        folder: 'clue',
        basename: 'audience-clue-answer-revealed-1920x1080.png',
        state: visualStressAnswerRevealSnapshot(512),
        waitForTestId: 'cbd-answer',
      },
      {
        folder: 'stress',
        basename: 'audience-clue-prompt-longtext-1920x1080.png',
        state: visualStressLongPromptSnapshot(513),
        waitForTestId: 'cbd-prompt',
      },
      {
        folder: 'stress',
        basename: 'audience-clue-image-1920x1080.png',
        state: visualStressImagePromptSnapshot(514),
        waitForTestId: 'mcd-img',
      },
      {
        folder: 'buzz',
        basename: 'audience-buzz-armed-waiting-1920x1080.png',
        state: visualStressArmedWaitingBuzzSnapshot(520),
        waitForTestId: 'signal-rail-status',
      },
      {
        folder: 'buzz',
        basename: 'audience-buzz-active-claim-1920x1080.png',
        state: visualStressFirstActiveClaimSnapshot(521),
        waitForTestId: 'bqd-active',
      },
      {
        folder: 'buzz',
        basename: 'audience-buzz-active-max-waiting-1920x1080.png',
        state: visualStressActiveClaimMaxWaitingSnapshot(522),
        waitForTestId: 'bqd-waiting',
      },
      {
        folder: 'outcome',
        basename: 'audience-outcome-correct-1920x1080.png',
        state: visualStressBoardCorrectOutcomeSnapshot(530),
        waitForTestId: 'board-outcome',
      },
      {
        folder: 'outcome',
        basename: 'audience-outcome-incorrect-with-active-1920x1080.png',
        state: visualStressBoardIncorrectWithActiveSnapshot(531),
        waitForTestId: 'board-outcome',
      },
      {
        folder: 'outcome',
        basename: 'audience-outcome-passed-1920x1080.png',
        state: visualStressBoardPassedOutcomeSnapshot(532),
        waitForTestId: 'board-outcome',
      },
      {
        folder: 'round-flow',
        basename: 'audience-round-final-bridge-1920x1080.png',
        state: visualStressFinalSetupFromBoardSnapshot(540),
        waitForTestId: 'audience-final',
      },
      {
        folder: 'final',
        basename: 'audience-final-setup-1920x1080.png',
        state: visualHistoryFinalSetupSnapshot(550),
        waitForTestId: 'fwd-setup',
      },
      {
        folder: 'final',
        basename: 'audience-final-wager-entry-1920x1080.png',
        state: visualHistoryFinalWagerEntrySnapshot(551),
        waitForTestId: 'fwd-wager-entry',
      },
      {
        folder: 'final',
        basename: 'audience-final-wagers-locked-1920x1080.png',
        state: visualHistoryFinalWagersLockedSnapshot(552),
        waitForTestId: 'audience-final',
      },
      {
        folder: 'final',
        basename: 'audience-final-response-entry-1920x1080.png',
        state: visualHistoryFinalResponseEntrySnapshot(553),
        waitForTestId: 'fwd-prompt',
      },
      {
        folder: 'final',
        basename: 'audience-final-responses-locked-1920x1080.png',
        state: visualHistoryFinalResponsesLockedSnapshot(554),
        waitForTestId: 'fwd-prompt',
      },
      {
        folder: 'final',
        basename: 'audience-final-answer-revealed-1920x1080.png',
        state: visualHistoryFinalAnswerRevealedSnapshot(555),
        waitForTestId: 'fwd-answer',
      },
      {
        folder: 'final',
        basename: 'audience-final-team-reveal-pending-1920x1080.png',
        state: visualHistoryFinalTeamRevealPendingSnapshot(556),
        waitForTestId: 'fwd-reveal-team',
      },
      {
        folder: 'final',
        basename: 'audience-final-settlement-correct-1920x1080.png',
        state: visualHistoryFinalSettlementCorrectSnapshot(557),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        folder: 'final',
        basename: 'audience-final-settlement-incorrect-1920x1080.png',
        state: visualHistoryFinalSettlementIncorrectSnapshot(558),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        folder: 'final',
        basename: 'audience-final-settlement-no-response-1920x1080.png',
        state: visualHistoryFinalSettlementNoResponseSnapshot(559),
        waitForTestId: 'fwd-reveal-outcome',
      },
      {
        folder: 'final',
        basename: 'audience-final-resolution-unique-leader-1920x1080.png',
        state: visualHistoryFinalResolutionUniqueLeaderSnapshot(560),
        waitForTestId: 'fwd-outcome',
      },
      {
        folder: 'final',
        basename: 'audience-final-resolution-tied-1920x1080.png',
        state: visualHistoryFinalResolutionTiedSnapshot(561),
        waitForTestId: 'fwd-outcome',
      },
      {
        folder: 'final',
        basename: 'audience-final-sudden-death-1920x1080.png',
        state: visualHistoryFinalSuddenDeathSnapshot(562),
        waitForTestId: 'fwd-sudden-death',
      },
      {
        folder: 'completion',
        basename: 'audience-final-complete-winner-1920x1080.png',
        state: visualHistoryFinalCompleteWinnerSnapshot(570),
        waitForTestId: 'fwd-outcome',
      },
      {
        folder: 'completion',
        basename: 'audience-final-complete-tied-1920x1080.png',
        state: visualHistoryFinalCompleteTiedSnapshot(571),
        waitForTestId: 'fwd-outcome',
      },
      {
        folder: 'completion',
        basename: 'audience-final-complete-generic-safe-1920x1080.png',
        state: visualHistoryFinalCompleteGenericSafeSnapshot(572),
        waitForTestId: 'fwd-outcome',
      },
      {
        folder: 'recovery',
        basename: 'audience-recovery-waiting-1920x1080.png',
        state: null,
        waitForTestId: 'audience-waiting-copy',
      },
      {
        folder: 'recovery',
        basename: 'audience-recovery-scores-unavailable-1920x1080.png',
        state: visualHistoryScoresUnavailableSnapshot(580),
        waitForTestId: 'tsb-unavailable',
      },
      {
        folder: 'recovery',
        basename: 'audience-recovery-round-unavailable-1920x1080.png',
        state: visualHistoryRoundUnavailableSnapshot(581),
        waitForTestId: 'audience-shell',
      },
      {
        folder: 'stress',
        basename: 'audience-board-high-contrast-1920x1080.png',
        state: visualStressBoardSnapshot(590),
        waitForTestId: 'cbd-board',
        theme: 'high-contrast',
      },
      {
        folder: 'stress',
        basename: 'audience-clue-reduced-motion-1920x1080.png',
        state: visualStressArmedWaitingBuzzSnapshot(591),
        waitForTestId: 'signal-rail-status',
        reducedMotion: true,
      },
    ]

    for (const shot of shots) {
      await captureDisplayState(page, {
        folder: shot.folder,
        basename: shot.basename,
        state: shot.state,
        waitForTestId: shot.waitForTestId,
        theme: shot.theme,
        reducedMotion: shot.reducedMotion,
      })
    }
  })

  test('audience board 720p stress', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p stress viewport only')
    await captureDisplayState(page, {
      folder: 'stress',
      basename: 'audience-board-partial-1280x720.png',
      state: visualStressBoardSnapshot(600),
      waitForTestId: 'cbd-board',
    })
  })

  test('app / authoring / setup surfaces', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', 'host/app captures on desktop-1080p')

    // Fresh context so Home persistence lock is not held by a prior Display tab.
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      baseURL: info.project.use.baseURL as string | undefined,
    })
    const page = await context.newPage()
    try {
      await page.goto('./')
      await capturePage(page, {
        folder: 'app',
        basename: 'app-home-1920x1080.png',
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
        },
      })

      // Import demo → quality report + library
      await page.getByTestId('home-import-game').click()
      await page.getByTestId('home-import-demo').click()
      await expect(page.getByTestId('import-quality-report')).toBeVisible({ timeout: 15_000 })
      await capturePage(page, {
        folder: 'authoring',
        basename: 'authoring-import-success-1920x1080.png',
        waitFor: async () => {
          await expect(page.getByTestId('import-quality-report')).toBeVisible()
        },
      })
      await capturePage(page, {
        folder: 'app',
        basename: 'app-home-with-game-1920x1080.png',
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /my games/i })).toBeVisible()
        },
      })

      // Class Setup (names + Sony copy) — reached via Play, not import alone
      await page.getByRole('button', { name: /^play$/i }).first().click()
      await expect(page.getByTestId('classroom-setup')).toBeVisible()
      await capturePage(page, {
        folder: 'setup',
        basename: 'setup-class-team-names.png',
        waitFor: async () => {
          await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
        },
        scrollTestId: 'classroom-setup',
      })
      await capturePage(page, {
        folder: 'setup',
        basename: 'setup-sony-ordinary-copy.png',
        waitFor: async () => {
          await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
        },
        scrollTestId: 'setup-sony-copy',
      })

      // Authoring edit — return Home then Edit
      await page.goto('./')
      await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
      await page.getByRole('button', { name: /^edit$/i }).first().click()
      await capturePage(page, {
        folder: 'authoring',
        basename: 'authoring-edit-demo-1920x1080.png',
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
        },
      })
    } finally {
      await context.close()
    }
  })

  test('host gameplay surfaces', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', 'host captures on desktop-1080p')
    test.slow()

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      baseURL: info.project.use.baseURL as string | undefined,
    })
    const page = await context.newPage()
    try {
      await page.goto('#/host')
      await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()

      await capturePage(page, {
        folder: 'host',
        basename: 'host-empty-load-game.png',
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /load a game/i })).toBeVisible()
        },
        scrollTestId: 'start-new-game-session',
      })

      await driveHostBoardAndFinal(page)
    } finally {
      await context.close()
    }
  })
})

async function driveHostBoardAndFinal(host: Page) {
  await host.getByTestId('start-new-game-session').click()
  await host.getByRole('button', { name: /load board \+ final-wager sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()

  await capturePage(host, {
    folder: 'host',
    basename: 'host-board-control.png',
    waitFor: async () => {
      await expect(host.getByTestId('cbh-grid')).toBeVisible()
    },
    scrollTestId: 'cbh-grid',
  })

  await host.getByTestId('cbh-tile-earth-structure-100').click()
  await capturePage(host, {
    folder: 'host',
    basename: 'host-clue-selected.png',
    waitFor: async () => {
      await expect(host.getByTestId('cbh-reveal-prompt')).toBeVisible()
    },
    scrollTestId: 'cbh-reveal-prompt',
  })

  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await host.getByTestId('cbh-return').click()
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()

  await capturePage(host, {
    folder: 'host',
    basename: 'host-final-setup.png',
    waitFor: async () => {
      await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
    },
    scrollTestId: 'fwh-begin',
  })

  // Drive to settlement for Host settlement controls screenshot
  await host.getByTestId('fwh-begin').click()
  await host.getByTestId('fwh-wager-input-basalts').fill('75')
  await host.getByTestId('fwh-save-wager-basalts').click()
  await host.getByTestId('fwh-lock-wagers').click()
  await host.getByTestId('fwh-capture-exact-text').check()
  await host.getByTestId('fwh-start-response').click()
  await host.getByTestId('fwh-response-input-basalts').fill('Mantle convection')
  await host.getByTestId('fwh-save-exact-basalts').click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()
  await host.getByTestId('fwh-reveal-basalts').click()

  await capturePage(host, {
    folder: 'host',
    basename: 'host-final-settlement.png',
    waitFor: async () => {
      await expect(host.getByTestId('fwh-settle-correct')).toBeVisible()
    },
    scrollTestId: 'fwh-settle-correct',
  })
}
