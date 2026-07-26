import { test, expect, type Page } from '@playwright/test'

/**
 * Slice 4 — validation & import pipeline through the real host UI.
 *
 * The host pastes canonical JSON into the import harness; a valid file loads
 * through the existing command path and reaches the display as sanitized public
 * state only, while an invalid file produces host-only structured issues and
 * changes nothing anywhere.
 */

// Sync tabs share process-global BroadcastChannel state, so run this file serially.
test.describe.configure({ mode: 'serial' })

const VALID_GAME_FILE = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'e2e-imported-game',
  title: 'E2E Imported Game',
  rounds: [
    { id: 'r1', type: 'placeholder', title: 'First', config: { note: 'engine plumbing' } },
    { id: 'r2', type: 'placeholder', title: 'Second', config: { note: 'engine plumbing' } },
  ],
})

const UNKNOWN_TYPE_GAME_FILE = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'e2e-unknown-type',
  title: 'E2E Unknown Type',
  rounds: [{ id: 'r1', type: 'not-a-real-round-type', title: 'Board', config: {} }],
})

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function importFile(host: Page, json: string) {
  await host.getByTestId('import-json').fill(json)
  await host.getByTestId('import-run').click()
}

test('pasting valid canonical JSON imports and loads the game', async ({ page }) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(page, VALID_GAME_FILE)

  const result = page.getByTestId('import-result')
  await expect(result).toContainText(/import succeeded/i)
  await expect(result).toContainText('classroom-quiz-show/game')
  await expect(page.getByTestId('import-round-count')).toHaveText('2')
  // It really landed in the authoritative session, via INITIALIZE_GAME.
  await expect(page.getByTestId('game-title')).toHaveText('E2E Imported Game')
  await expect(page.getByTestId('event-history')).toContainText('GAME_INITIALIZED')
})

test('malformed JSON produces an actionable host-only issue and loads nothing', async ({ page }) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(page, '{ "format": "classroom-quiz-show/game",')

  const result = page.getByTestId('import-result')
  await expect(result).toContainText(/import failed — no game was loaded/i)
  await expect(result).toContainText('json-parse')
  await expect(result).toContainText('invalid-json')
  await expect(page.getByTestId('event-history')).not.toContainText('GAME_INITIALIZED')
})

test('a structurally invalid document reports the exact field path', async ({ page }) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(
    page,
    JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'bad shape',
      title: 'Bad',
      rounds: [{ id: 'r1', type: 'placeholder', title: 42, config: { note: 'n' } }],
    }),
  )

  const issues = page.getByTestId('import-issues')
  await expect(issues).toContainText('rounds[0].title')
  await expect(issues).toContainText('id')
})

test('an unregistered round type is rejected safely at the host', async ({ page }) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(page, UNKNOWN_TYPE_GAME_FILE)

  const result = page.getByTestId('import-result')
  await expect(result).toContainText('unknown-round-type')
  await expect(result).toContainText('rounds[0].type')
  await expect(page.getByTestId('import-active-game')).toHaveText('none')
})

test('a failed import never reuses a previous success and leaves the game unchanged', async ({
  page,
}) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(page, VALID_GAME_FILE)
  await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(page.getByTestId('import-attempt-count')).toHaveText('attempt #1')

  await importFile(page, '{ not json')
  const result = page.getByTestId('import-result')
  await expect(result).toContainText(/import failed/i)
  await expect(result).not.toContainText(/import succeeded/i)
  await expect(page.getByTestId('import-attempt-count')).toHaveText('attempt #2')
  // The previously imported game is still the active one.
  await expect(page.getByTestId('game-title')).toHaveText('E2E Imported Game')
  await expect(page.getByTestId('import-active-game')).toContainText('e2e-imported-game')
})

test('the built-in sample file travels the same pipeline', async ({ page }) => {
  await openHost(page)
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await page.getByRole('button', { name: /load valid sample file/i }).click()
  await expect(page.getByTestId('import-json')).toHaveValue(/classroom-quiz-show\/game/)
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(page.getByTestId('game-title')).toHaveText('Imported Sample Game')
})

test('a valid import updates the display only through sanitized public state', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(host, VALID_GAME_FILE)
  await expect(display.getByTestId('display-game')).toContainText(/2 rounds/i)

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(display.getByTestId('display-game')).toHaveText(/round 1 of 2/i)

  // The display never sees the file, the title, the ids, or the round types.
  const body = (await display.locator('body').innerText()).toLowerCase()
  for (const forbidden of [
    'classroom-quiz-show/game',
    'schemaversion',
    'e2e imported game',
    'e2e-imported-game',
    'placeholder',
    'config',
    'import',
  ]) {
    expect(body, `display must not contain "${forbidden}"`).not.toContain(forbidden)
  }

  await host.close()
  await display.close()
})

test('an invalid import causes no display change at all', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(host, VALID_GAME_FILE)
  await expect(display.getByTestId('display-game')).toContainText(/2 rounds/i)
  const before = await display.locator('body').innerText()

  await importFile(host, '{ "format": "wrong", "schemaVersion": 99 }')
  await importFile(host, UNKNOWN_TYPE_GAME_FILE)
  await expect(host.getByTestId('import-result')).toContainText(/import failed/i)

  // Same DOM text as before the failed imports; no validation detail leaked.
  await expect(display.locator('body')).toHaveText(before.replace(/\s+/g, ' ').trim(), {
    useInnerText: true,
  })
  const body = (await display.locator('body').innerText()).toLowerCase()
  for (const forbidden of ['unknown-round-type', 'schemaversion', 'registry', 'invalid', 'issue']) {
    expect(body, `display must not contain "${forbidden}"`).not.toContain(forbidden)
  }

  await host.close()
  await display.close()
})
