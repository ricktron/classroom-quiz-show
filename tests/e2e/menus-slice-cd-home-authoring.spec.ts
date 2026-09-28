import { test, expect, type Page } from '@playwright/test'

/**
 * MENUS Slice C/D — Home hierarchy + Import templates + board-first authoring.
 * Semantic journeys (plan §22 / Court Home + Import). Not physical qualification.
 */

test.describe.configure({ mode: 'serial' })

test('empty Home: New Game dominant, Import adjacent, Display demoted, no dual library', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-empty')).toBeVisible()
  await expect(page.getByTestId('home-new-game')).toBeVisible()
  await expect(page.getByTestId('home-new-game')).not.toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-import-game')).toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-open-display')).toBeVisible()
  await expect(page.getByTestId('home-open-display')).toHaveClass(/home__text-link/)
  await expect(page.getByRole('heading', { name: /recent games/i })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^my games$/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /open classroom controls/i })).toHaveCount(0)
  await expect(page.getByTestId('home-more')).toBeVisible()
  await expect(page.getByTestId('home-more')).not.toHaveAttribute('open')
  await expect(page.getByTestId('backup-restore')).toBeAttached()
  await expect(page.getByTestId('backup-restore-privacy')).toBeHidden()
})

test('Import exposes Board+Final primary and Classic secondary templates', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await expect(page.getByTestId('home-import')).toBeVisible()
  await expect(page.getByTestId('home-import-templates')).toBeVisible()
  const boardFinal = page.getByTestId('home-download-board-plus-final')
  const classic = page.getByTestId('home-download-classic-board')
  await expect(boardFinal).toBeVisible()
  await expect(classic).toBeVisible()
  await expect(boardFinal).toHaveClass(/btn/)
  await expect(classic).toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-import')).toContainText(/formulas and macros/i)
})

test('populated Home: hero Play, demoted New/Import, Playable vocabulary', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await expect(page.getByTestId('home-hero-play')).toBeVisible()
  await expect(page.getByTestId('home-new-game')).toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-hero-playable')).toContainText(/playable/i)
  await expect(page.locator('body')).not.toContainText(/ready to play/i)
  await expect(page.getByRole('heading', { name: /recent games/i })).toHaveCount(0)
})

test('New Game lands board-first with Game settings closed; team count preserved inside', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByTestId('authoring-goal')).toContainText(/fill the board first/i)
  await expect(page.getByTestId('tile-editor')).toBeVisible()
  await expect(page.getByTestId('authoring-game-settings')).not.toHaveAttribute('open')
  await expect(page.getByTestId('authoring-team-count')).toBeHidden()
  await page.getByTestId('authoring-game-settings').locator('summary').click()
  await expect(page.getByTestId('authoring-team-count')).toBeVisible()
  await expect(page.getByTestId('authoring-team-count')).toHaveValue('2')
  await expect(page.getByRole('heading', { name: /^final$/i })).toBeVisible()
})

test('sim125-ish viewport keeps Resume / empty / hero hierarchy readable', async ({ page }) => {
  // Approximate Windows 125% on 1366×768 content box.
  await page.setViewportSize({ width: 1092, height: 614 })
  await page.goto('./')
  await expect(page.getByTestId('home-empty')).toBeVisible()
  await expect(page.getByTestId('home-new-game')).toBeVisible()
  await expect(page.getByTestId('home-import-game')).toBeVisible()
  await expect(page.getByTestId('home-open-display')).toBeVisible()
})

async function returnHomeFromAuthoring(page: Page): Promise<void> {
  await page.getByTestId('authoring-home').click()
  const discard = page.getByRole('button', { name: /discard unsaved changes/i })
  if (await discard.isVisible().catch(() => false)) {
    await discard.click()
  }
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
}

test('multi-entry Home: one featured playable, other playable + unfinished reachable once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('./')

  // Unfinished Game C (draft-only until playables exist).
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await returnHomeFromAuthoring(page)

  // Playable A via demo import.
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)

  // Playable B via duplicate of the featured playable.
  await page.getByTestId('home-hero-playable').locator('summary').click()
  await page.getByTestId('home-hero-playable').getByRole('button', { name: /^duplicate$/i }).click()
  await expect(page.getByTestId('home-status')).toContainText(/duplicated/i)

  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await expect(page.getByTestId('home-hero-play')).toBeVisible()
  await expect(page.getByTestId('home-hero-play')).not.toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-hero-edit')).toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-new-game')).toHaveClass(/btn--secondary/)
  await expect(page.getByRole('heading', { name: /your games/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /recent games/i })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^my games$/i })).toHaveCount(0)
  // Featured once — only one hero block.
  await expect(page.getByTestId('home-hero-playable')).toHaveCount(1)
  // Other playable remains in Your Games with usable Play.
  const library = page.locator('.home__library')
  await expect(library.getByRole('button', { name: /^play$/i }).first()).toBeVisible()
  // Unfinished C remains reachable (Edit, not fake Play).
  await expect(library.getByText(/draft|needs content/i).first()).toBeVisible()
  await expect(library.getByRole('button', { name: /^edit$/i }).first()).toBeVisible()
  await expect(page.getByTestId('home-hero-playable').getByRole('button', { name: /^more$/i })).toBeVisible()
})

test('draft-only Home: featured unfinished once with Continue, no fake Play', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await returnHomeFromAuthoring(page)

  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await returnHomeFromAuthoring(page)

  await expect(page.getByTestId('home-hero-unfinished')).toBeVisible()
  await expect(page.getByTestId('home-hero-unfinished')).toHaveCount(1)
  await expect(page.getByTestId('home-hero-edit')).toHaveText(/continue/i)
  await expect(page.getByTestId('home-hero-edit')).not.toHaveClass(/btn--secondary/)
  await expect(page.getByTestId('home-hero-play')).toHaveCount(0)
  await expect(page.getByTestId('home-hero-playable')).toHaveCount(0)
  await expect(page.getByTestId('home-new-game')).toHaveClass(/btn--secondary/)
  await expect(page.getByRole('heading', { name: /your games/i })).toBeVisible()
  await expect(page.locator('.home__library').getByRole('button', { name: /^edit$/i })).toBeVisible()
  await expect(page.locator('.home__library').getByRole('button', { name: /^play$/i })).toHaveCount(0)
})
