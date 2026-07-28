import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 8 — local input contract and keyboard buzz-in, end to end in a real
 * browser.
 *
 * A host tab and a projector tab in the same browser, synchronized over a real
 * BroadcastChannel. A teacher configures buzz keys, opens a clue, arms it, and
 * real key presses run the queue — while the projector shows exactly the right
 * sanitized state and never a key, a mapping or a waiting-team order.
 *
 * Timing note: nothing here waits for real seconds. Every step is driven by a
 * host action or a key press, and the exhaustive permutations live in the unit
 * tests where a manual clock makes them exact.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

/** Private content that lives in the built-in sample and must never be projected. */
const PRIVATE_SAMPLE_CONTENT = [
  'Students often say',
  'Accept "the Moho"',
  'Double-value tile',
  'Mantle convection',
]

/** The built-in sample's two teams, in authored order. */
const TEAM_ONE = 'Blue Basalts'
const TEAM_TWO = 'Red Rhyolites'

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

/** Open a clue through to the prompt reveal — the one legal response window. */
async function openClue(host: Page, tileId = 'earth-structure-100') {
  await host.getByTestId(`cbh-tile-${tileId}`).click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('lih-open')).toContainText('Open')
}

/**
 * Press a buzz key the way a team does — on whatever currently has focus.
 *
 * Deliberately NOT focused on anything first: a real classroom press lands while
 * the teacher's focus is wherever their last click left it, usually on a host
 * button, and buzzing has to work there.
 */
async function buzz(host: Page, code: string) {
  await host.keyboard.press(code)
}

/** Move focus out of a text field, the way a teacher does by clicking away. */
async function leaveTextField(host: Page) {
  await host.locator('#lih-title').click()
}

