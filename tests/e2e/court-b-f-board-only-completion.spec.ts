import { test, expect, type BrowserContext, type Page } from '@playwright/test'

/**
 * Court B repair F (CB-05, owner decision): when the teacher explicitly ends a
 * game with no Final, the Display names the unique top scorer Winner, or shows
 * tied-finish copy when the top score is shared. Never before explicit
 * completion; unplayed clues do not prevent it. Host and Display scores agree.
 *
 * Fail-first on baa818f: board-only completion showed only "Game complete".
 */

async function demoStartedWithDisplay(page: Page, context: BrowserContext): Promise<Page> {
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
  return display
}

async function award(page: Page, tile: string, team: 'Comets' | 'Magma') {
  await page.getByRole('button', { name: tile }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

async function endGame(page: Page) {
  await page.getByRole('button', { name: 'End the game' }).click()
  await page.getByRole('button', { name: 'End the game now' }).click()
}

const displayScores = (display: Page) => display.getByTestId('display-scores')
const hostScores = (page: Page) =>
  page.getByRole('region', { name: 'Teams & scoring' }).getByRole('list').first()

test.beforeEach(({ page }, info) => {
  void page
  test.skip(info.project.name === 'mobile-host', 'projector/laptop projects only')
})

test('CB-05: a unique top score is named Winner only after End the game, with clues unplayed', async ({
  page,
  context,
}) => {
  const display = await demoStartedWithDisplay(page, context)
  await award(page, 'Earth Structure, 200 points', 'Magma')
  await award(page, 'Earth Structure, 100 points', 'Comets')

  // No premature winner while the game is in play.
  await expect(display.locator('body')).not.toContainText(/winner/i)

  await endGame(page)
  const winner = display.getByTestId('audience-completion-winner')
  await expect(winner).toContainText('Winner')
  await expect(winner).toContainText('Magma')
  await expect(display.getByTestId('audience-completion-winner-score')).toHaveText('200')
  await expect(display.getByTestId('audience-completion-tied')).toHaveCount(0)
  // Host and Display agree on the final scores.
  await expect(hostScores(page)).toHaveText(/Comets\s*100\s*Magma\s*200/)
  await expect(displayScores(display)).toContainText(/Comets\s*100/)
  await expect(displayScores(display)).toContainText(/Magma\s*200/)

  // Remount-safe: a Display reload shows the same durable result.
  await display.reload()
  await expect(display.getByTestId('audience-completion-winner')).toContainText('Magma')
})

for (const [label, awards] of [
  ['0-0', [] as const],
  ['equal non-zero', [['Earth Structure, 100 points', 'Comets'], ['Plate Tectonics, 100 points', 'Magma']] as const],
] as const) {
  test(`CB-05: a shared top score (${label}) shows tied-finish copy and no winner`, async ({
    page,
    context,
  }) => {
    const display = await demoStartedWithDisplay(page, context)
    for (const [tile, team] of awards) await award(page, tile, team)
    await endGame(page)
    await expect(display.getByTestId('audience-completion-tied')).toHaveText('Game complete — a tie')
    await expect(display.getByTestId('audience-completion-winner')).toHaveCount(0)
    await expect(display.locator('body')).not.toContainText(/winner/i)
  })
}
