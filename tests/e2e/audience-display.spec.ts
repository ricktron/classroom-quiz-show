import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 18 audience display system — targeted projector viewport coverage.
 * Injects sanitized public-state wire-8 snapshots over BroadcastChannel.
 */

const CHANNEL_NAME = 'classroom-quiz-show:sync'
const LONG40 = 'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJ'

test.describe.configure({ mode: 'serial' })

type PublicSnapshot = Record<string, unknown>

function team(key: string, name: string, accent: string, score: number) {
  return { key, name, accent, score }
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
      roundCount: 4,
      currentRound: 2,
      roundAvailability: 'available',
    },
    round: null,
    teams: null,
    response: null,
    ...overrides,
  }
}

function boardRound(usedPattern: boolean[][] = [[false, false], [false, true]]) {
  return {
    kind: 'board',
    stage: 'board',
    categories: usedPattern.map((row, ci) => ({
      key: `c${ci}`,
      title: ci === 0 ? 'Science Fiction Extremely Long Category' : `Cat ${ci}`,
      tiles: row.map((used, ti) => ({
        key: `c${ci}t${ti}`,
        value: (ti + 1) * 100,
        used,
      })),
    })),
  }
}

async function openDisplay(page: Page, theme?: 'default' | 'high-contrast') {
  const q = theme ? `?theme=${theme}` : ''
  await page.goto(`#/display${q}`)
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  await expect(page.getByTestId('nexus-core')).toBeVisible()
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

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      x: doc.scrollWidth - doc.clientWidth,
      y: doc.scrollHeight - doc.clientHeight,
    }
  })
  expect(overflow.x, 'horizontal overflow').toBeLessThanOrEqual(1)
}

test.describe('audience display layouts', () => {
  test('1920×1080 default board with 4 teams uses Score Column', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    await openDisplay(page, 'default')
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 10,
        round: boardRound(),
        teams: {
          status: 'available',
          teams: [
            team('t0', 'Alpha', 'crimson', 100),
            team('t1', 'Bravo', 'azure', 900),
            team('t2', 'Charlie', 'emerald', -50),
            team('t3', 'Delta', 'amber', 20),
          ],
        },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-scene', 'board')
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-score-layout',
      'column',
    )
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('nexus-core')).toBeVisible()
    await expect(page.getByTestId('tsb-score-t2')).toHaveText('-50')
    await assertNoOverflow(page)
  })

  test('1280×720 board with 1 team stays readable', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page)
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 11,
        round: boardRound([[false]]),
        teams: { status: 'available', teams: [team('t0', LONG40, 'crimson', 0)] },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-score-layout',
      'column',
    )
    await expect(page.getByTestId('tsb-team-t0')).toContainText(LONG40)
    await expect(page.getByTestId('nexus-core')).toBeVisible()
    await assertNoOverflow(page)
  })

  test('1280×720 Score Strip with 6 teams', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page)
    const six = Array.from({ length: 6 }, (_, i) =>
      team(`t${i}`, `Team ${i}`, i % 2 === 0 ? 'crimson' : 'azure', 100 - i),
    )
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 12,
        round: boardRound(),
        teams: { status: 'available', teams: six },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-score-layout',
      'strip',
    )
    await expect(page.getByTestId('tsb')).toHaveAttribute('data-layout', 'strip')
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await assertNoOverflow(page)
  })

  test('1280×720 Score Deck 4×2 with 8 teams and 40-char names', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page)
    const eight = Array.from({ length: 8 }, (_, i) =>
      team(`t${i}`, LONG40, 'crimson', i === 0 ? -999999 : 100000 + i),
    )
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 13,
        round: boardRound(),
        teams: { status: 'available', teams: eight },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-score-layout',
      'deck',
    )
    const list = page.locator('.tsb--deck .tsb__list')
    await expect(list).toBeVisible()
    const grid = await list.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
        rows: style.gridTemplateRows.split(' ').filter(Boolean).length,
      }
    })
    expect(grid.columns).toBe(4)
    expect(grid.rows).toBe(2)
    await expect(page.getByTestId('tsb-team-t0')).toContainText(LONG40)
    await expect(page.getByTestId('tsb-score-t0')).toHaveText('-999999')
    await expect(page.getByTestId('tsb-score-t7')).toHaveText('100007')
    // Authored order, not score rank
    const order = await page.locator('[data-testid^="tsb-team-"]').evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-testid')),
    )
    expect(order).toEqual([
      'tsb-team-t0',
      'tsb-team-t1',
      'tsb-team-t2',
      'tsb-team-t3',
      'tsb-team-t4',
      'tsb-team-t5',
      'tsb-team-t6',
      'tsb-team-t7',
    ])
    await assertNoOverflow(page)
  })
})

