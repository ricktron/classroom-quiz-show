/**
 * Pre-owner Q5 — Desktop/Electron session lifecycle seams.
 *
 * Authorization: AUTHORIZE-CQS-Q5-DESKTOP-ELECTRON-INTEGRATION-QUALIFICATION
 *
 * Browser Q1–Q4 evidence remains RETAIN. This pack proves only Electron-specific
 * integration that browser e2e cannot establish:
 * - authentic started-Session persistence across quit/relaunch
 * - explicit Home Resume (no silent auto-resume) under Electron userData
 * - Host/Display reconvergence + privacy after desktop recovery
 * - Display hash-lock under the production shell
 * - desktop build identity bound to the exact candidate HEAD
 *
 * Does not claim physical Sony / projector / audio / Windows / signed release /
 * teacher usability / Class Setup golden-path completeness.
 */

import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import {
  advanceToBoard,
  armAndStartTimer,
  expectDisplayPrivate,
  keyboardNamesReadyStart,
  openBoardClue,
  Q3_PRIVATE_CONTENT,
  Q3_SESSION_NAME_ALPHA,
  Q3_TEAM_ALPHA,
  q3CompleteGameJson,
} from '../e2e/helpers/menusQ3'
import { waitForSessionSaved } from '../e2e/helpers/menusSession'
import {
  hostWindow,
  launchDesktop,
  makeUserDataDir,
  openDisplayFromHostChrome,
  resolveExactHeadSha,
} from './helpers/desktopLaunch'

test.describe.configure({ mode: 'serial' })

