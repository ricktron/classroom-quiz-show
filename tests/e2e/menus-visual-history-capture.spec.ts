import { test, expect } from '@playwright/test'
import {
  captureMenusPage,
  MENUS_VIEWPORTS,
  newMenusPage,
  waitForMenusHome,
  waitForMenusSetup,
} from './helpers/menusVisualHistoryCapture'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay, importDemoToReady } from './helpers/menusClassSetup'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'
import { waitForSessionSaved } from './helpers/menusSession'

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
 *   1404b517921a5182a57291b3d7df36d464245ee5
 */

const ENABLED = process.env.CQS_MENUS_VISUAL_HISTORY_CAPTURE === '1'

test.describe.configure({ mode: 'serial' })

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
      await captureMenusPage(page, {
        folder: 'app',
        basename: `menus-home-empty-${vp.label}.png`,
        waitFor: async () => {
          await waitForMenusHome(page)
          await expect(page.getByTestId('home-empty')).toBeVisible()
        },
        viewport: vp,
      })

      await page.getByTestId('home-import-game').click()
      await captureMenusPage(page, {
        folder: 'app',
        basename: `menus-import-templates-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('home-import-templates')).toBeVisible()
          await expect(page.getByTestId('home-download-board-plus-final')).toBeVisible()
        },
        scrollTestId: 'home-import',
        viewport: vp,
      })

      await page.getByTestId('home-new-game').click()
      await captureMenusPage(page, {
        folder: 'authoring',
        basename: `menus-auth-board-first-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
          await expect(page.getByTestId('authoring-goal')).toContainText(/fill the board first/i)
          await expect(page.getByTestId('tile-editor')).toBeVisible()
        },
        scrollTestId: 'tile-editor',
        viewport: vp,
      })

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
      await captureMenusPage(page, {
        folder: 'app',
        basename: `menus-home-populated-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('home-hero-playable')).toBeVisible()
          await expect(page.getByTestId('home-resume')).toHaveCount(0)
        },
        scrollTestId: 'home-hero-playable',
        viewport: vp,
      })

      // Start a Session so recovery Home is available.
      await page.getByTestId('home-hero-play').click()
      await waitForMenusSetup(page)
      await waitForSessionSaved(page)
      await page.getByTestId('host-change-game').click()
      await captureMenusPage(page, {
        folder: 'app',
        basename: `menus-home-recovery-${vp.label}.png`,
        waitFor: async () => {
          await waitForMenusHome(page)
          await expect(page.getByTestId('home-resume')).toBeVisible()
        },
        scrollTestId: 'home-resume',
        viewport: vp,
      })
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
      await captureMenusPage(page, {
        folder: 'setup',
        basename: `menus-setup-names-${vp.label}.png`,
        waitFor: async () => {
          await waitForMenusSetup(page)
          await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toBeDisabled()
        },
        scrollTestId: 'classroom-setup',
        viewport: vp,
      })

      await fillAllTeamNames(page)
      await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
      await captureMenusPage(page, {
        folder: 'setup',
        basename: `menus-setup-ready-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toBeEnabled()
          await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
        },
        scrollTestId: 'setup-outcome-strip',
        viewport: vp,
      })

      await page.getByTestId('setup-row-buzzers').locator('button').first().click()
      await captureMenusPage(page, {
        folder: 'setup',
        basename: `menus-setup-ready-optional-open-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
          await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toHaveClass(/classroom-setup__play--dominant/)
        },
        scrollTestId: 'classroom-setup',
        viewport: vp,
      })
    } finally {
      await close()
    }

    // 0-team blocked setup (fresh context).
    const zero = await newMenusPage(browser, info, vp)
    try {
      await importMenusJsonAndPlay(
        zero.page,
        menusBoardGameJson({
          id: 'menus-historian-zero-team',
          title: 'MENUS Historian Zero-Team',
          teamCount: 0,
        }),
      )
      await captureMenusPage(zero.page, {
        folder: 'setup',
        basename: `menus-setup-0-team-${vp.label}.png`,
        waitFor: async () => {
          await waitForMenusSetup(zero.page)
          await expect(zero.page.getByTestId('readiness-teams')).toHaveAttribute(
            'data-status',
            'blocked',
          )
          await expect(zero.page.getByTestId('setup-edit-game')).toBeVisible()
        },
        scrollTestId: 'classroom-setup',
        viewport: vp,
      })
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
      // Natural first viewport after Start (product scroll-to-top only).
      await captureMenusPage(page, {
        folder: 'host',
        basename: `menus-host-focused-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
          await expect(page.getByTestId('host-play-status')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toHaveText(/back to setup/i)
          await expect(page.getByTestId('tsp-scoreboard')).toBeVisible()
        },
        viewport: vp,
      })

      await captureMenusPage(page, {
        folder: 'host',
        basename: `menus-host-no-display-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('host-chrome-display')).toHaveText(/open display/i)
          await expect(page.getByTestId('host-play-status')).toContainText(/display not open/i)
        },
        scrollTestId: 'host-play-status',
        viewport: vp,
      })

      await ensureHostMoreOpen(page)
      await captureMenusPage(page, {
        folder: 'host',
        basename: `menus-host-more-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('host-more')).toHaveAttribute('open')
          await expect(page.getByRole('heading', { name: /load a game/i })).toBeVisible()
          await expect(page.getByTestId('reset-class-session')).toBeVisible()
        },
        scrollTestId: 'host-more',
        viewport: vp,
      })

      // Resume Welcome-back setup: leave mid-setup via Change → Home Resume.
      await page.getByTestId('setup-play').click()
      await waitForMenusSetup(page)
      await waitForSessionSaved(page)
      await page.getByTestId('host-change-game').click()
      await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: /^resume class$/i }).click()
      await captureMenusPage(page, {
        folder: 'host',
        basename: `menus-resume-welcome-setup-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
          await expect(page.getByTestId('host-welcome-back')).toBeVisible()
        },
        scrollTestId: 'host-welcome-back',
        viewport: vp,
      })

      // Names already complete from the earlier Ready path — Start again, then
      // create a runtime fact and Home-Resume into focused play Welcome-back.
      await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
      await page.getByTestId('setup-play').click()
      await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
      await ensureHostMoreOpen(page)
      await page.getByRole('button', { name: /^advance to next round$/i }).click()
      await expect(page.getByTestId('event-history')).toContainText('ROUND_ADVANCED')
      await waitForSessionSaved(page, { timeout: 15_000 })
      await page.getByRole('link', { name: /back to home/i }).click()
      await expect(page.getByTestId('home-resume')).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: /^resume class$/i }).click()
      await captureMenusPage(page, {
        folder: 'host',
        basename: `menus-resume-welcome-play-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
          await expect(page.getByTestId('host-welcome-back')).toBeVisible({ timeout: 15_000 })
          await expect(page.getByTestId('host-welcome-back')).toContainText(/scores kept/i)
        },
        scrollTestId: 'host-welcome-back',
        viewport: vp,
      })
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
        // 1366 may frame the Ready strip; sim125 stays natural first-viewport
        // so crowding / Start reachability is honest (no scroll-before-claim).
        await captureMenusPage(readyCtx.page, {
          folder: 'setup',
          basename: `menus-setup-ready-${vp.label}.png`,
          waitFor: async () => {
            await expect(readyCtx.page.getByTestId('setup-ready-heading')).toBeVisible()
            await expect(readyCtx.page.getByTestId('setup-play')).toBeEnabled()
          },
          scrollTestId: vp === MENUS_VIEWPORTS.sim125 ? undefined : 'setup-outcome-strip',
          viewport: vp,
        })
        await readyCtx.page.getByTestId('setup-play').click()
        // Natural first viewport — no scrollIntoView before focused Host shot.
        await captureMenusPage(readyCtx.page, {
          folder: 'host',
          basename: `menus-host-focused-${vp.label}.png`,
          waitFor: async () => {
            await expect(readyCtx.page.getByTestId('host-foundation')).toHaveAttribute(
              'data-posture',
              'play',
            )
            await expect(readyCtx.page.getByTestId('classroom-setup')).toHaveCount(0)
            await expect(readyCtx.page.getByTestId('tsp-scoreboard')).toBeVisible()
          },
          viewport: vp,
        })
      } finally {
        await readyCtx.close()
      }
    }

    // Eight-team Names compression stress (sim125).
    const eightVp = MENUS_VIEWPORTS.sim125
    const eight = await newMenusPage(browser, info, eightVp)
    try {
      await importMenusJsonAndPlay(
        eight.page,
        menusBoardGameJson({
          id: 'menus-historian-eight-team',
          title: 'MENUS Historian Eight-Team',
          teamCount: 8,
        }),
      )
      await captureMenusPage(eight.page, {
        folder: 'stress',
        basename: `menus-setup-eight-names-${eightVp.label}.png`,
        waitFor: async () => {
          await waitForMenusSetup(eight.page)
          await expect(eight.page.getByTestId('team-name-selection-board')).toBeVisible()
          await expect(eight.page.getByTestId('readiness-teams')).toContainText(/8 teams/i)
        },
        scrollTestId: 'classroom-setup',
        viewport: eightVp,
      })
    } finally {
      await eight.close()
    }

    // Home empty at secondary laptop size (hierarchy stress).
    const homeVp = MENUS_VIEWPORTS.laptop
    const home = await newMenusPage(browser, info, homeVp)
    try {
      await home.page.goto('./')
      await captureMenusPage(home.page, {
        folder: 'app',
        basename: `menus-home-empty-${homeVp.label}.png`,
        waitFor: async () => {
          await waitForMenusHome(home.page)
          await expect(home.page.getByTestId('home-empty')).toBeVisible()
        },
        viewport: homeVp,
      })
    } finally {
      await home.close()
    }
  })
})
