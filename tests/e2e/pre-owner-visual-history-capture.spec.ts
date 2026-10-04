/**
 * Pre-owner Q6-RP-2 visual historian — automated capture only.
 *
 * Gate: CQS_PRE_OWNER_VISUAL_HISTORY_CAPTURE=1
 * Archive: docs/design/history/2026-10-pre-owner-q6-rp2/screenshots/
 * Bound SHA: 9410b6290a6dcb2f971e66da8173c3b44a6f785a
 *
 * Ordinary teacher path only. Never uses Advanced diagnostics for gameplay.
 * Does not rewrite S05 or MENUS archives.
 */

import { test, expect } from '@playwright/test'
import {
  PRE_OWNER_IMPLEMENTATION_SHA,
  PRE_OWNER_VIEWPORTS,
  capturePreOwnerPage,
  newPreOwnerPage,
  waitForPreOwnerHome,
  waitForPreOwnerSetup,
} from './helpers/preOwnerVisualHistoryCapture'
import {
  advanceToBoard,
  advanceToFinal,
  armAndStartTimer,
  expectAdvancedDiagnosticsUnused,
  expectDisplayPrivate,
  importQ3GameToClassSetup,
  keyboardNamesReadyStart,
  openAudienceFromHost,
  openBoardClue,
  Q3_SESSION_NAME_ALPHA,
  Q3_SESSION_NAME_BRAVO,
} from './helpers/menusQ3'
import { fillAllTeamNames, importDemoAndPlay, importDemoToReady } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'

const CAPTURE_ON = process.env.CQS_PRE_OWNER_VISUAL_HISTORY_CAPTURE === '1'

test.describe.configure({ mode: 'serial' })

