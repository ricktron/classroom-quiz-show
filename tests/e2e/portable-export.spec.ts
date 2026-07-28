import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../../src/import/canonicalFormat'

/**
 * Slice 12 — portable export and round-trip import through the real host UI.
 *
 * Export downloads deterministic canonical JSON; those exact bytes re-import
 * through the existing paste-based import surface. Runtime session state never
 * appears in the file, and export status stays host-only.
 */

test.describe.configure({ mode: 'serial' })

const EXPORT_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'ecology-review',
  title: 'Ecology Review',
  teams: [
    { id: 'red', name: 'Red Team', accent: 'crimson' },
    { id: 'blue', name: 'Blue Team' },
  ],
  timer: { responseSeconds: 45 },
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'The Board',
      config: {
        categories: [
          {
            id: 'habitats',
            title: 'Habitats',
            tiles: [
              {
                id: 'habitats-100',
                value: 100,
                prompt: 'Which biome is dominated by grasses?',
                answer: 'Grassland',
                alternates: ['Prairie', 'Savanna'],
                notes: 'HOST-ONLY-EXPORT-NOTE',
              },
              {
                id: 'habitats-200',
                value: 200,
                multiplier: 2,
                prompt: {
                  kind: 'image',
                  source: {
                    kind: 'same-origin-path',
                    path: 'media-fixtures/slice-11-clue.png',
                  },
                  alt: 'Teal fixture pixel for portable export',
                  caption: 'Export fixture caption',
                  attribution: 'CI test asset',
                },
                answer: 'HOST-ONLY-IMAGE-ANSWER',
                notes: 'HOST-ONLY-IMAGE-NOTE',
              },
            ],
          },
        ],
      },
    },
  ],
}

const EXPORT_GAME_TEXT = JSON.stringify(EXPORT_GAME)

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

test('no-game export button is disabled', async ({ page }) => {
  await openHost(page)
  await expect(page.getByTestId('export-download')).toBeDisabled()
  await expect(page.getByTestId('export-no-game')).toHaveText('No game loaded.')
})

test('portable export downloads, re-imports, and stays host-only', async ({ browser }) => {
  const host = await browser.newPage()
  const display = await browser.newPage()

  await openHost(host)
  await openDisplay(display)

  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await importFile(host, EXPORT_GAME_TEXT)
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(host.getByTestId('game-title')).toHaveText('Ecology Review')
  await expect(host.getByTestId('export-game-id')).toHaveText('ecology-review')
  await expect(host.getByTestId('export-answer-warning')).toContainText(/answer keys/i)
  await expect(host.getByTestId('export-media-warning')).toContainText(/preserves media paths/i)

  const revisionBefore = await host.getByTestId('private-revision').innerText()
  const historyBefore = await host.getByTestId('event-history').locator('li').count()
  const displayBodyBefore = await display.locator('body').innerText()

  const downloadPromise = host.waitForEvent('download')
  await host.getByTestId('export-download').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('ecology-review.classroom-quiz-show.json')
  const path = await download.path()
  expect(path).toBeTruthy()
  const jsonText = await readFile(path!, 'utf8')

  expect(jsonText.endsWith('\n')).toBe(true)
  expect(jsonText.indexOf('\n')).toBe(jsonText.length - 1)
  expect(jsonText).not.toContain('\r')
  const withoutLf = jsonText.slice(0, -1)
  expect(withoutLf).toBe(JSON.stringify(JSON.parse(withoutLf)))

  const doc = JSON.parse(jsonText) as {
    id: string
    title: string
    teams: Array<{ id: string; name: string; accent: string }>
    timer: { responseSeconds: number }
    rounds: Array<{
      id: string
      config: {
        categories: Array<{
          tiles: Array<Record<string, unknown>>
        }>
      }
    }>
  }

  expect(doc.id).toBe('ecology-review')
  expect(doc.title).toBe('Ecology Review')
  expect(doc.teams).toEqual([
    { id: 'red', name: 'Red Team', accent: 'crimson' },
    { id: 'blue', name: 'Blue Team', accent: 'azure' },
  ])
  expect(doc.timer).toEqual({ responseSeconds: 45 })
  expect(doc.rounds.map((r) => r.id)).toEqual(['board-round'])

  const tiles = doc.rounds[0]!.config.categories[0]!.tiles
  expect(tiles[0]!.prompt).toBe('Which biome is dominated by grasses?')
  expect(tiles[0]!.answer).toBe('Grassland')
  expect(tiles[0]!.alternates).toEqual(['Prairie', 'Savanna'])
  expect(tiles[0]!.notes).toBe('HOST-ONLY-EXPORT-NOTE')
  expect(tiles[1]!.multiplier).toBe(2)
  expect(tiles[1]!.prompt).toMatchObject({
    kind: 'image',
    source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
  })

  for (const banned of [
    'sessionId',
    'revision',
    'teamScores',
    'selectedTile',
    'revealStage',
    'usedTiles',
    'buzzQueue',
    'responsePhases',
    'deadline',
    'eventHistory',
    'scores',
  ]) {
    expect(jsonText).not.toContain(banned)
  }

  await expect(host.getByTestId('export-result')).toContainText(
    'Export ready: ecology-review.classroom-quiz-show.json',
  )
  await expect(host.getByTestId('private-revision')).toHaveText(revisionBefore)
  expect(await host.getByTestId('event-history').locator('li').count()).toBe(historyBefore)

  // Re-import the exact downloaded bytes through the existing paste import UI.
  await importFile(host, jsonText)
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(host.getByTestId('game-title')).toHaveText('Ecology Review')
  await expect(host.getByTestId('export-game-id')).toHaveText('ecology-review')
  await expect(host.getByTestId('export-team-count')).toHaveText('2')

  // Prove authored private content survived through an observable host boundary
  // (not only by inspecting the downloaded JSON text).
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await host.getByTestId('cbh-tile-habitats-100').click()
  await expect(host.getByTestId('cbh-notes')).toContainText('HOST-ONLY-EXPORT-NOTE')
  await expect(host.getByTestId('cbh-alternates')).toContainText('Prairie')
  await expect(host.getByTestId('cbh-alternates')).toContainText('Savanna')
  await host.getByTestId('cbh-return').click()

  const secondDownloadPromise = host.waitForEvent('download')
  await host.getByTestId('export-download').click()
  const secondDownload = await secondDownloadPromise
  expect(secondDownload.suggestedFilename()).toBe('ecology-review.classroom-quiz-show.json')
  const secondPath = await secondDownload.path()
  const secondText = await readFile(secondPath!, 'utf8')
  expect(secondText).toBe(jsonText)

  // Display never shows export status, answer-key warning, or media warning.
  const displayBody = await display.locator('body').innerText()
  expect(displayBody).not.toContain('Export ready')
  expect(displayBody).not.toContain('answer keys')
  expect(displayBody).not.toContain('preserves media paths')
  expect(displayBody).not.toContain('HOST-ONLY-EXPORT-NOTE')
  expect(displayBody).not.toContain('HOST-ONLY-IMAGE-ANSWER')
  expect(displayBodyBefore).not.toContain('Export ready')

  await host.close()
  await display.close()
})
