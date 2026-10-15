/**
 * Teacher-viewport discoverability helpers for Q7 black-box qualification.
 *
 * Intentionally does NOT call scrollIntoView. A control that is only
 * Playwright-DOM-visible can still be off-screen for an ordinary teacher.
 */

import { expect, type Locator, type Page } from '@playwright/test'

export type TeacherViewport = {
  readonly label: string
  readonly width: number
  readonly height: number
}

export const TEACHER_VIEWPORTS: readonly TeacherViewport[] = [
  { label: '1280×720', width: 1280, height: 720 },
  { label: '1366×768', width: 1366, height: 768 },
  { label: 'sim125 (~1093×542)', width: 1093, height: 542 },
] as const

/** True when the element's bounding box intersects the viewport with meaningful area. */
export async function isMostlyInViewport(
  locator: Locator,
  options?: { readonly minVisibleRatio?: number },
): Promise<boolean> {
  const minVisibleRatio = options?.minVisibleRatio ?? 0.6
  const box = await locator.boundingBox()
  if (!box || box.width <= 0 || box.height <= 0) return false
  const viewport = locator.page().viewportSize()
  if (!viewport) return false

  const visibleLeft = Math.max(0, box.x)
  const visibleTop = Math.max(0, box.y)
  const visibleRight = Math.min(viewport.width, box.x + box.width)
  const visibleBottom = Math.min(viewport.height, box.y + box.height)
  const visibleW = Math.max(0, visibleRight - visibleLeft)
  const visibleH = Math.max(0, visibleBottom - visibleTop)
  const visibleArea = visibleW * visibleH
  const totalArea = box.width * box.height
  return totalArea > 0 && visibleArea / totalArea >= minVisibleRatio
}

/**
 * Reach a control the way a teacher does on a short screen: mouse-wheel scroll
 * in small steps until it is mostly visible. Never scrollIntoView (Q7-R1).
 */
export async function wheelScrollUntilMostlyInViewport(
  locator: Locator,
  options?: { readonly stepPx?: number; readonly maxSteps?: number },
): Promise<void> {
  const page = locator.page()
  const stepPx = options?.stepPx ?? 160
  const maxSteps = options?.maxSteps ?? 30
  await expect(locator).toBeVisible()
  const viewport = page.viewportSize()
  if (viewport) await page.mouse.move(viewport.width / 2, viewport.height / 2)
  for (let i = 0; i < maxSteps; i += 1) {
    if (await isMostlyInViewport(locator)) return
    const box = await locator.boundingBox()
    const down = !box || !viewport || box.y > viewport.height / 2
    await page.mouse.wheel(0, down ? stepPx : -stepPx)
    await page.waitForTimeout(50)
  }
}

export async function expectMostlyInViewport(
  locator: Locator,
  message: string,
  options?: { readonly minVisibleRatio?: number },
): Promise<void> {
  await expect(locator).toBeVisible()
  expect(await isMostlyInViewport(locator, options), message).toBe(true)
}

/**
 * Teacher-visible effect after Show buzzer setup.
 *
 * Repaired path: Class Setup shows an immediate status (Effect), then product
 * scroll/focus brings Connect into view (Continuation). Callers must not
 * scrollIntoView before this assertion.
 *
 * Pre-repair path: requires Connect + Check outcome in-viewport (fails on
 * unmodified main for Q7-F01).
 */
export async function expectShowBuzzerSetupTeacherEffect(page: Page): Promise<void> {
  const setupStatus = page.getByTestId('setup-buzzer-reveal-status')
  // Q7-F01 repaired Effect: Class Setup status appears where the teacher clicked.
  // (Unmodified main has no such status — this assertion fails closed for F01.)
  await expect(setupStatus).toBeVisible({ timeout: 5_000 })
  await expect(setupStatus).toContainText(/Buzzer Check is on/i)
  // Q7-R1: the next step follows live receiver state (Connect, or press RED).
  await expect(setupStatus).toContainText(/Next: (use Connect buzzers|press RED)/i)

  const connect = page.getByTestId('sbs-connect')
  await expect(connect).toBeVisible()
  // Product may smooth-scroll after paint — wait for Continuation.
  await expect
    .poll(async () => isMostlyInViewport(connect, { minVisibleRatio: 0.4 }), {
      timeout: 5_000,
      message: 'Show buzzer setup continuation: Connect must enter the teacher viewport',
    })
    .toBe(true)

  await expect(page.getByTestId('sbs-test-mode')).toHaveAttribute('aria-pressed', 'true')
}
