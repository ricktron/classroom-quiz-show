import { test, expect, type Page } from '@playwright/test'
import { importDemoToReady } from './helpers/menusClassSetup'

/**
 * Class Setup Start Game must work for keyboard-only teachers (A11Y-KEY) and
 * must be perceivable, not merely present and clickable (VP-HIDDEN).
 * Playwright's toBeVisible ignores opacity, so perceivability is asserted from
 * computed style on the button and every ancestor, plus a hit test.
 *
 * 1280×720 is a Playwright CSS viewport, not physical projector qualification.
 */

const PROJECTOR_720P = { width: 1280, height: 720 } as const

async function readyAt720p(page: Page): Promise<void> {
  await page.setViewportSize(PROJECTOR_720P)
  await importDemoToReady(page)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
}

/** Reach Start Game with Tab alone, as a keyboard-only teacher would. */
async function tabToStartGame(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const stops: string[] = []
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return { testId: el?.dataset.testid ?? null, label: el?.textContent?.trim().slice(0, 30) ?? '' }
    })
    if (focused.testId === 'setup-play') return
    stops.push(focused.testId ?? focused.label)
  }
  throw new Error(`Start Game was not reachable with Tab; focus visited: ${stops.join(' | ')}`)
}

async function expectGameplayStarted(page: Page): Promise<void> {
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
}

for (const key of ['Enter', 'Space'] as const) {
  test(`Start Game is reachable with Tab and activates with ${key}`, async ({ page }) => {
    await readyAt720p(page)
    const play = page.getByTestId('setup-play')
    await tabToStartGame(page)
    await expect(play).toBeFocused()
    await page.keyboard.press(key)
    await expectGameplayStarted(page)
  })
}

test('Start Game is perceivable at 720p, not just present and clickable', async ({ page }) => {
  await readyAt720p(page)
  const play = page.getByTestId('setup-play')
  await play.scrollIntoViewIfNeeded()
  const report = await play.evaluate((button) => {
    let opacity = 1
    let hidden: string | null = null
    for (let node: Element | null = button; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      opacity *= Number(style.opacity)
      if (!hidden && (style.visibility !== 'visible' || style.display === 'none')) {
        hidden = `${node.tagName.toLowerCase()} visibility=${style.visibility} display=${style.display}`
      }
    }
    const rect = button.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return {
      opacity,
      hidden,
      width: rect.width,
      height: rect.height,
      inViewport:
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth,
      topmost: hit === button || (hit !== null && button.contains(hit)),
    }
  })
  expect(report.opacity, 'effective opacity of Start Game').toBeGreaterThanOrEqual(0.95)
  expect(report.hidden, 'visibility/display on Start Game or an ancestor').toBeNull()
  expect(report.width).toBeGreaterThan(0)
  expect(report.height).toBeGreaterThan(0)
  expect(report.inViewport, 'Start Game inside the 720p viewport').toBe(true)
  expect(report.topmost, 'Start Game is the topmost element at its centre').toBe(true)
})
