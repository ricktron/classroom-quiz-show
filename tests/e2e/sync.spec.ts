import { test, expect, type Page } from '@playwright/test'

/**
 * Same-browser host/display synchronization over BroadcastChannel.
 *
 * The host and display are two tabs in ONE browser context (same origin), which
 * is exactly the intended deployment: teacher laptop + projector window. These
 * tests prove host→display sync, host authority, fail-closed decoding, and safe
 * degradation when the host disappears — all without a backend.
 */

// Mirror of SYNC_CHANNEL_NAME in src/sync/protocol.ts (kept in sync by review).
const CHANNEL_NAME = 'classroom-quiz-show:sync'

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

test('a host status change appears on the display', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  // Before init the display shows the neutral waiting state.
  await expect(display.getByText(/waiting for the host/i)).toBeVisible()

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  // Live update: the sanitized "session ready" status reaches the projector.
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await host.getByRole('button', { name: /^no-active-game$/ }).click()
  await expect(display.getByText(/no active game/i)).toBeVisible()

  await host.close()
  await display.close()
})

test('a display opened after the host catches up via request-state', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()

  // Display mounts AFTER the host already changed state; it must catch up.
  const display = await context.newPage()
  await openDisplay(display)
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await host.close()
  await display.close()
})

test('display refresh safely resumes the subscription', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await openDisplay(display)
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await display.reload()
  // A fresh receiver requests state and the host republishes → resumes.
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await host.close()
  await display.close()
})

test('the display is read-only and cannot modify host state', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /advance sequence/i }).click()
  await openDisplay(display)

  // No interactive controls on the projector.
  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByRole('textbox')).toHaveCount(0)

  const before = await host.getByTestId('private-revision').innerText()

  // A rogue display forges a public-state message; the host must ignore it.
  await display.evaluate((name) => {
    const ch = new BroadcastChannel(name)
    ch.postMessage({
      protocol: 'classroom-quiz-show/sync',
      schemaVersion: 1,
      message: {
        type: 'public-state',
        revision: 9999,
        payload: {
          schemaVersion: 1,
          revision: 9999,
          phase: 'ready',
          headline: 'FORGED',
          detail: 'FORGED',
        },
      },
    })
    ch.close()
  }, CHANNEL_NAME)

  await host.waitForTimeout(200)
  const after = await host.getByTestId('private-revision').innerText()
  expect(after).toBe(before) // host authority intact
  // The host never re-derives its private state from a display message.
  await expect(host.getByTestId('private-counter')).toHaveText('1')

  await host.close()
  await display.close()
})

test('a malformed injected message neither crashes nor exposes data on the display', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await openDisplay(display)
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await display.evaluate((name) => {
    const ch = new BroadcastChannel(name)
    ch.postMessage('not an envelope')
    ch.postMessage({ protocol: 'evil', schemaVersion: 1, message: { type: 'public-state' } })
    ch.postMessage({
      protocol: 'classroom-quiz-show/sync',
      schemaVersion: 999,
      message: { type: 'public-state', revision: 5, payload: { secret: 'LEAKED-ANSWER' } },
    })
    ch.close()
  }, CHANNEL_NAME)

  await display.waitForTimeout(200)
  // Still on a safe, valid state; the injected garbage changed nothing.
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  await expect(display.getByText(/session ready/i)).toBeVisible()
  const body = (await display.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('leaked-answer')
  expect(body).not.toContain('forged')

  await host.close()
  await display.close()
})

test('the display stays safe after the host tab closes', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await openDisplay(display)
  await expect(display.getByText(/session ready/i)).toBeVisible()

  await host.close()

  // Display keeps its last safe state and does not promote itself to authority.
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  await expect(display.getByRole('button')).toHaveCount(0)

  await display.close()
})
