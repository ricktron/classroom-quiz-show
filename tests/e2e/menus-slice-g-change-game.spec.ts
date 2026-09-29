import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS Slice G — Change game + different-Game replace + Resume Welcome-back.
 *
 * Does not claim physical Sony / Windows / projector. Does not begin H/I.
 */

test.describe.configure({ mode: 'serial' })

const GAME_B = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'menus-slice-g-game-b',
  title: 'Slice G Game B Private',
  timer: { responseSeconds: 45 },
  teams: [
    { id: 'g-b-1', name: 'Alpha', order: 1 },
    { id: 'g-b-2', name: 'Beta', order: 2 },
  ],
  rounds: [
    {
      id: 'board-b',
      type: 'category-board',
      title: 'Board B',
      config: {
        categories: [
          {
            id: 'gb-cat',
            title: 'Science',
            tiles: [
              { id: 'gb-100', value: 100, prompt: 'Water formula?', answer: 'H2O' },
              { id: 'gb-200', value: 200, prompt: 'Ice state?', answer: 'Solid' },
            ],
          },
          {
            id: 'gb-cat-2',
            title: 'Math',
            tiles: [
              { id: 'gb-m100', value: 100, prompt: '2+2?', answer: '4' },
              { id: 'gb-m200', value: 200, prompt: '3+3?', answer: '6' },
            ],
          },
        ],
      },
    },
  ],
})

async function waitForSessionSaved(page: Page): Promise<void> {
  await expect(page.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|saved locally|ready/i,
  )
}

async function importGameBFromHome(page: Page): Promise<void> {
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill(GAME_B)
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
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
  await importDemoAndPlay(page)
  await waitForSessionSaved(page)
  const gameATitle = (await page.getByTestId('host-identity').locator('.foundation__identity-title').innerText()).trim()
  expect(gameATitle.length).toBeGreaterThan(0)

  await page.getByTestId('host-change-game').click()
  await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })

  await importGameBFromHome(page)
  // Prefer import-report Play for B when still visible; else library row Play.
  const reportPlay = page.getByTestId('import-quality-report').getByRole('button', { name: /^play$/i })
  if (await reportPlay.isVisible().catch(() => false)) {
    await reportPlay.click()
  } else {
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Slice G Game B Private' })
      .getByRole('button', { name: /^play$/i })
      .click()
  }

  await expect(page.getByTestId('play-after-recovery').or(page.getByTestId('persistence-recovery'))).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId('play-replace-confirm')).toHaveCount(0)
  await expect(page.getByTestId('host-identity')).not.toContainText('Slice G Game B Private')

  // Resume A first (recovery decision), then replace-confirm for B.
  const homeStyleResume = page.getByRole('button', { name: /^resume class$/i })
  if (await homeStyleResume.isVisible().catch(() => false)) {
    await homeStyleResume.click()
  } else {
    await page.getByTestId('persistence-resume').click()
  }

  await expect(page.getByTestId('play-replace-confirm')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('host-identity')).toContainText(gameATitle)
  await page.getByRole('button', { name: /load this game and replace the current session/i }).click()

  await expect(page.getByTestId('host-identity')).toContainText('Slice G Game B Private', {
    timeout: 15_000,
  })
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