test.describe('audience display scenes and privacy', () => {
  test('prompt quiet cognition, image prompt, active response, answer reveal', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 20,
        round: {
          kind: 'board',
          stage: 'prompt',
          selection: {
            categoryTitle: 'Science',
            value: 200,
            prompt: {
              kind: 'image',
              source: { kind: 'same-origin-path', path: 'media-fixtures/missing-optional.png' },
              alt: 'Diagram of a cell',
              caption: null,
              attribution: null,
            },
            answer: null,
          },
        },
        teams: {
          status: 'available',
          teams: [
            team('t0', 'Alpha', 'crimson', 10),
            team('t1', 'Bravo', 'crimson', 20),
          ],
        },
        response: {
          armed: true,
          timer: { status: 'running', durationMs: 20_000, deadline: Date.now() + 20_000 },
          buzz: { status: 'active', activeTeamKey: 't0', waitingCount: 1 },
        },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-scene',
      'quiet-cognition',
      { timeout: 10_000 },
    )
    await expect(page.getByTestId('audience-lattice')).toBeVisible()
    await expect(page.getByTestId('cbd-board')).toHaveCount(0)
    await expect(page.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'expanded')
    await expect(page.getByTestId('nexus-timer')).toHaveAttribute('data-status', 'running')
    await expect(page.getByTestId('bqd-active')).toHaveText('Alpha')
    await expect(page.getByTestId('bqd-waiting')).toContainText('1 team waiting')
    await expect(page.getByTestId('signal-rail')).not.toContainText('Bravo')

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 21,
        round: {
          kind: 'board',
          stage: 'answer',
          selection: {
            categoryTitle: 'Science',
            value: 200,
            prompt: { kind: 'text', text: 'What is water?' },
            answer: 'H2O',
          },
        },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 10), team('t1', 'Bravo', 'azure', 20)],
        },
        response: null,
      }),
    )
    await expect(page.getByTestId('cbd-answer')).toContainText('H2O')
    await expect(page.getByTestId('audience-lattice')).toBeVisible()
  })

  test('category clear / depletion, Final reveal, unique-leader and tied', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 30,
        round: boardRound([
          [true, true],
          [true, false],
        ]),
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 100), team('t1', 'Bravo', 'azure', 50)],
        },
      }),
    )
    await expect(page.getByTestId('cbd-cleared-c0')).toBeVisible()
    await expect(page.getByTestId('cbd-depletion')).toContainText('3 of 4')

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 31,
        round: {
          kind: 'final',
          stage: 'team-reveal',
          prompt: { kind: 'text', text: 'Final question' },
          answer: '42',
          reveal: {
            teamKey: 't0',
            response: { kind: 'exact', text: '42' },
            wager: 100,
            settlement: { outcome: 'correct', delta: 100 },
          },
        },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 200), team('t1', 'Bravo', 'azure', 50)],
        },
      }),
    )
    await expect(page.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'final')
    await expect(page.getByTestId('fwd-team-reveal')).toBeVisible()
    await expect(page.getByTestId('signal-rail-revealed')).toHaveText('Alpha')

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 32,
        round: {
          kind: 'final',
          stage: 'wager-entry',
          timer: { status: 'running', durationMs: 60_000, deadline: Date.now() + 60_000 },
        },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 200), team('t1', 'Bravo', 'azure', 50)],
        },
      }),
    )
    await expect(page.getByTestId('nexus-timer')).toHaveAttribute('data-status', 'running')
    await expect(page.getByTestId('signal-rail-timer')).toBeVisible()
    await expect(page.getByTestId('signal-rail-status')).toContainText(/final wager open/i)
    await expect(page.getByTestId('fwd-timer')).toHaveCount(0)

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 33,
        round: { kind: 'final', stage: 'complete', outcome: 'unique-leader' },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 200), team('t1', 'Bravo', 'azure', 50)],
        },
      }),
    )
    await expect(page.getByTestId('audience-result-unique')).toContainText('Alpha leads')
    await expect(page.getByTestId('signal-rail-status')).toContainText(/game complete/i)

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 34,
        round: { kind: 'final', stage: 'complete', outcome: 'tied' },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 200), team('t1', 'Bravo', 'azure', 200)],
        },
      }),
    )
    await expect(page.getByTestId('audience-result-tied')).toHaveText('Tied')
    await expect(page.getByTestId('signal-rail-status')).toContainText(/tied/i)
  })

  test('scores unavailable is explicit; null teams omit the scoreboard', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await openDisplay(page)
    await injectPublicState(
      page,
      baseSnapshot({
        revision: 50,
        round: boardRound(),
        teams: { status: 'unavailable' },
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-score-layout',
      'unavailable',
    )
    await expect(page.getByTestId('tsb-unavailable')).toContainText(/scores unavailable/i)
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('nexus-core')).toBeVisible()
    await assertNoOverflow(page)

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 51,
        round: boardRound(),
        teams: null,
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'none')
    await expect(page.getByTestId('display-scores')).toHaveCount(0)
    await expect(page.getByTestId('tsb-unavailable')).toHaveCount(0)
  })

  test('high-contrast board/Final, reduced motion, unavailable, zero controls', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'mobile-host', 'projector projects only')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplay(page, 'high-contrast')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 40,
        round: boardRound(),
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 1), team('t1', 'Bravo', 'azure', 2)],
        },
      }),
    )
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('nexus-core')).toBeVisible()

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 41,
        round: { kind: 'final', stage: 'setup' },
        teams: {
          status: 'available',
          teams: [team('t0', 'Alpha', 'crimson', 1), team('t1', 'Bravo', 'azure', 2)],
        },
      }),
    )
    await expect(page.getByTestId('fwd-setup')).toBeVisible()
    await expect(page.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'final')

    await injectPublicState(
      page,
      baseSnapshot({
        revision: 42,
        game: {
          status: 'active',
          roundCount: 2,
          currentRound: 1,
          roundAvailability: 'unavailable',
        },
        round: null,
        teams: null,
      }),
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-scene', 'unavailable')

    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('link')).toHaveCount(0)
    await expect(page.getByRole('radio')).toHaveCount(0)

    const body = (await page.locator('body').innerText()).toLowerCase()
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(body, `must not contain "${label}"`).not.toContain(label.toLowerCase())
    }
    expect(body).not.toMatch(/eligible|reveal order|wager cap|category-board|final-wager/)
  })
})
