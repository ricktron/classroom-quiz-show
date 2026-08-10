import { test, expect, type Page } from '@playwright/test'

/**
 * Slice 22 — bounded presentation-audio lifecycle in a real browser.
 *
 * Counts playback attempts through `window.__CQS_PRESENTATION_AUDIO__`.
 * Does not claim what a human hears.
 */

test.describe.configure({ mode: 'serial' })

async function ensureHostCommandsEnabled(host: Page) {
  await expect(host.getByTestId('persistence-status')).toBeVisible()
  await expect(host.getByTestId('persistence-status')).not.toContainText(/loading/i)
  const discard = host.getByTestId('persistence-discard')
  if (await discard.isVisible()) {
    await discard.click()
    await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  }
  await expect(host.getByRole('button', { name: /initialize \/ reset session/i })).toBeEnabled()
}

async function startBoard(host: Page) {
  await ensureHostCommandsEnabled(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

async function openClue(host: Page, tileId = 'earth-structure-100') {
  await host.getByTestId(`cbh-tile-${tileId}`).click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('lih-open')).toContainText('Open')
}

async function playLog(host: Page): Promise<string[]> {
  return host.evaluate(() => [...(window.__CQS_PRESENTATION_AUDIO__?.getPlayLog() ?? [])])
}

async function clearPlayLog(host: Page) {
  await host.evaluate(() => {
    window.__CQS_PRESENTATION_AUDIO__?.clearPlayLog()
  })
}

test('presentation audio cues, mute backlog, and host-only controls', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()

  await host.goto('#/host')
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await display.goto('#/display')
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()

  await expect(host.getByTestId('audio-controls')).toBeVisible()
  await expect(host.getByRole('button', { name: /enable sound/i })).toBeVisible()
  await expect(display.getByTestId('audio-controls')).toHaveCount(0)
  await expect(display.getByRole('button', { name: /enable sound/i })).toHaveCount(0)

  await host.getByRole('button', { name: /enable sound/i }).click()
  await expect(host.getByTestId('audio-status')).toContainText(/sound enabled/i)
  await expect
    .poll(async () => host.evaluate(() => window.__CQS_PRESENTATION_AUDIO__?.getStatus()?.volume ?? null))
    .toBeCloseTo(0.35, 2)

  await clearPlayLog(host)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()

  // 1) First buzz → active-claim; queued buzz does not.
  await host.keyboard.press('Digit1')
  await expect.poll(async () => playLog(host)).toEqual(['active-claim'])
  await host.keyboard.press('Digit2')
  await expect.poll(async () => playLog(host)).toEqual(['active-claim'])

  // 2) Positive award.
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect.poll(async () => playLog(host)).toEqual(['active-claim', 'positive-award'])

  // 3) Incorrect.
  await host.getByTestId('lih-incorrect').click()
  await expect
    .poll(async () => playLog(host))
    .toEqual(['active-claim', 'positive-award', 'incorrect'])

  // 4) Timer expiration on a fresh clue.
  await host.getByTestId('cbh-return').click()
  await openClue(host, 'earth-structure-200')
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()
  await expect(host.getByTestId('rth-status')).toContainText('Time up', { timeout: 15_000 })
  await expect
    .poll(async () => playLog(host))
    .toEqual(['active-claim', 'positive-award', 'incorrect', 'timer-expired'])

  // 5) Mute consumes; unmute has no backlog; later cue still plays.
  await host.getByTestId('audio-mute').click()
  await expect(host.getByTestId('audio-status')).toContainText(/muted/i)
  const mutedLen = (await playLog(host)).length
  await host.getByTestId('tsp-target-rhyolites').click()
  await host.getByTestId('tsp-award-full').click()
  await expect.poll(async () => (await playLog(host)).length).toBe(mutedLen)

  await host.getByTestId('audio-mute').click()
  await expect(host.getByTestId('audio-status')).toContainText(/sound enabled/i)
  await expect.poll(async () => (await playLog(host)).length).toBe(mutedLen)

  // 6) Game completion.
  await host.getByRole('button', { name: /end game session/i }).click()
  await expect
    .poll(async () => playLog(host))
    .toEqual(['active-claim', 'positive-award', 'incorrect', 'timer-expired', 'game-complete'])

  // Gameplay still advanced under mute earlier (score changed).
  await expect(host.getByTestId('game-lifecycle')).toHaveText(/ended/i)

  await host.close()
  await display.close()
})
