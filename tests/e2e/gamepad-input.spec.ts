import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 9–10 — controller adapter paths, end to end in a real browser.
 *
 * The no-controller path is the roadmap's baseline e2e evidence. Slice 10 adds a
 * **simulated** Sony Buzz! candidate via `page.addInitScript` patching
 * `navigator.getGamepads` before navigation. That simulation is test instrumentation
 * only — it is **NOT** physical compatibility evidence and proves nothing about
 * real Buzz! hardware on this machine.
 *
 * The production app reads `navigator.getGamepads` and nothing else. No app
 * backdoor is introduced; Playwright may manipulate the fake pads through a
 * page-local hook the application never reads.
 *
 * What a real browser genuinely adds:
 *
 *  1. the host loads with no controller and the panel says so, calmly;
 *  2. keyboard buzzing remains fully usable with the panel present;
 *  3. the projector is unchanged and shows no controller diagnostics;
 *  4. the DISPLAY route never calls `navigator.getGamepads` and registers no
 *     gamepad listener — observed by instrumenting the page, not by trusting the
 *     layering;
 *  5. the host may show the bounded Sony Buzz! setup surface; the projector must
 *     never show Sony/Buzz/candidate/profile/handset/VID/PID/diagnostic copy.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

const TEAM_ONE = 'Blue Basalts'
const TEAM_TWO = 'Red Rhyolites'

/** Labels that must never appear on the projector — even when the host has Sony setup. */
const FORBIDDEN_PROJECTOR_GAMEPAD_LABELS = [
  ...FORBIDDEN_DISPLAY_LABELS,
  'gamepad',
  'controller',
  'no controller detected',
  'button 1',
  'controller buzzing',
  'assign a button',
  'not assigned',
  'press a button',
  'connected',
  'unsupported',
  'diagnostic',
  'polling',
  'sony',
  'playstation',
  'buzz!',
  // Do NOT forbid bare "buzz" — the public timer copy says "Buzzers armed".
  'handset',
  'candidate',
  'sony buzz',
  'device identifier',
  'product id',
  'vendor',
  'profile',
  'mapping',
  'capture',
  '054c',
  '0002',
  '1000',
  'controller index',
  'button index',
  'webhid',
  'bluetooth',
  'axis',
  'axes',
  'analog',
  'vibrat',
  'haptic',
  'supported hardware',
  'red button',
  'blue button',
  'gih-',
  'sbs-',
] as const

/**
 * Install a simulated Sony Buzz! wired candidate BEFORE navigation.
 *
 * NOT physical compatibility evidence — browser-only simulation for workflow
 * coverage. The app reads only `navigator.getGamepads`.
 */
async function installSimulatedSonyBuzzCandidate(page: Page) {
  await page.addInitScript(() => {
    const state = {
      pads: [
        {
          index: 0,
          connected: true,
          mapping: 'standard',
          id: 'Vendor: 054c Product: 0002',
          buttons: Array.from({ length: 12 }, () => ({
            pressed: false,
            value: 0,
            touched: false,
          })),
          axes: [] as number[],
          timestamp: 0,
        },
      ],
    }
    ;(window as unknown as { __cqsFakeGamepads?: typeof state }).__cqsFakeGamepads = state

    const nav = navigator as Navigator & { getGamepads?: () => readonly Gamepad[] | null[] }
    nav.getGamepads = function patched() {
      state.pads[0].timestamp = performance.now()
      return state.pads as unknown as Gamepad[]
    }
  })
}

/**
 * Wait for several animation frames so the host Gamepad poll owner can observe
 * the current simulated pad state. Synchronizes on `requestAnimationFrame`
 * rather than a fixed wall-clock timeout.
 */
async function settleGamepadPolls(page: Page, frames = 8): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let remaining = count
        const tick = () => {
          remaining -= 1
          if (remaining <= 0) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    frames,
  )
}

