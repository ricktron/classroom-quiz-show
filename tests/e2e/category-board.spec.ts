import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 5 — the category-board round, end to end in a real browser.
 *
 * A host tab and a projector tab in the same browser, synchronized over a real
 * BroadcastChannel. The host imports the built-in category-board sample through
 * the canonical pipeline, plays a tile, and the projector must show exactly the
 * right thing at every stage — and nothing private, ever.
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
  'Convection currents',
]

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

/** Import the built-in board sample and advance to its (single) board round. */
async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
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
  for (const secret of PRIVATE_SAMPLE_CONTENT) {
    expect(html, `DOM must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
}

test('the projector shows the board, then the prompt, then the answer', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  // ── Board stage ────────────────────────────────────────────────────────────
  const board = display.getByTestId('cbd-board')
  await expect(board).toBeVisible()
  await expect(board).toContainText('Earth Structure')
  await expect(board).toContainText('Plate Tectonics')
  await expect(board).toContainText('600') // 300 × 2
  await expectNoPrivateContent(display)
  // No prompt or answer text on the projector at all.
  expect((await display.content()).toLowerCase()).not.toContain('which layer of the earth')

  // ── Selected stage: category + value, still no prompt ──────────────────────
  await host.getByTestId('cbh-tile-earth-structure-100').click()
  await expect(display.getByTestId('cbd-open')).toBeVisible()
  await expect(display.getByTestId('cbd-category')).toHaveText('Earth Structure')
  await expect(display.getByTestId('cbd-value')).toHaveText('100')
  await expect(display.getByTestId('cbd-prompt')).toHaveCount(0)
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  await expectNoPrivateContent(display)

  // ── Prompt stage: the prompt, and NOT the answer ───────────────────────────
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('cbd-prompt')).toContainText(
    'Which layer of the Earth lies directly beneath the crust?',
  )
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  expect((await display.content())).not.toContain('The mantle')
  await expectNoPrivateContent(display)

  // ── Answer stage ───────────────────────────────────────────────────────────
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toContainText('The mantle')
  // The prompt is retained beside the answer (documented design decision).
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()
  // Alternates are host-only and are still absent.
  await expectNoPrivateContent(display)

  // ── Back to the board: the tile is now used ────────────────────────────────
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-tile-c0t0')).toHaveText('Used')
  await expectNoPrivateContent(display)

  await host.close()
  await display.close()
})

test('the host sees private content the projector never receives', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await host.getByTestId('cbh-tile-earth-structure-100').click()

  // The host has everything, from the moment of selection.
  await expect(host.getByTestId('cbh-prompt')).toContainText('Which layer of the Earth')
  await expect(host.getByTestId('cbh-answer')).toContainText('The mantle')
  await expect(host.getByTestId('cbh-alternates')).toContainText('Upper mantle')
  await expect(host.getByTestId('cbh-notes')).toContainText('Students often say')
  await expect(host.getByTestId('cbh-public-stage')).toContainText(/no prompt yet/i)

  // The projector has none of it.
  await expectNoPrivateContent(display)

  await host.close()
  await display.close()
})

test('the used tile survives a projector refresh and a second projector', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await host.getByTestId('cbh-tile-plate-tectonics-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-tile-c1t0')).toHaveText('Used')

  await display.reload()
  await expect(display.getByTestId('cbd-tile-c1t0')).toHaveText('Used')

  const display2 = await context.newPage()
  await openDisplay(display2)
  await expect(display2.getByTestId('cbd-tile-c1t0')).toHaveText('Used')
  await expectNoPrivateContent(display2)

  await host.close()
  await display.close()
  await display2.close()
})

test('undoing the answer reveal puts the tile back on the board', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await host.getByTestId('cbh-tile-earth-structure-200').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toBeVisible()

  await host.getByRole('button', { name: /undo last reversible/i }).click()
  // Back to the prompt stage: the answer is gone from the projector entirely.
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()
  expect(await display.content()).not.toContain('The outer core')

  // Undo the rest and the tile is available again, not used.
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(display.getByTestId('cbd-tile-c0t1')).toHaveText('200')
  await expect(host.getByTestId('cbh-tile-earth-structure-200')).toBeEnabled()

  await host.close()
  await display.close()
})

test('the projector stays read-only while a board is live', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await host.getByTestId('cbh-tile-earth-structure-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()

  await expect(display.getByRole('button')).toHaveCount(0)
  await expect(display.getByRole('textbox')).toHaveCount(0)
  await expect(display.getByRole('link')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('the host board grid is keyboard operable and used tiles are not', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)

  const tile = host.getByTestId('cbh-tile-earth-structure-100')
  await tile.focus()
  await expect(tile).toBeFocused()
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('cbh-selected')).toBeVisible()

  // Complete it, then confirm the used tile is disabled and unreachable by tab.
  await host.getByTestId('cbh-reveal-prompt').click()
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId('cbh-return').click()

  const usedTile = host.getByTestId('cbh-tile-earth-structure-100')
  await expect(usedTile).toBeDisabled()
  await expect(usedTile).toContainText('Used')
  await expect(usedTile).toHaveAttribute(
    'aria-label',
    'Earth Structure, 100 points, already used',
  )

  await host.close()
})

test('a board with a duplicate tile id is rejected with an exact path', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load sample with a duplicate tile id/i }).click()
  await host.getByTestId('import-run').click()

  const result = host.getByTestId('import-result')
  await expect(result).toContainText(/import failed/i)
  await expect(result).toContainText('duplicate-tile-id')
  await expect(result).toContainText('rounds[0].config.categories[0].tiles[1].id')
  // Nothing was loaded, so no board appears.
  await expect(host.getByTestId('cbh-grid')).toHaveCount(0)

  await host.close()
})

test('the board fits the projector viewport without horizontal overflow', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startBoard(host)

  await expect(display.getByTestId('cbd-board')).toBeVisible()
  const overflow = await display.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  // A long prompt must also stay inside the viewport.
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