test.describe('pre-owner Q6-RP-2 visual history capture', () => {
  test.skip(!CAPTURE_ON, 'Set CQS_PRE_OWNER_VISUAL_HISTORY_CAPTURE=1 to write PNGs')

  test('Home empty / import / authoring / populated / recovery', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'primary capture uses 1280×720 project')
    test.setTimeout(180_000)
    expect(PRE_OWNER_IMPLEMENTATION_SHA).toMatch(/^[0-9a-f]{40}$/)

    const vp = PRE_OWNER_VIEWPORTS.primary
    const { page, close } = await newPreOwnerPage(browser, info, vp)
    try {
      await page.goto('./')
      await capturePreOwnerPage(page, {
        folder: 'app',
        basename: `pre-owner-home-empty-${vp.label}.png`,
        waitFor: async () => {
          await waitForPreOwnerHome(page)
          await expect(page.getByTestId('home-empty')).toBeVisible()
        },
        viewport: vp,
      })

      await page.getByTestId('home-import-game').click()
      await capturePreOwnerPage(page, {
        folder: 'app',
        basename: `pre-owner-import-templates-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('home-import-templates')).toBeVisible()
        },
        scrollTestId: 'home-import',
        viewport: vp,
      })

      await page.getByTestId('home-new-game').click()
      await capturePreOwnerPage(page, {
        folder: 'authoring',
        basename: `pre-owner-auth-board-first-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
          await expect(page.getByTestId('tile-editor')).toBeVisible()
        },
        scrollTestId: 'tile-editor',
        viewport: vp,
      })

      await page.getByTestId('authoring-home').click()
      const discard = page.getByRole('button', { name: /discard unsaved changes/i })
      if (await discard.isVisible().catch(() => false)) {
        await discard.click()
      }
      await waitForPreOwnerHome(page)

      await page.getByTestId('home-import-game').click()
      await page.getByTestId('home-import-demo').click()
      await expect(page.getByTestId('home-status')).toContainText(/saved/i)
      await capturePreOwnerPage(page, {
        folder: 'app',
        basename: `pre-owner-home-populated-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('home-hero-playable')).toBeVisible()
        },
        scrollTestId: 'home-hero-playable',
        viewport: vp,
      })

      await page.getByTestId('home-hero-play').click()
      await waitForPreOwnerSetup(page)
      await waitForSessionSaved(page)
      await page.getByTestId('host-change-game').click()
      await capturePreOwnerPage(page, {
        folder: 'recovery',
        basename: `pre-owner-home-recovery-${vp.label}.png`,
        waitFor: async () => {
          await waitForPreOwnerHome(page)
          await expect(page.getByTestId('home-resume')).toBeVisible()
        },
        scrollTestId: 'home-resume',
        viewport: vp,
      })
    } finally {
      await close()
    }
  })

  test('Class Setup names + ready', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'primary capture uses 1280×720 project')
    test.setTimeout(120_000)
    const vp = PRE_OWNER_VIEWPORTS.primary
    const { page, close } = await newPreOwnerPage(browser, info, vp)
    try {
      await importDemoAndPlay(page)
      // Ordinary Class Setup may open Buzzers first — open Names for the names surface.
      await page.getByTestId('readiness-names').click()
      await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
      await capturePreOwnerPage(page, {
        folder: 'setup',
        basename: `pre-owner-setup-names-${vp.label}.png`,
        waitFor: async () => {
          await waitForPreOwnerSetup(page)
          await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
        },
        scrollTestId: 'classroom-setup',
        viewport: vp,
      })

      await fillAllTeamNames(page)
      await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
      await capturePreOwnerPage(page, {
        folder: 'setup',
        basename: `pre-owner-setup-ready-${vp.label}.png`,
        waitFor: async () => {
          await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          await expect(page.getByTestId('setup-play')).toBeEnabled()
        },
        scrollTestId: 'setup-outcome-strip',
        viewport: vp,
      })
    } finally {
      await close()
    }
  })

  test('ordinary live path: Host/Display + Undo + Final + completion', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'primary capture uses 1280×720 project')
    test.setTimeout(300_000)
    const vp = PRE_OWNER_VIEWPORTS.primary
    const { page: host, close } = await newPreOwnerPage(browser, info, vp)
    let display: Awaited<ReturnType<typeof openAudienceFromHost>> | undefined
    try {
      await importQ3GameToClassSetup(host, 'pre-owner-historian')
      await keyboardNamesReadyStart(host)
      await expectAdvancedDiagnosticsUnused(host)

      await capturePreOwnerPage(host, {
        folder: 'host',
        basename: `pre-owner-host-focused-pre-round-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
          await expect(host.getByTestId('rph-start')).toBeVisible()
          await expect(host.getByTestId('rph-start')).toHaveText('Start Round 1')
          await expect(host.getByTestId('host-undo')).toHaveCount(0)
        },
        viewport: vp,
      })

      display = await openAudienceFromHost(host.context(), host)
      await expectDisplayPrivate(display)
      await capturePreOwnerPage(display, {
        folder: 'audience',
        basename: `pre-owner-display-waiting-first-round-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('nexus-detail')).toHaveText(
            /Waiting for the first round/i,
            { timeout: 15_000 },
          )
        },
        viewport: vp,
      })

      // Ordinary Round 1 — never Advanced diagnostics
      await advanceToBoard(host)
      await expectAdvancedDiagnosticsUnused(host)
      await capturePreOwnerPage(host, {
        folder: 'host',
        basename: `pre-owner-host-board-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('cbh-grid')).toBeVisible()
          await expect(host.getByTestId('host-more')).not.toHaveAttribute('open', '')
        },
        viewport: vp,
      })

      await capturePreOwnerPage(display, {
        folder: 'audience',
        basename: `pre-owner-display-board-playing-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('nexus-detail')).toHaveText(/^Playing$/i, {
            timeout: 15_000,
          })
        },
        viewport: vp,
      })

      await openBoardClue(host)
      await capturePreOwnerPage(host, {
        folder: 'clue',
        basename: `pre-owner-host-clue-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('cbh-prompt')).toBeVisible()
          await expect(host.getByTestId('cbh-answer')).toContainText('Water')
        },
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'clue',
        basename: `pre-owner-display-clue-${vp.label}.png`,
        waitFor: async () => {
          await expectDisplayPrivate(display!)
        },
        viewport: vp,
      })

      await armAndStartTimer(host)
      await host.keyboard.press('Digit1')
      await host.keyboard.press('Digit2')
      await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
      await capturePreOwnerPage(host, {
        folder: 'buzz',
        basename: `pre-owner-host-buzz-claim-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${Q3_SESSION_NAME_BRAVO}`)
        },
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'buzz',
        basename: `pre-owner-display-buzz-claim-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
        },
        viewport: vp,
      })

      // Incorrect → ordinary live Undo (G3 / HG-13)
      await host.getByTestId('lih-incorrect').click()
      await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_BRAVO)
      await expectAdvancedDiagnosticsUnused(host)
      const undo = host.getByTestId('host-undo')
      await expect(undo).toBeVisible()
      await expect(undo).toHaveText(`Undo Incorrect (${Q3_SESSION_NAME_ALPHA})`)
      await capturePreOwnerPage(host, {
        folder: 'outcome',
        basename: `pre-owner-host-incorrect-undo-available-${vp.label}.png`,
        waitFor: async () => {
          await expect(undo).toBeEnabled()
        },
        scrollTestId: 'host-undo',
        viewport: vp,
      })

      await undo.click()
      await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
      await capturePreOwnerPage(host, {
        folder: 'outcome',
        basename: `pre-owner-host-after-undo-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${Q3_SESSION_NAME_BRAVO}`)
          await expect(host.getByTestId('host-undo')).toBeVisible()
          await expectAdvancedDiagnosticsUnused(host)
        },
        scrollTestId: 'host-undo',
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'outcome',
        basename: `pre-owner-display-after-undo-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
          await expectDisplayPrivate(display!)
        },
        viewport: vp,
      })

      // Continue ordinary adjudication → scoring
      await host.getByTestId('lih-pass').click()
      await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_BRAVO)
      await host.getByTestId('lih-correct').click()
      await expect(host.getByTestId('lih-board-outcome')).toContainText(
        `${Q3_SESSION_NAME_BRAVO} — Correct`,
      )
      await capturePreOwnerPage(host, {
        folder: 'outcome',
        basename: `pre-owner-host-correct-outcome-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('lih-board-outcome')).toBeVisible()
        },
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'outcome',
        basename: `pre-owner-display-correct-outcome-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('board-outcome')).toContainText(Q3_SESSION_NAME_BRAVO)
        },
        viewport: vp,
      })

      await host.getByTestId('cbh-reveal-answer').click()
      await host.getByTestId('tsp-target-bravo').click()
      await host.getByTestId('tsp-award-full').click()
      await expect(host.getByTestId('tsp-score-bravo')).toHaveText('100')
      await capturePreOwnerPage(host, {
        folder: 'outcome',
        basename: `pre-owner-host-scoring-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('tsp-score-bravo')).toHaveText('100')
        },
        viewport: vp,
      })
      await host.getByTestId('cbh-return').click()
      await expect(host.getByTestId('cbh-tile-science-100')).toBeDisabled()

      // Round transition control
      await expect(host.getByTestId('rph-next')).toBeVisible()
      await capturePreOwnerPage(host, {
        folder: 'round-flow',
        basename: `pre-owner-host-round-transition-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('rph-next')).toBeVisible()
          await expectAdvancedDiagnosticsUnused(host)
        },
        viewport: vp,
      })

      await advanceToFinal(host)
      await expectAdvancedDiagnosticsUnused(host)
      await capturePreOwnerPage(host, {
        folder: 'final',
        basename: `pre-owner-host-final-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
        },
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'final',
        basename: `pre-owner-display-final-${vp.label}.png`,
        waitFor: async () => {
          await expectDisplayPrivate(display!)
        },
        viewport: vp,
      })

      // Complete Final via ordinary controls (bravo has the score)
      await host.getByTestId('fwh-begin').click()
      await host.getByTestId('fwh-wager-input-bravo').fill('50')
      await host.getByTestId('fwh-save-wager-bravo').click()
      await host.getByTestId('fwh-lock-wagers').click()
      await host.getByTestId('fwh-start-response').click()
      await host.getByTestId('fwh-save-responded-bravo').click()
      await host.getByTestId('fwh-lock-responses').click()
      await host.getByTestId('fwh-reveal-answer').click()
      await host.getByTestId('fwh-reveal-bravo').click()
      await host.getByTestId('fwh-settle-correct').click()
      await host.getByTestId('fwh-complete').click()
      await host.getByTestId('fwh-complete-confirm').click()
      await expect(display.getByTestId('fwd-complete')).toBeVisible()
      await expect(display.getByTestId('fwd-winner')).toContainText(Q3_SESSION_NAME_BRAVO)

      await capturePreOwnerPage(host, {
        folder: 'completion',
        basename: `pre-owner-host-winner-complete-${vp.label}.png`,
        waitFor: async () => {
          await expect(host.getByTestId('session-summary-panel')).toBeVisible()
          await expect(host.getByTestId('host-undo')).toHaveCount(0)
        },
        viewport: vp,
      })
      await capturePreOwnerPage(display, {
        folder: 'completion',
        basename: `pre-owner-display-complete-${vp.label}.png`,
        waitFor: async () => {
          await expect(display!.getByTestId('fwd-complete')).toBeVisible()
          await expect(display!.getByTestId('fwd-winner')).toContainText(Q3_SESSION_NAME_BRAVO)
          await expect(display!.getByTestId('nexus-stage')).toHaveText('Game complete')
          await expectDisplayPrivate(display!)
        },
        viewport: vp,
      })
    } finally {
      await display?.close().catch(() => undefined)
      await close()
    }
  })

  test('stress reduced-motion + laptop + sim125', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'viewport fan-out driven inside this test')
    test.setTimeout(180_000)

    // Reduced motion board
    {
      const context = await browser.newContext({
        viewport: PRE_OWNER_VIEWPORTS.primary,
        baseURL: info.project.use.baseURL,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      try {
        await importQ3GameToClassSetup(page, 'pre-owner-rm')
        await keyboardNamesReadyStart(page)
        await advanceToBoard(page)
        await capturePreOwnerPage(page, {
          folder: 'stress',
          basename: `pre-owner-host-board-reduced-motion-${PRE_OWNER_VIEWPORTS.primary.label}.png`,
          waitFor: async () => {
            await expect(page.getByTestId('cbh-grid')).toBeVisible()
          },
          viewport: PRE_OWNER_VIEWPORTS.primary,
        })
      } finally {
        await context.close().catch(() => undefined)
      }
    }

    for (const vp of [PRE_OWNER_VIEWPORTS.laptop, PRE_OWNER_VIEWPORTS.sim125] as const) {
      const { page, close } = await newPreOwnerPage(browser, info, vp)
      try {
        await importDemoToReady(page)
        await capturePreOwnerPage(page, {
          folder: 'stress',
          basename: `pre-owner-setup-ready-${vp.label}.png`,
          waitFor: async () => {
            await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
          },
          viewport: vp,
        })
        await page.getByTestId('setup-play').click()
        await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
        await capturePreOwnerPage(page, {
          folder: 'stress',
          basename: `pre-owner-host-focused-${vp.label}.png`,
          waitFor: async () => {
            await expect(page.getByTestId('rph-start')).toBeVisible()
          },
          viewport: vp,
        })
      } finally {
        await close()
      }
    }
  })
})
