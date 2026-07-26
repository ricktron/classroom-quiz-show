import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 6 — teams and scoring, end to end in a real browser.
 *
 * A host tab and a projector tab in the same browser, synchronized over a real
 * BroadcastChannel. The host imports the built-in sample (which now configures
 * two teams), plays tiles, awards and deducts points, corrects a mistake, and
 * undoes a score — and the projector must show exactly the right totals at every
 * step while never showing a single host-only control.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

/** Private content that lives in the built-in sample and must never be projected. */
const PRIVATE_SAMPLE_CONTENT = [
  'Students often say',
  'Accept "the Moho"',
  'Double-value tile',
  'Upper mantle',
  'Mantle convection',
]

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

/** Import the built-in board sample (two teams) and advance to its board round. */
async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await expect(host.getByTestId('tsp-scoreboard')).toBeVisible()
}

/** Open a tile through to the answer reveal. */
async function playTile(host: Page, tileId: string) {
  await host.getByTestId(`cbh-tile-${tileId}`).click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
}

async function expectNoPrivateContent(display: Page) {
  const body = (await display.locator('body').innerText()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(body, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  for (const secret of PRIVATE_SAMPLE_CONTENT) {
    expect(body, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  // The whole DOM, not just visible text — nothing is merely hidden by CSS.
  const html = (await display.content()).toLowerCase()
  for (const secret of [...PRIVATE_SAMPLE_CONTENT, 'full-credit', 'manual-correction', 'team_score_adjusted']) {
    expect(html, `DOM must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
}

test('the full teacher flow: award, return, deduct, undo — mirrored on the projector', async ({
  context,
}) => {
  // Sixteen host actions, each round-tripping to a second tab over a real
  // BroadcastChannel. That is genuinely slow, not stuck.
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // ── The projector shows both teams on zero from the start ──────────────────
  const scoreboard = display.getByTestId('tsb')
  await expect(scoreboard).toBeVisible()
  await expect(scoreboard).toContainText('Blue Basalts')
  await expect(scoreboard).toContainText('Red Rhyolites')
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')
  await expect(display.getByTestId('tsb-score-t1')).toHaveText('0')

  // ── Play a tile, then award full credit to team one ────────────────────────
  await playTile(host, 'earth-structure-100')
  await expect(display.getByTestId('cbd-answer')).toBeVisible()
  // Revealing the answer alone awarded nothing.
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')

  await host.getByTestId('tsp-target-basalts').click()
  await expect(host.getByTestId('tsp-award-full')).toBeEnabled()
  await host.getByTestId('tsp-award-full').click()

  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')
  await expect(display.getByTestId('tsb-score-t1')).toHaveText('0')

  // ── Return to the board: the used tile AND the score both persist ──────────
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-tile-c0t0')).toHaveText('Used')
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  // ── Play another tile and deduct from the other team ───────────────────────
  await playTile(host, 'plate-tectonics-300') // 300 × 2 = 600
  await host.getByTestId('tsp-target-rhyolites').click()
  await expect(host.getByTestId('tsp-deduct-full')).toContainText('-600')
  await host.getByTestId('tsp-deduct-full').click()

  await expect(display.getByTestId('tsb-score-t1')).toHaveText('-600')
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  // ── Undo the latest score change: the projector returns to the prior total ─
  await host.getByTestId('tsp-undo-score').click()
  await expect(display.getByTestId('tsb-score-t1')).toHaveText('0')
  // The first team's total is untouched, and the tile state is unchanged by the
  // score undo: the answer is still revealed and the tile is still consumed.
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')
  await expect(display.getByTestId('cbd-answer')).toBeVisible()
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-tile-c1t1')).toHaveText('Used')

  await expectNoPrivateContent(display)
  await host.close()
  await display.close()
})

test('partial credit and a manual correction reach the projector', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await playTile(host, 'earth-structure-200')
  await host.getByTestId('tsp-target-basalts').click()

  // Partial credit: an explicit whole amount, previewed before submission.
  await host.getByTestId('tsp-partial-input').fill('50')
  await expect(host.getByTestId('tsp-partial-preview')).toContainText('0 → 50')
  await host.getByTestId('tsp-apply-partial').click()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('50')

  // A manual correction that takes points away needs explicit confirmation.
  await host.getByTestId('tsp-manual-input').fill('-20')
  await host.getByTestId('tsp-apply-manual').click()
  await expect(host.getByTestId('tsp-error')).toContainText(/confirmation box/i)
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('50')

  await host.getByTestId('tsp-confirm').check()
  await host.getByTestId('tsp-apply-manual').click()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('30')
  await expect(host.getByTestId('tsp-last-change')).toContainText(/manual correction/i)

  await expectNoPrivateContent(display)
  await host.close()
  await display.close()
})

test('an invalid manual amount produces an accessible error and no score change', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-manual-input').fill('12.5')
  await host.getByTestId('tsp-apply-manual').click()

  const error = host.getByRole('alert')
  await expect(error).toContainText(/whole number/i)
  await expect(host.getByTestId('tsp-manual-input')).toHaveAttribute('aria-invalid', 'true')
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')

  await host.close()
  await display.close()
})

test('the projector shows scores at the board, prompt and answer stages', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await expect(display.getByTestId('tsb')).toBeVisible() // board stage
  await host.getByTestId('cbh-tile-earth-structure-100').click()
  await expect(display.getByTestId('tsb')).toBeVisible() // selected stage
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()
  await expect(display.getByTestId('tsb')).toBeVisible() // prompt stage
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toBeVisible()
  await expect(display.getByTestId('tsb')).toBeVisible() // answer stage

  await host.close()
  await display.close()
})

test('the projector stays read-only and score-control-free while scoring happens', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await playTile(host, 'earth-structure-100')
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByRole('textbox')).toHaveCount(0)
  await expect(display.getByRole('radio')).toHaveCount(0)
  await expect(display.getByRole('checkbox')).toHaveCount(0)
  await expect(display.getByRole('spinbutton')).toHaveCount(0)
  await expectNoPrivateContent(display)

  await host.close()
  await display.close()
})

test('the scoreboard survives a projector refresh and a second projector', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await playTile(host, 'earth-structure-100')
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  await display.reload()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  const display2 = await context.newPage()
  await openDisplay(display2)
  await expect(display2.getByTestId('tsb-score-t0')).toHaveText('100')
  await expectNoPrivateContent(display2)

  await host.close()
  await display.close()
  await display2.close()
})

test('the host scoring controls are keyboard operable', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await playTile(host, 'earth-structure-100')

  const target = host.getByTestId('tsp-target-basalts')
  await target.focus()
  await expect(target).toBeFocused()
  await host.keyboard.press('Space')
  await expect(target).toBeChecked()

  const award = host.getByTestId('tsp-award-full')
  await award.focus()
  await expect(award).toBeFocused()
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('tsp-score-basalts')).toHaveText('100')

  await host.close()
})

test('a duplicate team id is rejected at import with an exact path', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load sample with a duplicate team id/i }).click()
  await host.getByTestId('import-run').click()

  const result = host.getByTestId('import-result')
  await expect(result).toContainText(/import failed/i)
  await expect(result).toContainText('duplicate-team-id')
  await expect(result).toContainText('teams[1].id')
  // Nothing was loaded, so no scoreboard and no board appear.
  await expect(host.getByTestId('tsp-scoreboard')).toHaveCount(0)
  await expect(host.getByTestId('cbh-grid')).toHaveCount(0)

  await host.close()
})

test('the scoreboard fits the projector viewport without horizontal overflow', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await expect(display.getByTestId('tsb')).toBeVisible()
  const boardOverflow = await display.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(boardOverflow).toBeLessThanOrEqual(1)

  // A long prompt plus the scoreboard must also stay inside the viewport.
  await host.getByTestId('cbh-tile-earth-structure-300').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()
  const promptOverflow = await display.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(promptOverflow).toBeLessThanOrEqual(1)

  await host.close()
  await display.close()
})

test('a new game resets every score', async ({ context }) => {
  test.slow()
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await playTile(host, 'earth-structure-100')
  await host.getByTestId('tsp-target-basalts').click()
  await host.getByTestId('tsp-award-full').click()
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('100')

  // Import the same sample again — a genuinely new game.
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()

  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')
  await expect(display.getByTestId('tsb-score-t1')).toHaveText('0')

  await host.close()
  await display.close()
})

test('the Slice 5 board flow still works with no scoring at all', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // Play a whole tile and return, never touching a scoring control.
  await playTile(host, 'earth-structure-100')
  await expect(display.getByTestId('cbd-answer')).toContainText('The mantle')
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-tile-c0t0')).toHaveText('Used')

  // Both teams are still on zero: nothing scored itself.
  await expect(display.getByTestId('tsb-score-t0')).toHaveText('0')
  await expect(display.getByTestId('tsb-score-t1')).toHaveText('0')
  await expect(host.getByTestId('tsp-last-change')).toContainText(/no score change yet/i)

  await host.close()
  await display.close()
})
