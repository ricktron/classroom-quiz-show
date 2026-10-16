import { test, expect, type Page } from '@playwright/test'
import { importDemoToReady } from './helpers/menusClassSetup'

/**
 * Class Setup Start Game for a keyboard-only teacher at 1280×720 Ready
 * (A11Y-KEY), in Court order: REACH → ACT → VISIBLE EFFECT → CONTINUATION.
 *
 * - REACH: Tab alone. Never programmatic focus, never scrollIntoView.
 * - ACT: Enter or Space on the focused button.
 * - VISIBLE EFFECT: Host leaves setup for play posture.
 * - CONTINUATION: the ordinary round control opens the board.
 *
 * Not claimed here: Start Game perceivability at 720p (VP-HIDDEN). On the
 * default Ready path Start Game sits below the 1280×720 fold (document
 * y≈1071) until the teacher scrolls or tabs to it, so a no-scroll
 * perceivability check fails on the current product. That is an open
 * product-layout finding for a separately authorized slice.
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

    // REACH
    await tabToStartGame(page)
    await expect(page.getByTestId('setup-play')).toBeFocused()

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
