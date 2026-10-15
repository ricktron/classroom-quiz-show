import { test, expect, type Page } from '@playwright/test'

/**
 * Q7 R1 certification blockers 8 and 10 — natural teacher routes from Home.
 *
 * Navigation uses visible controls by role / accessible name. Test ids are used
 * only to assert state. No Advanced diagnostics, no scroll helpers.
 *
 * Item 8: a Game with no class name list must not offer inert name-choice,
 *         "More names", or "Choose again" controls in Class Setup → Names.
 * Item 10: Host "Last score change" must reflect a Final settlement, not the
 *          earlier board award.
 */

const NAME_ALPHA = 'Comet Crew'
const NAME_BRAVO = 'Ozone Owls'

/** Smallest board + Final game whose only tile is worth 200. No name bank. */
const BOARD_200_PLUS_FINAL_JSON = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'q7-r1-score-200',
  title: 'Q7 R1 Score 200',
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
                id: 'science-200',
                value: 200,
                prompt: 'R1 prompt: what is H2O?',
                answer: 'Water',
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
        prompt: 'R1 final prompt: name the process that moves heat in the mantle.',
        answer: 'Mantle convection',
      },
    },
  ],
})

async function openImportFromHome(page: Page): Promise<void> {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await page
    .getByRole('button', { name: /^import game$/i })
    .first()
    .click()
}

async function playFirstGameFromReport(page: Page): Promise<void> {
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page
    .getByRole('button', { name: /^play$/i })
    .first()
    .click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

/** Open the Names task via its readiness row (only if it is not already open). */
async function openNamesTask(page: Page): Promise<void> {
  const namesRow = page.getByRole('button', { name: /^names\b/i })
  if ((await namesRow.getAttribute('aria-expanded')) !== 'true') {
    await namesRow.click()
  }
  await expect(namesRow).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('setup-names-task')).toBeVisible()
}

async function typeTeamName(page: Page, index: number, name: string): Promise<void> {
  const input = page.getByLabel('Type a name').nth(index)
  await input.fill(name)
  await input.press('Enter')
}

test('R1 item 8: Game without a class name list offers no inert name-choice controls', async ({
  page,
}) => {
  await openImportFromHome(page)
  await page.getByRole('button', { name: /^import demo game$/i }).click()
  await playFirstGameFromReport(page)
  await openNamesTask(page)

  const namesTask = page.getByTestId('setup-names-task')

  // Truthful explanation: there is no class name list; type names instead.
  await expect(namesTask).toContainText(/no class name list/i)
  await expect(namesTask).toContainText(/type a name/i)

  // No inert controls: no colour choice buttons, no More names, no Choose again.
  await expect(namesTask.getByRole('button', { name: /^choice \d/i })).toHaveCount(0)
  await expect(namesTask.getByRole('button', { name: /^more names$/i })).toHaveCount(0)
  await expect(namesTask.getByRole('button', { name: /^choose again$/i })).toHaveCount(0)

  // Manual name entry stays fully usable for every team.
  const manuals = namesTask.getByLabel('Type a name')
  const count = await manuals.count()
  expect(count).toBeGreaterThan(1)
  for (let i = 0; i < count; i += 1) {
    await expect(manuals.nth(i)).toBeEditable()
  }

  // Typing a name claims it; a typed name can be cleared again.
  await typeTeamName(page, 0, NAME_ALPHA)
  const firstTeam = namesTask.locator('[data-testid^="tnsb-team-"]').first()
  await expect(firstTeam.locator('[data-testid^="tnsb-claimed-"]')).toHaveText(
    `Selected: ${NAME_ALPHA}`,
  )
  await firstTeam.getByRole('button', { name: /^clear name$/i }).click()
  await expect(firstTeam.locator('[data-testid^="tnsb-claimed-"]')).toHaveCount(0)

  for (let i = 0; i < count; i += 1) {
    await typeTeamName(page, i, `Typed Team ${i + 1}`)
  }
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByRole('button', { name: /^start game$/i })).toBeEnabled()
})

test('R1 item 10: Host "Last score change" names the Final settlement after a board award', async ({
  page,
}) => {
  await openImportFromHome(page)
  await page.getByLabel('Game file text').fill(BOARD_200_PLUS_FINAL_JSON)
  await page.getByRole('button', { name: /^import file text$/i }).click()
  await playFirstGameFromReport(page)

  // Class Setup: keyboard names → Start Game.
  const skipBuzzers = page.getByRole('button', { name: /^skip buzzers$/i })
  if (await skipBuzzers.isVisible().catch(() => false)) await skipBuzzers.click()
  await openNamesTask(page)
  await typeTeamName(page, 0, NAME_ALPHA)
  await typeTeamName(page, 1, NAME_BRAVO)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await page.getByRole('button', { name: /^start game$/i }).click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')

  // Board: +200 full credit to Comet Crew.
  await page.getByRole('button', { name: /^start round 1$/i }).click()
  await page.getByRole('button', { name: /^science, 200 points$/i }).click()
  await page.getByRole('button', { name: /^show prompt on display$/i }).click()
  await page.getByRole('radio', { name: new RegExp(`^${NAME_ALPHA} \\(0\\)$`) }).check()
  await page
    .getByRole('button', { name: new RegExp(`^full credit, \\+200 points, to ${NAME_ALPHA}`) })
    .click()
  await expect(page.getByTestId('tsp-score-alpha')).toHaveText('200')
  await expect(page.getByTestId('tsp-last-change')).toHaveText(
    `Last score change: ${NAME_ALPHA} +200 (full credit).`,
  )
  await page.getByRole('button', { name: /^show answer on display$/i }).click()
  await page.getByRole('button', { name: /^return to board$/i }).click()

  // Final: Comet Crew wagers 200 and is settled incorrect (−200).
  await page.getByRole('button', { name: /^go to the final$/i }).click()
  await expect(page.getByRole('heading', { name: /^final wager$/i }).first()).toBeVisible()
  await expect(page.getByRole('radio', { name: /^classic/i })).toBeChecked()
  await page.getByRole('button', { name: /^begin final$/i }).click()
  await page.getByLabel(/^wager \(0–200\)$/i).fill('200')
  await page.getByRole('button', { name: /^save wager$/i }).click()
  await expect(page.getByTestId('fwh-committed-wager-alpha')).toContainText('200')
  await page.getByRole('button', { name: /^lock all wagers$/i }).click()
  await page
    .getByRole('button', { name: /^show the question and start the response window$/i })
    .click()
  await page.getByRole('button', { name: /^answered \(no wording\)$/i }).click()
  await page.getByRole('button', { name: /^lock all responses$/i }).click()
  await page.getByRole('button', { name: /^reveal the answer$/i }).click()
  await page.getByRole('button', { name: new RegExp(`^reveal ${NAME_ALPHA}`, 'i') }).click()
  await page.getByRole('button', { name: /^incorrect \(-200\)$/i }).click()

  await expect(page.getByTestId('tsp-score-alpha')).toHaveText('0')
  // The last score change is the Final settlement, not the earlier board award.
  const lastChange = page.getByTestId('tsp-last-change')
  await expect(lastChange).toContainText(`${NAME_ALPHA} -200`)
  await expect(lastChange).toContainText(/final/i)
  await expect(lastChange).toContainText(/incorrect/i)
  await expect(lastChange).not.toContainText('+200')
  await expect(lastChange).not.toContainText(/full credit/i)
})
