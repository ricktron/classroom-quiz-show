import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * Q1 — 0-team contextual Fix team count → Game settings → direct Class Setup.
 *
 * Target path (Finding B): Save returns directly to Class Setup (Names), without
 * Home / Play / Resume / replace theater as teacher-facing steps.
 *
 * Eligibility: this unfinished Session is init-only + invalid team-count for the
 * same Game — disposable under `isDisposableContextualTeamCountSession`. Host
 * may discardRecovery only then; meaningful Sessions must not take this path.
 */

test.describe.configure({ mode: 'serial' })

test('0-team: Fix team count Save returns directly to Class Setup Names', async ({ page }) => {
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({
      id: 'menus-q1-zero-team-fix',
      title: 'Q1 Zero-Team Board',
      teamCount: 0,
    }),
  )

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('readiness-names')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  // BEFORE: Names selects when blocked; Fix is the repair CTA.
  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-row-names')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-row-teams')).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('setup-names-blocked-copy')).toBeVisible()
  await expect(page.getByTestId('setup-fix-team-count')).toBeVisible()
  await expect(page.getByTestId('setup-fix-team-count')).toHaveText(/fix team count/i)

  // INTENT/ACTION: Fix team count → focused Game settings team-count.
  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await expect(page.getByTestId('authoring-team-count')).toBeFocused()

  await page.getByTestId('authoring-team-count').fill('2')
  await expect(page.getByLabel(/^team 1$/i)).toBeVisible()
  await expect(page.getByLabel(/^team 2$/i)).toBeVisible()

  // EFFECT: Save → direct Class Setup (no Home / Play / Resume / replace clicks).
  // Disposable eligibility proof (e2e): recovery discarded, no replace theater,
  // fresh Class Setup Names for the repaired Game (unit predicate covers history).
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^resume class$/i })).toHaveCount(0)
  await expect(page.getByTestId('host-welcome-back')).toHaveCount(0)

  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete', {
    timeout: 15_000,
  })
  // CONTINUATION: Names if interrupted — no stale Fix; keyboard naming works.
  await expect(page.getByTestId('setup-row-names')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-names-blocked-copy')).toHaveCount(0)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toBeVisible()
})
