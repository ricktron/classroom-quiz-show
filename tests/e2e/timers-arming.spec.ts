import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 7 — timers, arming and transitions, end to end in a real browser.
 *
 * A host tab and a projector tab in the same browser, synchronized over a real
 * BroadcastChannel. The host opens a clue, arms it, runs a window, pauses,
 * resumes, stops and expires it — and the projector must show exactly the right
 * sanitized state at every step, never a host control, and never an answer.
 *
 * Timing note: only ONE test waits for real seconds (the expiry test, using the
 * five-second minimum window). Everything else is driven by host actions, and the
 * exhaustive timing permutations live in the unit tests, where a manual clock
 * makes them exact.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

/** Private content that lives in the built-in sample and must never be projected. */
const PRIVATE_SAMPLE_CONTENT = [
  'Students often say',
  'Accept "the Moho"',
  'Double-value tile',
  'Mantle convection',
]

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

/** Import the built-in board sample (45-second authored window) and open its round. */
async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

/** Open a clue through to the prompt reveal — the one legal response window. */
async function openClue(host: Page, tileId = 'earth-structure-100') {
  await host.getByTestId(`cbh-tile-${tileId}`).click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('rth-open')).toContainText('Open')
}

test('the full teacher flow: arm, run, pause, resume, stop — mirrored on the projector', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // ── 1. No window exists yet, so the projector shows no timer panel at all ──
  await expect(display.getByTestId('display-response')).toHaveCount(0)

  await openClue(host)
  await expect(display.getByTestId('display-response')).toHaveCount(0)

  // ── 2. Arming is a durable fact, and it reaches the projector ──────────────
  await host.getByTestId('rth-arm').click()
  await expect(host.getByTestId('rth-armed')).toHaveText('Armed')
  await expect(display.getByTestId('rtd-armed')).toContainText('Buzzers armed')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-armed', 'armed')

  // ── 3. The projector shows the countdown, derived from the deadline ────────
  await host.getByTestId('rth-duration').selectOption('60')
  await host.getByTestId('rth-start').click()
  await expect(host.getByTestId('rth-status')).toContainText('Running')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')
  await expect(display.getByTestId('rtd-status')).toHaveText('Time remaining')
  // It is counting down from a minute; the exact instant is a local derivation.
  await expect(display.getByTestId('rtd-clock')).toHaveText(/^0:5\d$|^1:00$/)

  // ── 4. Pause and resume ────────────────────────────────────────────────────
  await host.getByTestId('rth-pause').click()
  await expect(host.getByTestId('rth-status')).toContainText('Paused')
  await expect(display.getByTestId('rtd-status')).toHaveText('Paused')
  const pausedClock = await display.getByTestId('rtd-clock').textContent()
  // A paused clock is frozen: it still reads the same after a real second.
  await host.waitForTimeout(1_100)
  await expect(display.getByTestId('rtd-clock')).toHaveText(pausedClock ?? '')

  await host.getByTestId('rth-resume').click()
  await expect(host.getByTestId('rth-status')).toContainText('Running')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  // ── 5. The host interrupts before the deadline ─────────────────────────────
  await host.getByTestId('rth-interrupt').click()
  await expect(host.getByTestId('rth-status')).toContainText('Stopped early')
  await expect(display.getByTestId('rtd-status')).toHaveText('Stopped')
  // The projector is told THAT it stopped, never who stopped it.
  await expect(display.locator('body')).not.toContainText('stopped by the host')
  // Interruption does not end the clue: the prompt is still up, unanswered.
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('a timer expires exactly once, and only the host decides that', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)

  // The five-second minimum window keeps this — the one real wait in the file —
  // as short as the domain bounds allow.
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  await expect(host.getByTestId('rth-status')).toContainText('Time up', { timeout: 15_000 })
  await expect(display.getByTestId('rtd-status')).toHaveText('Time up')
  await expect(display.getByTestId('rtd-clock')).toHaveText('0:00')
  // Expiry disarms and, crucially, awards nothing.
  await expect(host.getByTestId('rth-armed')).toHaveText('Not armed')

  // Exactly ONE expiry fact in the append-only history, however long we wait.
  await host.waitForTimeout(1_500)
  const history = host.getByTestId('event-history')
  await expect(history.getByText('RESPONSE_TIMER_EXPIRED')).toHaveCount(1)

  await host.close()
  await display.close()
})

