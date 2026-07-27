import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 9 — the generic controller adapter's NO-CONTROLLER path, end to end in a
 * real browser.
 *
 * The roadmap's named e2e evidence for this slice is "the no-controller fallback
 * path", and that is deliberately all this file covers. There is no physical
 * controller in CI or in this sandbox, and **no fake production global or
 * test-only backdoor is introduced to pretend there is one** — every physical
 * behaviour (rising edges, held buttons, connect/disconnect, multi-edge order)
 * is proved deterministically in `src/input/gamepadAdapter.test.ts`,
 * `src/host/useGamepadBuzzInput.test.tsx` and their siblings, against a fake
 * source. Simulating hardware here would prove less and cost more.
 *
 * What a real browser genuinely adds, and what this file therefore asserts:
 *
 *  1. the host loads with no controller and the panel says so, calmly;
 *  2. keyboard buzzing remains fully usable with the panel present;
 *  3. the projector is unchanged and shows no controller diagnostics;
 *  4. the DISPLAY route never calls `navigator.getGamepads` and registers no
 *     gamepad listener — observed by instrumenting the page, not by trusting the
 *     layering;
 *  5. no Sony, vendor, WebHID or Bluetooth surface exists anywhere.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

const TEAM_ONE = 'Blue Basalts'
const TEAM_TWO = 'Red Rhyolites'

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
  for (const secret of [
    ...FORBIDDEN_DISPLAY_LABELS,
    // Slice 9 additions: no device availability, count, label, button, mapping,
    // capture state, adapter error or source kind reaches the projector.
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
  ]) {
    expect(html, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  // The projector is still read-only, and still shows a COUNT not a name.
  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByTestId('bqd')).not.toContainText(TEAM_TWO)

  await host.close()
  await display.close()
})

test('no Sony, vendor, WebHID or Bluetooth surface exists on either screen', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  for (const [label, page] of [
    ['host', host],
    ['display', display],
  ] as const) {
    const html = (await page.content()).toLowerCase()
    for (const absent of [
      'sony',
      'playstation',
      'buzz!',
      'handset',
      'vendor',
      'product id',
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
    ]) {
      expect(html, `${label} must not contain "${absent}"`).not.toContain(absent)
    }
  }

  await host.close()
  await display.close()
})
