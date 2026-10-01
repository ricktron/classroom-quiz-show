import { test, expect } from '@playwright/test'
import {
  completeBlankAuthoringToPlayable,
  playFromAuthoringToClassSetup,
} from './helpers/menusQ2'

/**
 * Q2-A — Home → New Game → usable Game → Play → Class Setup
 * Matrix: HL-02, AI-01, AI-03, AI-06, AI-07, HL-05 (STRENGTHEN)
 * Stops at Class Setup (not Q3 gameplay).
 */

test.describe.configure({ mode: 'serial' })

test('Q2-A: New Game → fill board+Final → Saved playable → Play → Class Setup', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1366, height: 768 })

  // BEFORE: empty Home.
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-empty')).toBeVisible()

  // INTENT/ACTION: New Game.
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByTestId('authoring-goal')).toContainText(/fill the board first/i)
  await expect(page.getByTestId('tile-editor')).toBeVisible()
  await expect(page.getByTestId('authoring-game-settings')).not.toHaveAttribute('open')
  await expect(page.getByTestId('authoring-validation')).toContainText(/missing questions or answers/i)
  await expect(page.getByRole('button', { name: /^play$/i })).toBeDisabled()

  // EFFECT: complete content → Saved playable.
  await completeBlankAuthoringToPlayable(page, { title: 'Q2-A Usable Game' })
  await expect(page.getByRole('button', { name: /^play$/i })).toBeEnabled()

  // CONTINUATION: authoring Play → `?play=` Class Setup.
  await playFromAuthoringToClassSetup(page)
  await expect(page.getByTestId('setup-row-buzzers')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeDisabled()
})
