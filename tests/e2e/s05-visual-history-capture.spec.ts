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
  type DisplayCaptureShot,
} from './helpers/visualHistoryCapture'

function shot(
  folder: string,
  basename: string,
  state: DisplayCaptureShot['state'],
  waitForTestId?: string,
  extras?: Pick<DisplayCaptureShot, 'theme' | 'reducedMotion'>,
): DisplayCaptureShot {
  return { folder, basename, state, waitForTestId, ...extras }
}

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

    const shots: DisplayCaptureShot[] = [
      shot('audience', 'audience-board-pristine-1920x1080.png', visualStressFreshBoardSnapshot(500), 'cbd-board'),
      shot('audience', 'audience-board-partial-1920x1080.png', visualStressBoardSnapshot(501), 'cbd-board'),
      shot('audience', 'audience-board-depleted-1920x1080.png', visualHistoryBoardDepletedSnapshot(502), 'cbd-board'),
      shot('round-flow', 'audience-board-category-cleared-1920x1080.png', visualStressCategoryClearedBoardSnapshot(503), 'cbd-board'),
      shot('scoreboard', 'audience-scoreboard-stress-1920x1080.png', visualStressBoardSnapshot(504), 'display-scores'),
      shot('clue', 'audience-clue-selected-1920x1080.png', visualStressSelectedSnapshot(510), 'cbd-open'),
      shot('clue', 'audience-clue-prompt-1920x1080.png', visualStressPromptOnlySnapshot(511), 'cbd-prompt'),
      shot('clue', 'audience-clue-answer-revealed-1920x1080.png', visualStressAnswerRevealSnapshot(512), 'cbd-answer'),
      shot('stress', 'audience-clue-prompt-longtext-1920x1080.png', visualStressLongPromptSnapshot(513), 'cbd-prompt'),
      shot('stress', 'audience-clue-image-1920x1080.png', visualStressImagePromptSnapshot(514), 'mcd-img'),
      shot('buzz', 'audience-buzz-armed-waiting-1920x1080.png', visualStressArmedWaitingBuzzSnapshot(520), 'signal-rail-status'),
      shot('buzz', 'audience-buzz-active-claim-1920x1080.png', visualStressFirstActiveClaimSnapshot(521), 'bqd-active'),
      shot('buzz', 'audience-buzz-active-max-waiting-1920x1080.png', visualStressActiveClaimMaxWaitingSnapshot(522), 'bqd-waiting'),
      shot('outcome', 'audience-outcome-correct-1920x1080.png', visualStressBoardCorrectOutcomeSnapshot(530), 'board-outcome'),
      shot('outcome', 'audience-outcome-incorrect-with-active-1920x1080.png', visualStressBoardIncorrectWithActiveSnapshot(531), 'board-outcome'),
      shot('outcome', 'audience-outcome-passed-1920x1080.png', visualStressBoardPassedOutcomeSnapshot(532), 'board-outcome'),
      shot('round-flow', 'audience-round-final-bridge-1920x1080.png', visualStressFinalSetupFromBoardSnapshot(540), 'audience-final'),
      shot('final', 'audience-final-setup-1920x1080.png', visualHistoryFinalSetupSnapshot(550), 'fwd-setup'),
      shot('final', 'audience-final-wager-entry-1920x1080.png', visualHistoryFinalWagerEntrySnapshot(551), 'fwd-wager-entry'),
      shot('final', 'audience-final-wagers-locked-1920x1080.png', visualHistoryFinalWagersLockedSnapshot(552), 'audience-final'),
      shot('final', 'audience-final-response-entry-1920x1080.png', visualHistoryFinalResponseEntrySnapshot(553), 'fwd-prompt'),
      shot('final', 'audience-final-responses-locked-1920x1080.png', visualHistoryFinalResponsesLockedSnapshot(554), 'fwd-prompt'),
      shot('final', 'audience-final-answer-revealed-1920x1080.png', visualHistoryFinalAnswerRevealedSnapshot(555), 'fwd-answer'),
      shot('final', 'audience-final-team-reveal-pending-1920x1080.png', visualHistoryFinalTeamRevealPendingSnapshot(556), 'fwd-reveal-team'),
      shot('final', 'audience-final-settlement-correct-1920x1080.png', visualHistoryFinalSettlementCorrectSnapshot(557), 'fwd-reveal-outcome'),
      shot('final', 'audience-final-settlement-incorrect-1920x1080.png', visualHistoryFinalSettlementIncorrectSnapshot(558), 'fwd-reveal-outcome'),
      shot('final', 'audience-final-settlement-no-response-1920x1080.png', visualHistoryFinalSettlementNoResponseSnapshot(559), 'fwd-reveal-outcome'),
      shot('final', 'audience-final-resolution-unique-leader-1920x1080.png', visualHistoryFinalResolutionUniqueLeaderSnapshot(560), 'fwd-outcome'),
      shot('final', 'audience-final-resolution-tied-1920x1080.png', visualHistoryFinalResolutionTiedSnapshot(561), 'fwd-outcome'),
      shot('final', 'audience-final-sudden-death-1920x1080.png', visualHistoryFinalSuddenDeathSnapshot(562), 'fwd-sudden-death'),
      shot('completion', 'audience-final-complete-winner-1920x1080.png', visualHistoryFinalCompleteWinnerSnapshot(570), 'fwd-outcome'),
      shot('completion', 'audience-final-complete-tied-1920x1080.png', visualHistoryFinalCompleteTiedSnapshot(571), 'fwd-outcome'),
      shot('completion', 'audience-final-complete-generic-safe-1920x1080.png', visualHistoryFinalCompleteGenericSafeSnapshot(572), 'fwd-outcome'),
      shot('recovery', 'audience-recovery-waiting-1920x1080.png', null, 'audience-waiting-copy'),
      shot('recovery', 'audience-recovery-scores-unavailable-1920x1080.png', visualHistoryScoresUnavailableSnapshot(580), 'tsb-unavailable'),
      shot('recovery', 'audience-recovery-round-unavailable-1920x1080.png', visualHistoryRoundUnavailableSnapshot(581), 'audience-shell'),
      shot('stress', 'audience-board-high-contrast-1920x1080.png', visualStressBoardSnapshot(590), 'cbd-board', { theme: 'high-contrast' }),
      shot('stress', 'audience-clue-reduced-motion-1920x1080.png', visualStressArmedWaitingBuzzSnapshot(591), 'signal-rail-status', { reducedMotion: true }),
    ]

    for (const entry of shots) {
      await captureDisplayState(page, entry)
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
