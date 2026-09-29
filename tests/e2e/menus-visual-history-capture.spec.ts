import { test, expect, type Browser, type Page } from '@playwright/test'
import {
  captureMenusPage,
  MENUS_VIEWPORTS,
  waitForMenusHome,
  waitForMenusSetup,
  type MenusViewport,
} from './helpers/menusVisualHistoryCapture'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay, importDemoToReady } from './helpers/menusClassSetup'

/**
 * MENUS pre-owner-gate visual historian — deterministic browser captures into
 * docs/design/history/2026-09-menus-pre-owner-gate/screenshots/.
 *
 * Gated by CQS_MENUS_VISUAL_HISTORY_CAPTURE=1 so ordinary `npm run test:e2e`
 * does not rewrite historical PNGs. Regenerate with:
 *   npm run capture:visual-history:menus
 *
 * Distinct from S05 (`CQS_VISUAL_HISTORY_CAPTURE` / capture:visual-history).
 * Browser captures are not Electron / Windows / projector / Sidecar evidence.
 *
 * Implementation SHA under qualification (product UI):
 *   5915d466371515cd0a6994647fe7c80bf6f22b91
 */

const ENABLED = process.env.CQS_MENUS_VISUAL_HISTORY_CAPTURE === '1'

test.describe.configure({ mode: 'serial' })

async function newMenusPage(
  browser: Browser,
  info: { project: { use: { baseURL?: string } } },
  viewport: MenusViewport,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    baseURL: info.project.use.baseURL,
  })
  const page = await context.newPage()
  return {
    page,
    close: async () => {
      await context.close().catch(() => undefined)
    },
  }
}

async function shot(
  page: Page,
  folder: string,
  basename: string,
  waitFor: () => Promise<void>,
  scrollTestId?: string,
  viewport?: MenusViewport,
) {
  await captureMenusPage(page, { folder, basename, waitFor, scrollTestId, viewport })
}