/** Home is already at cqs://app — do not page.goto web-relative paths. */
async function importQ3GameToClassSetupOnDesktop(page: Page, suffix: string): Promise<void> {
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await page.getByTestId('home-import-game').click()
  await page.locator('#home-import-json').fill(q3CompleteGameJson(suffix))
  await page.getByTestId('home-import-json').click()
  await expect(page.getByTestId('import-quality-report')).toBeVisible()
  await page.getByRole('button', { name: /^play$/i }).first().click()
  await expect(page).toHaveURL(/[?&]play=/)
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

async function expectHostPrivateAnswerVisible(host: Page): Promise<void> {
  await expect(host.getByTestId('cbh-answer')).toContainText('Water')
  await expect(host.getByTestId('cbh-prompt')).toContainText(/what is H2O/i)
}

test('Q5-A: desktop build identity binds sourceSha to exact candidate HEAD', async () => {
  const userData = makeUserDataDir('cqs-q5-identity-')
  const expectedSha = resolveExactHeadSha()
  const app = await launchDesktop(userData)
  try {
    const host = await hostWindow(app)
    const identity = await host.evaluate(async () => {
      const res = await fetch('cqs://app/desktop-build-identity.json')
      return {
        ok: res.ok,
        body: (await res.json()) as {
          appId: string
          protocol: string
          runtime: string
          sourceSha: string
          updateModel: string
        },
      }
    })
    expect(identity.ok).toBe(true)
    expect(identity.body.appId).toBe('com.classroomquizshow.app')
    expect(identity.body.protocol).toBe('cqs://app')
    expect(identity.body.runtime).toBe('electron')
    expect(identity.body.updateModel).toBe('manual-versioned-replacement')
    expect(identity.body.sourceSha).toBe(expectedSha)
    expect(identity.body.sourceSha).not.toBe('unknown')
  } finally {
    await app.close()
  }
})

test('Q5-B: Display hash-lock rejects Host navigation under Electron', async () => {
  const userData = makeUserDataDir('cqs-q5-hashlock-')
  const app = await launchDesktop(userData)
  try {
    const host = await hostWindow(app)
    const displayPromise = app.waitForEvent('window')
    await host.getByTestId('home-open-display').click()
    const display = await displayPromise
    await expect(display.getByTestId('display-route')).toBeVisible({ timeout: 20_000 })

    await display.evaluate(() => {
      window.location.hash = '#/host'
    })

    // Shell must keep the projector window on #/display (hash-lock / reload fallback).
    await expect
      .poll(async () => display.evaluate(() => window.location.hash), { timeout: 10_000 })
      .toMatch(/#\/display/)
    await expect(display.getByTestId('display-route')).toBeVisible()
    await expect(display.getByRole('heading', { name: /host control/i })).toHaveCount(0)
    await expect(display.getByText(/private teacher controls/i)).toHaveCount(0)
    expect(await app.windows()).toHaveLength(2)
  } finally {
    await app.close()
  }
})

test('Q5-C: authentic started Session survives quit/relaunch with explicit Resume + Display privacy', async () => {
  test.slow()
  const userData = makeUserDataDir('cqs-q5-session-')
  let app: ElectronApplication = await launchDesktop(userData)

  try {
    const host = await hostWindow(app)
    await importQ3GameToClassSetupOnDesktop(host, 'q5-desktop-lifecycle')
    await keyboardNamesReadyStart(host)

    const display = await openDisplayFromHostChrome(app, host)
    await advanceToBoard(host)
    await openBoardClue(host)
    await expectHostPrivateAnswerVisible(host)
    await expectDisplayPrivate(display, Q3_PRIVATE_CONTENT)
    expect((await display.content()).toLowerCase()).not.toContain('water')

    // Leave a durable mid-play fact: keyboard claim → Correct → score Alpha +100.
    await armAndStartTimer(host)
    await host.keyboard.press('Digit1')
    await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
    await expect(host.getByTestId('lih-correct')).toBeEnabled()
    await host.getByTestId('lih-correct').click()
    await expect(host.getByTestId('lih-board-outcome')).toContainText(
      `${Q3_SESSION_NAME_ALPHA} — Correct`,
    )
    await expect(display.getByTestId('board-outcome')).toContainText(/Correct/i)
    await host.getByTestId('cbh-reveal-answer').click()
    await host.getByTestId(`tsp-target-${Q3_TEAM_ALPHA}`).click()
    await host.getByTestId('tsp-award-full').click()
    await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('100')
    await expect(display.getByTestId('display-scores')).toContainText('100')
    await waitForSessionSaved(host, { timeout: 15_000 })
  } finally {
    await app.close()
  }

  // Fresh Electron process, same userData identity — not a browser reload.
  app = await launchDesktop(userData)
  try {
    const host = await hostWindow(app)

    // Cold relaunch must not silently auto-resume into play (ADR-013 / H1).
    await expect(host.getByTestId('home-resume')).toBeVisible()
    await expect(host.getByTestId('home-resume-session')).toBeVisible()
    await expect(host.getByTestId('classroom-setup')).toHaveCount(0)
    await expect(host.getByTestId('cbh-grid')).toHaveCount(0)
    await expect(host.getByTestId('host-foundation')).toHaveCount(0)

    await host.getByTestId('home-resume-session').click()

    // Explicit Resume lands focused Host play with durable score — no second gate.
    await expect(host.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play', {
      timeout: 20_000,
    })
    await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
    await expect(host.getByTestId('persistence-resume')).toHaveCount(0)
    await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('100')
    await expect(host.getByTestId(`tsp-team-${Q3_TEAM_ALPHA}`)).toContainText(Q3_SESSION_NAME_ALPHA)

    // Reopen Display after relaunch; public scores reconverge; private answer stays Host-only.
    const display = await openDisplayFromHostChrome(app, host)
    await expect(display.getByTestId('display-scores')).toContainText('100', { timeout: 20_000 })
    await expectDisplayPrivate(display, Q3_PRIVATE_CONTENT)
    await expect(display.getByText(/private teacher controls/i)).toHaveCount(0)
    await expect(display.getByTestId('cbh-answer')).toHaveCount(0)
    expect((await display.content()).toLowerCase()).not.toContain('q3 host-only teaching note')
  } finally {
    await app.close()
  }
})

test('Q5-D: protocol fail-closed for missing renderer resource under cqs://app', async () => {
  const userData = makeUserDataDir('cqs-q5-protocol-')
  const app = await launchDesktop(userData)
  try {
    const host = await hostWindow(app)
    const missing = await host.evaluate(async () => {
      const res = await fetch('cqs://app/assets/__q5-missing-resource__.js')
      return {
        status: res.status,
        csp: res.headers.get('content-security-policy'),
        origin: window.location.origin,
      }
    })
    expect(missing.origin).toBe('cqs://app')
    expect(missing.status).toBe(404)
    expect(missing.csp).toContain("script-src 'self'")
    expect(missing.csp).not.toContain('unsafe-eval')
    // Host remains usable after a missing-asset fetch.
    await expect(host.getByRole('heading', { name: /^home$/i })).toBeVisible()
  } finally {
    await app.close()
  }
})
