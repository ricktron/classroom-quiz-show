import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { importPlayNamesDisplayStartRound1 } from './helpers/courtQualificationJourney'

/**
 * FRC-2: during a BOARD clue, the teacher's Host response countdown must visibly
 * progress while the window runs, and agree with the projector's countdown —
 * both derive from the one durable deadline.
 *
 * Same timer-authority principle CBN-3 established for the Final. Natural route
 * only: Home → Import Game (qualification fixture) → Play → names → Display →
 * Start → Start Round 1 → open a tile → show the prompt → Start timer. No state
 * injection.
 */

/** Natural route to a live board clue with the prompt public. */
async function toOpenBoardClue(page: Page, context: BrowserContext): Promise<Page> {
  const display = await importPlayNamesDisplayStartRound1(page, context)
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  return display
}

/** Seconds shown by "m:ss". */
function seconds(text: string): number {
  const match = text.match(/(\d+):(\d{2})/)
  if (!match) throw new Error(`no countdown in "${text}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Read the Host number and the projector number as close to simultaneously as
 * the transport allows. Two sequential reads leave real time between them, and
 * the Display's own sample is already up to COUNTDOWN_TICK_MS stale, so a
 * sequential pair can differ by 2 whole seconds after rounding on a loaded
 * machine — a flake shape, not a product fact.
 */

const hostRemaining = (page: Page) => page.getByTestId('rth-remaining')
const hostStatus = (page: Page) => page.getByTestId('rth-status')
const displayClock = (display: Page) => display.getByTestId('rtd-clock')

/**
 * Read the Host number and the projector number as close to simultaneously as
 * the transport allows. Two sequential reads leave real time between them, and
 * the Display's own sample is already up to COUNTDOWN_TICK_MS stale, so a
 * sequential pair can differ by 2 whole seconds after rounding on a loaded
 * machine — a flake shape, not a product fact. A few milliseconds of protocol
 * jitter remain: there is no atomic cross-page read.
 */
async function hostAndProjectorSeconds(
  page: Page,
  display: Page,
): Promise<readonly [number, number]> {
  const [hostText, projectorText] = await Promise.all([
    hostRemaining(page).innerText(),
    displayClock(display).innerText(),
  ])
  return [seconds(hostText), seconds(projectorText)]
}

test('FRC-2: the Host board response countdown ticks and agrees with the projector', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Board countdown journey runs once (1080p)')
  test.setTimeout(120_000)
  const display = await toOpenBoardClue(page, context)

  await page.getByTestId('rth-start').click()
  await expect(hostStatus(page)).toContainText(/running/i)

  const first = seconds(await hostRemaining(page).innerText())
  // The Host number must move on its own: no teacher action in between.
  await expect
    .poll(async () => seconds(await hostRemaining(page).innerText()), { timeout: 10_000 })
    .toBeLessThan(first)
  await expect
    .poll(async () => seconds(await hostRemaining(page).innerText()), { timeout: 10_000 })
    .toBeLessThanOrEqual(first - 3)

  // Same remaining-time truth as the projector, within display granularity.
  const [host, projector] = await hostAndProjectorSeconds(page, display)
  expect(Math.abs(host - projector)).toBeLessThanOrEqual(1)
})

test('FRC-2: pausing the Host board countdown freezes the same number on both surfaces', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Board countdown journey runs once (1080p)')
  test.setTimeout(120_000)
  const display = await toOpenBoardClue(page, context)

  await page.getByTestId('rth-start').click()
  const started = seconds(await hostRemaining(page).innerText())
  await expect
    .poll(async () => seconds(await hostRemaining(page).innerText()), { timeout: 10_000 })
    .toBeLessThanOrEqual(started - 2)

  await page.getByTestId('rth-pause').click()
  await expect(hostStatus(page)).toContainText(/paused/i)
  const paused = seconds(await hostRemaining(page).innerText())

  // Paused is a fixed fact on both surfaces: it must not keep counting down.
  await page.waitForTimeout(2_000)
  const [hostPaused, projectorPaused] = await hostAndProjectorSeconds(page, display)
  expect(hostPaused).toBe(paused)
  expect(Math.abs(projectorPaused - paused)).toBeLessThanOrEqual(1)

  // Resume returns both to a live, moving countdown from the same remaining time.
  await page.getByTestId('rth-resume').click()
  await expect(hostStatus(page)).toContainText(/running/i)
  await expect
    .poll(async () => seconds(await hostRemaining(page).innerText()), { timeout: 10_000 })
    .toBeLessThan(paused)
  const [hostResumed, projectorResumed] = await hostAndProjectorSeconds(page, display)
  expect(Math.abs(hostResumed - projectorResumed)).toBeLessThanOrEqual(1)
})
