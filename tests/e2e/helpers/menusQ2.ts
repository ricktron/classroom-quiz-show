/**
 * Q2 MENUS workflow helpers — semantic journeys only (not Q3 gameplay).
 */

import { expect, type Page } from '@playwright/test'

/** Leave authoring for Home, discarding unsaved edits when prompted. */
export async function returnHomeFromAuthoring(page: Page): Promise<void> {
  await page.getByTestId('authoring-home').click()
  const discard = page.getByRole('button', { name: /discard unsaved changes/i })
  if (await discard.isVisible().catch(() => false)) {
    await discard.click()
  }
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
}

/** New Game → abandon/discard back to Home as an unfinished draft. */
export async function createAbandonedDraftOnHome(page: Page): Promise<void> {
  await page.goto('./')
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await returnHomeFromAuthoring(page)
}

/** Open Home Import panel without toggling it closed when already open. */
export async function openHomeImport(page: Page): Promise<void> {
  if ((await page.getByTestId('home-import').count()) > 0) {
    await expect(page.getByTestId('home-import')).toBeVisible()
    return
  }
  await page.getByTestId('home-import-game').click()
  await expect(page.getByTestId('home-import')).toBeVisible()
}

/** Home JSON paste → Import file text → Saved status (stay on Home). */
export async function importHomeJsonExpectSaved(page: Page, gameJson: string): Promise<void> {
  await openHomeImport(page)
  await page.locator('#home-import-json').fill(gameJson)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('home-status')).toContainText(/Saved|saved/i, { timeout: 20_000 })
}

/** Fill every incomplete board tile + Final so New Game becomes playable. */
export async function completeBlankAuthoringToPlayable(
  page: Page,
  options?: { readonly title?: string },
): Promise<void> {
  const title = options?.title ?? 'Q2 New Game Playable'
  await page.getByLabel(/game title/i).fill(title)

  await page.locator('#final-prompt').fill('Q2 final question')
  await page.locator('#final-answer').fill('Q2 final answer')

  for (let guard = 0; guard < 40; guard += 1) {
    const incomplete = page.locator('.authoring-board__tile--incomplete')
    if ((await incomplete.count()) === 0) break
    await incomplete.first().click()
    await page.locator('#tile-prompt').fill(`Q2 prompt ${guard + 1}`)
    await page.locator('#tile-answer').fill(`Q2 answer ${guard + 1}`)
  }
  await expect(page.locator('.authoring-board__tile--incomplete')).toHaveCount(0)
  await expect(page.getByTestId('authoring-validation')).toContainText(/can be played/i)

  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 20_000,
  })
}

/** Authoring Play → Class Setup (`?play=`). */
export async function playFromAuthoringToClassSetup(page: Page): Promise<void> {
  const play = page.getByRole('button', { name: /^play$/i })
  await expect(play).toBeEnabled()
  await play.click()
  await expect(page).toHaveURL(/[?&]play=/)
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

export async function expectClassSetup(page: Page): Promise<void> {
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

export async function resumeAfterHostReload(page: Page): Promise<void> {
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  await page.getByTestId('persistence-resume').click()
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
}
