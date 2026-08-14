import { test, expect, type Page } from '@playwright/test'

/**
 * Slice 22 — bounded presentation-audio lifecycle in a real browser.
 *
 * Playback attempts are counted entirely from the Playwright environment via
 * an init-script AudioContext wrapper. Production code has no e2e global.
 * Does not claim what a human hears.
 */

test.describe.configure({ mode: 'serial' })

type PresentationAudioProbe = {
  readonly getStartCount: () => number
  readonly clearStartCount: () => void
  readonly getStarts: () => number
}

declare global {
  interface Window {
    __CQS_E2E_PRESENTATION_AUDIO__?: PresentationAudioProbe
  }
}

/**
 * Install before host app scripts: wrap AudioContext so source.start() is
 * counted in the test page only.
 */
async function installPresentationAudioProbe(page: Page) {
  await page.addInitScript(() => {
    const NativeAudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!NativeAudioContext) return

    let startCount = 0
    window.__CQS_E2E_PRESENTATION_AUDIO__ = {
      getStartCount: () => startCount,
      clearStartCount: () => {
        startCount = 0
      },
      getStarts: () => startCount,
    }

    class WrappedAudioContext extends NativeAudioContext {
      createBufferSource(): AudioBufferSourceNode {
        const source = super.createBufferSource()
        const nativeStart = source.start.bind(source)
        source.start = (...startArgs: Parameters<AudioBufferSourceNode['start']>) => {
          startCount += 1
          return nativeStart(...startArgs)
        }
        return source
      }
    }

    ;(window as unknown as { AudioContext: typeof AudioContext }).AudioContext =
      WrappedAudioContext as unknown as typeof AudioContext
    if ('webkitAudioContext' in window) {
      ;(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext =
        WrappedAudioContext as unknown as typeof AudioContext
    }
  })
}

async function startCount(host: Page): Promise<number> {
  return host.evaluate(() => window.__CQS_E2E_PRESENTATION_AUDIO__?.getStartCount() ?? 0)
}

async function clearStartCount(host: Page) {
  await host.evaluate(() => {
    window.__CQS_E2E_PRESENTATION_AUDIO__?.clearStartCount()
  })
}

async function ensureHostCommandsEnabled(host: Page) {
  await expect(host.getByTestId('persistence-status')).toBeVisible()
  await expect(host.getByTestId('persistence-status')).not.toContainText(/loading/i)
  const discard = host.getByTestId('persistence-discard')
  if (await discard.isVisible()) {
    await discard.click()
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

test('presentation audio cues, mute backlog, and host-only controls', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()

  await installPresentationAudioProbe(host)

  await host.goto('#/host')
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await display.goto('#/display')
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()

  await expect(host.getByTestId('audio-controls')).toBeVisible()
  await expect(host.getByRole('button', { name: /enable sound/i })).toBeVisible()
  await expect(display.getByTestId('audio-controls')).toHaveCount(0)
  await expect(display.getByRole('button', { name: /enable sound/i })).toHaveCount(0)

  // Inactive initially — no buffer sources started.
  await expect.poll(async () => startCount(host)).toBe(0)

  await host.getByRole('button', { name: /enable sound/i }).click()
  await expect(host.getByTestId('audio-status')).toContainText(/sound enabled/i)
  await expect(host.getByRole('switch', { name: 'Presentation sound' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(host.getByTestId('audio-volume')).toHaveValue('0.35')

  await clearStartCount(host)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()

  // 1) First buzz → playback; queued buzz does not add playback.
  await host.keyboard.press('Digit1')
  await expect.poll(async () => startCount(host)).toBe(1)
  await host.keyboard.press('Digit2')
  await expect.poll(async () => startCount(host)).toBe(1)

  // 2) Positive award adds playback.
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect.poll(async () => startCount(host)).toBe(2)

  // 3) Incorrect adds playback.
  await host.getByTestId('lih-incorrect').click()
  await expect.poll(async () => startCount(host)).toBe(3)

  // 4) Timer expiration on a fresh clue.
  await host.getByTestId('cbh-return').click()
  await openClue(host, 'earth-structure-200')
  await host.getByTestId('rth-duration').selectOption('5')
  await host.getByTestId('rth-start').click()
  await expect(host.getByTestId('rth-status')).toContainText('Time up', { timeout: 15_000 })
  await expect.poll(async () => startCount(host)).toBe(4)

  // 5) Mute consumes; unmute has no backlog; later cue still plays.
  await host.getByRole('switch', { name: 'Presentation sound' }).click()
  await expect(host.getByTestId('audio-status')).toContainText(/muted/i)
  await expect(host.getByRole('switch', { name: 'Presentation sound' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  const mutedLen = await startCount(host)
  await host.getByTestId('tsp-target-rhyolites').click()
  await host.getByTestId('tsp-award-full').click()
  await expect.poll(async () => startCount(host)).toBe(mutedLen)

  await host.getByRole('switch', { name: 'Presentation sound' }).click()
  await expect(host.getByTestId('audio-status')).toContainText(/sound enabled/i)
  await expect.poll(async () => startCount(host)).toBe(mutedLen)

  // 6) Game completion adds playback.
  await host.getByRole('button', { name: /end game session/i }).click()
  await expect.poll(async () => startCount(host)).toBe(mutedLen + 1)

  // Gameplay still advanced under mute earlier (score changed).
  await expect(host.getByTestId('game-lifecycle')).toHaveText(/ended/i)

  await host.close()
  await display.close()
})
