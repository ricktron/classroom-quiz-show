import { test, expect, type Page } from '@playwright/test'
import { MAX_CATEGORY_TITLE_LENGTH } from '../../src/game/categoryBoard/limits'
import { MAX_TEAM_NAME_LENGTH } from '../../src/game/teams/limits'

/**
 * S05-F1 — core Display readability + visual stress (Board / Clue).
 * Injects sanitized public-state snapshots; does not claim physical projector
 * or Windows scaling qualification (S06).
 */

const CHANNEL_NAME = 'classroom-quiz-show:sync'
const LONG_NAME = 'A'.repeat(MAX_TEAM_NAME_LENGTH)
const LONG_CATEGORY = 'B'.repeat(MAX_CATEGORY_TITLE_LENGTH)

test.describe.configure({ mode: 'serial' })

type PublicSnapshot = Record<string, unknown>

function team(key: string, name: string, accent: string, score: number) {
  return { key, name, accent, score }
}

function eightStressTeams() {
  const accents = [
    'crimson',
    'azure',
    'emerald',
    'amber',
    'violet',
    'teal',
    'rose',
    'slate',
  ] as const
  return accents.map((accent, i) =>
    team(`t${i}`, LONG_NAME, accent, i === 0 ? -999999 : i === 7 ? 100007 : 100 * i),
  )
}

function stressBoardRound(usedFirst = true) {
  return {
    kind: 'board',
    stage: 'board',
    categories: Array.from({ length: 6 }, (_, ci) => ({
      key: `c${ci}`,
      title: LONG_CATEGORY,
      tiles: Array.from({ length: 5 }, (_, ti) => ({
        key: `c${ci}t${ti}`,
        value: (ti + 1) * 100,
        used: usedFirst && ci === 0 && ti === 0,
      })),
    })),
  }
}

function baseSnapshot(overrides: PublicSnapshot = {}): PublicSnapshot {
  return {
    schemaVersion: 8,
    revision: 1,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
    game: {
      status: 'active',
      roundCount: 1,
      currentRound: 1,
      roundAvailability: 'available',
    },
    round: null,
    teams: null,
    response: null,
    ...overrides,
  }
}

async function openDisplay(page: Page, theme?: 'default' | 'high-contrast') {
  const q = theme ? `?theme=${theme}` : ''
  await page.goto(`#/display${q}`)
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function injectPublicState(page: Page, payload: PublicSnapshot) {
  const accepted = await page.evaluate(
    ({ name, payload: p }) => {
      const ch = new BroadcastChannel(name)
      ch.postMessage({
        protocol: 'classroom-quiz-show/sync',
        schemaVersion: 2,
        message: {
          type: 'public-state',
          revision: p.revision as number,
          sentAt: Date.now(),
          payload: p,
        },
      })
      ch.close()
      return true
    },
    { name: CHANNEL_NAME, payload },
  )
  expect(accepted).toBe(true)
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflowX = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
  expect(overflowX, 'horizontal overflow').toBeLessThanOrEqual(1)
}

test.describe('S05-F1 board stress', () => {
  test('1080p default stress board keeps used tiles and long headers readable', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    await openDisplay(page, 'default')
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 101,
        round: stressBoardRound(true),
        teams: { status: 'available', teams: eightStressTeams() },
      }),
    )
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('cbd-tile-c0t0')).toHaveText(/used/i)
    await expect(page.getByTestId('cbd-tile-c0t1')).toHaveText('200')
    await expect(page.getByTestId('cbd-category-c0')).toContainText(LONG_CATEGORY.slice(0, 20))
    await expect(page.getByTestId('tsb-score-t0')).toHaveText('-999999')
    await assertNoHorizontalOverflow(page)
  })

  test('720p high-contrast stress board remains non-overflowing', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'high-contrast')
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 102,
        round: stressBoardRound(true),
        teams: { status: 'available', teams: eightStressTeams() },
      }),
    )
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('cbd-tile-c0t0')).toHaveText(/used/i)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await assertNoHorizontalOverflow(page)
  })
})

test.describe('S05-F1 clue stress', () => {
  test('1080p long prompt coexists with 8-team deck and timer chrome', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    const longPrompt = `Interpret ${'evidence '.repeat(40)}carefully for the class.`
    await openDisplay(page, 'default')
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 110,
        round: {
          kind: 'board',
          stage: 'prompt',
          selection: {
            categoryTitle: LONG_CATEGORY,
            value: 500,
            prompt: { kind: 'text', text: longPrompt },
            answer: null,
          },
        },
        teams: { status: 'available', teams: eightStressTeams() },
        response: {
          armed: true,
          timer: { status: 'running', durationMs: 20_000, deadline: Date.now() + 20_000 },
          buzz: { status: 'none' },
        },
      }),
    )
    await expect(page.getByTestId('cbd-open')).toBeVisible()
    await expect(page.getByTestId('cbd-prompt')).toContainText('Interpret')
    await expect(page.getByTestId('cbd-answer')).toHaveCount(0)
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'deck')
    await expect(page.getByTestId('nexus-timer')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('720p reduced-motion clue with image media stays contained', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplay(page, 'default')
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 111,
        round: {
          kind: 'board',
          stage: 'prompt',
          selection: {
            categoryTitle: 'Media',
            value: 300,
            prompt: {
              kind: 'image',
              source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
              alt: 'Stress diagram',
              caption: 'Caption must stay secondary',
              attribution: 'Fixture',
            },
            answer: null,
          },
        },
        teams: {
          status: 'available',
          teams: [
            team('t0', 'Alpha', 'crimson', -12),
            team('t1', 'Bravo', 'azure', 40),
            team('t2', 'Charlie', 'emerald', 8),
            team('t3', 'Delta', 'amber', 0),
          ],
        },
      }),
    )
    await expect(page.getByTestId('cbd-open')).toBeVisible()
    await expect(page.getByTestId('mcd-image')).toBeVisible()
    await expect(page.getByTestId('tsb-score-t0')).toHaveText('-12')
    await assertNoHorizontalOverflow(page)
  })
})
