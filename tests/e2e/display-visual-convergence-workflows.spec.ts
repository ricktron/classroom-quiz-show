/**
 * Bounded semantic Display workflows that close evidence gaps for visual
 * convergence readiness. Prefer assertions over screenshots.
 */

import { test, expect } from '@playwright/test'
import {
  openDisplay,
  injectPublicState,
  assertNoHorizontalOverflow,
} from './helpers/displayPublicState'
import { visualStressBoardSnapshot } from '../../src/test/visualStressDisplaySnapshots'
import { visualHistoryFinalCompleteGenericSafeSnapshot } from '../../src/test/visualHistoryFinalSnapshots'
import { PUBLIC_STATE_SCHEMA_VERSION, type PublicState } from '../../src/state/publicState'

test.describe('Display visual convergence workflow gaps', () => {
  test('5-team Score Strip boundary preserves authored order', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    const base = visualStressBoardSnapshot(701)
    if (!base.teams || base.teams.status !== 'available') {
      throw new Error('expected available stress teams')
    }
    const five = base.teams.teams.slice(0, 5)
    const state: PublicState = {
      ...base,
      revision: 701,
      teams: { status: 'available', teams: five },
    }
    await injectPublicState(page, state)
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'strip')
    await expect(page.getByTestId('tsb')).toHaveAttribute('data-layout', 'strip')
    const names = await page.locator('[data-testid^="tsb-team-"]').allTextContents()
    expect(names).toHaveLength(5)
    // Authored order: first stress team remains first; no score ranking.
    expect(names[0]).toContain(five[0]!.name)
    expect(names[4]).toContain(five[4]!.name)
    await assertNoHorizontalOverflow(page)
  })

  test('public paused timer is visible on Nexus without inventing digits ownership', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    const base = visualStressBoardSnapshot(702)
    const state: PublicState = {
      ...base,
      revision: 702,
      schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
      round: {
        kind: 'board',
        stage: 'prompt',
        selection: {
          categoryTitle: 'Science',
          value: 100,
          prompt: { kind: 'text', text: 'Paused timer prompt' },
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
    await injectPublicState(page, state)
    await expect(page.getByTestId('nexus-timer')).toHaveAttribute('data-status', 'paused')
    await expect(page.getByTestId('nexus-timer-status')).toHaveText(/paused/i)
    await expect(page.getByTestId('signal-rail')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('generic-safe completion never invents a winner name', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    await injectPublicState(page, visualHistoryFinalCompleteGenericSafeSnapshot(703))
    await expect(page.getByTestId('fwd-complete')).toBeVisible()
    await expect(page.getByTestId('fwd-winner')).toHaveCount(0)
    await expect(page.getByTestId('fwd-outcome')).toBeVisible()
    // Must not fabricate a team name when teams are unavailable.
    await expect(page.getByTestId('audience-shell')).not.toContainText(/Red Team|Blue Team/i)
    await assertNoHorizontalOverflow(page)
  })

  test('7-team Score Deck boundary stays in authored order', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    const base = visualStressBoardSnapshot(704)
    if (!base.teams || base.teams.status !== 'available') {
      throw new Error('expected available stress teams')
    }
    const seven = base.teams.teams.slice(0, 7)
    await injectPublicState(page, {
      ...base,
      revision: 704,
      teams: { status: 'available', teams: seven },
    })
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'deck')
    await expect(page.getByTestId('tsb')).toHaveAttribute('data-layout', 'deck')
    const names = await page.locator('[data-testid^="tsb-team-"]').allTextContents()
    expect(names).toHaveLength(7)
    expect(names[0]).toContain(seven[0]!.name)
    expect(names[6]).toContain(seven[6]!.name)
    await assertNoHorizontalOverflow(page)
  })

  test('1-team Score Column stays readable without inventing peers', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    const base = visualStressBoardSnapshot(705)
    if (!base.teams || base.teams.status !== 'available') {
      throw new Error('expected available stress teams')
    }
    const one = base.teams.teams.slice(0, 1)
    await injectPublicState(page, {
      ...base,
      revision: 705,
      teams: { status: 'available', teams: one },
    })
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'column')
    await expect(page.getByTestId('tsb')).toHaveAttribute('data-layout', 'column')
    const team = page.locator('[data-testid^="tsb-team-"]').first()
    await expect(team).toContainText(one[0]!.name)
    const nameBox = page.locator('[data-testid^="tsb-team-"] .tsb__name').first()
    const box = await nameBox.boundingBox()
    expect(box).toBeTruthy()
    // Schema-max names must keep a horizontal reading track (not character-stack).
    expect(box!.width).toBeGreaterThan(140)
    expect(box!.height).toBeLessThan(120)
    await assertNoHorizontalOverflow(page)
  })

  test('4-team Score Column keeps all authored teams in view under stress names', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    const base = visualStressBoardSnapshot(706)
    if (!base.teams || base.teams.status !== 'available') {
      throw new Error('expected available stress teams')
    }
    const four = base.teams.teams.slice(0, 4)
    await injectPublicState(page, {
      ...base,
      revision: 706,
      teams: { status: 'available', teams: four },
    })
    await expect(page.getByTestId('tsb')).toHaveAttribute('data-layout', 'column')
    const teams = page.locator('[data-testid^="tsb-team-"]')
    await expect(teams).toHaveCount(4)
    const last = teams.nth(3)
    await expect(last).toBeVisible()
    const lastBox = await last.boundingBox()
    const shellBox = await page.getByTestId('audience-shell').boundingBox()
    expect(lastBox).toBeTruthy()
    expect(shellBox).toBeTruthy()
    // Last team card remains inside the shell (not clipped off the stage).
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(shellBox!.y + shellBox!.height + 1)
    await assertNoHorizontalOverflow(page)
  })
})
