import { test, expect, type Page } from '@playwright/test'

/**
 * Slice 15 — Session Summary Contract, host-only end-of-session surface.
 *
 * Proves completed-session visibility, absence during active play, cleanup on
 * reset / new game / refresh, and that the display never receives a summary.
 */

test.describe.configure({ mode: 'serial' })

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(/loading/i)
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function startSampleGame(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /^initialize sample game$/i }).click()
  await expect(host.getByTestId('game-lifecycle')).toHaveText('active')
}

test('summary is absent while active and visible after host ends the session', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startSampleGame(host)

  await expect(host.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.getByRole('button', { name: /end game session/i }).click()
  await expect(host.getByTestId('game-lifecycle')).toHaveText('ended')
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByTestId('ssp-current-session-warning')).toContainText(/saved locally/i)
  await expect(host.getByTestId('ssp-terminal-path')).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Session summary' })).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Final standings' })).toBeVisible()

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  expect(displayText).not.toContain('session summary')
  expect(displayText).not.toContain('current-session-only')
  await expect(display.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('reset removes the summary; loading another game removes the prior summary', async ({
  context,
}) => {
  const host = await context.newPage()
  await openHost(host)
  await startSampleGame(host)
  await host.getByRole('button', { name: /end game session/i }).click()
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await expect(host.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.getByRole('button', { name: /^initialize sample game$/i }).click()
  await host.getByRole('button', { name: /end game session/i }).click()
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()

  await host.getByRole('button', { name: /initialize sample with unsupported round/i }).click()
  await expect(host.getByTestId('game-lifecycle')).toHaveText('active')
  await expect(host.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.close()
})

test('refresh after completion does not restore the summary or recovery record', async ({
  context,
}) => {
  const host = await context.newPage()
  await openHost(host)
  await startSampleGame(host)
  await host.getByRole('button', { name: /end game session/i }).click()
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByTestId('event-history')).toContainText('GAME_SESSION_ENDED')
  // Completion atomically saves the ledger record and clears active recovery.
  await expect(host.getByTestId('ledger-status')).toContainText(/saved locally/i, {
    timeout: 10_000,
  })

  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-status')).toBeVisible()
  await expect(host.getByTestId('persistence-status')).not.toContainText(/loading/i)
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('session-summary-panel')).toHaveCount(0)
  await expect(host.getByTestId('game-lifecycle')).toHaveCount(0)
  await expect(host.getByRole('table', { name: /host-private completed summary/i })).toContainText(
    'Foundation Sample Game',
  )

  await host.close()
})

test('unsupported-round sample shows unavailable rounds and nothing on display', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /initialize sample with unsupported round/i }).click()
  await expect(host.getByTestId('game-lifecycle')).toHaveText('active')

  await host.getByRole('button', { name: /end game session/i }).click()
  await expect(host.getByTestId('game-lifecycle')).toHaveText('ended')
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Unavailable rounds' })).toBeVisible()
  await expect(host.getByTestId('ssp-unavailable-round-mystery-round')).toContainText(
    /Mystery Round/,
  )
  await expect(host.getByTestId('ssp-unavailable-round-mystery-round')).toContainText(
    /unsupported-sample/,
  )
  await expect(host.getByTestId('ssp-unavailable-round-mystery-round')).toContainText(
    /No gameplay metrics are invented/,
  )
  await expect(host.getByTestId('ssp-unavailable-round-supported-1')).toContainText(
    /placeholder/,
  )
  await expect(host.getByTestId('ssp-boards-none')).toBeVisible()
  await expect(host.locator('[data-testid^="ssp-board-"]')).toHaveCount(0)
  await expect(host.getByTestId('ssp-unavailable-rounds')).not.toContainText(/Tile selections/)
  await expect(host.getByTestId('ssp-unavailable-rounds')).not.toContainText(/Timer starts/)

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  expect(displayText).not.toContain('session summary')
  expect(displayText).not.toContain('unavailable rounds')
  expect(displayText).not.toContain('mystery round')
  await expect(display.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.close()
  await display.close()
})
