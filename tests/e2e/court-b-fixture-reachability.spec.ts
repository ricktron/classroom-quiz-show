import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Court B harness (CB-07): every journey named in
 * docs/qualification/COURT-B-BLACK-BOX-BRIEF.md is mechanically reachable from
 * the committed qualification fixture, starting at Home, through ordinary
 * visible controls (no state injection, no test ids, no diagnostics).
 *
 * Each test title carries its journey id in brackets; the fixture guard
 * (src/test/courtBQualificationFixture.test.ts) fails if a brief journey has no
 * test here.
 */

const FIXTURE_DIR = resolve(process.cwd(), 'docs/qualification/fixtures')
const GAME_FILE = resolve(FIXTURE_DIR, 'court-b-final-qualification.game.json')
const SPREADSHEET = resolve(FIXTURE_DIR, 'court-b-final-qualification.xlsx')
const TITLE = 'Court B Final Qualification'

test.beforeEach(({ page }, info) => {
  void page
  test.skip(info.project.name !== 'desktop-1080p', 'journey reachability runs once (1080p)')
})

async function importGameFile(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('textbox', { name: 'Game file text' }).fill(readFileSync(GAME_FILE, 'utf8'))
  await page.getByRole('button', { name: 'Import file text' }).click()
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
}

async function playToClassSetup(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  await expect(page.getByRole('region', { name: 'Class setup' })).toBeVisible()
  await expect(page.getByText(TITLE).first()).toBeVisible()
}

async function namesDisplayStart(page: Page, context: BrowserContext): Promise<Page> {
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
  // The teacher goes back to the Host window (a real click focuses it; a
  // synthetic one does not, and a background headless page stalls rAF).
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByRole('button', { name: 'Start Round 1' })).toBeVisible()
  return display
}

const scores = (page: Page) =>
  page.getByRole('region', { name: 'Teams & scoring' }).getByRole('list').first()

async function scoreTile(page: Page, tile: string, team: 'Granite' | 'Nimbus') {
  await page.getByRole('button', { name: tile }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

/** Classic Final: a team with no points is not eligible and gets no wager field. */
async function toFinalWithWagers(page: Page, wagers: { granite: string; nimbus?: string }) {
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  const confirm = page.getByRole('button', { name: 'Go to the Final now' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await page.getByRole('button', { name: 'Begin Final' }).click()
  const wagersGroup = page.getByRole('group', { name: 'Team wagers' })
  const inputs = wagersGroup.getByRole('spinbutton')
  await inputs.nth(0).fill(wagers.granite)
  await wagersGroup.getByRole('button', { name: 'Save wager' }).first().click()
  if (wagers.nimbus !== undefined) {
    await inputs.nth(1).fill(wagers.nimbus)
    await wagersGroup.getByRole('button', { name: 'Save wager' }).first().click()
  }
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
}

async function finalQuestionToReveal(page: Page) {
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()
  const responses = page.getByRole('group', { name: 'Team responses' })
  const answered = responses.getByRole('button', { name: 'Answered (no wording)' })
  const eligible = await answered.count()
  await answered.first().click()
  if (eligible > 1) await answered.last().click()
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()
}

async function revealAndJudge(page: Page, team: 'Granite' | 'Nimbus', verdict: 'Correct' | 'Incorrect') {
  await page.getByRole('button', { name: new RegExp(`^Reveal ${team}`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${verdict} \\(`) }).click()
}

test('[CBJ-01] Import the game file and reach Class Setup', async ({ page }) => {
  await importGameFile(page)
  await playToClassSetup(page)
})

test('[CBJ-02] Import the filled spreadsheet and reach Class Setup', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import spreadsheet' }).click()
  await (await chooser).setFiles(SPREADSHEET)
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
  await playToClassSetup(page)
  // The spreadsheet carries the Final too.
  await page.getByRole('region', { name: 'Class setup' }).getByRole('button', { name: /^Names/ }).click()
  await expect(page.getByRole('region', { name: 'Class setup' })).toContainText('Team Granite')
})

test('[CBJ-03] Names, Display and Start Game', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await expect(display.locator('body')).toContainText('Granite')
})

test('[CBJ-04] Board clue: prompt, score, answer, Undo', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await page.getByRole('button', { name: 'Rocks, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await expect(display.locator('body')).toContainText('Synthetic prompt R1')
  await expect(display.locator('body')).not.toContainText('never projected')
  await page.getByRole('radio', { name: /^Granite/ }).check()
  await page.getByRole('button', { name: /^full credit, .* to Granite/ }).click()
  await expect(scores(page)).toHaveText(/Granite\s*100\s*Nimbus\s*0/)
  await page.getByRole('button', { name: 'Undo last score change' }).click()
  await expect(scores(page)).toHaveText(/Granite\s*0\s*Nimbus\s*0/)
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await expect(display.locator('body')).toContainText('Igneous')
})

test('[CBJ-05] Final: wagers, question, responses, reveal, settlement, winner', async ({
  page,
  context,
}) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await toFinalWithWagers(page, { granite: '100', nimbus: '50' })
  await finalQuestionToReveal(page)
  await expect(display.locator('body')).toContainText('Mantle convection')
  await revealAndJudge(page, 'Nimbus', 'Correct')
  await revealAndJudge(page, 'Granite', 'Incorrect')
  await expect(scores(page)).toHaveText(/Granite\s*100\s*Nimbus\s*150/)
  await page.getByRole('button', { name: 'End the game session' }).click()
  await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
  await expect(display.locator('body')).toContainText(/WINNER/i)
  await expect(display.locator('body')).toContainText(/NIMBUS/i)
})

test('[CBJ-06] Final tie: tied-finish completion', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 100 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await toFinalWithWagers(page, { granite: '0', nimbus: '0' })
  await finalQuestionToReveal(page)
  await revealAndJudge(page, 'Granite', 'Correct')
  await revealAndJudge(page, 'Nimbus', 'Correct')
  await page.getByRole('button', { name: 'Accept the tie' }).click()
  await page.getByRole('button', { name: /^Accept the tie and end the game/ }).click()
  await expect(display.locator('body')).toContainText(/a tie/i)
})

test('[CBJ-07] Host reload + Resume during the Final', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await toFinalWithWagers(page, { granite: '50' })
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  const finalPanel = page.getByRole('region', { name: 'Final wager' })
  await expect(finalPanel).toContainText('Wagers locked')
  await finalQuestionToReveal(page)
  await revealAndJudge(page, 'Granite', 'Correct')
  await expect(scores(page)).toHaveText(/Granite\s*250/)
})
