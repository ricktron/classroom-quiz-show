import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS Slice G — Change game + different-Game replace + Resume Welcome-back.
 *
 * Does not claim physical Sony / Windows / projector. Does not begin H/I.
 */

test.describe.configure({ mode: 'serial' })

async function waitForSessionSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|saved locally|ready/i,
  )
}

/** Two distinct playable library Games via demo + Duplicate. */
async function seedTwoPlayableGames(page: Page): Promise<{ gameATitle: string; gameBTitle: string }> {
  await page.goto('./')
  await page.getByTestId('home-import-game').click()
  await page.getByTestId('home-import-demo').click()
  await expect(page.getByTestId('home-status')).toContainText(/saved/i)
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  const gameATitle = (
    await page.getByTestId('home-hero-playable').getByRole('heading', { level: 2 }).innerText()
  ).trim()
  const gameBTitle = `Copy of ${gameATitle}`

  await page.getByTestId('home-hero-playable').locator('summary').click()
  await page.getByTestId('home-hero-playable').getByRole('button', { name: /^duplicate$/i }).click()
  await expect(page.getByTestId('home-status')).toContainText(/duplicated/i)
  await expect(page.getByRole('heading', { name: gameBTitle })).toBeVisible({ timeout: 15_000 })

  return { gameATitle, gameBTitle }
}

test('Change game is setup-only secondary and returns to Home without clobbering Session', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await expect(page.getByTestId('host-change-game')).toBeVisible()
  await expect(page.getByTestId('host-change-game')).toHaveText(/change game/i)
  await expect(page.getByTestId('host-change-game')).toHaveClass(/btn--secondary/)
  // Start Game remains the sole dominant outcome control.
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).not.toHaveClass(/btn--secondary/)

  await page.getByTestId('host-change-game').click()
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  // Unfinished Session still durable → recovery dominates Home.
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /^resume class$/i })).toBeVisible()
})

test('different-Game Play keeps recovery then replace-confirm before INITIALIZE_GAME for B', async ({
  page,
}) => {
  const { gameATitle, gameBTitle } = await seedTwoPlayableGames(page)
  expect(gameATitle.length).toBeGreaterThan(0)
  expect(gameATitle).not.toBe(gameBTitle)

  // After duplicate, hero is usually the Copy. Play original A from Your Games.
  // Exact title — "Copy of X" must not match filter(hasText: X).
  const playByExactTitle = (title: string) =>
    page
      .locator('.home__library .home__game, [data-testid="home-hero-playable"]')
      .filter({
        has: page.locator(`:is(h2, strong)`).getByText(title, { exact: true }),
      })
      .getByRole('button', { name: /^play$/i })
      .first()

  await playByExactTitle(gameATitle).click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(
    page.getByTestId('host-identity').locator('.foundation__identity-title'),
  ).toHaveText(gameATitle)
  await waitForSessionSaved(page)

  await page.getByTestId('host-change-game').click()
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('strong').getByText(gameBTitle, { exact: true })).toBeVisible()

  // Play B while unfinished A Session still exists (recovery still dominant).
  await playByExactTitle(gameBTitle).click()

  await expect(page.getByTestId('play-after-recovery')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await expect(
    page.getByTestId('host-identity').locator('.foundation__identity-title'),
  ).not.toHaveText(gameBTitle)

  // Resume A first (recovery decision), then replace-confirm for B.
  await page.getByTestId('persistence-resume').click()

  await expect(page.getByTestId('play-replace-confirm')).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByTestId('host-identity').locator('.foundation__identity-title'),
  ).toHaveText(gameATitle)
  await page.getByRole('button', { name: /load this game and replace the current session/i }).click()

  await expect(
    page.getByTestId('host-identity').locator('.foundation__identity-title'),
  ).toHaveText(gameBTitle, { timeout: 15_000 })
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
})

test('Home Resume into setup shows Welcome-back after posture hydrate', async ({ page }) => {
  await importDemoAndPlay(page)
  await waitForSessionSaved(page)
  // Leave Host via Change game so Home Resume intent is the Slice G path.
  await page.getByTestId('host-change-game').click()
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /^resume class$/i }).click()

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('host-welcome-back')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('host-welcome-back')).toContainText(/welcome back/i)
  await expect(page.getByTestId('host-welcome-back')).toContainText(/finish team names|class setup/i)
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-change-game')).toBeVisible()
  // Play posture must not show Change game.
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('host-change-game')).toHaveCount(0)
  await expect(page.getByTestId('host-welcome-back')).toHaveCount(0)
})

test('Home Resume into play shows Welcome-back with scores kept', async ({ page }) => {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /^advance to next round$/i }).click()
  await expect(page.getByTestId('event-history')).toContainText('ROUND_ADVANCED')
  await waitForSessionSaved(page)

  await page.getByRole('link', { name: /back to home/i }).click()
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /^resume class$/i }).click()

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play', {
    timeout: 15_000,
  })
  await expect(page.getByTestId('host-welcome-back')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('host-welcome-back')).toContainText(/welcome back/i)
  await expect(page.getByTestId('host-welcome-back')).toContainText(/scores kept/i)
  await expect(page.getByTestId('host-change-game')).toHaveCount(0)
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
})
