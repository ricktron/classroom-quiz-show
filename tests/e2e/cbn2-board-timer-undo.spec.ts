import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * CBN-2 (Court A/B recertification 2026-10-17): a board response-timer expiry
 * is a clock fact, not a teacher action. After "Time up", Undo must reach the
 * latest genuine teacher action — never an inert "Undo time up" that re-expires.
 *
 * Natural route only: Home demo import → Play → names → Start Game → Start
 * Round 1 → open a clue → ordinary scoring and timer controls → Undo.
 */

async function toBoardWithDisplay(page: Page, context: BrowserContext): Promise<Page> {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  const popup = context.waitForEvent('page')
  await page.getByRole('region', { name: 'Class setup' }).getByRole('button', { name: 'Open display' }).first().click()
  const display = await popup
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  return display
}

async function openClue(page: Page) {
  await page.locator('[data-testid^="cbh-tile-"]:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
}

/** Arm and start the shortest ordinary timer. */
async function startShortTimer(page: Page) {
  await page.getByTestId('rth-arm').click()
  await page.getByTestId('rth-duration').selectOption('5')
  await page.getByTestId('rth-start').click()
}

/** Wait for the host to record the expiry (the host decides expiry, not the test). */
async function waitForTimeUp(page: Page) {
  await expect(page.getByTestId('rth-status')).toContainText('Time up', { timeout: 15_000 })
}

async function runTimerOut(page: Page) {
  await startShortTimer(page)
  await waitForTimeUp(page)
}

const undoButton = (page: Page) => page.getByTestId('host-undo')
const hostScores = (page: Page) =>
  page.getByRole('region', { name: 'Teams & scoring' }).getByRole('list').first()

test('CBN-2: after Time up, Undo reaches the earlier score change and does not loop', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'timer journey runs once (1080p)')
  test.setTimeout(90_000)
  const display = await toBoardWithDisplay(page, context)
  await openClue(page)
  await startShortTimer(page)
  // The teacher scores while the window is still running; then time runs out.
  await page.getByRole('radio', { name: /^Team 1/ }).check()
  await page.getByRole('button', { name: /^full credit, .* to Team 1/ }).click()
  await expect(hostScores(page)).toContainText(/Team 1\s*100/)
  await waitForTimeUp(page)
  await expect(undoButton(page)).toHaveText('Undo score change (Team 1 +100)')

  await undoButton(page).click()
  await expect(hostScores(page)).toContainText(/Team 1\s*0/)
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')
  // Time is still up, and Undo has moved on: no "Undo time up" loop.
  await expect(page.getByTestId('rth-status')).toContainText('Time up')
  await expect(undoButton(page)).not.toHaveText(/time up/i)
})

test('CBN-2: a timer that runs out with no adjudication undoes its own start, then stays stopped', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'timer journey runs once (1080p)')
  test.setTimeout(90_000)
  await toBoardWithDisplay(page, context)
  await openClue(page)
  await runTimerOut(page)
  await expect(undoButton(page)).toHaveText('Undo timer start')
  await undoButton(page).click()
  // No past-deadline running timer is restored, so nothing re-expires.
  await expect(page.getByTestId('rth-status')).not.toContainText('Running')
  await expect(undoButton(page)).not.toHaveText(/time up/i)
  await page.waitForTimeout(1_500)
  await expect(page.getByTestId('rth-status')).not.toContainText('Time up')
})

test('CBN-2: after Time up and a Host reload, Undo still reaches the score change', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'timer journey runs once (1080p)')
  test.setTimeout(90_000)
  await toBoardWithDisplay(page, context)
  await openClue(page)
  await startShortTimer(page)
  await page.getByRole('radio', { name: /^Team 2/ }).check()
  await page.getByRole('button', { name: /^full credit, .* to Team 2/ }).click()
  await waitForTimeUp(page)
  await waitForSessionSaved(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(undoButton(page)).toHaveText('Undo score change (Team 2 +100)')
  await undoButton(page).click()
  await expect(hostScores(page)).toContainText(/Team 2\s*0/)
})
