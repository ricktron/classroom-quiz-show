import { test, expect, type Page } from '@playwright/test'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import {
  installWbuzzHardwareSimulator,
  exposeSimulatedWbuzzGamepad,
  hideSimulatedWbuzzGamepad,
  disconnectSimulatedReceiver,
  pressWbuzzButton,
  setHidSimMode,
  getHidSimSnapshot,
} from './helpers/simulatedWbuzzHardware'
import {
  openOptionalBuzzers,
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
  runFourHandsetRedCheck,
  startRound1Ordinary,
  backToSetupOrdinary,
} from './helpers/q7BuzzerTeacherJourney'
import { armAndStartTimer } from './helpers/menusQ3'
import { settleGamepadPolls } from './helpers/simulatedGamepad'

/**
 * Q7-R1 certification blockers (PR #143 independent review HOLD).
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-REPAIR-R1-CERTIFICATION-BLOCKERS-1
 *
 * Natural route only: Home → demo import → Class Setup → visible controls.
 * Hardware is simulated at navigator.hid / getGamepads only. Not physical evidence.
 * Testids are used for state assertions; navigation uses roles and names.
 */


const SESSION_NAMES = ['Otters', 'Falcons'] as const

async function typeSessionNames(page: Page): Promise<void> {
  const inputs = page.getByLabel('Type a name')
  if ((await inputs.count()) === 0 || !(await inputs.first().isVisible())) {
    await page.getByTestId('readiness-names').click()
  }
  await expect(inputs.first()).toBeVisible()
  const count = await inputs.count()
  for (let i = 0; i < count; i += 1) {
    await inputs.nth(i).fill(SESSION_NAMES[i] ?? `Crew ${i + 1}`)
    await inputs.nth(i).press('Enter')
  }
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
}

/**
 * Stability window for "must not regress" assertions: the PR #143 regression
 * landed ~1 s after Leave Buzzer Check, after several Gamepad polls.
 */
async function holdStill(page: Page): Promise<void> {
  await settleGamepadPolls(page, 30)
  await page.waitForTimeout(1_500)
}

async function startGame(page: Page): Promise<void> {
  await page.getByRole('button', { name: /start game/i }).click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
}

/** Home → demo → Names → Show buzzer setup → Connect → Wbuzz pad present. */
async function setupConnected(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await typeSessionNames(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeSimulatedWbuzzGamepad(page)
}

async function openClueAndArm(page: Page): Promise<void> {
  await page.locator('[data-testid^="cbh-tile-"]').first().click()
  await expect(page.getByTestId('cbh-prompt')).toBeVisible()
  const reveal = page.getByRole('button', { name: /show prompt/i })
  if (await reveal.isVisible().catch(() => false)) await reveal.click()
  await armAndStartTimer(page)
}

async function controllerBuzzing(page: Page) {
  const disclosure = page.getByTestId('gih-advanced-generic')
  if ((await disclosure.getAttribute('open')) === null) {
    await page.getByText('Controller assignments', { exact: true }).click()
  }
  return page.getByTestId('gih-enabled')
}

test('R1-1: connected Wbuzz auto-enables once; explicit teacher Off survives Back→Start and pad reconnect', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  await startGame(page)
  await expect(await controllerBuzzing(page)).toHaveText('On')

  await page.getByRole('button', { name: 'Turn controller buzzing off' }).click()
  await expect(page.getByTestId('gih-enabled')).toHaveText('Off')

  await backToSetupOrdinary(page)
  await startGame(page)
  await holdStill(page)
  await expect(await controllerBuzzing(page)).toHaveText('Off')

  await hideSimulatedWbuzzGamepad(page)
  await exposeSimulatedWbuzzGamepad(page)
  await holdStill(page)
  await expect(page.getByTestId('gih-enabled')).toHaveText('Off')

  // Explicit Off is honoured by gameplay: a red press does not claim.
  await startRound1Ordinary(page)
  await openClueAndArm(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('lih-active')).not.toContainText(SESSION_NAMES[0])
})

test('R1-2: stale responding — pad gone after Start is not "responding" on Back→Check', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  await runFourHandsetRedCheck(page, SESSION_NAMES)
  await startGame(page)
  await hideSimulatedWbuzzGamepad(page)
  await backToSetupOrdinary(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await expect(page.getByTestId('sbs-controller-layer')).toHaveText('Waiting for buzzer presses')
  await expect(page.getByTestId('sbs-test-outcome')).not.toContainText(/Buzzer Check:/)
  await expect(page.getByTestId('sbs-teacher-summary')).not.toContainText(/responding|ready/i)
})

test('R1-2b: pad disappears during Buzzer Check — responding clears without leaving Check', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  await runFourHandsetRedCheck(page, SESSION_NAMES)
  await hideSimulatedWbuzzGamepad(page)
  await expect(page.getByTestId('sbs-controller-layer')).toHaveText('Waiting for buzzer presses')
})

