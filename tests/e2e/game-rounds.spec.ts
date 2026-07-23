import { test, expect, type Page } from '@playwright/test'

/**
 * Slice 3 — game & round model over the same-browser host/display sync.
 *
 * The host loads a small in-memory sample definition (non-gameplay placeholder
 * rounds) and drives round selection; the projector display reflects ONLY the
 * safe, derived round status ("Round N of M", "unavailable", "complete"). The
 * display never becomes interactive and never exposes round-type identifiers or
 * unsupported-type diagnostics.
 */

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

async function startSessionWithSampleGame(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /^initialize sample game$/i }).click()
}

test('host loads a sample game and the display shows safe round status', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await startSessionWithSampleGame(host)
  // No round selected yet → neutral "game ready" with the round count.
  await expect(display.getByTestId('display-game')).toContainText(/3 rounds/i)

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/round 1 of 3/i)

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/round 2 of 3/i)

  await host.close()
  await display.close()
})

test('the display cannot select or advance rounds (read-only)', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await startSessionWithSampleGame(host)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await openDisplay(display)
  await expect(display.getByTestId('display-game')).toHaveText(/round 1 of 3/i)

  // No interactive controls at all on the projector.
  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByRole('textbox')).toHaveCount(0)
  await expect(display.getByRole('link')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('an unsupported round leaves the display safe and reveals no internals', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /initialize sample with unsupported round/i }).click()

  // First round is supported.
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/round 1 of 2/i)

  // Second round is an unregistered type → display fails closed to a neutral line.
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/not available/i)

  // The display exposes no round-type identifier or unsupported-type diagnostic.
  const body = (await display.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('unsupported-sample')
  expect(body).not.toContain('mystery')
  expect(body).not.toContain('placeholder')
  expect(body).not.toContain('answer')
  expect(body).not.toContain('note')

  await host.close()
  await display.close()
})

test('display refresh and a second display both resume the current round', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await startSessionWithSampleGame(host)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await openDisplay(display)
  await expect(display.getByTestId('display-game')).toHaveText(/round 2 of 3/i)

  // Refresh resumes via request-state.
  await display.reload()
  await expect(display.getByTestId('display-game')).toHaveText(/round 2 of 3/i)

  // A second projector tab catches up to the same round.
  const display2 = await context.newPage()
  await openDisplay(display2)
  await expect(display2.getByTestId('display-game')).toHaveText(/round 2 of 3/i)

  await host.close()
  await display.close()
  await display2.close()
})

test('ending the game shows a neutral "complete" state on the display', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await startSessionWithSampleGame(host)
  await host.getByRole('button', { name: /^end game session$/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/game complete/i)

  await host.close()
  await display.close()
})
