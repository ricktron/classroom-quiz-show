import { test, expect } from '@playwright/test'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'
import {
  installWbuzzHardwareSimulator,
  pressWbuzzButton,
  getHidSimSnapshot,
  exposeSimulatedWbuzzGamepad,
} from './helpers/simulatedWbuzzHardware'
import {
  createUnfinishedThenHomeResume,
  openOptionalBuzzers,
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  waitForKeepAliveContinuation,
  exposeGamepadAndExpectBuzzersStatus,
  runFourHandsetRedCheck,
  namesReadyStartGame,
  startRound1Ordinary,
  backToSetupOrdinary,
} from './helpers/q7BuzzerTeacherJourney'
import { waitForSessionSaved } from './helpers/menusSession'
import { armAndStartTimer } from './helpers/menusQ3'

/**
 * Q7 black-box ordinary teacher Sony/Wbuzz golden path.
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-SIMULATION-REPAIR-QUALIFICATION-1
 *
 * Starts at Home. Navigates with visible/accessibility controls.
 * Hardware is simulated only at navigator.hid / getGamepads.
 * Not physical Sony evidence. Not Q7-F02 physical root cause.
 */

test.describe.configure({ mode: 'serial' })

test('Q7 golden path: Home Resume → Show → Connect → 4× check → play buzz → Back → reload Resume', async ({
  page,
}, info) => {
  test.slow()
  test.skip(info.project.name !== 'projector-720p', 'golden path on projector-720p (1280×720)')

  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, 'ready')

  // A. HOME / RESUME — unfinished session created through ordinary UI first.
  await createUnfinishedThenHomeResume(page)
  // Ordinary buzzer path must not require Advanced diagnostics.
  if (await page.getByTestId('host-more').getAttribute('open') !== null) {
    await page.locator('summary.foundation__more-summary').click()
  }
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('host-advanced')).toBeHidden()

  // B. CLASS SETUP / SHOW BUZZER SETUP
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeVisible()

  // C. WEBHID CONNECT
  await connectSimulatedReceiver(page)
  await waitForKeepAliveContinuation(page)
  const afterKeepAlive = await getHidSimSnapshot(page)
  expect(afterKeepAlive.sendCalls.length).toBeGreaterThanOrEqual(2)
  expect(afterKeepAlive.sendCalls.every((c) => c.reportId === 0 && c.bytes.length === 7)).toBe(
    true,
  )

  // D. GAMEPAD EXPOSURE
  await exposeGamepadAndExpectBuzzersStatus(page)
  await expect(page.getByTestId('gih')).toHaveCount(1)

  // E. FOUR-HANDSET BUZZER CHECK
  await runFourHandsetRedCheck(page)

  // F–G. NAMES / START GAME
  await namesReadyStartGame(page)
  await expect(page.getByTestId('gih')).toHaveCount(1)

  // H. START ROUND
  await startRound1Ordinary(page)

  // Open a clue + arm for buzz acceptance (ordinary Host controls).
  const tile = page.locator('[data-testid^="cbh-tile-"]').first()
  await tile.click()
  await expect(page.getByTestId('cbh-prompt')).toBeVisible()
  if (await page.getByTestId('cbh-reveal-prompt').isVisible().catch(() => false)) {
    await page.getByTestId('cbh-reveal-prompt').click()
  }
  await armAndStartTimer(page)
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')

  // I. GAMEPLAY WBUZZ RED + LOCKOUT + ADJUDICATION
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText(/Team 1/i, { timeout: 10_000 })
  await expect(page.getByTestId('lih-active')).not.toContainText(/Nobody has buzzed/i)
  const claimText = await page.getByTestId('lih-active').innerText()

  await pressWbuzzButton(page, buttonIndexForSlotColor(2, 'red'))
  await expect(page.getByTestId('lih-active')).toHaveText(claimText)
  await expect(page.getByTestId('lih-correct')).toBeEnabled()

  await page.getByTestId('lih-correct').click()
  await expect(page.getByTestId('lih-board-outcome')).toContainText(/Correct/i)

  // J. BACK TO SETUP + buzzer check still usable
  await backToSetupOrdinary(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(3, 'red'))
  await expect(page.getByTestId('sbs-test-outcome')).toContainText(/Buzzer Check:/i, {
    timeout: 10_000,
  })

  // K. PERSISTENCE / RELOAD / RESUME
  await waitForSessionSaved(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  // Host reload recovery OR Home — prefer Resume when shown.
  const hostResume = page.getByTestId('persistence-resume')
  const homeResume = page.getByTestId('home-resume-session')
  if (await hostResume.isVisible().catch(() => false)) {
    await hostResume.click()
  } else if (await homeResume.isVisible().catch(() => false)) {
    await homeResume.click()
  } else {
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page.getByRole('button', { name: /resume class/i })).toBeVisible()
    await page.getByRole('button', { name: /resume class/i }).click()
  }
  await expect(page.getByTestId('classroom-setup').or(page.getByTestId('host-gameplay'))).toBeVisible({
    timeout: 20_000,
  })

  // Post-resume: if setup, buzzer path remains usable (Connect may be required again).
  if (await page.getByTestId('classroom-setup').isVisible().catch(() => false)) {
    await openOptionalBuzzers(page)
    await clickShowBuzzerSetup(page)
    const connect = page.getByRole('button', { name: 'Connect buzzers' })
    if (await connect.isVisible().catch(() => false)) {
      await connect.click()
      await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, {
        timeout: 10_000,
      })
    }
    // Reload cleared in-page Gamepad exposure; re-expose at platform boundary.
    await exposeSimulatedWbuzzGamepad(page)
    await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
    await expect(page.getByTestId('sbs-test-outcome')).toContainText(/Buzzer Check:/i, {
      timeout: 10_000,
    })
  }
})

test('Q7 mapping contract: all 20 buttons / 4×5 slot colors are deterministic', async () => {
  const colors = ['red', 'yellow', 'green', 'orange', 'blue'] as const
  const seen = new Set<number>()
  for (const slot of [1, 2, 3, 4] as const) {
    for (const color of colors) {
      const idx = buttonIndexForSlotColor(slot, color)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(20)
      expect(seen.has(idx), `duplicate index ${idx}`).toBe(false)
      seen.add(idx)
    }
  }
  expect(seen.size).toBe(20)
})