/** Press and release one simulated gamepad button; allows rAF polls to observe edges. */
async function pressSimulatedGamepadButton(page: Page, buttonIndex: number) {
  await page.evaluate((idx) => {
    const state = (
      window as unknown as {
        __cqsFakeGamepads?: { pads: { buttons: { pressed: boolean; value: number }[] }[] }
      }
    ).__cqsFakeGamepads
    if (!state) throw new Error('fake gamepads not installed')
    state.pads[0].buttons[idx].pressed = true
    state.pads[0].buttons[idx].value = 1
  }, buttonIndex)
  await settleGamepadPolls(page)
  await page.evaluate((idx) => {
    const state = (
      window as unknown as {
        __cqsFakeGamepads?: { pads: { buttons: { pressed: boolean; value: number }[] }[] }
      }
    ).__cqsFakeGamepads
    if (!state) throw new Error('fake gamepads not installed')
    state.pads[0].buttons[idx].pressed = false
    state.pads[0].buttons[idx].value = 0
  }, buttonIndex)
  await settleGamepadPolls(page, 4)
}

/**
 * Count Gamepad API touches on a page, from before any application code runs.
 *
 * This instruments the PAGE, not the application: nothing is added to the
 * production bundle, and no global the app reads is introduced. It is the browser
 * equivalent of a spy, and it is the only way to prove "the display never polls"
 * rather than merely asserting the display has no controller markup.
 */
async function watchGamepadApi(page: Page) {
  await page.addInitScript(() => {
    const counters = { getGamepads: 0, listeners: 0 }
    ;(window as unknown as { __cqsGamepadWatch: typeof counters }).__cqsGamepadWatch = counters

    const nav = navigator as Navigator & { getGamepads?: () => unknown }
    const original = nav.getGamepads
    if (typeof original === 'function') {
      nav.getGamepads = function patched(this: Navigator) {
        counters.getGamepads += 1
        return (original as () => unknown).call(this)
      } as typeof nav.getGamepads
    }

    const add = window.addEventListener.bind(window)
    window.addEventListener = function patched(type: string, ...rest: unknown[]) {
      if (type === 'gamepadconnected' || type === 'gamepaddisconnected') counters.listeners += 1
      return (add as (...args: unknown[]) => void)(type, ...rest)
    } as typeof window.addEventListener
  })
}

async function gamepadWatch(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __cqsGamepadWatch?: { getGamepads: number; listeners: number } })
        .__cqsGamepadWatch ?? { getGamepads: -1, listeners: -1 },
  )
}

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

/** Import the built-in board sample (two teams) and open its round. */
async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

async function openClue(host: Page, tileId = 'earth-structure-100') {
  await host.getByTestId(`cbh-tile-${tileId}`).click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('lih-open')).toContainText('Open')
}

