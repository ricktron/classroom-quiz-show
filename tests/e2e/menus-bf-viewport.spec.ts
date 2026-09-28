import { test, expect, type Page } from '@playwright/test'

/**
 * MENUS B+F — bounded viewport / stress evidence (browser automation).
 *
 * - 1280×720 / 1366×768 / SIMULATED 125% are Playwright CSS viewports.
 * - They are NOT physical Windows / projector / OS-zoom qualification.
 * - Eight-team stress uses the authentic Home import → Class Setup path
 *   (Game definition already has 8 teams; Class Setup does not invent team count).
 */

test.describe.configure({ mode: 'serial' })

const EIGHT_TEAM_GAME = JSON.stringify(
  {
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'menus-bf-eight-team-stress',
    title: 'B+F Eight-Team Stress Board',
    teams: [
      { id: 't0', name: 'Team 1', accent: 'crimson' },
      { id: 't1', name: 'Team 2', accent: 'azure' },
      { id: 't2', name: 'Team 3', accent: 'emerald' },
      { id: 't3', name: 'Team 4', accent: 'amber' },
      { id: 't4', name: 'Team 5', accent: 'violet' },
      { id: 't5', name: 'Team 6', accent: 'teal' },
      { id: 't6', name: 'Team 7', accent: 'rose' },
      { id: 't7', name: 'Team 8', accent: 'slate' },
    ],
    timer: { responseSeconds: 45 },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Earth & Space Science',
        config: {
          categories: [
            {
              id: 'earth-structure',
              title: 'Earth Structure',
              tiles: [
                {
                  id: 'earth-structure-100',
                  value: 100,
                  prompt: 'Which layer of the Earth lies directly beneath the crust?',
                  answer: 'The mantle',
                },
              ],
            },
          ],
        },
      },
    ],
  },
  null,
  2,
)

async function fillAllTeamNames(page: Page): Promise<void> {
  await page
    .locator('[data-testid^="tnsb-manual-"]')
    .first()
    .waitFor({ state: 'visible' })
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  const count = await manuals.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    await input.fill(`Team ${i + 1}`)
    await input.blur()
  }
}

async function assertNoDestructiveHorizontalOverflow(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const setup = document.querySelector('[data-testid="classroom-setup"]')
    const outcome = document.querySelector('[data-testid="setup-outcome-strip"]')
    const ready = document.querySelector('[data-testid="setup-ready-heading"]')
    const play = document.querySelector('[data-testid="setup-play"]')
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      setupWidth: setup?.getBoundingClientRect().width ?? null,
      outcomeVisible: Boolean(outcome && (outcome as HTMLElement).offsetParent !== null),
      readyVisible: Boolean(ready && (ready as HTMLElement).offsetParent !== null),
      playEnabled: play instanceof HTMLButtonElement ? !play.disabled : false,
      playDominant:
        play instanceof HTMLElement && play.classList.contains('classroom-setup__play--dominant'),
    }
  })
  expect(report.scrollWidth, 'document horizontal scroll').toBeLessThanOrEqual(report.clientWidth + 1)
  expect(report.setupWidth, 'classroom-setup width').not.toBeNull()
  expect(report.setupWidth!).toBeLessThanOrEqual(report.clientWidth + 1)
  expect(report.readyVisible).toBe(true)
  expect(report.outcomeVisible).toBe(true)
  expect(report.playEnabled).toBe(true)
  expect(report.playDominant).toBe(true)
}

async function importDemoReady(page: Page): Promise<void> {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
}

test('1280×720 Class Setup Ready remains usable without destructive overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await importDemoReady(page)
  await assertNoDestructiveHorizontalOverflow(page)
})

test('1366×768 Class Setup Ready remains usable without destructive overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await importDemoReady(page)
  await assertNoDestructiveHorizontalOverflow(page)
})

test('SIMULATED browser approx: 1366×768 at 125% (CSS ~1093×614) — Ready usable', async ({
  page,
}) => {
  // SIMULATED: approximates OS/browser 125% zoom on a 1366×768 laptop by
  // shrinking the CSS viewport. NOT physical Windows display scaling evidence.
  await page.setViewportSize({ width: 1093, height: 614 })
  await importDemoReady(page)
  await assertNoDestructiveHorizontalOverflow(page)
  await expect(page.getByTestId('setup-play')).toBeVisible()
  await expect(page.getByTestId('classroom-readiness')).toBeVisible()
})

test('eight-team Class Setup via authentic Home import stays Ready-usable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill(EIGHT_TEAM_GAME)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toContainText(/8 teams/i)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await assertNoDestructiveHorizontalOverflow(page)
  await expect(page.locator('[data-testid^="tnsb-manual-"]')).toHaveCount(0)
  await expect(page.getByTestId('setup-names-summary')).toContainText(/Team 8/)
})
