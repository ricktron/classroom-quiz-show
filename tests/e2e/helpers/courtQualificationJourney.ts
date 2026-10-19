import { expect, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The Court qualification fixture's natural route, shared by the specs that
 * need a live Round 1 board with the projector open.
 *
 * Extracted because it was copied verbatim between two countdown specs. Two
 * copies of a natural route is worse than it looks: both specs exist to compare
 * the Host and the projector on the SAME journey, and a route that drifts
 * between copies stops proving the same thing in each.
 */

export const COURT_QUALIFICATION_GAME_FILE = resolve(
  process.cwd(),
  'docs/qualification/fixtures/court-b-final-qualification.game.json',
)

/** The two class names this journey always uses. */
export const COURT_QUALIFICATION_TEAM_NAMES = ['Granite', 'Nimbus'] as const

/**
 * Home -> Import Game -> Play -> names -> open the Display -> Start Game ->
 * Start Round 1. Returns the Display page so the caller can read the projector.
 */
export async function importPlayNamesDisplayStartRound1(
  page: Page,
  context: BrowserContext,
): Promise<Page> {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page
    .getByRole('textbox', { name: 'Game file text' })
    .fill(readFileSync(COURT_QUALIFICATION_GAME_FILE, 'utf8'))
  await page.getByRole('button', { name: 'Import file text' }).click()
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()

  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  for (const [index, name] of COURT_QUALIFICATION_TEAM_NAMES.entries()) {
    await fields.nth(index).fill(name)
    await fields.nth(index).press('Enter')
  }

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
