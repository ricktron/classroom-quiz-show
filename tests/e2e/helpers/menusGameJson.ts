/**
 * Synthetic MENUS e2e/historian game JSON builders (no real class data).
 */

import { expect, type Page } from '@playwright/test'

const BOARD_CATEGORIES = [
  {
    id: 'cat-1',
    title: 'Science',
    tiles: [
      { id: 't-100', value: 100, prompt: 'What is water?', answer: 'H2O' },
      { id: 't-200', value: 200, prompt: 'What is ice?', answer: 'Solid water' },
    ],
  },
  {
    id: 'cat-2',
    title: 'Math',
    tiles: [
      { id: 'm-100', value: 100, prompt: '2+2?', answer: '4' },
      { id: 'm-200', value: 200, prompt: '3+3?', answer: '6' },
    ],
  },
] as const

const TEAM_ACCENTS = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
] as const

export function menusBoardGameJson(options: {
  readonly id: string
  readonly title: string
  /** 0 or omit = no teams field (0-team edge); 1–8 = explicit team list. */
  readonly teamCount?: number
  /** Team id prefix; default `t` → t1…tN. Use `t` + startAt 0 for t0… style. */
  readonly teamIdStart?: number
}): string {
  const teamCount = options.teamCount
  const idStart = options.teamIdStart ?? 1
  const doc: Record<string, unknown> = {
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: options.id,
    title: options.title,
    timer: { responseSeconds: 45 },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Board',
        config: { categories: BOARD_CATEGORIES },
      },
    ],
  }
  if (typeof teamCount === 'number' && teamCount > 0) {
    doc.teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `t${idStart + i}`,
      name: `Team ${i + 1}`,
      accent: TEAM_ACCENTS[i] ?? 'slate',
    }))
  }
  return JSON.stringify(doc)
}

/**
 * Smallest complete playable Game for Q3 golden paths: one board tile + Final.
 * Travels Home import → canonical validation/registry (not a privileged seed).
 */
export function menusBoardPlusFinalGameJson(options: {
  readonly id: string
  readonly title: string
}): string {
  return JSON.stringify({
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: options.id,
    title: options.title,
    timer: { responseSeconds: 45 },
    teams: [
      { id: 'alpha', name: 'Alpha Rockets', accent: 'crimson' },
      { id: 'bravo', name: 'Bravo Comets', accent: 'azure' },
    ],
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Board',
        config: {
          categories: [
            {
              id: 'science',
              title: 'Science',
              tiles: [
                {
                  id: 'science-100',
                  value: 100,
                  prompt: 'Q3 golden prompt: what is H2O?',
                  answer: 'Water',
                  alternates: ['H2O liquid'],
                  notes: 'Q3 host-only teaching note — never project',
                },
              ],
            },
          ],
        },
      },
      {
        id: 'final-round',
        type: 'final-wager',
        title: 'Final Wager',
        config: {
          prompt: 'Q3 final prompt: name the process that moves heat in the mantle.',
          answer: 'Mantle convection',
          alternates: ['Convection currents'],
          notes: 'Q3 final host-only note — never project',
        },
      },
    ],
  })
}

/** Home import JSON → quality report → first Play. */
export async function importMenusJsonAndPlay(page: Page, gameJson: string): Promise<void> {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill(gameJson)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
}
