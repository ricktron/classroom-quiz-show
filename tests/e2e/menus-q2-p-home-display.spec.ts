import { test, expect } from '@playwright/test'

/**
 * Q2-P — Home power path / Display privacy.
 * HL-09 RETAIN (Slice A). HL-08 STRENGTHEN Home Open Display.
 * Web runtime navigates same-tab to Display (desktop uses window.open).
 * DP-02 RETAIN via projector-safety / audience-display.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-P: Home Open Display opens Audience without Host-private leak', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-open-display')).toBeVisible()
  await expect(page.getByTestId('home-open-display')).toHaveClass(/home__text-link/)
  // Power path not marketed.
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
  await expect(page.locator('a[href*="#/host"]')).toHaveCount(0)

  // Web path: same-tab navigate to Display (not a popup).
  await page.getByTestId('home-open-display').click()
  await expect(page.getByRole('heading', { name: /game display ready|display/i })).toBeVisible({
    timeout: 15_000,
  })
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/WebHID|054c:1000|teamNameBank|Mute all sounds|canonical answer|teacher notes/i)
  expect(body.toLowerCase()).not.toMatch(/host control|class setup|persistence recovery/)

  // CONTINUATION: return Home still private Host surface.
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-open-display')).toBeVisible()
})