test('the host reports no controller, calmly, and keyboard buzzing still works', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await watchGamepadApi(host)
  await openHost(host)
  await startBoard(host)

  // ── 1. The panel exists and reports the truth about this machine ──────────
  await expect(host.getByTestId('gih-count')).toHaveText('None detected')
  await expect(host.getByTestId('gih-controllers')).toHaveText(
    'No controller detected. Keyboard buzzing remains available.',
  )
  // Controller buzzing is off until a teacher asks for it.
  await expect(host.getByTestId('gih-enabled')).toHaveText('Off')
  await expect(host.getByTestId('gih-outcome')).toContainText('No controller buttons pressed yet')

  // ── 2. Whatever the browser supports, the panel neither crashes nor lies ───
  const support = await host.getByTestId('gih-support').textContent()
  expect(support).toMatch(/available in this browser|not available in this browser/i)

  // ── 3. The host DOES poll — that is what makes the diagnostics live ───────
  const hostWatch = await gamepadWatch(host)
  expect(hostWatch.getGamepads).toBeGreaterThan(0)

  // ── 4. Keyboard buzzing is completely unaffected ──────────────────────────
  await openClue(host)
  await host.getByTestId('rth-arm').click()
  await host.keyboard.press('Digit1')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await host.keyboard.press('Digit2')
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${TEAM_TWO}`)
  await host.getByTestId('lih-incorrect').click()
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_TWO)

  await host.close()
})

test('the controller panel is operable from the keyboard and assigns nothing by itself', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)

  // Nothing is bound by default — there is no assumed "buzz button".
  await expect(host.getByTestId('gih-control-basalts')).toHaveText('Not assigned')
  await expect(host.getByTestId('gih-control-rhyolites')).toHaveText('Not assigned')
  // …and clearing is unavailable rather than silently doing nothing.
  await expect(host.getByTestId('gih-clear-basalts')).toBeDisabled()
  await expect(host.getByTestId('gih-clear-all')).toBeDisabled()

  // Capture can be entered and cancelled entirely from the keyboard, with no
  // controller attached and no way for it to get stuck.
  const assign = host.getByTestId('gih-capture-basalts')
  await assign.focus()
  await expect(assign).toBeFocused()
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('gih-control-basalts')).toHaveText('Press a button…')
  await expect(host.getByTestId('gih-capture-basalts')).toBeFocused()
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('gih-capture-status')).toContainText(
    'Cancelled. The assignment was left as it was.',
  )
  await expect(host.getByTestId('gih-control-basalts')).toHaveText('Not assigned')
  // Focus is exactly where the teacher left it.
  await expect(host.getByTestId('gih-capture-basalts')).toBeFocused()

  // Keyboard buzzing works while capture was open and after it closed — the two
  // adapters gate independently.
  await openClue(host)
  await host.getByTestId('rth-arm').click()
  await host.keyboard.press('Digit1')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)

  // The session-local lifetime is stated, not implied.
  await expect(host.getByTestId('gih-lifetime-note')).toContainText('lost when this page reloads')

  await host.close()
})

test('the projector shows no controller surface and never touches the Gamepad API', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await watchGamepadApi(display)
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()
  await host.keyboard.press('Digit1')
  await expect(display.getByTestId('bqd-active')).toHaveText(TEAM_ONE)
  await host.keyboard.press('Digit2')
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')

  // ── The display route registered NO gamepad listener and made NO read ─────
  const watch = await gamepadWatch(display)
  expect(watch.getGamepads).toBe(0)
  expect(watch.listeners).toBe(0)

  // ── …and shows nothing about controllers, devices or the host's panel ─────
  const html = (await display.content()).toLowerCase()
  for (const secret of FORBIDDEN_PROJECTOR_GAMEPAD_LABELS) {
    expect(html, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  // The projector is still read-only, and still shows a COUNT not a name.
  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByTestId('bqd')).not.toContainText(TEAM_TWO)

  await host.close()
  await display.close()
})

test('the host may show Sony Buzz setup; the projector must not leak setup vocabulary', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await installSimulatedSonyBuzzCandidate(host)
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // Host-private setup surface is present and honest — not a supported-hardware claim.
  await expect(host.getByTestId('sbs')).toBeVisible()
  await expect(host.getByTestId('sbs-intro')).toContainText(/candidate match is not proof/i)
  await expect(host.getByTestId('sbs-intro')).toContainText(/lost when this page reloads/i)
  await expect(host.getByTestId('sbs-keyboard-fallback')).toContainText(
    /keyboard buzzing remains available/i,
  )

  const hostHtml = (await host.content()).toLowerCase()
  expect(hostHtml).not.toContain('supported hardware')

  const displayHtml = (await display.content()).toLowerCase()
  for (const absent of FORBIDDEN_PROJECTOR_GAMEPAD_LABELS) {
    expect(displayHtml, `display must not contain "${absent}"`).not.toContain(absent.toLowerCase())
  }

  await host.close()
  await display.close()
})

test('simulated Sony Buzz candidate supports setup capture, apply, and test mode without scoring', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await watchGamepadApi(display)
  await installSimulatedSonyBuzzCandidate(host)
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()

  // Candidate diagnostics appear on the host only.
  await expect(host.getByTestId('gih-count')).not.toHaveText('None detected')
  await expect(host.getByTestId('sbs-surface-state')).toContainText(/candidate Sony Buzz/i)
  await expect(host.getByTestId('sbs-class-0')).toContainText(/Candidate Sony Buzz/i)

  // Setup is keyboard-operable.
  const capture = host.getByTestId('sbs-capture')
  await capture.focus()
  await expect(capture).toBeFocused()

  // Guided capture: five prompts with colour words, then preview and apply.
  // After each Capture click the poll loop re-primes; wait one frame so the
  // baseline is taken with buttons UP before the simulated press, otherwise the
  // held-at-baseline button never produces a rising edge.
  for (let buttonIndex = 0; buttonIndex < 5; buttonIndex += 1) {
    await host.getByTestId('sbs-capture').click()
    await expect(host.getByTestId('sbs-capture')).toHaveText('Cancel capture')
    await settleGamepadPolls(host)
    await pressSimulatedGamepadButton(host, buttonIndex)
    await expect(host.getByTestId('sbs-progress')).toContainText(`${buttonIndex + 1} of 5`, {
      timeout: 10_000,
    })
  }
  await expect(host.getByTestId('sbs-progress')).toContainText('complete')

  await host.getByTestId('sbs-preview').click()
  await expect(host.getByTestId('sbs-preview-list')).toBeVisible()
  for (const colour of ['red', 'blue', 'orange', 'green', 'yellow']) {
    await expect(host.getByTestId('sbs-preview-list')).toContainText(colour)
  }

  await host.getByTestId('sbs-apply').click()
  await expect(host.getByTestId('sbs-status')).toContainText(/Applied handset profile/i)
  await expect(host.getByTestId('gih-control-basalts')).toContainText('Controller 1 · button 1')

  // Test mode reports presses and does not change gameplay on host or display.
  // Entering test mode re-primes — wait for a baseline poll before pressing.
  await host.getByTestId('sbs-test-mode').click()
  await expect(host.getByTestId('sbs-test-outcome')).toContainText(/Test mode is on/i)
  await settleGamepadPolls(host)
  await pressSimulatedGamepadButton(host, 0)
  await expect(host.getByTestId('sbs-test-outcome')).toContainText(/Test:/i, { timeout: 10_000 })
  await expect(host.getByTestId('gih-outcome')).toContainText(/no gameplay change/i)
  // Test mode must not accept a buzz into the queue or project an active respondent.
  await expect(host.getByTestId('lih-active')).toContainText(/Nobody has buzzed yet/i)
  await expect(display.getByTestId('bqd-active')).toHaveCount(0)
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')

  const displayWatch = await gamepadWatch(display)
  expect(displayWatch.getGamepads).toBe(0)
  expect(displayWatch.listeners).toBe(0)

  const displayHtml = (await display.content()).toLowerCase()
  for (const absent of FORBIDDEN_PROJECTOR_GAMEPAD_LABELS) {
    expect(displayHtml, `display must not contain "${absent}"`).not.toContain(absent.toLowerCase())
  }

  await host.close()
  await display.close()
})

test('Controllers empty state and supported-profile host surface (Slice 21)', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /initialize sample game/i }).click()
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('gih-empty-teams')).toBeVisible()
  await expect(host.getByTestId('gih-empty-teams-message')).toContainText(/Game Import/i)

  await startBoard(host)
  await expect(host.getByTestId('sbs-supported-profile')).toBeVisible()
  await expect(host.getByTestId('sbs-connect')).toBeVisible()
  await expect(host.getByTestId('sbs-slot-1')).toBeVisible()
  await expect(host.getByTestId('sbs-keyboard-fallback')).toContainText(
    /Keyboard buzzing remains available/i,
  )

  const displayHtml = (await display.content()).toLowerCase()
  for (const absent of ['sony buzz', '054c', '1000', 'webhid', 'sbs-supported-profile']) {
    expect(displayHtml, `display must not contain "${absent}"`).not.toContain(absent)
  }

  await host.close()
  await display.close()
})
