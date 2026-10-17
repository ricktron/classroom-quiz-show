import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Court B repair H (CB-05, owner-confirmed): an explicit end of the game always
 * brings the Display to the completed-game scene. When the Final has not begun
 * (never opened, or opened but not begun), the current scores decide Winner or
 * tied finish. A Final that has begun keeps its own completion. Never a winner
 * before explicit completion. Ordinary UI only, using the Court B fixture.
 *
 * Fail-first on 8c226ee:
 *  - no ordinary control ended a Final-capable game before or at Final setup
 *    (only More > Advanced diagnostics "End game session");
 *  - ended that way from Final setup, the Display stayed on the Final
 *    "Getting ready" panel with no result.
 */

const GAME_FILE = resolve(
  process.cwd(),
  'docs/qualification/fixtures/court-b-final-qualification.game.json',
)

test.beforeEach(({ page }, info) => {
  void page
  test.skip(info.project.name === 'mobile-host', 'projector/laptop projects only')
})

async function startFixtureWithDisplay(page: Page, context: BrowserContext): Promise<Page> {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('textbox', { name: 'Game file text' }).fill(readFileSync(GAME_FILE, 'utf8'))
  await page.getByRole('button', { name: 'Import file text' }).click()
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Granite')
  await fields.nth(0).press('Enter')
  await fields.nth(1).fill('Nimbus')
  await fields.nth(1).press('Enter')
  const popup = context.waitForEvent('page')
  await setup.getByRole('button', { name: 'Open display' }).first().click()
  const display = await popup
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({
    timeout: 20_000,
  })
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  return display
}

async function scoreTile(page: Page, tile: string, team: 'Granite' | 'Nimbus') {
  await page.getByRole('button', { name: tile }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

async function openFinalWithoutBeginning(page: Page) {
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  const confirm = page.getByRole('button', { name: 'Go to the Final now' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await expect(page.getByRole('button', { name: 'Begin Final' })).toBeVisible()
}

/** Ordinary Round progress: end the game early, with a later round or the Final to come. */
async function endGameFromBoard(page: Page) {
  await page.getByRole('button', { name: 'End the game', exact: true }).click()
  await page.getByRole('button', { name: 'End the game now' }).click()
  await expect(page.getByRole('heading', { name: 'Session summary' })).toBeVisible()
}

/** Ordinary Final setup: end the game without beginning the Final. */
async function endGameFromFinalSetup(page: Page) {
  await page.getByRole('button', { name: 'End the game session' }).click()
  await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
  await expect(page.getByRole('heading', { name: 'Session summary' })).toBeVisible()
}

async function expectWinner(display: Page, name: string, score: string) {
  const winner = display.getByTestId('audience-completion-winner')
  await expect(winner).toContainText('Winner')
  await expect(winner).toContainText(name)
  await expect(display.getByTestId('audience-completion-winner-score')).toHaveText(score)
  await expect(display.getByTestId('audience-completion-tied')).toHaveCount(0)
}

async function expectTie(display: Page) {
  await expect(display.getByTestId('audience-completion-tied')).toHaveText('Game complete — a tie')
  await expect(display.getByTestId('audience-completion-winner')).toHaveCount(0)
}

async function expectNoFinalSetup(display: Page) {
  await expect(display.locator('body')).not.toContainText(/getting ready/i)
  await expect(display.locator('body')).not.toContainText(/final ready/i)
}

test('[1] Final-capable game, Final never opened, End game: current scores decide Winner', async ({
  page,
  context,
}) => {
  const display = await startFixtureWithDisplay(page, context)
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await expect(display.locator('body')).not.toContainText(/winner/i)
  await endGameFromBoard(page)
  await expectWinner(display, 'Granite', '200')
  await expectNoFinalSetup(display)
})

test('[2] Final opened but not begun, End game: Display leaves "Getting ready" for the Winner', async ({
  page,
  context,
}) => {
  const display = await startFixtureWithDisplay(page, context)
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await openFinalWithoutBeginning(page)
  await expect(display.locator('body')).toContainText(/getting ready/i)
  await expect(display.locator('body')).not.toContainText(/winner/i)
  await endGameFromFinalSetup(page)
  await expectWinner(display, 'Granite', '200')
  await expectNoFinalSetup(display)

  // Coherent after a Display reload.
  await display.reload()
  await expectWinner(display, 'Granite', '200')
  await expectNoFinalSetup(display)
})

test('[2-tie] Final opened but not begun with a tied top score, End game: tied finish', async ({
  page,
  context,
}) => {
  const display = await startFixtureWithDisplay(page, context)
  await scoreTile(page, 'Rocks, 100 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await openFinalWithoutBeginning(page)
  await endGameFromFinalSetup(page)
  await expectTie(display)
  await expectNoFinalSetup(display)
})

test('[1-tie] Final never opened, 0-0, End game: tied finish', async ({ page, context }) => {
  const display = await startFixtureWithDisplay(page, context)
  await endGameFromBoard(page)
  await expectTie(display)
  await expectNoFinalSetup(display)
})

test('[3] Final begun and completed through the Final keeps the Final result', async ({
  page,
  context,
}) => {
  const display = await startFixtureWithDisplay(page, context)
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await openFinalWithoutBeginning(page)
  await page.getByRole('button', { name: 'Begin Final' }).click()
  const wagers = page.getByRole('group', { name: 'Team wagers' })
  const inputs = wagers.getByRole('spinbutton')
  await inputs.nth(0).fill('100')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await inputs.nth(1).fill('50')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page
    .getByRole('button', { name: 'Show the question and start the response window' })
    .click()
  const answered = page.getByRole('group', { name: 'Team responses' }).getByRole('button', {
    name: 'Answered (no wording)',
  })
  await answered.first().click()
  await answered.last().click()
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()
  await page.getByRole('button', { name: /^Reveal Nimbus/ }).click()
  await page.getByRole('button', { name: /^Correct \(/ }).click()
  await page.getByRole('button', { name: /^Reveal Granite/ }).click()
  await page.getByRole('button', { name: /^Incorrect \(/ }).click()
  await page.getByRole('button', { name: 'End the game session' }).click()
  await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
  // The Final's own completion (unchanged), not the board-only block.
  await expect(display.getByTestId('fwd-winner')).toContainText(/nimbus/i)
  await expect(display.getByTestId('audience-completion-winner')).toHaveCount(0)
})

test('[4] No-Final game, End game: current scores decide Winner', async ({ page, context }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('button', { name: 'Import demo game' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Comets')
  await fields.nth(0).press('Enter')
  await fields.nth(1).fill('Magma')
  await fields.nth(1).press('Enter')
  const popup = context.waitForEvent('page')
  await setup.getByRole('button', { name: 'Open display' }).first().click()
  const display = await popup
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({
    timeout: 20_000,
  })
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await page.getByRole('button', { name: 'Earth Structure, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: /^Magma/ }).check()
  await page.getByRole('button', { name: /^full credit, .* to Magma/ }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
  await page.getByRole('button', { name: 'End the game' }).click()
  await page.getByRole('button', { name: 'End the game now' }).click()
  await expectWinner(display, 'Magma', '200')
})
