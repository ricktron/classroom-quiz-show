import { test, expect } from '@playwright/test'
import {
  visualStressBoardCorrectOutcomeSnapshot,
  visualStressBoardIncorrectWithActiveSnapshot,
  visualStressBoardPassedOutcomeSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import { visualStressTeams } from '../../src/test/visualStressFixtures'
import { openDisplay, injectPublicState } from './helpers/displayPublicState'
import type { PublicState } from '../../src/state/publicState'

/**
 * S05 Path A — board outcome public authority foundation.
 * Injects sanitizer-derived PublicState snapshots. Minimal truthful text only.
 */

test.describe.configure({ mode: 'serial' })

const TEAM_NAMES = visualStressTeams().map((team) => String(team.name))
const FIRST_TEAM = TEAM_NAMES[0]!
const SECOND_TEAM = TEAM_NAMES[1]!

test.describe('S05 board outcome public authority', () => {
  test('projects Correct + team without exhausted buzz copy', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressBoardCorrectOutcomeSnapshot(140))
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toBeVisible()
    await expect(outcome).toHaveAttribute('data-outcome-kind', 'correct')
    await expect(outcome).toHaveAttribute('data-seeded', 'true')
    await expect(outcome).toContainText('Correct')
    await expect(outcome).toContainText(FIRST_TEAM)
    await expect(page.getByText(/No one left to answer/i)).toHaveCount(0)
    await expect(page.getByText(/Response ready/i)).toHaveCount(0)
    await expect(page.getByText(/Waiting for a buzz/i)).toHaveCount(0)
    await expect(page.getByTestId('bqd')).toHaveCount(0)
  })

  test('coexists Incorrect outcome with active buzz without false implications', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressBoardIncorrectWithActiveSnapshot(141))
    await expect(page.getByTestId('board-outcome')).toContainText('Incorrect')
    await expect(page.getByTestId('board-outcome')).toContainText(FIRST_TEAM)
    await expect(page.getByTestId('bqd-active')).toContainText(SECOND_TEAM)
  })

  test('remount seeds truthful Passed snapshot without fabricated transition', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    await injectPublicState(page, visualStressBoardPassedOutcomeSnapshot(142))
    await expect(page.getByTestId('board-outcome')).toHaveAttribute('data-seeded', 'true')
    await expect(page.getByTestId('board-outcome')).toContainText('Passed')
    await expect(page.getByTestId('board-outcome')).toContainText(FIRST_TEAM)
  })

  test('fail-closed: schema 8 payload with outcome is not adopted', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplay(page)
    const stale = {
      ...visualStressBoardCorrectOutcomeSnapshot(143),
      schemaVersion: 8,
    } as unknown as PublicState
    await injectPublicState(page, stale)
    await expect(page.getByTestId('board-outcome')).toHaveCount(0)
  })
})