test.describe('MENUS visual historian capture', () => {
  test.skip(!ENABLED, 'Set CQS_MENUS_VISUAL_HISTORY_CAPTURE=1 to regenerate MENUS historical screenshots')

  test('Home empty / populated / recovery + Import + board-first (1280)', async ({
    browser,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'MENUS primary capture uses 1280×720 project')
    const vp = MENUS_VIEWPORTS.primary
    const { page, close } = await newMenusPage(browser, info, vp)
    try {
      await page.goto('./')
      await shot(
        page,
        'app',
        `menus-home-empty-${vp.label}.png`,
        async () => {
          await waitForMenusHome(page)
          await expect(page.getByTestId('home-empty')).toBeVisible()
        },
        undefined,
        vp,
      )

      await page.getByTestId('home-import-game').click()
      await shot(
        page,
        'app',
        `menus-import-templates-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('home-import-templates')).toBeVisible()
          await expect(page.getByTestId('home-download-board-plus-final')).toBeVisible()
        },
        'home-import',
        vp,
      )

      await page.getByTestId('home-new-game').click()
      await shot(
        page,
        'authoring',
        `menus-auth-board-first-${vp.label}.png`,
        async () => {
          await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
          await expect(page.getByTestId('authoring-goal')).toContainText(/fill the board first/i)
          await expect(page.getByTestId('tile-editor')).toBeVisible()
        },
        'tile-editor',
        vp,
      )

      // Discard draft → empty, then seed playable for populated Home.
      await page.getByTestId('authoring-home').click()
      const discard = page.getByRole('button', { name: /discard unsaved changes/i })
      if (await discard.isVisible().catch(() => false)) {
        await discard.click()
      }
      await waitForMenusHome(page)
      await page.getByTestId('home-import-game').click()
      await page.getByTestId('home-import-demo').click()
      await expect(page.getByTestId('home-status')).toContainText(/saved/i)
      await shot(
        page,
        'app',
        `menus-home-populated-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('home-hero-playable')).toBeVisible()
          await expect(page.getByTestId('home-resume')).toHaveCount(0)
        },
        'home-hero-playable',
        vp,
      )

      // Start a Session so recovery Home is available.
      await page.getByTestId('home-hero-play').click()
      await waitForMenusSetup(page)
      await expect(page.getByTestId('persistence-status')).toHaveText(
        /saved on this device|ready to save|saved locally|ready/i,
      )
      await page.getByTestId('host-change-game').click()
      await shot(
        page,
        'app',
        `menus-home-recovery-${vp.label}.png`,
        async () => {
          await waitForMenusHome(page)
          await expect(page.getByTestId('home-resume')).toBeVisible()
        },
        'home-resume',
        vp,
      )
    } finally {
      await close()
    }
  })

  test('Class Setup Names / Ready / 0-team / eight / optional-open', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'MENUS primary capture uses 1280×720 project')
    test.slow()
    const vp = MENUS_VIEWPORTS.primary
    const { page, close } = await newMenusPage(browser, info, vp)
    try {
      await importDemoAndPlay(page)
      await shot(
        page,
        'setup',
        `menus-setup-names-${vp.label}.png`,
        async () => {
          await waitForMenusSetup(page)
          await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toBeDisabled()
        },
        'classroom-setup',
        vp,
      )

      await fillAllTeamNames(page)
      await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
      await shot(
        page,
        'setup',
        `menus-setup-ready-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toBeEnabled()
          await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
        },
        'setup-outcome-strip',
        vp,
      )

      await page.getByTestId('setup-row-buzzers').locator('button').first().click()
      await shot(
        page,
        'setup',
        `menus-setup-ready-optional-open-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
          await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
        },
        'classroom-setup',
        vp,
      )
    } finally {
      await close()
    }

    // 0-team blocked setup (fresh context).
    const zero = await newMenusPage(browser, info, vp)
    try {
      const ZERO_TEAM_GAME = JSON.stringify({
        format: 'classroom-quiz-show/game',
        schemaVersion: 1,
        id: 'menus-historian-zero-team',
        title: 'MENUS Historian Zero-Team',
        timer: { responseSeconds: 45 },
        rounds: [
          {
            id: 'board-round',
            type: 'category-board',
            title: 'Board',
            config: {
              categories: [
                {
                  id: 'h-cat',
                  title: 'Science',
                  tiles: [
                    { id: 'h-100', value: 100, prompt: 'What is water?', answer: 'H2O' },
                    { id: 'h-200', value: 200, prompt: 'What is ice?', answer: 'Solid water' },
                  ],
                },
                {
                  id: 'h-cat-2',
                  title: 'Math',
                  tiles: [
                    { id: 'h-m100', value: 100, prompt: '2+2?', answer: '4' },
                    { id: 'h-m200', value: 200, prompt: '3+3?', answer: '6' },
                  ],
                },
              ],
            },
          },
        ],
      })
      await zero.page.goto('./')
      await zero.page.getByTestId('home-import-game').click()
      await zero.page.locator('#home-import-json').fill(ZERO_TEAM_GAME)
      await zero.page.getByTestId('home-import-json').click()
      await expect(zero.page.getByTestId('import-quality-report')).toBeVisible()
      await zero.page.getByRole('button', { name: /^play$/i }).first().click()
      await shot(
        zero.page,
        'setup',
        `menus-setup-0-team-${vp.label}.png`,
        async () => {
          await waitForMenusSetup(zero.page)
          await expect(zero.page.getByTestId('readiness-teams')).toHaveAttribute(
            'data-status',
            'blocked',
          )
          await expect(zero.page.getByTestId('setup-edit-game')).toBeVisible()
        },
        'classroom-setup',
        vp,
      )
    } finally {
      await zero.close()
    }
  })

  test('Focused Host + More + no-display + Resume welcome (1280)', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'MENUS primary capture uses 1280×720 project')
    test.setTimeout(180_000)
    const vp = MENUS_VIEWPORTS.primary
    const { page, close } = await newMenusPage(browser, info, vp)
    try {
      await importDemoToReady(page)
      await page.getByTestId('setup-play').click()
      await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
      await shot(
        page,
        'host',
        `menus-host-focused-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
          await expect(page.getByTestId('host-play-status')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
        },
        'host-chrome',
        vp,
      )

      await shot(
        page,
        'host',
        `menus-host-no-display-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('host-chrome-display')).toHaveText(/open display/i)
          await expect(page.getByTestId('host-play-status')).toContainText(/display not open/i)
        },
        'host-play-status',
        vp,
      )

      await ensureHostMoreOpen(page)
      await shot(
        page,
        'host',
        `menus-host-more-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('host-more')).toHaveAttribute('open')
          await expect(page.getByRole('heading', { name: /load a game/i })).toBeVisible()
          await expect(page.getByTestId('reset-class-session')).toBeVisible()
        },
        'host-more',
        vp,
      )

      // Resume Welcome-back setup: leave mid-setup via Change → Home Resume.
      await page.getByTestId('setup-play').click()
      await waitForMenusSetup(page)
      await expect(page.getByTestId('persistence-status')).toHaveText(
        /saved on this device|ready to save|saved locally|ready/i,
      )
      await page.getByTestId('host-change-game').click()
      await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: /^resume class$/i }).click()
      await shot(
        page,
        'host',
        `menus-resume-welcome-setup-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
          await expect(page.getByTestId('host-welcome-back')).toBeVisible()
        },
        'host-welcome-back',
        vp,
      )

      // Names already complete from the earlier Ready path — Start again, then
      // create a runtime fact and Home-Resume into focused play Welcome-back.
      await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
      await page.getByTestId('setup-play').click()
      await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
      await ensureHostMoreOpen(page)
      await page.getByRole('button', { name: /^advance to next round$/i }).click()
      await expect(page.getByTestId('event-history')).toContainText('ROUND_ADVANCED')
      await expect(page.getByTestId('persistence-status')).toHaveText(
        /saved on this device|ready to save|saved locally|ready/i,
        { timeout: 15_000 },
      )
      await page.getByRole('link', { name: /back to home/i }).click()
      await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: /^resume class$/i }).click()
      await shot(
        page,
        'host',
        `menus-resume-welcome-play-${vp.label}.png`,
        async () => {
          await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
          await expect(page.getByTestId('host-welcome-back')).toBeVisible({ timeout: 15_000 })
          await expect(page.getByTestId('host-welcome-back')).toContainText(/scores kept/i)
        },
        'host-welcome-back',
        vp,
      )
    } finally {
      await close()
    }
  })

  test('Ready + focused Host + eight-names at 1366 and sim125', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'viewport fan-out driven inside this test')
    test.setTimeout(180_000)

    for (const vp of [MENUS_VIEWPORTS.laptop, MENUS_VIEWPORTS.sim125] as const) {
      const readyCtx = await newMenusPage(browser, info, vp)
      try {
        await importDemoToReady(readyCtx.page)
        await shot(
          readyCtx.page,
          'setup',
          `menus-setup-ready-${vp.label}.png`,
          async () => {
            await expect(readyCtx.page.getByTestId('setup-ready-heading')).toBeVisible()
            await expect(readyCtx.page.getByTestId('setup-play')).toBeEnabled()
          },
          'setup-outcome-strip',
          vp,
        )
        await readyCtx.page.getByTestId('setup-play').click()
        await shot(
          readyCtx.page,
          'host',
          `menus-host-focused-${vp.label}.png`,
          async () => {
            await expect(readyCtx.page.getByTestId('host-foundation')).toHaveAttribute(
              'data-posture',
              'play',
            )
            await expect(readyCtx.page.getByTestId('classroom-setup')).toHaveCount(0)
          },
          'host-chrome',
          vp,
        )
      } finally {
        await readyCtx.close()
      }
    }

    // Eight-team Names compression stress (sim125).
    const eightVp = MENUS_VIEWPORTS.sim125
    const eight = await newMenusPage(browser, info, eightVp)
    try {
      const EIGHT_TEAM_GAME = JSON.stringify({
        format: 'classroom-quiz-show/game',
        schemaVersion: 1,
        id: 'menus-historian-eight-team',
        title: 'MENUS Historian Eight-Team',
        timer: { responseSeconds: 45 },
        teams: Array.from({ length: 8 }, (_, i) => ({
          id: `t${i + 1}`,
          name: `Team ${i + 1}`,
          accent: ['crimson', 'azure', 'emerald', 'amber', 'violet', 'teal', 'rose', 'slate'][i],
        })),
        rounds: [
          {
            id: 'board-round',
            type: 'category-board',
            title: 'Board',
            config: {
              categories: [
                {
                  id: 'e8-cat',
                  title: 'Science',
                  tiles: [
                    { id: 'e8-100', value: 100, prompt: 'What is water?', answer: 'H2O' },
                    { id: 'e8-200', value: 200, prompt: 'What is ice?', answer: 'Solid water' },
                  ],
                },
                {
                  id: 'e8-cat-2',
                  title: 'Math',
                  tiles: [
                    { id: 'e8-m100', value: 100, prompt: '2+2?', answer: '4' },
                    { id: 'e8-m200', value: 200, prompt: '3+3?', answer: '6' },
                  ],
                },
              ],
            },
          },
        ],
      })
      await eight.page.goto('./')
      await eight.page.getByTestId('home-import-game').click()
      await eight.page.locator('#home-import-json').fill(EIGHT_TEAM_GAME)
      await eight.page.getByTestId('home-import-json').click()
      await expect(eight.page.getByTestId('import-quality-report')).toBeVisible()
      await eight.page.getByRole('button', { name: /^play$/i }).first().click()
      await shot(
        eight.page,
        'stress',
        `menus-setup-eight-names-${eightVp.label}.png`,
        async () => {
          await waitForMenusSetup(eight.page)
          await expect(eight.page.getByTestId('team-name-selection-board')).toBeVisible()
          await expect(eight.page.getByTestId('readiness-teams')).toContainText(/8 teams/i)
        },
        'classroom-setup',
        eightVp,
      )
    } finally {
      await eight.close()
    }

    // Home empty at secondary laptop size (hierarchy stress).
    const homeVp = MENUS_VIEWPORTS.laptop
    const home = await newMenusPage(browser, info, homeVp)
    try {
      await home.page.goto('./')
      await shot(
        home.page,
        'app',
        `menus-home-empty-${homeVp.label}.png`,
        async () => {
          await waitForMenusHome(home.page)
          await expect(home.page.getByTestId('home-empty')).toBeVisible()
        },
        undefined,
        homeVp,
      )
    } finally {
      await home.close()
    }
  })
})
