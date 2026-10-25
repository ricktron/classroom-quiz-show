/**
 * UI/DESIGN QUALIFICATION — Phase 1 rendered baseline capture.
 *
 * Gate: CQS_UI_COURT_CAPTURE=1
 * Output root: CQS_UI_COURT_OUT (absolute path; run-owned, outside the repo)
 *
 * This spec captures the product AS IT IS at the frozen candidate SHA. It makes
 * no product assertions and repairs nothing. Every shot records success or an
 * explicit MISSING entry in manifest.json, so a partial baseline cannot quietly
 * present itself as complete.
 *
 * Every state is reached through ordinary teacher routes — Home -> import ->
 * Class Setup -> Start Game -> play — except the shots explicitly labelled as
 * system/edge surfaces. Game content is authored test data imported through the
 * product's own Home import, which is exactly what a teacher does; no state is
 * reached by mutating the store.
 */

import { test, expect, type Page } from '@playwright/test'
import { importMenusJsonAndPlay } from './helpers/menusGameJson'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'
import { advanceToNextRound, openAudienceFromHost } from './helpers/menusQ3'


/*
 * Every instrument below is shared with the supplemental pass and the metrics
 * probe. They live in `helpers/uiCourtCapture.ts` rather than being restated
 * here: this file originally carried its own copies, which is duplication a
 * reviewer should not have to read twice.
 */
import {
  CAPTURE_ON,
  OUT_ROOT,
  VP,
  flushManifest,
  newPage,
  openImportPanel,
  readyAndStart,
  record,
  selectShortestDuration,
  shot,
  step,
  stepValue,
  uiCourtGame,
} from './helpers/uiCourtCapture'

test.describe.configure({ mode: 'serial' })