test('a stale timeout after a reset or a clue change has no effect', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)

  // Start a short window, then reset it before the deadline. The scheduled
  // callback must append nothing when its moment arrives.
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()
  await host.getByTestId('rth-reset').click()
  await expect(host.getByTestId('rth-status')).toContainText('No timer running')
  await expect(display.getByTestId('display-response')).toHaveCount(0)

  // Start another and close the CLUE before the deadline.
  await host.getByTestId('rth-start').click()
  await host.getByTestId('cbh-return').click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()

  // Well past both deadlines: no expiry was ever recorded.
  await host.waitForTimeout(6_500)
  await expect(host.getByTestId('event-history').getByText('RESPONSE_TIMER_EXPIRED')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('undo restores the prior durable phase state', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)

  await host.getByTestId('rth-arm').click()
  await host.getByTestId('rth-duration').selectOption('60')
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  // Undo the START: the clue stays armed and the clock is gone.
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(host.getByTestId('rth-status')).toContainText('No timer running')
  await expect(host.getByTestId('rth-armed')).toHaveText('Armed')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'idle')
  await expect(display.getByTestId('rtd-armed')).toContainText('Buzzers armed')

  // Undo the ARM: the projector's timer panel disappears entirely.
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(host.getByTestId('rth-armed')).toHaveText('Not armed')
  await expect(display.getByTestId('display-response')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('a projector reload recovers the live window from the host', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)

  await host.getByTestId('rth-arm').click()
  await host.getByTestId('rth-duration').selectOption('60')
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  // A projector that is reloaded mid-window asks the host to republish and picks
  // the countdown straight back up from the durable deadline — it does not start
  // a new one, and it does not lose the armed state.
  await display.reload()
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')
  await expect(display.getByTestId('rtd-armed')).toContainText('Buzzers armed')
  await expect(display.getByTestId('rtd-clock')).toHaveText(/^0:[0-5]\d$/)

  await host.close()
  await display.close()
})

test('the projector leaks nothing new, and scoring still works alongside a window', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  // ── Privacy: the permanent baseline plus the Slice 7 host-only vocabulary ──
  const body = (await display.locator('body').innerText()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(body, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  for (const secret of PRIVATE_SAMPLE_CONTENT) {
    expect(body, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  const html = (await display.content()).toLowerCase()
  for (const secret of [
    ...PRIVATE_SAMPLE_CONTENT,
    'timerid',
    'tmr-',
    'responseseconds',
    'response_timer_started',
    'stopped by the host',
    'reset window',
    'arm clue',
  ]) {
    expect(html, `DOM must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  // The answer is still not public while the window runs.
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  // And the projector is still read-only.
  await expect(display.getByRole('button')).toHaveCount(0)

  // ── Hardware vocabulary: host may show Slice 10 Sony setup; display must not ─
  // Slice 8–10 added keyboard buzz-in, a generic controller panel, and a
  // host-private Sony Buzz! setup section. The host may therefore contain
  // "sony"/"handset". Neither surface may offer WebHID, Bluetooth, or first-only
  // lockout, and the projector must still show no controller/Sony surface.
  const hostHtml = (await host.content()).toLowerCase()
  for (const absent of ['webhid', 'bluetooth', 'playstation', 'lockout']) {
    expect(hostHtml, `host must not contain "${absent}"`).not.toContain(absent)
  }
  const projectorHtml = (await display.content()).toLowerCase()
  for (const absent of [
    'gamepad',
    'controller',
    'webhid',
    'bluetooth',
    'sony',
    'handset',
    'candidate',
    'lockout',
    '054c',
  ]) {
    expect(projectorHtml, `display must not contain "${absent}"`).not.toContain(absent)
  }

  // ── Scoring is unchanged and independent of the window ────────────────────
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect(display.getByTestId('display-scores')).toContainText('100')
  // Scoring did not stop the clock — ending the window is its own decision.
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  await host.close()
  await display.close()
})

test('reduced motion: the projector stays fully usable with the pulse suppressed', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  const reducedDisplay = await context.newPage()
  // One projector with the default preference and one that asks for reduced
  // motion, so the test proves the media query does something as well as that
  // the panel stays readable without it.
  await reducedDisplay.emulateMedia({ reducedMotion: 'reduce' })

  await openHost(host)
  await openDisplay(display)
  await openDisplay(reducedDisplay)
  await startBoard(host)
  await openClue(host)

  await host.getByTestId('rth-arm').click()
  // A five-second window puts the countdown straight into its "urgent" band,
  // which is the only place an animation exists at all.
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()

  const clock = reducedDisplay.getByTestId('rtd-clock')
  await expect(clock).toBeVisible()
  await expect(reducedDisplay.getByTestId('rtd-armed')).toContainText('Buzzers armed')
  // Everything is still readable as TEXT — that is what "still usable" means.
  await expect(clock).toHaveText(/^0:0\d$/)
  await expect(reducedDisplay.getByTestId('rtd-status')).toHaveText('Time remaining')

  const reducedStyle = await clock.evaluate((element) => ({
    animationName: getComputedStyle(element).animationName,
    opacity: getComputedStyle(element).opacity,
  }))
  expect(reducedStyle.animationName).toBe('none')
  // Full opacity, so nothing is caught mid-fade when someone looks up.
  expect(Number(reducedStyle.opacity)).toBe(1)

  // …while the default projector does run the (slow, opacity-only) pulse.
  const defaultAnimation = await display
    .getByTestId('rtd-clock')
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(defaultAnimation).toBe('rtd-pulse')

  await host.close()
  await display.close()
  await reducedDisplay.close()
})