test('the full buzz-in flow: configure, arm, buzz, promote — mirrored on the projector', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // ── 1. Buzz keys are configured and visible before anything is played ──────
  await expect(host.getByTestId('lih-enabled')).toHaveText('On')
  await expect(host.getByTestId('lih-key-basalts')).toHaveText('1')
  await expect(host.getByTestId('lih-key-rhyolites')).toHaveText('2')

  // ── 2. A clue is opened and the response phase is manually armed ───────────
  await openClue(host)
  await expect(host.getByTestId('lih-armed')).toContainText('Not armed')

  // A press while DISARMED does nothing at all, and says so.
  await buzz(host, 'Digit1')
  await expect(host.getByTestId('lih-active')).toContainText('Nobody has buzzed yet')
  await expect(host.getByTestId('lih-outcome')).toContainText('not armed')

  await host.getByTestId('rth-arm').click()
  await expect(host.getByTestId('lih-armed')).toContainText('Armed')

  // ── 3. A timer is started, so the first buzz has a clock to interrupt ──────
  await host.getByTestId('rth-duration').selectOption('120')
  await host.getByTestId('rth-start').click()
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')

  // ── 4. The first team key buzzes and becomes ACTIVE ────────────────────────
  await buzz(host, 'Digit1')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await expect(display.getByTestId('bqd-active')).toHaveText(TEAM_ONE)
  await expect(display.getByTestId('bqd')).toHaveAttribute('data-status', 'active')

  // ── 5. The timer was interrupted through the Slice 7 seam ─────────────────
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'interrupted')
  await expect(display.getByTestId('rtd-status')).toHaveText('Stopped')
  // …and the projector is told "stopped", never WHY.
  expect((await display.content()).toLowerCase()).not.toContain('team-buzz')

  // ── 6. A second team buzzes and joins the queue in order ───────────────────
  await buzz(host, 'Digit2')
  await expect(host.getByTestId('lih-waiting')).toContainText(`1. ${TEAM_TWO}`)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')
  // The projector shows a COUNT, never the waiting team's name.
  await expect(display.getByTestId('bqd')).not.toContainText(TEAM_TWO)

  // ── 7. Repeated presses do not duplicate a queue entry ─────────────────────
  await buzz(host, 'Digit1')
  await buzz(host, 'Digit2')
  await expect(host.getByTestId('lih-outcome')).toContainText('already buzzed')
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${TEAM_TWO}`)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')

  // ── 8. Marking the active response incorrect promotes the next team ───────
  await host.getByTestId('lih-incorrect').click()
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_TWO)
  await expect(host.getByTestId('lih-waiting')).toHaveText('Empty')
  await expect(display.getByTestId('bqd-active')).toHaveText(TEAM_TWO)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('No teams waiting')
  // Marking incorrect moved no points.
  await expect(display.getByTestId('display-scores')).toContainText('0')

  // ── 9. A host pass promotes the following team; here the queue runs out ────
  await host.getByTestId('lih-pass').click()
  await expect(host.getByTestId('lih-active')).toContainText('every team that buzzed has had a turn')

  // ── 10. Queue exhaustion is represented on both surfaces ──────────────────
  await expect(display.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
  await expect(display.getByTestId('bqd-active')).toHaveText('No one left to answer')
  // Both queue actions are now unavailable rather than silently doing nothing.
  await expect(host.getByTestId('lih-incorrect')).toBeDisabled()
  await expect(host.getByTestId('lih-pass')).toBeDisabled()

  // A team that already had its turn cannot buzz again for this clue.
  await buzz(host, 'Digit1')
  await expect(host.getByTestId('lih-outcome')).toContainText('already buzzed')

  // ── 11. Scoring is unrestricted and independent (OG-6 stays deferred) ─────
  // `basalts` had its turn and was marked incorrect; the ordinary score controls
  // are still available for it and for every other team.
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect(display.getByTestId('display-scores')).toContainText('100')
  // Scoring did not touch the queue.
  await expect(display.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')

  await host.close()
  await display.close()
})

test('the queue closes with the clue, and a stale key press cannot reach the next one', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)

  await host.getByTestId('rth-arm').click()
  await buzz(host, 'Digit1')
  await expect(display.getByTestId('bqd-active')).toHaveText(TEAM_ONE)

  // Revealing the answer ends the response opportunity: the queue closes with it.
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('bqd')).toHaveCount(0)
  await expect(display.getByTestId('display-response')).toHaveCount(0)

  // A press while the answer is public does nothing.
  await buzz(host, 'Digit2')
  await expect(host.getByTestId('lih-outcome')).toContainText('no open clue')

  // The NEXT clue starts with an empty queue — nothing survived.
  await host.getByTestId('cbh-return').click()
  await openClue(host, 'earth-structure-200')
  await expect(host.getByTestId('lih-active')).toContainText('Nobody has buzzed yet')
  await expect(display.getByTestId('bqd')).toHaveCount(0)

  // …and the team that buzzed on the previous clue may buzz on this one.
  await host.getByTestId('rth-arm').click()
  await buzz(host, 'Digit1')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)

  await host.close()
  await display.close()
})

test('typing never buzzes, and undo restores the prior active team and order', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await openClue(host)
  await host.getByTestId('rth-arm').click()

  // ── Typing in the import textarea must never buzz ─────────────────────────
  const editor = host.getByTestId('import-json')
  await editor.click()
  await editor.press('Digit1')
  await editor.press('Digit2')
  await expect(host.getByTestId('lih-active')).toContainText('Nobody has buzzed yet')
  await expect(host.getByTestId('lih-outcome')).toContainText('while you are typing')

  // ── Real presses build a queue, once the teacher clicks away from the field ─
  await leaveTextField(host)
  await buzz(host, 'Digit1')
  await buzz(host, 'Digit2')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${TEAM_TWO}`)

  // ── Undo restores the prior queue exactly ─────────────────────────────────
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(host.getByTestId('lih-waiting')).toHaveText('Empty')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await expect(display.getByTestId('bqd-waiting')).toHaveText('No teams waiting')

  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(host.getByTestId('lih-active')).toContainText('Nobody has buzzed yet')
  await expect(display.getByTestId('bqd')).toHaveCount(0)

  // ── A promotion undoes back to the prior active team ──────────────────────
  await buzz(host, 'Digit1')
  await buzz(host, 'Digit2')
  await host.getByTestId('lih-pass').click()
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_TWO)
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${TEAM_TWO}`)

  await host.close()
  await display.close()
})

test('buzz keys survive a refresh, and the projector receives only sanitized state', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // ── Reassign a buzz key through the capture flow ──────────────────────────
  await host.getByTestId('lih-capture-basalts').click()
  await expect(host.getByTestId('lih-key-basalts')).toHaveText('Press a key…')
  // Capture suspends game buzzing, so this press ASSIGNS and does not buzz.
  await buzz(host, 'KeyQ')
  await expect(host.getByTestId('lih-key-basalts')).toHaveText('Q')
  await expect(host.getByTestId('lih-capture-status')).toContainText('Buzz key set to Q')

  // A conflicting key is refused and nothing is overwritten.
  await host.getByTestId('lih-capture-rhyolites').click()
  await buzz(host, 'KeyQ')
  await expect(host.getByTestId('lih-capture-status')).toContainText('already assigned')
  await buzz(host, 'Escape')
  await expect(host.getByTestId('lih-key-basalts')).toHaveText('Q')
  await expect(host.getByTestId('lih-key-rhyolites')).toHaveText('2')

  // ── The mapping survives a refresh; the in-memory game does not ───────────
  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await startBoard(host)
  await expect(host.getByTestId('lih-key-basalts')).toHaveText('Q')
  await expect(host.getByTestId('lih-storage-note')).toContainText('restored from this device')

  // The restored key really does buzz.
  await openClue(host)
  await host.getByTestId('rth-arm').click()
  await buzz(host, 'KeyQ')
  await expect(host.getByTestId('lih-active')).toHaveText(TEAM_ONE)
  await buzz(host, 'Digit2')
  await expect(host.getByTestId('lih-waiting')).toHaveText(`1. ${TEAM_TWO}`)

  // ── The projector receives ONLY sanitized state ───────────────────────────
  const displayHtml = (await display.content()).toLowerCase()
  for (const secret of [
    ...FORBIDDEN_DISPLAY_LABELS,
    ...PRIVATE_SAMPLE_CONTENT,
    // Slice 8 additions: no key, no mapping, no adapter, no host queue control.
    'buzz key',
    'keyq',
    'digit1',
    'digit2',
    'keyboard buzzing',
    'mapping',
    'binding',
    'primary-buzz',
    'secondary',
    'mark incorrect',
    'pass and advance',
    'reset buzz keys',
    'team-buzz',
    'basalts"',
    'rhyolites"',
  ]) {
    expect(displayHtml, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  // The waiting team is counted, not named.
  await expect(display.getByTestId('bqd-waiting')).toHaveText('1 team waiting')
  await expect(display.getByTestId('bqd')).not.toContainText(TEAM_TWO)
  // The answer is still not public.
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  // And the projector is still read-only.
  await expect(display.getByRole('button')).toHaveCount(0)

  // ── No WebHID / Bluetooth on either surface; Sony setup is host-only ──────
  //
  // Slice 9 added a GENERIC controller panel; Slice 10 added a host-private Sony
  // Buzz! setup section. The host may therefore contain "sony"/"handset". The
  // DISPLAY must still show none of that vocabulary, and neither surface may
  // offer WebHID or Bluetooth.
  const hostHtml = (await host.content()).toLowerCase()
  for (const absent of ['webhid', 'bluetooth', 'playstation']) {
    expect(hostHtml, `host must not contain "${absent}"`).not.toContain(absent)
  }
  for (const absent of [
    'webhid',
    'sony',
    'playstation',
    'bluetooth',
    'handset',
    'gamepad',
    'controller',
    'button index',
    'no controller detected',
    'candidate',
    '054c',
  ]) {
    expect(displayHtml, `display must not contain "${absent}"`).not.toContain(absent)
  }
  for (const page of [host, display]) {
    const hid = await page.evaluate(() =>
      (navigator as { hid?: unknown }).hid === undefined ? 'absent' : 'present-unused',
    )
    expect(['absent', 'present-unused']).toContain(hid)
  }

  await host.close()
  await display.close()
})
