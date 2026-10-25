/**
 * UI/DESIGN QUALIFICATION — Phase 1 rendered baseline, supplemental pass.
 *
 * Gate: CQS_UI_COURT_CAPTURE=1, output root CQS_UI_COURT_OUT.
 *
 * Covers the surfaces the main baseline pass does not reach: authoring with
 * real content, media clues, the Host's Advanced/diagnostics and audio layers,
 * the completed-summary ledger, mid-game escape and reset, the spreadsheet
 * authoring route, and the FRC-4 Live-Undo state that the surface inventory
 * already routes as an open design question.
 *
 * Same contract as the main pass: observe only, assert nothing about the
 * product, and record an explicit MISSING row for any state this build cannot
 * reach.
 */

import { test, expect, type Page } from '@playwright/test'
import {
  ACCENTS,
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
import { importMenusJsonAndPlay } from './helpers/menusGameJson'
import { advanceToNextRound, openAudienceFromHost } from './helpers/menusQ3'

/** A game whose first clue is an authored image, for projector media review. */
function mediaGame(): string {
  return JSON.stringify({
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'ui-court-media',
    title: 'UI Court Media Clue',
    timer: { responseSeconds: 45 },
    teams: [
      { id: 'team1', name: 'Authored Team 1', accent: ACCENTS[0] },
      { id: 'team2', name: 'Authored Team 2', accent: ACCENTS[1] },
    ],
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Board',
        config: {
          categories: [
            {
              id: 'science',
              title: 'Science',
              tiles: [
                {
                  id: 'science-100',
                  value: 100,
                  prompt: {
                    kind: 'image',
                    source: {
                      kind: 'same-origin-path',
                      path: 'media-fixtures/s05-f1-stress-diagram.png',
                    },
                    alt: 'A labelled cross-section diagram of the Earth',
                    caption: 'Earth layers',
                    attribution: 'USGS public domain',
                  },
                  answer: 'The mantle',
                  notes: 'Host-only note — never project',
                },
                {
                  id: 'science-200',
                  value: 200,
                  prompt: 'Science 200: what is H2O?',
                  answer: 'Water',
                },
              ],
            },
          ],
        },
      },
    ],
  })
}

test.describe.configure({ mode: 'serial' })

