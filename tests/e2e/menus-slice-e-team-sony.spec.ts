import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * MENUS Slice E / Q1 sibling — 0-team Class Setup mount + Fix team count → direct return.
 *
 * Same contextual-return invariant as menus-i-repair-1-zero-team-fix (Finding B).
 * Uses authentic Home import of a board-only game with omitted teams.
 * Does not claim physical Sony / Windows.
 */

test.describe.configure({ mode: 'serial' })

test('0-team import mounts Class Setup; Fix → Save returns directly with teams', async ({
  page,
}) => {
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({
      id: 'menus-slice-e-zero-team',
      title: 'Slice E Zero-Team Board',
      teamCount: 0,
    }),
  )

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  for (const id of ['buzzers', 'teams', 'names', 'display', 'sound'] as const) {
    await expect(page.getByTestId(`setup-row-${id}`)).toBeVisible()
  }
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('readiness-names')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-play-blocker')).toContainText(/still needs teams/i)
  // Workflow opens Buzzers first; Teams remains the required readiness cue.
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'buzzers')
  await expect(page.getByTestId('setup-row-teams')).toHaveAttribute('data-emphasized', 'true')
  await page.getByTestId('readiness-teams').click()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'teams')
  await expect(page.getByTestId('setup-fix-team-count')).toBeVisible()

  const namesCopy = page.getByTestId('setup-sony-copy')
  await expect(namesCopy).toHaveCount(0)

  await page.getByTestId('setup-fix-team-count').click()
  await expect(page.getByTestId('authoring-game-settings')).toBeVisible()
  await expect(page.getByTestId('authoring-game-settings')).toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await expect(page.getByTestId('authoring-team-count')).toHaveValue('')

  await page.getByTestId('authoring-team-count').fill('2')
  await expect(page.getByLabel(/^team 1$/i)).toBeVisible()
  await expect(page.getByLabel(/^team 2$/i)).toBeVisible()

  await page.getByTestId('authoring-save').click()

  // Q1 sibling: direct Class Setup return (no Play / Resume / replace clicks).
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^resume class$/i })).toHaveCount(0)

  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  // Names focus after contextual Fix (interrupted naming).
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-fix-team-count')).toHaveCount(0)
})
