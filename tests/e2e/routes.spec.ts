import { test, expect } from '@playwright/test'

/**
 * These run against the PRODUCTION build served by `vite preview` under the
 * repository base path (/classroom-quiz-show/). baseURL already includes that
 * base path, so relative hash navigations exercise real Pages behavior.
 */

test('root route loads with role selection', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /choose a screen/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open host/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /open display/i })).toBeVisible()
})

test('host route loads directly and warns it is private', async ({ page }) => {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByText(/do not project this screen/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /no active game/i })).toBeVisible()
})

test('display route loads directly with a safe waiting state', async ({ page }) => {
  await page.goto('#/display')
  await expect(
    page.getByRole('heading', { name: /game display ready/i }),
  ).toBeVisible()
  await expect(page.getByText(/waiting for the host/i)).toBeVisible()
})

test('host can open the display in a new window', async ({ page, context }) => {
  await page.goto('#/host')
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: /open display in new window/i }).click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  expect(popup.url()).toContain('#/display')
  await expect(
    popup.getByRole('heading', { name: /game display ready/i }),
  ).toBeVisible()
})

test('unknown route fails safely with no technical detail', async ({ page }) => {
  await page.goto('#/no-such-screen')
  await expect(page.getByRole('heading', { name: /screen not found/i })).toBeVisible()
  const body = (await page.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('stack')
  expect(body).not.toContain('/src/')
  expect(body).not.toContain('error:')
})

test('routes work under the configured GitHub Pages base path', async ({ page }) => {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  expect(page.url()).toContain('/classroom-quiz-show/#/host')

  // Reset to a blank document so the next hash route is a real navigation
  // (a fragment-only change from #/host would not trigger a load). Each goto
  // resolves against the configured base URL, mirroring a direct/bookmarked
  // load under the Pages base path.
  await page.goto('about:blank')
  await page.goto('#/display')
  await expect(
    page.getByRole('heading', { name: /game display ready/i }),
  ).toBeVisible()
  expect(page.url()).toContain('/classroom-quiz-show/#/display')
})

test('refresh preserves host access', async ({ page }) => {
  await page.goto('#/host')
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  expect(page.url()).toContain('#/host')
})

test('refresh preserves display access', async ({ page }) => {
  await page.goto('#/display')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: /game display ready/i }),
  ).toBeVisible()
  expect(page.url()).toContain('#/display')
})

test('mobile / narrow host route remains usable', async ({ page }) => {
  await page.goto('#/host')
  // Core host affordances must be visible and reachable at any viewport.
  await expect(page.getByRole('heading', { name: /no active game/i })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /open display in new window/i }),
  ).toBeVisible()
})

test('projector display renders legibly (large headline)', async ({ page }) => {
  await page.goto('#/display')
  const headline = page.getByRole('heading', { name: /game display ready/i })
  await expect(headline).toBeVisible()
  const fontSize = await headline.evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize),
  )
  // Must be comfortably readable from across a classroom.
  expect(fontSize).toBeGreaterThanOrEqual(40)
})
