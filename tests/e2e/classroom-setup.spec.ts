import { test, expect } from '@playwright/test'

test('Home Play reaches class setup with keyboard name completion', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/WebHID|054c|cqs\.sony/i)
  await expect(page.getByTestId('setup-panic-mute')).toBeVisible()
  await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
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
