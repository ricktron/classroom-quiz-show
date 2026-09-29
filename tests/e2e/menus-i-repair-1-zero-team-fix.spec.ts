import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * I-REPAIR-1 — 0-team contextual Fix team count → Game settings → return setup.
 * Complements Slice E; asserts open Game settings / team-count landing.
 */

test.describe.configure({ mode: 'serial' })

test('0-team: Names selects when blocked; Fix team count opens Game settings', async ({ page }) => {
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({
      id: 'menus-i-repair-1-zero-team',
      title: 'I-REPAIR-1 Zero-Team Board',
      teamCount: 0,
    }),
  )

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('readiness-names')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-row-names')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-row-teams')).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('setup-names-blocked-copy')).toBeVisible()
  await expect(page.getByTestId('setup-fix-team-count')).toBeVisible()

  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await expect(page.getByTestId('authoring-team-count')).toBeFocused()

  await page.getByTestId('authoring-team-count').fill('2')
  await expect(page.getByLabel(/^team 1$/i)).toBeVisible()
  await expect(page.getByLabel(/^team 2$/i)).toBeVisible()

  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 15_000,
  })
  const playBtn = page.getByRole('button', { name: /^play$/i })
  await expect(playBtn).toBeEnabled({ timeout: 15_000 })
  await playBtn.click()

  await page.getByRole('button', { name: /^resume class$/i }).click({ timeout: 15_000 })
  await expect(page.getByTestId('play-replace-confirm')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /load this game and replace the current session/i }).click()

  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toBeVisible()
})
