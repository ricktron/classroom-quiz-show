import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'
import { waitForSessionSaved } from './helpers/menusSession'

/**
 * Q1-R1 final — Meaningful Session survives Open Game settings + real roster edit.
 *
 * Establishes: named Session → Open Game settings → change team count 2→3 → Save
 * → no automatic contextual return/discard → Play → recovery preserved → Resume
 * → original names still present → same-Game roster drift surfaces
 * `play-replace-confirm` (no auto `confirmedReplace`; do not click replace).
 *
 * Sibling zero-team disposable Fix-return proof remains in
 * `menus-i-repair-1-zero-team-fix.spec.ts` / `menus-slice-e-team-sony.spec.ts`.
 */

test.describe.configure({ mode: 'serial' })

test('named Session: Open Game settings roster edit preserves Session until explicit replace', async ({
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

  // 1. Valid 2-team Class Setup
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')

  // 2–3. Durable Session-owned names on both teams + wait for persistence
  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  const nameInputs = page.locator('[data-testid^="tnsb-manual-"]')
  await expect(nameInputs).toHaveCount(2)
  await nameInputs.nth(0).fill('Red Hawks')
  await nameInputs.nth(0).blur()
  await nameInputs.nth(1).fill('Blue Jays')
  await nameInputs.nth(1).blur()
  await waitForSessionSaved(page)

  // 4. Teams → Open Game settings (valid Teams CTA — not Fix-return intent)
  await page.getByTestId('readiness-teams').click()
  await expect(page.getByTestId('setup-fix-team-count')).toBeVisible()
  await expect(page.getByTestId('setup-fix-team-count')).toHaveText(/open game settings/i)

  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await expect(page.getByTestId('authoring-team-count')).toHaveValue('2')

  // 5–6. Actual Game roster edit 2 → 3, then Save
  await page.getByTestId('authoring-team-count').fill('3')
  await expect(page.getByLabel(/^team 3$/i)).toBeVisible()
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 15_000,
  })

  // 7. No automatic contextual return / discard (Stay on authoring; Session intact)
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^resume class$/i })).toHaveCount(0)
  await expect(page.getByTestId('host-welcome-back')).toHaveCount(0)

  // 8–10. Play → recovery still exists → Resume unfinished Session
  await page.getByRole('button', { name: /^play$/i }).click()
  await expect(page.getByTestId('persistence-recovery')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('play-after-recovery')).toBeVisible()
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await page.getByTestId('persistence-resume').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })

  // 11. Before replacement: original names present; Session not silently discarded
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(0)).toHaveValue('Red Hawks')
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(1)).toHaveValue('Blue Jays')

  // 12. Same-Game roster drift → explicit replace boundary; do NOT click replace
  await expect(page.getByTestId('play-replace-confirm')).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByRole('button', { name: /load this game and replace the current session/i }),
  ).toBeVisible()
  // Names remain while replace is pending — proves no auto confirmedReplace.
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(0)).toHaveValue('Red Hawks')
  await expect(page.locator('[data-testid^="tnsb-manual-"]').nth(1)).toHaveValue('Blue Jays')
  await expect(page.locator('[data-testid^="tnsb-manual-"]')).toHaveCount(2)
})
