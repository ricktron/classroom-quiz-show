import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(/loading/i)
}

async function completeSample(page: Page) {
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await page.getByRole('button', { name: /^initialize sample game$/i }).click()
  await page.getByRole('button', { name: /end game session/i }).click()
  await expect(page.getByTestId('ledger-status')).toContainText(/saved locally/i)
}

test('auto-save, refresh, labeling, deletion, confirmation, and display privacy', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await display.goto('#/display')
  await completeSample(host)

  const ledger = host.getByRole('table', { name: /host-private completed summary/i })
  await expect(ledger).toContainText('Foundation Sample Game')
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)

  // Human-readable timestamps, not raw epoch integers.
  await expect(ledger.locator('time').first()).toBeVisible()
  await expect(ledger.locator('time').first()).not.toHaveText(/^\d+$/)

  await host.reload()
  await openHost(host)
  await expect(host.getByTestId('session-summary-panel')).toHaveCount(0)
  await expect(ledger).toContainText('Foundation Sample Game')

  await host.getByRole('button', { name: /view details/i }).click()
  const label = host.getByRole('textbox', { name: /class label/i })
  await label.fill('Period 3')
  await host.getByRole('button', { name: /save class label/i }).click()
  await expect(host.getByTestId('ledger-status')).toContainText(/class label updated/i)
  await expect(ledger).toContainText('Period 3')

  // Filters constrain the compatible report selection.
  await host.getByLabel('Filter by class label').selectOption('Period 3')
  await expect(host.getByTestId('ledger-class-rollups')).toContainText('Period 3')
  await expect(host.getByTestId('ledger-game-rollup')).toContainText('Foundation Sample Game')
  await host.getByLabel('Filter by class label').selectOption('unlabeled')
  await expect(host.getByTestId('ledger-reports-empty')).toBeVisible()
  await host.getByLabel('Filter by class label').selectOption('all')
  await expect(host.getByTestId('ledger-game-rollup')).toContainText('Foundation Sample Game')

  await host.getByRole('button', { name: /^delete$/i }).click()
  await expect(host.getByRole('button', { name: /confirm delete/i })).toBeFocused()
  await host.getByRole('button', { name: /confirm delete/i }).press('Enter')
  await expect(ledger).toContainText(/no completed summaries/i)

  await completeSample(host)
  await host.getByRole('button', { name: /clear all summaries/i }).click()
  await host.getByRole('button', { name: /confirm clear all/i }).click()
  await expect(ledger).toContainText(/no completed summaries/i)

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  expect(displayText).not.toContain('completed summary ledger')
  expect(displayText).not.toContain('class label')
  expect(displayText).not.toContain('competitive profile')

  await host.close()
  await display.close()
})
