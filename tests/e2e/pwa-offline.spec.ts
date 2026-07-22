import { test, expect } from '@playwright/test'

/**
 * Offline app-shell smoke test. After a first successful load the service
 * worker precaches the shell, so a subsequent offline reload of the host and
 * display routes must still render. This proves the SHELL is offline-capable;
 * it does NOT claim offline gameplay (there is no gameplay yet).
 *
 * Runs on a single project for determinism.
 */
test.describe('offline app shell', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Service worker offline behavior is validated on Chromium.',
  )

  test('host and display shells load offline after first visit', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-1080p',
      'Offline shell is validated once, on the desktop project.',
    )

    // First online load + wait for the service worker to control the page.
    await page.goto('#/display')
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller != null,
      undefined,
      { timeout: 30_000 },
    )
    // Give Workbox a moment to finish precaching the shell.
    await page.waitForTimeout(1000)

    await context.setOffline(true)

    await page.reload()
    await expect(
      page.getByRole('heading', { name: /game display ready/i }),
    ).toBeVisible()

    await page.goto('#/host')
    await expect(
      page.getByRole('heading', { name: /host control/i }),
    ).toBeVisible()

    await context.setOffline(false)
  })
})
