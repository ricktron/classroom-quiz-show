import { test, expect, type Page } from '@playwright/test'
import { PERSISTENCE_WIRE_FORMAT } from '../../src/persistence/constants'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * Slice 13 — local persistence and recovery, end to end in a real browser.
 *
 * IndexedDB persists across reloads inside one browser context, so these tests
 * use real host refreshes rather than test doubles. The display checks assert
 * that persistence remains host-only.
 */

test.describe.configure({ mode: 'serial' })

const SAMPLE_TITLE = 'Earth & Space Science Board'
const PRIVATE_HOST_NOTE = 'private host memo (never projected)'
const PRIVATE_SAMPLE_CONTENT = [
  'The mantle',
  'Students often say',
  'Accept "the Moho"',
  'Double-value tile',
]

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(/loading/i)
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function waitForSaved(host: Page) {
  await expect(host.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|saved locally|ready/i,
  )
}

async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(host.getByTestId('game-title')).toHaveText(SAMPLE_TITLE)
  await waitForSaved(host)
}

async function eventCount(host: Page): Promise<number> {
  return host.getByTestId('event-history').locator('li').count()
}

test('host starts clean with visible persistence status and no silent recovery', async ({ page }) => {
  await openHost(page)

  await expect(page.getByTestId('persistence-status')).toHaveText(/ready to save this class session/i)
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('private-revision')).toHaveText('0')
  await expect(page.getByText('No events yet.')).toBeVisible()
})

test('refresh prompts for recovery and Resume restores event history', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await host.getByRole('button', { name: /advance sequence/i }).click()
  await waitForSaved(host)

  const revisionBefore = await host.getByTestId('private-revision').innerText()
  const historyBefore = await eventCount(host)
  await expect(host.getByTestId('event-history')).toContainText('SEQUENCE_ADVANCED')

  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toContainText(/unfinished session found/i)
  await expect(host.getByTestId('game-title')).toHaveCount(0)

  await host.getByTestId('persistence-resume').click()
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('game-title')).toHaveText(SAMPLE_TITLE)
  await expect(host.getByTestId('private-revision')).toHaveText(revisionBefore)
  expect(await eventCount(host)).toBe(historyBefore)
  await expect(host.getByTestId('event-history')).toContainText('GAME_INITIALIZED')
  await expect(host.getByTestId('event-history')).toContainText('SEQUENCE_ADVANCED')

  await host.close()
})

test('Discard recovery clears the active session and starts empty', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)

  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toBeVisible()
  await host.getByTestId('persistence-discard').click()
  await host.getByTestId('persistence-discard').click()

  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('private-revision')).toHaveText('0')
  await expect(host.getByText('No events yet.')).toBeVisible()

  await host.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('persistence-status')).toHaveText(/ready to save this class session/i)

  await host.close()
})

test('saved definition appears in the library and Load confirms replacement', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)

  await host.getByTestId('persistence-save').click()
  await expect(host.getByTestId('persistence-library')).toContainText(SAMPLE_TITLE)

  await host.getByRole('button', { name: /^initialize sample game$/i }).click()
  await expect(host.getByTestId('game-title')).toHaveText('Foundation Sample Game')
  await waitForSaved(host)

  const historyBeforeLoad = await eventCount(host)
  await host.getByTestId('persistence-load').click()
  await expect(host.getByTestId('persistence-load')).toHaveText(/confirm load and replace current game/i)
  await host.getByTestId('persistence-load').click()

  await expect(host.getByTestId('game-title')).toHaveText(SAMPLE_TITLE)
  await expect(host.getByTestId('event-history')).toContainText('GAME_INITIALIZED')
  expect(await eventCount(host)).toBeGreaterThan(historyBeforeLoad)

  await host.close()
})

test('display remains free of persistence UI and private storage content', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()

  await openHost(host)
  await openDisplay(display)
  await startBoard(host)
  await host.getByRole('button', { name: /set private note/i }).click()
  await host.getByTestId('persistence-save').click()
  await expect(host.getByTestId('persistence-library')).toContainText(SAMPLE_TITLE)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await expect(display.getByTestId('display-game')).toBeVisible()

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(displayText, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }

  const displayHtml = (await display.content()).toLowerCase()
  for (const secret of [
    PRIVATE_HOST_NOTE,
    ...PRIVATE_SAMPLE_CONTENT,
    SAMPLE_TITLE,
    'imported-sample-board',
    'persistence',
    'resume session',
    'discard recovery',
    'saved definitions',
    'local persistence',
    'active session saved locally',
    PERSISTENCE_WIRE_FORMAT,
    'saveddefinitions',
    'activesessions',
    'coordination',
  ]) {
    expect(displayHtml, `display DOM must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  await expect(display.locator('[data-testid^="persistence"]')).toHaveCount(0)
  await expect(display.getByRole('button')).toHaveCount(0)

  await host.close()
  await display.close()
})
