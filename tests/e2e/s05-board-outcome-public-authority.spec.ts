import { test, expect } from '@playwright/test'
import type { PublicState } from '../../src/state/publicState'
import { openDisplay, injectPublicState } from './helpers/displayPublicState'

/**
 * S05 Path A — board outcome public authority foundation.
 * Minimal truthful Display text; no theatrical choreography.
 */

test.describe.configure({ mode: 'serial' })

function teams() {
  return {
    status: 'available' as const,
    teams: [
      { key: 't0', name: 'Red Team', accent: 'crimson' as const, score: 0 },
      { key: 't1', name: 'Blue Team', accent: 'azure' as const, score: 100 },
    ],
  }
}

function boardSnapshot(overrides: Partial<PublicState> = {}): PublicState {
  return {
    schemaVersion: 9,
    revision: 1,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
    game: {
      status: 'active',
      roundCount: 2,
      currentRound: 1,
      roundAvailability: 'available',
    },
    round: {
      kind: 'board',
      stage: 'prompt',
      categories: [{ name: 'Alpha', tiles: [{ value: 100, used: false }] }],
      selection: {
        categoryIndex: 0,
        tileIndex: 0,
        value: 100,
        prompt: { kind: 'text', text: 'What is 2+2?' },
        answer: null,
      },
    },
    teams: teams(),
    response: {
      armed: false,
      timer: { status: 'idle' },
      buzz: { status: 'none' },
      boardOutcome: { status: 'none' },
    },
    ...overrides,
  } as PublicState
}

test.describe('S05 board outcome public authority', () => {
  test('projects Correct + team without exhausted buzz copy', async ({ page }) => {
    await openDisplay(page)
    await injectPublicState(
      page,
      boardSnapshot({
        revision: 2,
        response: {
          armed: false,
          timer: { status: 'idle' },
          buzz: { status: 'none' },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'correct' },
        },
      }),
    )
    const outcome = page.getByTestId('board-outcome')
    await expect(outcome).toBeVisible()
    await expect(outcome).toHaveAttribute('data-outcome-kind', 'correct')
    await expect(outcome).toHaveAttribute('data-seeded', 'true')
    await expect(outcome).toContainText('Correct')
    await expect(outcome).toContainText('Red Team')
    await expect(page.getByText(/No one left to answer/i)).toHaveCount(0)
  })

  test('coexists Incorrect outcome with active buzz without false implications', async ({
    page,
  }) => {
    await openDisplay(page)
    await injectPublicState(
      page,
      boardSnapshot({
        revision: 3,
        response: {
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'active', activeTeamKey: 't1', waitingCount: 0 },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'incorrect' },
        },
      }),
    )
    await expect(page.getByTestId('board-outcome')).toContainText('Incorrect')
    await expect(page.getByTestId('board-outcome')).toContainText('Red Team')
    await expect(page.getByTestId('bqd-active')).toContainText('Blue Team')
  })

  test('remount seeds truthful snapshot without fabricated transition', async ({ page }) => {
    await openDisplay(page)
    await injectPublicState(
      page,
      boardSnapshot({
        revision: 4,
        response: {
          armed: false,
          timer: { status: 'idle' },
          buzz: { status: 'none' },
          boardOutcome: { status: 'resolved', teamKey: 't1', kind: 'passed' },
        },
      }),
    )
    await expect(page.getByTestId('board-outcome')).toHaveAttribute('data-seeded', 'true')
    await expect(page.getByTestId('board-outcome')).toContainText('Passed')
    await expect(page.getByTestId('board-outcome')).toContainText('Blue Team')
  })

  test('fail-closed: schema 8 payload with outcome is not adopted', async ({ page }) => {
    await openDisplay(page)
    await injectPublicState(page, {
      ...boardSnapshot({ revision: 5 }),
      schemaVersion: 8,
      response: {
        armed: false,
        timer: { status: 'idle' },
        buzz: { status: 'none' },
        boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'correct' },
      },
    } as unknown as PublicState)
    // Version mismatch fails closed — Display keeps no adopted board outcome.
    await expect(page.getByTestId('board-outcome')).toHaveCount(0)
  })
})
