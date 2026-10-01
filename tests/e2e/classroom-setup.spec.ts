import { test, expect } from '@playwright/test'

test('Home Play reaches class setup with keyboard name completion', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page).toHaveURL(/[?&]play=/)
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  // Ordinary workflow opens Buzzers first; Names remains the Start readiness blocker.
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'buzzers')
  await expect(page.getByTestId('setup-play-blocker')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('host-chrome-mute')).toBeVisible()
  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/WebHID|054c|cqs\.sony/i)
  await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  await manuals.first().waitFor({ state: 'visible' })
  const count = await manuals.count()
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    await input.fill(`Team ${i + 1}`)
    await input.blur()
  }
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  const viewport = page.viewportSize()
  const box = await page.getByTestId('classroom-setup').boundingBox()
  expect(viewport).toBeTruthy()
  expect(box).toBeTruthy()
  if (viewport && box) {
    expect(box.width).toBeLessThanOrEqual(viewport.width + 1)
  }
})

test('audience display stays free of Host setup diagnostics', async ({ page }) => {
  await page.goto('./#/display')
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/WebHID|054c:1000|teamNameBank|Mute all sounds/i)
})
