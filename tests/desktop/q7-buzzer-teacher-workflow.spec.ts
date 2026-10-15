/**
 * Q7 Desktop/Electron ordinary teacher buzzer workflow (platform-boundary sim).
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-SIMULATION-REPAIR-QUALIFICATION-1
 *
 * Injects navigator.hid / getGamepads via Playwright page.addInitScript + reload
 * before the journey. No production preload (desktop/security forbids preload).
 * Simulation is NOT physical Sony evidence.
 */

import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'
import { waitForSessionSaved } from '../e2e/helpers/menusSession'
import { armAndStartTimer } from '../e2e/helpers/menusQ3'
import {
  installWbuzzHardwareSimulator,
  exposeSimulatedWbuzzGamepad,
  pressWbuzzButton,
  getHidSimSnapshot,
} from '../e2e/helpers/simulatedWbuzzHardware'
import {
  openOptionalBuzzers,
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  runFourHandsetRedCheck,
  namesReadyStartGame,
  startRound1Ordinary,
  backToSetupOrdinary,
} from '../e2e/helpers/q7BuzzerTeacherJourney'
import {
  hostWindow,
  launchDesktop,
  makeUserDataDir,
  resolveExactHeadSha,
} from './helpers/desktopLaunch'
import { DESKTOP_WEB_PREFERENCES, assertSecureWebPreferences } from '../../desktop/security'

test.describe.configure({ mode: 'serial' })

async function prepareSimOnDesktopHome(host: Page): Promise<void> {
  await host.addInitScript(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  })
  await installWbuzzHardwareSimulator(host, 'ready')
  await host.setViewportSize({ width: 1280, height: 720 })
  await host.reload()
  await expect(host.getByRole('heading', { name: /^home$/i })).toBeVisible({ timeout: 30_000 })
  await host.setViewportSize({ width: 1280, height: 720 })
}

async function importDemoPlayOnDesktop(host: Page): Promise<void> {
  await host.getByTestId('home-import-game').click()
  await host.getByTestId('home-import-demo').click()
  await expect(host.getByTestId('import-quality-report')).toBeVisible()
  await host.getByRole('button', { name: /^play$/i }).first().click()
  await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
}

test('production webPreferences still forbid preload (simulator absence)', () => {
  expect(assertSecureWebPreferences(DESKTOP_WEB_PREFERENCES)).toEqual([])
  expect(DESKTOP_WEB_PREFERENCES.preload).toBeUndefined()
})

test('Q7 desktop: Home→Resume→Show→Connect→check→play buzz→Back→quit/relaunch Resume', async () => {
  test.slow()
  const userData = makeUserDataDir('cqs-q7-buzzer-')
  const expectedSha = resolveExactHeadSha()
  let app: ElectronApplication | undefined
  try {
    app = await launchDesktop(userData)
    let host = await hostWindow(app)
    await prepareSimOnDesktopHome(host)

    const identity = await host.evaluate(async () => {
      const res = await fetch('cqs://app/desktop-build-identity.json')
      return (await res.json()) as { sourceSha: string }
    })
    expect(identity.sourceSha).toBe(expectedSha)

    await importDemoPlayOnDesktop(host)
    await waitForSessionSaved(host)
    await host.getByRole('link', { name: /back to home/i }).click()
    await expect(host.getByRole('heading', { name: /^home$/i })).toBeVisible()
    await host.getByRole('button', { name: /resume class/i }).click()
    await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })

    if (await host.getByTestId('host-more').getAttribute('open') !== null) {
      await host.locator('summary.foundation__more-summary').click()
    }

    await openOptionalBuzzers(host)
    await clickShowBuzzerSetup(host)
    await connectSimulatedReceiver(host)
    expect((await getHidSimSnapshot(host)).sendCalls[0]?.bytes.length).toBe(7)
    await exposeSimulatedWbuzzGamepad(host)
    await runFourHandsetRedCheck(host)
    await namesReadyStartGame(host)
    await startRound1Ordinary(host)

    const tile = host.locator('[data-testid^="cbh-tile-"]').first()
    await tile.click()
    if (await host.getByTestId('cbh-reveal-prompt').isVisible().catch(() => false)) {
      await host.getByTestId('cbh-reveal-prompt').click()
    }
    await armAndStartTimer(host)
    await pressWbuzzButton(host, buttonIndexForSlotColor(1, 'red'))
    await expect(host.getByTestId('lih-active')).toContainText(/Team 1/i, { timeout: 10_000 })
    await host.getByTestId('lih-correct').click()

    await backToSetupOrdinary(host)
    await openOptionalBuzzers(host)
    await clickShowBuzzerSetup(host)
    await pressWbuzzButton(host, buttonIndexForSlotColor(2, 'red'))
    await expect(host.getByTestId('sbs-test-outcome')).toContainText(/Buzzer Check:/i, {
      timeout: 10_000,
    })

    await waitForSessionSaved(host)
    await app.close()
    app = undefined

    app = await launchDesktop(userData)
    host = await hostWindow(app)
    await prepareSimOnDesktopHome(host)
    await expect(host.getByRole('button', { name: /resume class/i })).toBeVisible()
    await host.getByRole('button', { name: /resume class/i }).click()
    await expect(host.getByTestId('classroom-setup').or(host.getByTestId('host-gameplay'))).toBeVisible({
      timeout: 20_000,
    })
  } finally {
    if (app) await app.close()
  }
})
