import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import {
  visualStressBoardCorrectOutcomeSnapshot,
  visualStressBoardSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressPromptOnlySnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import {
  visualHistoryFinalCompleteWinnerSnapshot,
  visualHistoryFinalSetupSnapshot,
} from '../../src/test/visualHistoryFinalSnapshots'
import { openDisplay, injectPublicState, assertNoHorizontalOverflow } from './helpers/displayPublicState'
import { prepareDeterministicCapture } from './helpers/visualHistoryCapture'
import type { PublicState } from '../../src/state/publicState'

const ENABLED = process.env.CQS_DISPLAY_VISUAL_REVIEW === '1'

async function capture(
  page: Parameters<typeof openDisplay>[0],
  projectName: string,
  basename: string,
  state: PublicState,
  waitForTestId: string,
) {
  await openDisplay(page)
  await prepareDeterministicCapture(page)
  await injectPublicState(page, state)
  await expect(page.getByTestId(waitForTestId)).toBeVisible({ timeout: 15_000 })
  await assertNoHorizontalOverflow(page)
  await page.waitForTimeout(150)
  const outDir = path.resolve('test-results/display-visual-review', projectName)
  await mkdir(outDir, { recursive: true })
  await page.screenshot({ path: path.join(outDir, basename), fullPage: false })
}

test.describe('Display visual convergence review captures', () => {
  test.skip(!ENABLED, 'Set CQS_DISPLAY_VISUAL_REVIEW=1 for review captures')

  test('captures the principal 1080p states', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p review project only')
    const shots = [
      ['01-board.png', visualStressBoardSnapshot(810), 'cbd-board'],
      ['02-prompt.png', visualStressPromptOnlySnapshot(811), 'cbd-prompt'],
      ['03-active-claim.png', visualStressFirstActiveClaimSnapshot(812), 'bqd-active'],
      ['04-correct.png', visualStressBoardCorrectOutcomeSnapshot(813), 'board-outcome'],
      ['05-final-setup.png', visualHistoryFinalSetupSnapshot(814), 'fwd-setup'],
      ['06-winner.png', visualHistoryFinalCompleteWinnerSnapshot(815), 'fwd-winner'],
    ] as const

    for (const [basename, state, testId] of shots) {
      await capture(page, info.project.name, basename, state, testId)
    }
  })

  test('captures the board at 720p', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p review project only')
    await capture(page, info.project.name, '07-board-720p.png', visualStressBoardSnapshot(820), 'cbd-board')
  })
})