test.describe('UI Court rendered baseline — supplemental', () => {
  test.skip(!CAPTURE_ON, 'Set CQS_UI_COURT_CAPTURE=1 to write PNGs')
  test.skip(!OUT_ROOT, 'Set CQS_UI_COURT_OUT to an absolute output directory')
  test.use({ actionTimeout: 8_000, navigationTimeout: 30_000 })

  // ──────────────────────────────────────────────────────────────────────────
  // S1 — AUTHORING WITH REAL CONTENT
  // ──────────────────────────────────────────────────────────────────────────
  test('S1 Authoring a game that already has content', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(300_000)
    const vp = VP.laptop
    const { page, close } = await newPage(browser, info, vp)
    try {
      await step('author-import', 'authoring', async () => {
        await page.goto('./')
        await openImportPanel(page)
        await page.getByTestId('home-import-demo').click()
        await expect(page.getByTestId('home-hero-playable')).toBeVisible({ timeout: 15_000 })
      })
      await step('author-open', 'authoring', async () => {
        await page.getByTestId('home-hero-edit').click()
        await expect(page.getByTestId('tile-editor')).toBeVisible({ timeout: 15_000 })
      })

      await shot(page, {
        id: 'authoring-populated',
        surface: 'authoring',
        state: 'editing a real game with five authored clues',
        vp,
      })
      await shot(page, {
        id: 'authoring-populated-full',
        surface: 'authoring',
        state: 'editing a real game (full page)',
        vp,
        fullPage: true,
      })
      await shot(page, {
        id: 'authoring-populated-720',
        surface: 'authoring',
        state: 'editing a real game at the constrained projector width',
        vp: VP.proj720,
        fullPage: true,
      })
      await page.setViewportSize(VP.laptop)

      for (const id of [
        'authoring-goal',
        'authoring-preview',
        'authoring-quality-details',
        'authoring-team-count',
        'authoring-validation',
      ]) {
        const el = page.getByTestId(id)
        if (await el.isVisible().catch(() => false)) {
          await shot(page, {
            id: `authoring-detail-${id}`,
            surface: 'authoring',
            state: `authoring sub-surface ${id}`,
            vp,
            scrollTestId: id,
          })
        } else {
          record({
            id: `authoring-detail-${id}`,
            surface: 'authoring',
            state: `authoring sub-surface ${id}`,
            viewport: vp.label,
            file: null,
            status: 'MISSING',
            note: `${id} not visible while editing a populated game`,
          })
        }
      }

      // Edit a clue, then observe the save-state language.
      await step('author-edit-clue', 'authoring', async () => {
        const firstText = page.locator('#tile-prompt, textarea').first()
        await firstText.fill('Edited by the UI Court baseline — what is the mantle?')
        await firstText.blur()
      })
      await shot(page, {
        id: 'authoring-dirty',
        surface: 'authoring',
        state: 'unsaved edit pending — save state language',
        vp,
        scrollTestId: 'authoring-save-status',
      })
      await step('author-save', 'authoring', async () => {
        await page.getByTestId('authoring-save').click()
        await expect(page.getByTestId('authoring-save-status')).toBeVisible({ timeout: 10_000 })
      })
      await shot(page, {
        id: 'authoring-saved',
        surface: 'authoring',
        state: 'after Save — saved state language',
        vp,
        scrollTestId: 'authoring-save-status',
      })
    } finally {
      flushManifest()
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // S2 — MEDIA CLUE on Host and projector
  // ──────────────────────────────────────────────────────────────────────────
  test('S2 Media clue', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(300_000)
    const { context, page: host, close } = await newPage(browser, info, VP.laptop)
    const owned: Page[] = []
    try {
      const disp = await stepValue('media-start', 'media', async () => {
        await importMenusJsonAndPlay(host, mediaGame())
        await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
        await readyAndStart(host)
        const opened = await openAudienceFromHost(context, host)
        owned.push(opened)
        await advanceToNextRound(host)
        await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
        return opened
      })
      if (!disp) return

      await step('media-open', 'media', async () => {
        await host.getByTestId('cbh-tile-science-100').click()
        await host.getByTestId('cbh-reveal-prompt').click()
        await expect(host.getByTestId('lih-open')).toContainText('Open', { timeout: 10_000 })
      })
      await shot(host, {
        id: 'host-media-clue',
        surface: 'media',
        state: 'Host holding an image clue',
        vp: VP.laptop,
        fullPage: true,
      })
      for (const vp of [VP.proj1080, VP.proj720] as const) {
        await shot(disp, {
          id: 'display-media-clue',
          surface: 'media',
          state: 'projector showing an image clue with caption and attribution',
          vp,
        })
      }
    } finally {
      flushManifest()
      for (const p of owned) await p.close().catch(() => undefined)
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // S3 — HOST ADVANCED, AUDIO, EMERGENCY MUTE, ESCAPE AND RESET
  // ──────────────────────────────────────────────────────────────────────────
  test('S3 Host advanced, audio, escape and reset', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(420_000)
    const vp = VP.laptop
    const { context, page: host, close } = await newPage(browser, info, vp)
    const owned: Page[] = []
    try {
      const ok = await stepValue('adv-start', 'system', async () => {
        await importMenusJsonAndPlay(
          host,
          uiCourtGame({ id: 'ui-court-adv', title: 'UI Court Advanced' }),
        )
        await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
        return true
      })
      if (!ok) return

      // Class Setup optional facts: sound test, display preview, panic mute.
      for (const id of [
        'setup-sound-task',
        'setup-audio-test',
        'setup-panic-mute',
        'setup-display-task',
        'setup-display-preview',
      ]) {
        const el = host.getByTestId(id)
        if (await el.isVisible().catch(() => false)) {
          await shot(host, {
            id: `setup-${id}`,
            surface: 'setup-optional',
            state: `Class Setup optional surface ${id}`,
            vp,
            scrollTestId: id,
          })
        } else {
          record({
            id: `setup-${id}`,
            surface: 'setup-optional',
            state: `Class Setup optional surface ${id}`,
            viewport: vp.label,
            file: null,
            status: 'MISSING',
            note: `${id} not visible at Class Setup`,
          })
        }
      }

      await step('adv-play', 'system', () => readyAndStart(host))
      const disp = await stepValue('adv-display', 'system', async () => {
        const opened = await openAudienceFromHost(context, host)
        owned.push(opened)
        return opened
      })

      // Audio controls in play posture.
      const audio = host.getByTestId('audio-controls')
      if (await audio.isVisible().catch(() => false)) {
        await shot(host, {
          id: 'host-audio-controls',
          surface: 'system',
          state: 'audio controls in play posture',
          vp,
          scrollTestId: 'audio-controls',
        })
      } else {
        record({
          id: 'host-audio-controls',
          surface: 'system',
          state: 'audio controls in play posture',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'audio-controls not visible in play posture',
        })
      }

      // Advanced diagnostics, explicitly as a diagnostics surface.
      await step('adv-open', 'system', async () => {
        await host.locator('details[data-testid="host-more"] > summary').click()
        await expect(host.getByTestId('host-advanced')).toBeVisible({ timeout: 10_000 })
      })
      await shot(host, {
        id: 'host-advanced-open',
        surface: 'system',
        state: 'More → Advanced diagnostics expanded (not an ordinary route)',
        vp,
        fullPage: true,
      })
      for (const id of ['diagnostic-report', 'event-history', 'ledger-status']) {
        const el = host.getByTestId(id)
        if (await el.isVisible().catch(() => false)) {
          await shot(host, {
            id: `host-advanced-${id}`,
            surface: 'system',
            state: `Advanced sub-surface ${id}`,
            vp,
            scrollTestId: id,
          })
        }
      }
      await step('adv-close', 'system', async () => {
        await host.locator('details[data-testid="host-more"] > summary').click()
      })

      // FRC-4: start timer -> disarm -> expiry, then read the Live Undo label.
      await step('frc4-setup', 'host', async () => {
        await advanceToNextRound(host)
        await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
        await host.getByTestId('cbh-tile-science-100').click()
        await host.getByTestId('cbh-reveal-prompt').click()
        await host.getByTestId('rth-arm').click()
        await expect(host.getByTestId('lih-armed')).toContainText('Armed', { timeout: 10_000 })
      })
      const shortest = await selectShortestDuration(host)
      const frc4 = await step('frc4-disarm-expiry', 'host', async () => {
        await host.getByTestId('rth-start').click()
        await host.getByTestId('rth-disarm').click()
        await expect(host.getByTestId('lih-armed')).toContainText(/not armed/i, { timeout: 10_000 })
        await host.waitForTimeout(((shortest ?? 5) + 2) * 1000)
      })
      if (frc4) {
        const undoLabel = await host
          .getByTestId('host-undo')
          .innerText()
          .catch(() => '(no live undo control)')
        record({
          id: 'frc4-undo-label',
          surface: 'host',
          state: `Live Undo label after start timer -> disarm -> expiry: "${undoLabel.trim()}"`,
          viewport: vp.label,
          file: null,
          status: 'CAPTURED',
          note: 'observation only; routed open question on surface 12 of the UX surface inventory',
        })
        await shot(host, {
          id: 'host-frc4-undo-after-expiry',
          surface: 'host',
          state: 'FRC-4 — Live Undo label after start timer → disarm → expiry',
          vp,
          scrollTestId: 'host-undo',
        })
        await shot(host, {
          id: 'host-frc4-undo-after-expiry-full',
          surface: 'host',
          state: 'FRC-4 — whole Host at that moment',
          vp,
          fullPage: true,
        })
      }

      // Mid-game escape: Back to setup, then Change game.
      await step('escape-back-to-setup', 'recovery', async () => {
        await host.getByTestId('cbh-return').click().catch(() => undefined)
        await host.getByTestId('host-change-game').click()
      })
      await shot(host, {
        id: 'mid-game-escape',
        surface: 'recovery',
        state: 'mid-game escape — where the teacher lands',
        vp,
        fullPage: true,
      })

      // Reset this class session.
      const reset = host.getByTestId('reset-class-session')
      if (await reset.isVisible().catch(() => false)) {
        await shot(host, {
          id: 'reset-class-session',
          surface: 'recovery',
          state: 'Reset this class session control in context',
          vp,
          scrollTestId: 'reset-class-session',
        })
      } else {
        record({
          id: 'reset-class-session',
          surface: 'recovery',
          state: 'Reset this class session control in context',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'reset-class-session not visible after mid-game escape',
        })
      }
      await disp?.close().catch(() => undefined)
    } finally {
      flushManifest()
      for (const p of owned) await p.close().catch(() => undefined)
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // S4 — SPREADSHEET AUTHORING ROUTE
  // ──────────────────────────────────────────────────────────────────────────
  test('S4 Spreadsheet authoring route', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(180_000)
    const vp = VP.laptop
    const { page, close } = await newPage(browser, info, vp)
    try {
      await step('sheet-open', 'authoring', async () => {
        await page.goto('./')
        await openImportPanel(page)
        await page.getByTestId('home-import-spreadsheet').click()
      })
      await shot(page, {
        id: 'spreadsheet-route',
        surface: 'authoring',
        state: 'spreadsheet authoring entry point',
        vp,
        fullPage: true,
      })
      await shot(page, {
        id: 'import-templates',
        surface: 'authoring',
        state: 'downloadable templates offered on Home import',
        vp,
        scrollTestId: 'home-import-templates',
      })
    } finally {
      flushManifest()
      await close()
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // S5 — COMPLETION, SUMMARY AND THE COMPLETED-SUMMARY LEDGER
  // ──────────────────────────────────────────────────────────────────────────
  test('S5 Completion, summary and ledger', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(420_000)
    const vp = VP.laptop
    const { context, page: host, close } = await newPage(browser, info, vp)
    const owned: Page[] = []
    try {
      const disp = await stepValue('sum-start', 'summary', async () => {
        await importMenusJsonAndPlay(
          host,
          uiCourtGame({ id: 'ui-court-sum', title: 'UI Court Summary' }),
        )
        await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
        await readyAndStart(host)
        const opened = await openAudienceFromHost(context, host)
        owned.push(opened)
        return opened
      })
      if (!disp) return

      // Play one clue so the summary has something to report, then end early.
      await step('sum-play', 'summary', async () => {
        await advanceToNextRound(host)
        await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
        await host.getByTestId('cbh-tile-science-100').click()
        await host.getByTestId('cbh-reveal-prompt').click()
        await host.getByTestId('rth-arm').click()
        await host.keyboard.press('Digit1')
        await host.getByTestId('lih-correct').click()
        await host.getByTestId('cbh-reveal-answer').click()
        await host.getByTestId('tsp-target-team1').click()
        await host.getByTestId('tsp-award-full').click()
        await expect(host.getByTestId('tsp-score-team1')).toHaveText('100', { timeout: 10_000 })
        await host.getByTestId('cbh-return').click()
      })

      // End the game early through the ordinary round control.
      const endEarly = host.getByTestId('rph-end-early')
      if (await endEarly.isVisible().catch(() => false)) {
        await shot(host, {
          id: 'host-end-early-available',
          surface: 'summary',
          state: 'End the game early, offered on the round panel',
          vp,
          scrollTestId: 'rph',
        })
        await step('sum-end', 'summary', async () => {
          await endEarly.click()
          const confirm = host.getByTestId('rph-confirm')
          if (await confirm.isVisible().catch(() => false)) await confirm.click()
        })
      } else {
        record({
          id: 'host-end-early-available',
          surface: 'summary',
          state: 'End the game early, offered on the round panel',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'rph-end-early not visible mid-board',
        })
      }

      const summary = host.getByTestId('session-summary-panel')
      if (await summary.isVisible().catch(() => false)) {
        await shot(host, {
          id: 'host-session-summary',
          surface: 'summary',
          state: 'session summary after the game ends',
          vp,
          scrollTestId: 'session-summary-panel',
        })
        await shot(host, {
          id: 'host-session-summary-full',
          surface: 'summary',
          state: 'Host at game end (full page) — what the teacher does next',
          vp,
          fullPage: true,
        })
      } else {
        record({
          id: 'host-session-summary',
          surface: 'summary',
          state: 'session summary after the game ends',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'session-summary-panel not visible after ending the game',
        })
      }
      await shot(disp, {
        id: 'display-after-end',
        surface: 'summary',
        state: 'projector after the game ends',
        vp: VP.proj720,
      })

      // Completed-summary ledger, reached through Advanced.
      await step('ledger-open', 'summary', async () => {
        await host.locator('details[data-testid="host-more"] > summary').click()
        await expect(host.getByTestId('ledger-status')).toBeVisible({ timeout: 10_000 })
      })
      await shot(host, {
        id: 'host-completed-ledger',
        surface: 'summary',
        state: 'completed-summary ledger (reached through More → Advanced)',
        vp,
        scrollTestId: 'ledger-status',
        fullPage: true,
      })

      // Start a new game session from the completed state.
      const newSession = host.getByTestId('start-new-game-session')
      if (await newSession.isVisible().catch(() => false)) {
        await shot(host, {
          id: 'host-start-new-session',
          surface: 'summary',
          state: 'P8 — next action after a finished class',
          vp,
          scrollTestId: 'start-new-game-session',
        })
      } else {
        record({
          id: 'host-start-new-session',
          surface: 'summary',
          state: 'P8 — next action after a finished class',
          viewport: vp.label,
          file: null,
          status: 'MISSING',
          note: 'start-new-game-session not visible after completion',
        })
      }
    } finally {
      flushManifest()
      for (const p of owned) await p.close().catch(() => undefined)
      await close()
    }
  })
})
