import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * CBN-3 (Court A/B recertification 2026-10-17): during the Final, the teacher's
 * Host countdown must visibly progress while a window runs, and agree with the
 * projector's countdown (both derive from the one durable deadline).
 *
 * Natural route only: Home → Import Game (qualification fixture) → Play →
 * names → Display → Start → two board clues scored → Go to the Final → wagers →
 * response window → lock. No state injection.
 */

const GAME_FILE = resolve(process.cwd(), 'docs/qualification/fixtures/court-b-final-qualification.game.json')

async function toFinalWagers(page: Page, context: BrowserContext): Promise<Page> {
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
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({ timeout: 20_000 })
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  for (const [tile, team] of [['Rocks, 200 points', 'Granite'], ['Skies, 100 points', 'Nimbus']] as const) {
    await page.getByRole('button', { name: tile }).click()
    await page.getByRole('button', { name: 'Show prompt on display' }).click()
    await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
    await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
    await page.getByRole('button', { name: 'Show answer on display' }).click()
    await page.getByRole('button', { name: 'Return to board' }).click()
  }
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  const confirm = page.getByRole('button', { name: 'Go to the Final now' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await page.getByRole('button', { name: 'Begin Final' }).click()
  return display
}

/** Seconds shown by "…: running — m:ss" (host) or "m:ss" (projector). */
function seconds(text: string): number {
  const match = text.match(/(\d+):(\d{2})/)
  if (!match) throw new Error(`no countdown in "${text}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

const hostResponse = (page: Page) => page.getByTestId('fwh-response-status')
const hostWager = (page: Page) => page.getByTestId('fwh-wager-status')
const displayClock = (display: Page) => display.getByTestId('signal-rail-timer-clock')

test('CBN-3: the Host Final response countdown ticks and agrees with the projector', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final countdown journey runs once (1080p)')
  test.setTimeout(120_000)
  const display = await toFinalWagers(page, context)
  const wagers = page.getByRole('group', { name: 'Team wagers' })
  const inputs = wagers.getByRole('spinbutton')
  await inputs.nth(0).fill('100')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await inputs.nth(1).fill('50')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()

  await expect(hostResponse(page)).toContainText('running')
  const first = seconds(await hostResponse(page).innerText())
  // The Host number must move on its own: no teacher action in between.
  await expect.poll(async () => seconds(await hostResponse(page).innerText()), { timeout: 10_000 }).toBeLessThan(first)
  await expect.poll(async () => seconds(await hostResponse(page).innerText()), { timeout: 10_000 }).toBeLessThanOrEqual(first - 3)
  // Same remaining-time truth as the projector, within display granularity.
  const host = seconds(await hostResponse(page).innerText())
  const projector = seconds(await displayClock(display).innerText())
  expect(Math.abs(host - projector)).toBeLessThanOrEqual(1)

  // Lock: the Host stops showing a running countdown once the window is no longer running.
  const responses = page.getByRole('group', { name: 'Team responses' })
  for (const answered of await responses.getByRole('button', { name: 'Answered (no wording)' }).all()) {
    await answered.click()
  }
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await expect(page.getByRole('button', { name: 'Reveal the answer' })).toBeVisible()
  await expect(hostResponse(page).filter({ hasText: 'running' })).toHaveCount(0)
})

test('CBN-3: the Host Final wager countdown ticks and agrees with the projector', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final countdown journey runs once (1080p)')
  test.setTimeout(120_000)
  const display = await toFinalWagers(page, context)
  await page.getByRole('button', { name: 'Start wager window' }).click()
  await expect(hostWager(page)).toContainText('running')
  const first = seconds(await hostWager(page).innerText())
  await expect.poll(async () => seconds(await hostWager(page).innerText()), { timeout: 10_000 }).toBeLessThanOrEqual(first - 3)
  const host = seconds(await hostWager(page).innerText())
  const projector = seconds(await displayClock(display).innerText())
  expect(Math.abs(host - projector)).toBeLessThanOrEqual(1)
})