test('R1-3: Leave Buzzer Check keeps real responding evidence', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  await runFourHandsetRedCheck(page, SESSION_NAMES)
  await expect(page.getByTestId('sbs-controller-layer')).toHaveText('4 buzzers responding')
  await page.getByRole('button', { name: 'Leave Buzzer Check' }).click()
  await expect(page.getByRole('button', { name: 'Check buzzers' }).last()).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await holdStill(page)
  await expect(page.getByTestId('sbs-controller-layer')).toHaveText('4 buzzers responding')
  await expect(page.getByTestId('sbs-teacher-summary')).toContainText(/Buzzers responding|Buzzers ready/)
})

test('R1-4: Class Setup reveal status follows Connect and Leave Buzzer Check', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  const status = page.getByTestId('setup-buzzer-reveal-status')
  await expect(status).toContainText(/Next: use Connect buzzers/)

  await connectSimulatedReceiver(page)
  await expect(status).not.toContainText(/Connect buzzers/)
  await expect(status).toContainText(/press RED on each/i)

  await page.getByRole('button', { name: 'Leave Buzzer Check' }).click()
  await expect(page.getByText(/Buzzer Check is on/)).toHaveCount(0)
  await expect(page.getByTestId('setup-reveal-buzzers')).toHaveAttribute('aria-pressed', 'false')
})

test('R1-5: Buzzers panel during live gameplay reflects presses that produce claims', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  // No Buzzer Check presses in setup: evidence must come from gameplay.
  await startGame(page)
  await startRound1Ordinary(page)
  await openClueAndArm(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('lih-active')).toContainText(SESSION_NAMES[0], { timeout: 10_000 })
  await holdStill(page)
  await expect(page.getByTestId('sbs-controller-layer')).toHaveText('1 buzzer responding')
  await expect(page.getByTestId('sbs-teacher-summary')).not.toContainText(/waiting for buzzers/i)
})

test('R1-6: "Which buzzer is which team" options use the Session team names', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await setupConnected(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  const slot1 = page.getByLabel('Buzzer 1', { exact: true })
  await expect(slot1).toBeVisible()
  await expect(slot1.locator('option')).toContainText([
    'Unassigned',
    SESSION_NAMES[0],
    SESSION_NAMES[1],
  ])

  await startGame(page)
  const playSlot1 = page.getByLabel('Buzzer 1', { exact: true })
  await expect(playSlot1.locator('option')).toContainText([
    'Unassigned',
    SESSION_NAMES[0],
    SESSION_NAMES[1],
  ])
})

test('R1-9a: first output failure shows Failed teacher copy, not Connecting', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, 'send-fail')
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toHaveText('Failed to reconnect', {
    timeout: 8_000,
  })
  await expect(page.getByTestId('sbs-teacher-summary')).toHaveText(
    'Receiver not connected — keyboard still works.',
  )
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeEnabled()
})

test('R1-9b: reconnect whose first output fails is not reported Connected', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, 'ready')
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await disconnectSimulatedReceiver(page)
  await expect(page.getByTestId('sbs-receiver-layer')).toHaveText('Disconnected')
  await setHidSimMode(page, 'send-fail')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toHaveText('Failed to reconnect', {
    timeout: 8_000,
  })
})

test('R1-sim: the Wbuzz simulator rejects a wrong filter and a wrong output report', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'buzzer journeys on projector-720p')
  await installWbuzzHardwareSimulator(page, 'ready')
  await page.goto('./')
  const result = await page.evaluate(async () => {
    const hid = (navigator as unknown as {
      hid: {
        requestDevice(o: { filters: { vendorId?: number; productId?: number }[] }): Promise<
          { open(): Promise<void>; sendReport(id: number, data: BufferSource): Promise<void> }[]
        >
      }
    }).hid
    const wrongFilter = await hid.requestDevice({ filters: [{ vendorId: 0x054c }] })
    const [device] = await hid.requestDevice({ filters: [{ vendorId: 0x054c, productId: 0x1000 }] })
    await device!.open()
    const errors: string[] = []
    for (const [id, len] of [
      [1, 7],
      [0, 8],
      [0, 7],
    ] as const) {
      try {
        await device!.sendReport(id, new Uint8Array(len))
      } catch (error) {
        errors.push(String((error as Error).message))
      }
    }
    return { wrongFilterCount: wrongFilter.length, errors }
  })
  expect(result.wrongFilterCount).toBe(0)
  expect(result.errors).toHaveLength(2)
  const snap = await getHidSimSnapshot(page)
  expect(snap.violations).toHaveLength(3)
  expect(snap.sendCalls).toEqual([{ reportId: 0, bytes: [0, 0, 0, 0, 0, 0, 0] }])
})
