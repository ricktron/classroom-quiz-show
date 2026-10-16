import { test, expect, type Page } from '@playwright/test'
import { importDemoToReady } from './helpers/menusClassSetup'

/**
 * Class Setup Start Game at 1280×720 Ready, in Court order:
 * REACH → ACT → VISIBLE EFFECT → CONTINUATION.
 *
 * - REACH (A11Y-KEY): Tab alone, as a keyboard-only teacher would. Never
 *   programmatic focus, never scrollIntoView; only the browser's own
 *   focus scrolling moves the page.
 * - VISIBLE (VP-HIDDEN): once focused, Start Game must be perceivable.
 *   Playwright's toBeVisible ignores opacity, so this comes from computed
 *   style on the button and every ancestor, size, viewport bounds, and a
 *   hit test.
 * - ACT: Enter or Space on the focused button.
 * - VISIBLE EFFECT: Host leaves setup for play posture.
 * - CONTINUATION: the ordinary round control opens the board.
 *
 * Open finding (product layout, not asserted here): on the default Ready
 * path Start Game sits below the 1280×720 fold before the teacher scrolls or
 * tabs to it (document y≈1071). A no-scroll "visible at the natural posture"
 * assertion fails on the current product, so it is kept out until the layout
 * is decided.
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

/** Perceivability of Start Game exactly as currently laid out (this does not scroll). */
async function startGamePerception(page: Page) {
  return page.getByTestId('setup-play').evaluate((button) => {
    let opacity = 1
    let hiddenBy: string | null = null
    for (let node: Element | null = button; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      opacity *= Number(style.opacity)
      if (!hiddenBy && (style.visibility !== 'visible' || style.display === 'none')) {
        hiddenBy = `${node.tagName.toLowerCase()} visibility=${style.visibility} display=${style.display}`
      }
    }
    const rect = button.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return {
      scrollY: window.scrollY,
      opacity,
      hiddenBy,
      width: rect.width,
      height: rect.height,
      rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      inViewport:
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth,
      topmost: hit === button || (hit !== null && button.contains(hit)),
    }
  })
}

async function expectStartGamePerceivable(page: Page, when: string): Promise<void> {
  const seen = await startGamePerception(page)
  test.info().annotations.push({ type: `start-game ${when}`, description: JSON.stringify(seen) })
  expect(seen.opacity, `${when}: effective opacity of Start Game`).toBeGreaterThanOrEqual(0.95)
  expect(seen.hiddenBy, `${when}: visibility/display on Start Game or an ancestor`).toBeNull()
  expect(seen.width, `${when}: Start Game width`).toBeGreaterThan(0)
  expect(seen.height, `${when}: Start Game height`).toBeGreaterThan(0)
  expect(seen.inViewport, `${when}: Start Game inside the 1280×720 viewport`).toBe(true)
  expect(seen.topmost, `${when}: Start Game is the topmost element at its centre`).toBe(true)
}

/** REACH: Tab alone, as a keyboard-only teacher would. */
async function tabToStartGame(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const stops: string[] = []
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return el?.dataset.testid ?? el?.textContent?.trim().slice(0, 30) ?? ''
    })
    if (focused === 'setup-play') return
    if (stops.length > 0 && focused === stops[0]) break
    stops.push(focused)
  }
  throw new Error(`Start Game was not reachable with Tab; one focus cycle: ${stops.join(' | ')}`)
}

for (const key of ['Enter', 'Space'] as const) {
  test(`Start Game: Tab reaches it, ${key} starts the game, play continues`, async ({ page }) => {
    await readyAt720p(page)

    // REACH: Tab only. The browser may scroll a focused control into view;
    // nothing else does.
    await tabToStartGame(page)
    await expect(page.getByTestId('setup-play')).toBeFocused()
    await expectStartGamePerceivable(page, 'focused by Tab')

    // ACT
    await page.keyboard.press(key)

    // VISIBLE EFFECT
    await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
    await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
    await expect(page.getByTestId('host-play-status')).toBeVisible()

    // CONTINUATION: the ordinary round control opens the board.
    await page.getByTestId('rph-start').click()
    await expect(page.getByTestId('cbh-grid')).toBeVisible()
  })
}