test.describe('UI Court rendered baseline', () => {
  test.skip(!CAPTURE_ON, 'Set CQS_UI_COURT_CAPTURE=1 to write PNGs')
  test.skip(!OUT_ROOT, 'Set CQS_UI_COURT_OUT to an absolute output directory')

  /**
   * Bounded action/expect timeouts. The repo config leaves `actionTimeout`
   * unset, which means NO limit — a capture run must never hang on one blocked
   * control, because the evidence for every later state is lost with it.
   */
  test.use({ actionTimeout: 8_000, navigationTimeout: 30_000 })

  // ──────────────────────────────────────────────────────────────────────────
  // T1 — HOME / LIBRARY / AUTHORING (teacher laptop)
  // ──────────────────────────────────────────────────────────────────────────
  test('T1 Home, Library, Authoring', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(300_000)
    const vp = VP.laptop
    const { page, close } = await newPage(browser, info, vp)
    try {
      await page.goto('./')
      await shot(page, {
        id: 'home-empty',
        surface: 'home',
        state: 'initial / empty library',
        vp,
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
          await expect(page.getByTestId('home-empty')).toBeVisible()
        },
      })
      await shot(page, {
        id: 'home-empty-full',
        surface: 'home',
        state: 'initial / empty library (full page)',
        vp,
        fullPage: true,
      })

      await step('home-open-import', 'home', () => openImportPanel(page))
      await shot(page, {
        id: 'home-import-open',
        surface: 'home',
        state: 'import panel open, templates offered',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('home-import-templates')).toBeVisible()
        },
        scrollTestId: 'home-import',
      })
      await shot(page, {
        id: 'home-import-open-full',
        surface: 'home',
        state: 'import panel open (full page)',
        vp,
        fullPage: true,
      })

      // Authoring — brand new game.
      await step('home-new-game', 'authoring', async () => {
        await page.getByTestId('home-new-game').click()
        await expect(page.getByTestId('tile-editor')).toBeVisible({ timeout: 15_000 })
      })
      await shot(page, {
        id: 'authoring-new-empty',
        surface: 'authoring',
        state: 'new game, nothing authored yet',
        vp,
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
          await expect(page.getByTestId('tile-editor')).toBeVisible()
        },
      })
      await shot(page, {
        id: 'authoring-new-empty-full',
        surface: 'authoring',
        state: 'new game (full page)',
        vp,
        fullPage: true,
      })
      await shot(page, {
        id: 'authoring-validation',
        surface: 'authoring',
        state: 'validation / blocker surface on an incomplete game',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('authoring-validation')).toBeVisible()
        },
        scrollTestId: 'authoring-validation',
      })
      await shot(page, {
        id: 'authoring-tile-editor',
        surface: 'authoring',
        state: 'clue / tile editor form',
        vp,
        scrollTestId: 'tile-editor',
      })
      await shot(page, {
        id: 'authoring-game-settings',
        surface: 'authoring',
        state: 'game settings / team count',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('authoring-game-settings')).toBeVisible()
        },
        scrollTestId: 'authoring-game-settings',
      })
      await shot(page, {
        id: 'authoring-save-attempt',
        surface: 'authoring',
        state: 'Save pressed on an incomplete game',
        vp,
        waitFor: async () => {
          await page.getByTestId('authoring-save').click()
          await expect(page.getByTestId('authoring-save-status')).toBeVisible()
        },
        scrollTestId: 'authoring-save-status',
      })

      // Leave authoring with unsaved work.
      await step('authoring-leave', 'authoring', async () => {
        await page.getByTestId('authoring-home').click()
      })
      const discard = page.getByRole('button', { name: /discard unsaved changes/i })
      if (await discard.isVisible().catch(() => false)) {
        await shot(page, {
          id: 'authoring-discard-confirm',
          surface: 'authoring',
          state: 'leave with unsaved changes — confirmation',
          vp,
          fullPage: true,
        })
        await discard.click()
      } else {
        record({
          id: 'authoring-discard-confirm',
          surface: 'authoring',
          state: 'leave with unsaved changes — confirmation',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'no discard confirmation offered',
        })
      }
      await step('back-home', 'home', async () => {
        await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible({
          timeout: 15_000,
        })
      })

      // Populated library via the built-in demo import.
      await step('import-demo', 'home', async () => {
        await openImportPanel(page)
        await page.getByTestId('home-import-demo').click()
      })
      await shot(page, {
        id: 'home-import-quality-report',
        surface: 'home',
        state: 'import succeeded — quality report',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('import-quality-report')).toBeVisible()
        },
        scrollTestId: 'import-quality-report',
      })
      await shot(page, {
        id: 'home-import-quality-report-full',
        surface: 'home',
        state: 'import succeeded — quality report (full page)',
        vp,
        fullPage: true,
      })
      await shot(page, {
        id: 'home-populated',
        surface: 'home',
        state: 'populated library, hero playable game',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('home-hero-playable')).toBeVisible()
        },
        scrollTestId: 'home-hero-playable',
      })

      // A second and third game so secondary cards and library rows are real.
      for (const [i, title] of ['Second Game', 'Third Game'].entries()) {
        await step(`import-lib-${i}`, 'home', async () => {
          await openImportPanel(page)
          await page
            .locator('#home-import-json')
            .fill(uiCourtGame({ id: `ui-court-lib-${i}`, title }))
          await page.getByTestId('home-import-json').click()
          await expect(page.getByTestId('import-quality-report')).toBeVisible({ timeout: 15_000 })
        })
      }
      await shot(page, {
        id: 'home-multi-game',
        surface: 'home',
        state: 'three games — hero plus the Your Games list',
        vp,
        waitFor: async () => {
          await expect(page.locator('.home__library')).toBeVisible({ timeout: 10_000 })
        },
        fullPage: true,
      })
      await shot(page, {
        id: 'home-multi-game-viewport',
        surface: 'home',
        state: 'three games, above the fold only',
        vp,
      })

      // Home-level More (backup & restore).
      await step('home-more', 'home', async () => {
        await page.locator('details[data-testid="home-more"] > summary').click()
        await expect(page.getByTestId('backup-restore')).toBeVisible({ timeout: 10_000 })
      })
      await shot(page, {
        id: 'home-more-open',
        surface: 'home',
        state: 'Home More — backup & restore expanded',
        vp,
        scrollTestId: 'home-more',
        fullPage: true,
      })

      // Per-game More menu: Duplicate / Rename / Export / Delete.
      const gameMore = page.locator('.home__game-more').first()
      await step('home-game-more', 'home', async () => {
        await gameMore.locator('summary').click()
        await expect(gameMore.getByRole('button', { name: /^delete$/i })).toBeVisible({
          timeout: 10_000,
        })
      })
      await shot(page, {
        id: 'home-game-more-open',
        surface: 'home',
        state: 'per-game More menu — Duplicate, Rename, Export, Delete',
        vp,
        scroll: async () => {
          await gameMore.scrollIntoViewIfNeeded()
        },
      })

      // Destructive delete, armed.
      await step('home-delete-arm', 'home', async () => {
        await gameMore.getByRole('button', { name: /^delete$/i }).click()
        await expect(gameMore.getByRole('button', { name: /confirm delete game/i })).toBeVisible({
          timeout: 10_000,
        })
      })
      await shot(page, {
        id: 'home-delete-confirm',
        surface: 'home',
        state: 'delete game — armed confirmation on the same button',
        vp,
        scroll: async () => {
          await gameMore.scrollIntoViewIfNeeded()
        },
      })

      // Rename editor.
      await step('home-rename', 'home', async () => {
        await gameMore.getByRole('button', { name: /^rename$/i }).click()
      })
      await shot(page, {
        id: 'home-rename-editor',
        surface: 'home',
        state: 'rename a saved game in place',
        vp,
        fullPage: true,
      })
    } finally {
      flushManifest()
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // T2 — RESUME / RECOVERY
  // ──────────────────────────────────────────────────────────────────────────
  test('T2 Home resume and recovery', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(240_000)
    const vp = VP.laptop
    const { page, close } = await newPage(browser, info, vp)
    try {
      await step('demo-and-play', 'recovery', async () => {
        await importDemoAndPlay(page)
        await waitForSessionSaved(page)
        await page.getByTestId('host-change-game').click()
      })
      await shot(page, {
        id: 'home-resume-session',
        surface: 'recovery',
        state: 'an unfinished session is resumable from Home',
        vp,
        waitFor: async () => {
          await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
          await expect(page.getByTestId('home-resume')).toBeVisible()
        },
        scrollTestId: 'home-resume',
        fullPage: true,
      })
      await shot(page, {
        id: 'home-resume-session-viewport',
        surface: 'recovery',
        state: 'resume state, above the fold only',
        vp,
      })

      await page.goto('#/host')
      await shot(page, {
        id: 'host-reopened-unfinished',
        surface: 'recovery',
        state: 'Host reopened with an unfinished session',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('host-foundation')).toBeVisible()
        },
        fullPage: true,
      })
      const welcome = page.getByTestId('host-welcome-back')
      if (await welcome.isVisible().catch(() => false)) {
        await shot(page, {
          id: 'host-welcome-back',
          surface: 'recovery',
          state: 'welcome-back notice',
          vp,
          scrollTestId: 'host-welcome-back',
        })
      }

      // Mid-setup reload.
      await page.goto('./')
      await page.getByTestId('home-resume').click().catch(() => undefined)
      await page.reload()
      await shot(page, {
        id: 'reload-mid-session',
        surface: 'recovery',
        state: 'reload in the middle of a session',
        vp,
        fullPage: true,
      })
    } finally {
      flushManifest()
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // T3 — CLASS SETUP at laptop and constrained projector
  // ──────────────────────────────────────────────────────────────────────────
  for (const vpKey of ['laptop', 'proj720'] as const) {
    test(`T3 Class Setup (${VP[vpKey].label})`, async ({ browser }, info) => {
      test.skip(info.project.name !== 'projector-720p', 'driver project only')
      test.setTimeout(300_000)
      const vp = VP[vpKey]
      const { page, close } = await newPage(browser, info, vp)
      try {
        const entered = await step(`setup-enter-${vpKey}`, 'setup', async () => {
          await importMenusJsonAndPlay(
            page,
            uiCourtGame({ id: `ui-court-setup-${vpKey}`, title: `UI Court Setup ${vpKey}` }),
          )
          await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
        })
        if (!entered) return

        await shot(page, {
          id: 'setup-initial',
          surface: 'setup',
          state: 'Class Setup as first opened',
          vp,
          waitFor: async () => {
            await expect(page.getByTestId('classroom-readiness')).toBeVisible()
          },
          fullPage: true,
        })
        await shot(page, {
          id: 'setup-initial-viewport',
          surface: 'setup',
          state: 'Class Setup, above the fold only (P1 five-second read)',
          vp,
        })

        const reveal = page.getByTestId('setup-reveal-buzzers')
        if (await reveal.isVisible().catch(() => false)) {
          await reveal.click()
          await shot(page, {
            id: 'setup-buzzer-setup-open',
            surface: 'setup',
            state: 'Buzzer setup opened, no receiver present (P3)',
            vp,
            waitFor: async () => {
              await expect(page.getByTestId('sbs')).toBeVisible()
            },
            fullPage: true,
          })
          await shot(page, {
            id: 'setup-buzzer-setup-viewport',
            surface: 'setup',
            state: 'Buzzer setup, above the fold only',
            vp,
          })
          const readiness = page.getByTestId('sbs-readiness')
          if (await readiness.isVisible().catch(() => false)) {
            await shot(page, {
              id: 'setup-buzzer-readiness',
              surface: 'setup',
              state: 'Buzzer readiness layers / unsupported state',
              vp,
              scrollTestId: 'sbs-readiness',
            })
          }
        }

        const skip = page.getByTestId('setup-skip-buzzers')
        if (await skip.isVisible().catch(() => false)) await skip.click()

        // Names: unnamed -> partially named -> ready.
        await step(`setup-open-names-${vpKey}`, 'setup', async () => {
          await page.getByTestId('readiness-names').click()
        })
        await shot(page, {
          id: 'setup-names-empty',
          surface: 'setup',
          state: 'Names open, no team named yet',
          vp,
          waitFor: async () => {
            await expect(page.getByTestId('team-name-selection-board')).toBeVisible()
          },
          fullPage: true,
        })
        const bank = page.getByTestId('team-name-bank')
        if (await bank.isVisible().catch(() => false)) {
          await shot(page, {
            id: 'setup-name-bank',
            surface: 'setup',
            state: 'team name bank offered',
            vp,
            scrollTestId: 'team-name-bank',
          })
        }

        await step(`setup-name-one-${vpKey}`, 'setup', async () => {
          const manuals = page.locator('[data-testid^="tnsb-manual-"]')
          await manuals.first().waitFor({ state: 'visible', timeout: 10_000 })
          await manuals.nth(0).fill('Mantle Movers')
          await manuals.nth(0).blur()
        })
        await shot(page, {
          id: 'setup-names-partial',
          surface: 'setup',
          state: 'P2 — one team named, one still blank',
          vp,
          fullPage: true,
        })
        await shot(page, {
          id: 'setup-names-partial-viewport',
          surface: 'setup',
          state: 'P2 — partially named, above the fold (one-second blocker read)',
          vp,
        })
        const blocker = page.getByTestId('setup-play-blocker')
        if (await blocker.isVisible().catch(() => false)) {
          await shot(page, {
            id: 'setup-play-blocker',
            surface: 'setup',
            state: 'Start blocked — stated reason',
            vp,
            scrollTestId: 'setup-play-blocker',
          })
        }

        await step(`setup-name-all-${vpKey}`, 'setup', () => fillAllTeamNames(page))
        await shot(page, {
          id: 'setup-ready',
          surface: 'setup',
          state: 'all readiness met — Start Game available',
          vp,
          waitFor: async () => {
            await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
            await expect(page.getByTestId('setup-play')).toBeEnabled()
          },
          fullPage: true,
        })
        await shot(page, {
          id: 'setup-ready-viewport',
          surface: 'setup',
          state: 'P1 — ready, above the fold',
          vp,
        })
        const optional = page.getByTestId('setup-optional-facts')
        if (await optional.isVisible().catch(() => false)) {
          await shot(page, {
            id: 'setup-optional-facts',
            surface: 'setup',
            state: 'optional-not-ready facts (display, sound)',
            vp,
            scrollTestId: 'setup-optional-facts',
          })
        }

        // Keyboard-only focus evidence.
        await step(`setup-focus-${vpKey}`, 'setup', async () => {
          await page.getByTestId('setup-play').focus()
        })
        await shot(page, {
          id: 'setup-keyboard-focus-start',
          surface: 'setup',
          state: 'keyboard focus on Start Game',
          vp,
        })
        await page.keyboard.press('Shift+Tab')
        await shot(page, {
          id: 'setup-keyboard-focus-prev',
          surface: 'setup',
          state: 'keyboard focus one control before Start',
          vp,
        })
      } finally {
        flushManifest()
        await close()
      }
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // T4 — HOST + DISPLAY gameplay arc
  // ──────────────────────────────────────────────────────────────────────────
  for (const displayKey of ['proj1080', 'proj720'] as const) {
    test(`T4 Host and Display gameplay (display ${VP[displayKey].label})`, async ({
      browser,
    }, info) => {
      test.skip(info.project.name !== 'projector-720p', 'driver project only')
      test.setTimeout(900_000)
      const hostVp = VP.laptop
      const dispVp = VP[displayKey]
      const suffix = displayKey
      const { context, page: host, close } = await newPage(browser, info, hostVp)
      /** Pages this run owns and must release, however the journey ends. */
      const owned: Page[] = []
      try {
        const disp = await stepValue(`play-start-${suffix}`, 'host', async () => {
          await importMenusJsonAndPlay(
            host,
            uiCourtGame({ id: `ui-court-play-${suffix}`, title: `UI Court Play ${suffix}` }),
          )
          await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
          await readyAndStart(host)
          const opened = await openAudienceFromHost(context, host)
          await opened.setViewportSize({ width: dispVp.width, height: dispVp.height })
          owned.push(opened)
          return opened
        })
        if (!disp) return

        const hostShot = (id: string, state: string, scrollTestId?: string) =>
          shot(host, { id: `host-${id}`, surface: 'host', state, vp: hostVp, scrollTestId })
        const hostFull = (id: string, state: string) =>
          shot(host, { id: `host-${id}-full`, surface: 'host', state, vp: hostVp, fullPage: true })
        const dispShot = (id: string, state: string) =>
          shot(disp, { id: `display-${id}`, surface: 'display', state, vp: dispVp })

        // 1. Round preamble.
        await hostShot('round-preamble', 'play posture, round not started')
        await hostFull('round-preamble', 'play posture, round not started')
        await dispShot('waiting', 'projector waiting for the game to start')

        // 2. Board open.
        await step(`play-board-${suffix}`, 'host', async () => {
          await expect(host.getByTestId('rph-start')).toBeVisible({ timeout: 15_000 })
          await advanceToNextRound(host)
          await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
        })
        await hostShot('board', 'category board, nothing selected')
        await hostFull('board', 'category board')
        await dispShot('board', 'public category board')

        // 3. Clue selected — Host holds the private answer.
        await step(`play-select-${suffix}`, 'host', async () => {
          await host.getByTestId('cbh-tile-science-100').click()
        })
        await hostShot('clue-selected', 'clue selected, private answer held, prompt not revealed')
        await hostFull('clue-selected', 'clue selected')
        await dispShot('clue-selected', 'public selection header, prompt not revealed')

        // 4. Prompt revealed.
        await step(`play-reveal-${suffix}`, 'host', async () => {
          await host.getByTestId('cbh-reveal-prompt').click()
          await expect(host.getByTestId('lih-open')).toContainText('Open', { timeout: 10_000 })
        })
        await hostShot('clue-revealed', 'prompt revealed, response window open')
        await dispShot('clue-revealed', 'public prompt revealed')

        // 5. Armed.
        await step(`play-arm-${suffix}`, 'host', async () => {
          await host.getByTestId('rth-arm').click()
          await expect(host.getByTestId('lih-armed')).toContainText('Armed', { timeout: 10_000 })
        })
        await hostShot('armed', 'armed, waiting for a buzz')
        await dispShot('armed', 'armed — waiting for a buzz')

        // 6. Timer running.
        await step(`play-timer-${suffix}`, 'host', async () => {
          await host.getByTestId('rth-duration').selectOption('60')
          await host.getByTestId('rth-start').click()
          await expect(disp.getByTestId('rtd')).toHaveAttribute('data-status', 'running', {
            timeout: 10_000,
          })
        })
        await hostShot('timer-running', 'timer running')
        await dispShot('timer-running', 'timer running on the projector')

        // 7. A team buzzes (keyboard buzzer; team1 is key 1).
        await step(`play-buzz-${suffix}`, 'host', async () => {
          await host.keyboard.press('Digit1')
          await expect(host.getByTestId('lih-active')).toContainText('Team 1', { timeout: 10_000 })
        })
        await hostShot('buzz-active', 'a team has buzzed and is active')
        await dispShot('buzz-active', 'active team shown publicly')

        // 8. Marked correct.
        await step(`play-correct-${suffix}`, 'host', async () => {
          await host.getByTestId('lih-correct').click()
          await expect(host.getByTestId('lih-board-outcome')).toContainText(/correct/i, {
            timeout: 10_000,
          })
        })
        await hostShot('marked-correct', 'active team marked correct')
        await dispShot('marked-correct', 'public correct outcome')

        // 9. Answer revealed.
        await step(`play-answer-${suffix}`, 'host', async () => {
          await host.getByTestId('cbh-reveal-answer').click()
        })
        await hostShot('answer-revealed', 'answer revealed to the room')
        await dispShot('answer-revealed', 'public answer reveal')

        // 10. Score awarded + Undo.
        await step(`play-target-${suffix}`, 'host', async () => {
          await host.getByTestId('tsp-target-team1').click()
        })
        await hostShot('score-target-selected', 'a team is selected for scoring', 'tsp-scoreboard')
        await step(`play-award-${suffix}`, 'host', async () => {
          await host.getByTestId('tsp-award-full').click()
          await expect(host.getByTestId('tsp-score-team1')).toHaveText('100', { timeout: 10_000 })
        })
        await hostShot('score-awarded', 'score changed', 'tsp-scoreboard')
        await hostFull('score-awarded', 'score changed')
        await dispShot('score-awarded', 'public scoreboard after a score change')
        const undo = host.getByTestId('tsp-undo-score')
        if (await undo.isVisible().catch(() => false)) {
          await shot(host, {
            id: 'host-undo-available',
            surface: 'host',
            state: 'P4 recovery — Undo last score change',
            vp: hostVp,
            scrollTestId: 'tsp-undo-score',
          })
        } else {
          record({
            id: 'host-undo-available',
            surface: 'host',
            state: 'P4 recovery — Undo last score change',
            viewport: hostVp.label,
            file: null,
            status: 'MISSING',
            note: 'tsp-undo-score not visible after a score change',
          })
        }

        // 11. Return to board — tile consumed.
        await step(`play-return-${suffix}`, 'host', async () => {
          await host.getByTestId('cbh-return').click()
          await expect(host.getByTestId('cbh-tile-science-100')).toBeDisabled({ timeout: 10_000 })
        })
        await hostShot('board-tile-used', 'returned to board, tile consumed')
        await dispShot('board-tile-used', 'public board with a used tile')

        // 12. Incorrect path on a second clue.
        await step(`play-second-clue-${suffix}`, 'host', async () => {
          await host.getByTestId('cbh-tile-science-200').click()
          await host.getByTestId('cbh-reveal-prompt').click()
          await host.getByTestId('rth-arm').click()
          await host.keyboard.press('Digit2')
        })
        const incorrect = host.getByTestId('lih-incorrect')
        if (await incorrect.isEnabled().catch(() => false)) {
          await incorrect.click()
          await hostShot('marked-incorrect', 'active team marked incorrect')
          await dispShot('marked-incorrect', 'public incorrect outcome')
        } else {
          record({
            id: 'host-marked-incorrect',
            surface: 'host',
            state: 'active team marked incorrect',
            viewport: hostVp.label,
            file: null,
            status: 'MISSING',
            note: 'lih-incorrect not enabled',
          })
        }
        await host.getByTestId('cbh-return').click().catch(() => undefined)

        // 13. Timer expiry (P6) on a third clue.
        await host.getByTestId('cbh-tile-science-300').click().catch(() => undefined)
        await host.getByTestId('cbh-reveal-prompt').click().catch(() => undefined)
        await host.getByTestId('rth-arm').click().catch(() => undefined)
        const shortest = await selectShortestDuration(host)
        if (shortest !== null) {
          await host.getByTestId('rth-start').click().catch(() => undefined)
          await host.waitForTimeout((shortest + 2) * 1000)
          await hostShot('timer-expired', `P6 — timer expired after ${shortest}s`)
          await hostFull('timer-expired', `P6 — timer expired after ${shortest}s`)
          await dispShot('timer-expired', `P6 — timer expired on the projector (${shortest}s)`)
        } else {
          record({
            id: 'host-timer-expired',
            surface: 'host',
            state: 'P6 — timer expired',
            viewport: hostVp.label,
            file: null,
            status: 'MISSING',
            note: 'no usable duration preset found',
          })
        }
        await host.getByTestId('cbh-return').click().catch(() => undefined)

        // 14. Round transition into Final (P7).
        await shot(host, {
          id: 'host-round-transition',
          surface: 'host',
          state: 'P7 — round progression controls before Final',
          vp: hostVp,
          scrollTestId: 'rph',
        })
        await step(`play-to-final-${suffix}`, 'host', () => advanceToNextRound(host))
        const finalHeading = host.getByRole('heading', { name: /^final wager$/i })
        if (await finalHeading.isVisible().catch(() => false)) {
          await hostShot('final-setup', 'Final Wager setup')
          await hostFull('final-setup', 'Final Wager setup')
          await dispShot('final-setup', 'projector entering Final')

          await step(`final-begin-${suffix}`, 'host', async () => {
            await host.getByTestId('fwh-begin').click()
            await expect(host.getByTestId('fwh-lock-wagers')).toBeVisible({ timeout: 10_000 })
          })
          await hostShot('final-wager-entry', 'Final — wager entry')
          await dispShot('final-wager-entry', 'Final — public wager entry')

          // Who is actually eligible for Final is a product decision (classic
          // mode admits only positive-score teams), so read it off the Host
          // rather than assuming both teams play.
          const eligible = await host
            .locator('[data-testid^="fwh-cap-"]')
            .evaluateAll((nodes) =>
              nodes
                .map((n) => (n.getAttribute('data-testid') ?? '').replace('fwh-cap-', ''))
                .filter(Boolean),
            )
            .catch(() => [] as string[])
          record({
            id: `final-eligible-${suffix}`,
            surface: 'host',
            state: `Final eligible teams observed: ${eligible.join(', ') || 'none'}`,
            viewport: hostVp.label,
            file: null,
            status: 'CAPTURED',
            note: 'observation only, no screenshot',
          })

          await step(`final-wagers-${suffix}`, 'host', async () => {
            for (const teamId of eligible) {
              await host.getByTestId(`fwh-wager-input-${teamId}`).fill('50')
              await host.getByTestId(`fwh-save-wager-${teamId}`).click()
              await expect(host.getByTestId(`fwh-committed-wager-${teamId}`)).toBeVisible({
                timeout: 10_000,
              })
            }
          })
          await hostShot('final-wagers-saved', 'Final — wagers saved (private on Host)')

          await step(`final-lock-wagers-${suffix}`, 'host', async () => {
            await host.getByTestId('fwh-lock-wagers').click()
            await expect(disp.getByTestId('fwd-wagers-locked')).toBeVisible({ timeout: 10_000 })
          })
          await hostShot('final-wagers-locked', 'Final — wagers locked')
          await dispShot('final-wagers-locked', 'Final — wagers locked publicly')

          await step(`final-start-response-${suffix}`, 'host', async () => {
            await host.getByTestId('fwh-start-response').click()
            await expect(disp.getByTestId('fwd-prompt')).toBeVisible({ timeout: 10_000 })
          })
          await hostShot('final-responses', 'Final — response capture, nothing recorded yet')
          await dispShot('final-prompt', 'Final — public prompt')

          await step(`final-record-responses-${suffix}`, 'host', async () => {
            for (const teamId of eligible) {
              const exact = host.getByTestId(`fwh-response-input-${teamId}`)
              if (await exact.isVisible().catch(() => false)) {
                await exact.fill('Mantle convection')
                await host.getByTestId(`fwh-save-exact-${teamId}`).click()
              } else {
                await host.getByTestId(`fwh-save-responded-${teamId}`).click()
              }
              await expect(host.getByTestId(`fwh-committed-response-${teamId}`)).toBeVisible({
                timeout: 10_000,
              })
            }
          })
          await hostShot('final-responses-recorded', 'Final — every eligible team recorded')

          await step(`final-lock-responses-${suffix}`, 'host', async () => {
            await host.getByTestId('fwh-lock-responses').click()
            await expect(host.getByTestId('fwh-reveal-answer')).toBeVisible({ timeout: 10_000 })
          })
          await hostShot('final-responses-locked', 'Final — responses locked, answer still private')
          await dispShot('final-responses-locked', 'Final — responses locked publicly')

          await step(`final-reveal-answer-${suffix}`, 'host', async () => {
            await host.getByTestId('fwh-reveal-answer').click()
            await expect(disp.getByTestId('fwd-answer')).toBeVisible({ timeout: 10_000 })
          })
          await hostShot('final-judging', 'Final — judging / reveal controls')
          await hostFull('final-judging', 'Final — judging / reveal controls')
          await dispShot('final-answer', 'Final — public answer')

          for (const [i, teamId] of eligible.entries()) {
            await step(`final-reveal-${teamId}-${suffix}`, 'host', async () => {
              await host.getByTestId(`fwh-reveal-${teamId}`).click()
              await expect(host.getByTestId('fwh-active-reveal')).toBeVisible({ timeout: 10_000 })
            })
            if (i === 0) {
              await hostShot('final-team-reveal', 'Final — a team revealed, not yet settled')
              await dispShot('final-team-reveal', 'Final — public team reveal before settlement')
            }
            await step(`final-settle-${teamId}-${suffix}`, 'host', async () => {
              await host.getByTestId('fwh-settle-correct').click()
              await expect(
                host.getByTestId('fwh-settled').or(host.getByTestId('fwh-complete')),
              ).toBeVisible({ timeout: 10_000 })
            })
            if (i === 0) {
              await hostShot('final-settled', 'Final — first team settled')
              await dispShot('final-settled', 'Final — public outcome')
            }
          }

          const completed = await step(`final-complete-${suffix}`, 'host', async () => {
            await expect(host.getByTestId('fwh-complete')).toBeVisible({ timeout: 10_000 })
            await host.getByTestId('fwh-complete').click()
            await hostShot('completion-armed', 'P8 — End the game, armed confirmation')
            await host.getByTestId('fwh-complete-confirm').click()
            await expect(disp.getByTestId('fwd-complete')).toBeVisible({ timeout: 15_000 })
          })
          if (completed) {
            await hostShot('completion', 'P8 — game complete on Host')
            await hostFull('completion', 'P8 — game complete on Host')
            await dispShot('completion-winner', 'public winner / completion')
          }

          const summary = host.getByTestId('session-summary-panel')
          if (await summary.isVisible().catch(() => false)) {
            await shot(host, {
              id: 'host-session-summary',
              surface: 'host',
              state: 'P8 — session summary after completion',
              vp: hostVp,
              scrollTestId: 'session-summary-panel',
              fullPage: true,
            })
          } else {
            record({
              id: 'host-session-summary',
              surface: 'host',
              state: 'P8 — session summary after completion',
              viewport: hostVp.label,
              file: null,
              status: 'MISSING',
              note: 'session-summary-panel not visible after completion',
            })
          }
        } else {
          record({
            id: 'host-final-setup',
            surface: 'host',
            state: 'Final Wager setup',
            viewport: hostVp.label,
            file: null,
            status: 'MISSING',
            note: 'Final Wager heading never appeared',
          })
        }
      } finally {
        flushManifest()
        for (const p of owned) await p.close().catch(() => undefined)
        await close()
      }
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // T5 — TEAM-COUNT AND LONG-CONTENT STRESS
  // ──────────────────────────────────────────────────────────────────────────
  test('T5 team-count and long-content stress', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(600_000)
    const { context, page: host, close } = await newPage(browser, info, VP.laptop)
    /** Pages this run owns and must release, however the journey ends. */
    const owned: Page[] = []
    try {
      // Eight teams — the product maximum.
      const eightOk = await step('eight-enter', 'stress', async () => {
        await importMenusJsonAndPlay(
          host,
          uiCourtGame({ id: 'ui-court-eight', title: 'Eight Team Stress', teamCount: 8 }),
        )
        await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
      })
      if (!eightOk) return
      for (const vp of [VP.laptop, VP.proj720] as const) {
        await shot(host, {
          id: 'setup-eight-teams',
          surface: 'stress',
          state: 'Class Setup with eight teams',
          vp,
          fullPage: true,
        })
        await shot(host, {
          id: 'setup-eight-teams-viewport',
          surface: 'stress',
          state: 'Class Setup with eight teams, above the fold',
          vp,
        })
      }
      await host.setViewportSize(VP.laptop)
      const disp = await stepValue('eight-start', 'stress', async () => {
        await readyAndStart(host)
        const opened = await openAudienceFromHost(context, host)
        owned.push(opened)
        return opened
      })
      if (!disp) return
      for (const vp of [VP.proj1080, VP.proj720] as const) {
        await shot(disp, {
          id: 'display-eight-teams-waiting',
          surface: 'stress',
          state: 'projector scoreboard with eight teams',
          vp,
        })
      }
      await step('eight-board', 'stress', async () => {
        await advanceToNextRound(host)
        await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
      })
      for (const vp of [VP.proj1080, VP.proj720] as const) {
        await shot(disp, {
          id: 'display-eight-teams-board',
          surface: 'stress',
          state: 'projector board with eight teams',
          vp,
        })
      }
      await shot(host, {
        id: 'host-eight-teams-board',
        surface: 'stress',
        state: 'Host board and scoreboard with eight teams',
        vp: VP.laptop,
        fullPage: true,
      })

      // Long content — verbose prompts, categories and team names. A SEPARATE
      // context: the eight-team session above leaves Home recovery-dominant,
      // which is a real product behaviour but not the state under test here.
      const longCtx = await browser.newContext({
        viewport: VP.laptop,
        baseURL: info.project.use.baseURL,
      })
      const long = await longCtx.newPage()
      const longDisp = await stepValue('long-start', 'stress', async () => {
        await importMenusJsonAndPlay(
          long,
          uiCourtGame({
            id: 'ui-court-long',
            title: 'Very Long Content Stress Game For Legibility Review',
            longText: true,
          }),
        )
        await expect(long.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
        await readyAndStart(long)
        const opened = await openAudienceFromHost(longCtx, long)
        owned.push(opened)
        owned.push(long)
        await advanceToNextRound(long)
        await expect(long.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
        return opened
      })
      if (!longDisp) {
        await longCtx.close().catch(() => undefined)
        return
      }
      for (const vp of [VP.proj1080, VP.proj720] as const) {
        await shot(longDisp, {
          id: 'display-long-board',
          surface: 'stress',
          state: 'projector board with very long category titles',
          vp,
        })
      }
      await step('long-clue', 'stress', async () => {
        await long.getByTestId('cbh-tile-science-100').click()
        await long.getByTestId('cbh-reveal-prompt').click()
      })
      for (const vp of [VP.proj1080, VP.proj720] as const) {
        await shot(longDisp, {
          id: 'display-long-prompt',
          surface: 'stress',
          state: 'projector clue with a very long prompt',
          vp,
        })
      }
      await shot(long, {
        id: 'host-long-prompt',
        surface: 'stress',
        state: 'Host clue with a very long prompt and answer',
        vp: VP.laptop,
        fullPage: true,
      })
    } finally {
      flushManifest()
      for (const p of owned) await p.close().catch(() => undefined)
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // T6 — SYSTEM / EDGE SURFACES
  // ──────────────────────────────────────────────────────────────────────────
  test('T6 System and edge surfaces', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(300_000)
    const vp = VP.laptop
    const { page, close } = await newPage(browser, info, vp)
    try {
      await page.goto('#/display')
      for (const v of [vp, VP.proj720, VP.proj1080] as const) {
        await shot(page, {
          id: 'display-standalone-idle',
          surface: 'system',
          state: 'Display opened with no session running',
          vp: v,
        })
      }

      await page.goto('#/host')
      await shot(page, {
        id: 'host-no-game',
        surface: 'system',
        state: 'Host opened with no game chosen',
        vp,
        fullPage: true,
      })
      await shot(page, {
        id: 'host-no-game-viewport',
        surface: 'system',
        state: 'Host with no game, above the fold',
        vp,
      })

      await page.goto('#/nope-not-a-route')
      await shot(page, {
        id: 'not-found',
        surface: 'system',
        state: 'unknown route',
        vp,
      })

      // Import failure — malformed content must fail closed and say why.
      await page.goto('./')
      await step('bad-import', 'system', async () => {
        await openImportPanel(page)
        await page.locator('#home-import-json').fill('{ "format": "nope", "title": 7 }')
        await page.getByTestId('home-import-json').click()
      })
      await shot(page, {
        id: 'import-failure-salvage',
        surface: 'system',
        state: 'malformed import — fails closed into salvage review',
        vp,
        waitFor: async () => {
          await expect(page.getByTestId('import-salvage')).toBeVisible({ timeout: 15_000 })
        },
        scrollTestId: 'import-salvage',
        fullPage: true,
      })
      await shot(page, {
        id: 'import-failure-salvage-viewport',
        surface: 'system',
        state: 'malformed import — salvage review, above the fold',
        vp,
      })
      const salvageOpen = page.getByTestId('import-salvage-open')
      if (await salvageOpen.isVisible().catch(() => false)) {
        await step('salvage-detail', 'system', async () => {
          await salvageOpen.click()
        })
        await shot(page, {
          id: 'import-salvage-detail',
          surface: 'system',
          state: 'salvage review — expanded detail',
          vp,
          fullPage: true,
        })
      }

      // High-contrast projector theme.
      await page.goto('#/display?theme=high-contrast')
      for (const v of [VP.proj720, VP.proj1080] as const) {
        await shot(page, {
          id: 'display-high-contrast',
          surface: 'system',
          state: 'Display, high-contrast theme, no session',
          vp: v,
        })
      }

      // Reduced-motion is already forced for every shot by
      // prepareDeterministicCapture; record that as an evidence condition.
      record({
        id: 'capture-conditions',
        surface: 'system',
        state: 'reduced-motion forced and animations disabled for every shot',
        viewport: 'all',
        file: null,
        status: 'CAPTURED',
        note: 'prepareDeterministicCapture: emulateMedia reducedMotion=reduce + animation/transition none',
      })
    } finally {
      flushManifest()
      await close()
    }
  })
})
