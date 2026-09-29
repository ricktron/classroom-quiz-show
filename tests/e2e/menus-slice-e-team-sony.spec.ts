import { test, expect } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * MENUS Slice E — 0-team Class Setup mount + Edit → team count → return Play.
 *
 * Uses authentic Home import of a board-only game with omitted teams (valid;
 * playable by rounds). Does not claim physical Sony / Windows.
 */

test.describe.configure({ mode: 'serial' })

test('0-team import mounts Class Setup; Edit → set count → Play returns with teams', async ({
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

  // Board-only draft with teams should become playable after save once content is complete.
  // Fill minimal clues if still blocked, then save and Play.
  const validation = page.getByTestId('authoring-validation')
  const playBtn = page.getByRole('button', { name: /^play$/i })
  if (await validation.textContent().then((t) => /missing/i.test(t ?? ''))) {
    // Imported board should already be complete; if not, do not invent content here.
  }
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 15_000,
  })
  await expect(playBtn).toBeEnabled({ timeout: 15_000 })
  await playBtn.click()

  // Leaving Host for authoring persists an unfinished session; returning via
  // Play lands on recovery. Resume, then same-Game roster drift must ask the
  // teacher before replacing the Session (never silent confirmedReplace).
  await page.getByRole('button', { name: /^resume class$/i }).click({ timeout: 15_000 })

  await expect(page.getByTestId('play-replace-confirm')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /load this game and replace the current session/i }).click()

  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
})
