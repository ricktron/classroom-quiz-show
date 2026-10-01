import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * Q1-R1 — Meaningful Session must not be silently discarded via Open Game settings.
 *
 * Valid Teams + named Session → Open Game settings → Save must preserve names
 * (no silent discardRecovery). Open Game settings does not carry Fix-return intent.
 */

test.describe.configure({ mode: 'serial' })

test('named Session: Open Game settings Save does not silently discard names', async ({
  page,
}) => {
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({
      id: 'menus-q1-open-settings-names',
      title: 'Q1 Open Settings Names',
      teamCount: 2,
    }),
  )

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')

  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  const nameInputs = page.locator('[data-testid^="tnsb-manual-"]')
  await expect(nameInputs).toHaveCount(2)
  await nameInputs.nth(0).fill('Red Hawks')
  await nameInputs.nth(0).blur()
  await nameInputs.nth(1).fill('Blue Jays')
  await nameInputs.nth(1).blur()
  await waitForSessionSaved(page)

  await page.getByTestId('readiness-teams').click()
  await expect(page.getByTestId('setup-fix-team-count')).toBeVisible()
  await expect(page.getByTestId('setup-fix-team-count')).toHaveText(/open game settings/i)

  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 15_000,
  })

  // Open Game settings must not silently return via discardRecovery.
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)

  // Play → Host: unfinished named Session remains recoverable (Resume restores names).
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByTestId('persistence-recovery')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('persistence-resume').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(0)).toHaveValue('Red Hawks')
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(1)).toHaveValue('Blue Jays')
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
})
