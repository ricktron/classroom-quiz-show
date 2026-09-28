import { test, expect } from '@playwright/test'

/**
 * MENUS Slice E — 0-team Class Setup mount + Edit → team count → return Play.
 *
 * Uses authentic Home import of a board-only game with omitted teams (valid;
 * playable by rounds). Does not claim physical Sony / Windows.
 */

test.describe.configure({ mode: 'serial' })

const ZERO_TEAM_GAME = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'menus-slice-e-zero-team',
  title: 'Slice E Zero-Team Board',
  timer: { responseSeconds: 45 },
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Board',
      config: {
        categories: [
          {
            id: 'e-cat',
            title: 'Science',
            tiles: [
              { id: 'e-100', value: 100, prompt: 'What is water?', answer: 'H2O' },
              { id: 'e-200', value: 200, prompt: 'What is ice?', answer: 'Solid water' },
            ],
          },
          {
            id: 'e-cat-2',
            title: 'Math',
            tiles: [
              { id: 'e-m100', value: 100, prompt: '2+2?', answer: '4' },
              { id: 'e-m200', value: 200, prompt: '3+3?', answer: '6' },
            ],
          },
        ],
      },
    },
  ],
})

test('0-team import mounts Class Setup; Edit → set count → Play returns with teams', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill(ZERO_TEAM_GAME)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  for (const id of ['teams', 'names', 'buzzers', 'display', 'sound'] as const) {
    await expect(page.getByTestId(`setup-row-${id}`)).toBeVisible()
  }
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('readiness-names')).toHaveAttribute('data-status', 'blocked')
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-play-blocker')).toContainText(/still needs teams/i)
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'teams')
  await expect(page.getByTestId('setup-edit-game')).toBeVisible()

  const namesCopy = page.getByTestId('setup-sony-copy')
  await expect(namesCopy).toHaveCount(0)

  await page.getByTestId('setup-edit-game').click()
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
  // Play lands on recovery. Resume, then expect library team-roster refresh.
  await page.getByRole('button', { name: /^resume session$/i }).click({ timeout: 15_000 })

  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toContainText(/type a name/i)
  await expect(page.getByTestId('setup-sony-copy')).not.toContainText(/Blue, Orange/)
})
