import { test, expect } from '@playwright/test'

/**
 * Q2-P — Home power path / Display privacy.
 * HL-09 RETAIN (Slice A). HL-08 STRENGTHEN Home Open Display.
 * DP-02 RETAIN via projector-safety / audience-display (cited; not duplicated fully).
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

  const popupPromise = page.context().waitForEvent('page')
  await page.getByTestId('home-open-display').click()
  const display = await popupPromise
  await display.waitForLoadState('domcontentloaded')
  await expect(display.locator('body')).toBeVisible()
  const body = await display.locator('body').innerText()
  expect(body).not.toMatch(/WebHID|054c:1000|teamNameBank|Mute all sounds|canonical answer|teacher notes/i)
  expect(body.toLowerCase()).not.toMatch(/host control|class setup|persistence recovery/i)
  await display.close()

  // CONTINUATION: Home still private Host surface.
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
})
