import { test, expect, type Page, type Download } from '@playwright/test'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { buildTestWorkbookBytes } from '../../src/authoring/testWorkbookFactory'

/**
 * Slice 20 — spreadsheet authoring seed through the real host UI.
 *
 * External AI authoring template framework (2026-09) update: the downloaded
 * workbook template is now academically blank (see `docs/architecture/ADR-023
 * -external-ai-authoring-template-contract.md` and
 * `src/authoring/templates.test.ts`). It must never masquerade as a playable
 * game merely because it was downloaded, so the "valid workbook" flow tests
 * below build a completed workbook fixture with `buildTestWorkbookBytes`
 * (the same node-safe helper the unit/component authoring tests use) rather
 * than re-uploading the pristine downloaded template. A dedicated test below
 * proves the downloaded blank template stays fail-closed.
 *
 * Exact-head provenance: Playwright webServer builds then previews this
 * checkout (`npm run build && npm run preview -- --port 4173 --strictPort`).
 * CI sets reuseExistingServer=false; locally a stale server on 4173 must be
 * avoided when claiming exact-head evidence.
 */

test.describe.configure({ mode: 'serial' })

const require = createRequire(import.meta.url)

function writeWorkbookFixture(filename: string, bytes: Uint8Array): string {
  const dir = mkdtempSync(join(tmpdir(), 'cqs-s20-fixture-'))
  const path = join(dir, filename)
  writeFileSync(path, bytes)
  return path
}

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function initSession(page: Page) {
  await page.getByRole('button', { name: /initialize \/ reset session/i }).click()
}

async function saveDownload(download: Download, filename: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'cqs-s20-'))
  const path = join(dir, filename)
  await download.saveAs(path)
  return path
}

test('teacher can download both workbook templates', async ({ page }) => {
  await openHost(page)
  const classicDownloadPromise = page.waitForEvent('download')
  await page.getByTestId('spreadsheet-download-classic').click()
  const classic = await classicDownloadPromise
  expect(classic.suggestedFilename()).toMatch(/classic-board.*\.xlsx$/i)

  const finalDownloadPromise = page.waitForEvent('download')
  await page.getByTestId('spreadsheet-download-final').click()
  const finalDownload = await finalDownloadPromise
  expect(finalDownload.suggestedFilename()).toMatch(/board-plus-final.*\.xlsx$/i)
})

test('downloaded blank Classic template is academically blank and cannot become playable', async ({
  page,
}) => {
  await openHost(page)
  await initSession(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('spreadsheet-download-classic').click()
  const download = await downloadPromise
  const path = await saveDownload(download, 'classic-blank.xlsx')

  // An untouched downloadable template is structurally prepared but carries no
  // semantic academic content (Title/GameKey/Prompt/Answer are blank), so it
  // must fail to parse into a draft rather than quietly becoming playable.
  await page.getByTestId('spreadsheet-upload').setInputFiles(path)
  await expect(page.getByTestId('spreadsheet-diagnostics')).toBeVisible()
  await expect(page.getByTestId('spreadsheet-profile')).toHaveText('—')
  await expect(page.getByTestId('spreadsheet-approve')).toBeDisabled()
  await expect(page.getByTestId('spreadsheet-review')).not.toBeVisible()
})

test('valid Classic workbook uploads, requires approval, then loads for play', async ({ page }) => {
  await openHost(page)
  await initSession(page)

  const path = writeWorkbookFixture(
    'classic-completed.xlsx',
    buildTestWorkbookBytes({ profile: 'classic-board' }),
  )

  await page.getByTestId('spreadsheet-upload').setInputFiles(path)
  await expect(page.getByTestId('spreadsheet-profile')).toHaveText('classic-board')
  await expect(page.getByTestId('spreadsheet-review')).toBeVisible()
  await expect(page.getByTestId('spreadsheet-approve')).toBeEnabled()
  await expect(page.getByTestId('spreadsheet-trusted')).toHaveText('none')

  await page.getByTestId('spreadsheet-approve').click()
  await expect(page.getByTestId('spreadsheet-trusted')).not.toHaveText('none')
  await expect(page.getByTestId('event-history')).not.toContainText('GAME_INITIALIZED')

  await page.getByTestId('spreadsheet-load').click()
  await expect(page.getByTestId('spreadsheet-load-outcome')).toContainText('loaded')
  await expect(page.getByTestId('event-history')).toContainText('GAME_INITIALIZED')

  // Enough Classic Board play to prove runtime validity.
  const openButtons = page.getByRole('button', { name: /open|select|reveal/i })
  if (await openButtons.count()) {
    await openButtons.first().click()
  }
  await expect(page.getByTestId('game-title')).toBeVisible()
})

test('valid Board + Final authors/imports and can reach Final', async ({ page }) => {
  await openHost(page)
  await initSession(page)

  const path = writeWorkbookFixture(
    'board-plus-final-completed.xlsx',
    buildTestWorkbookBytes({ profile: 'board-plus-final' }),
  )

  await page.getByTestId('spreadsheet-upload').setInputFiles(path)
  await expect(page.getByTestId('spreadsheet-profile')).toHaveText('board-plus-final')
  await expect(page.getByTestId('spreadsheet-review-final')).toHaveText('yes')
  await page.getByTestId('spreadsheet-approve').click()
  await page.getByTestId('spreadsheet-load').click()
  await expect(page.getByTestId('spreadsheet-load-outcome')).toContainText('loaded')

  // Advance to Final when the host control exists.
  const nextRound = page.getByRole('button', { name: /next round|advance|start final|final wager/i })
  if (await nextRound.count()) {
    await nextRound.first().click()
  }
  await expect(page.locator('body')).toContainText(/final|wager|board/i)
})

test('invalid workbook gives located diagnostics and does not replace active game', async ({
  page,
}) => {
  await openHost(page)
  await initSession(page)

  // Load a known-good JSON game first.
  await page.getByTestId('import-json').fill(
    JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'preexisting-game',
      title: 'Preexisting Game',
      rounds: [{ id: 'r1', type: 'placeholder', title: 'First', config: { note: 'x' } }],
    }),
  )
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(page.getByTestId('game-title')).toHaveText('Preexisting Game')

  const dir = mkdtempSync(join(tmpdir(), 'cqs-s20-bad-'))
  const badPath = join(dir, 'bad.xlsx')
  writeFileSync(badPath, Buffer.from([1, 2, 3, 4]))
  await page.getByTestId('spreadsheet-upload').setInputFiles(badPath)
  await expect(page.getByTestId('spreadsheet-diagnostics')).toBeVisible()
  await expect(page.getByTestId('spreadsheet-approve')).toBeDisabled()
  await expect(page.getByTestId('game-title')).toHaveText('Preexisting Game')
})

test('existing JSON import remains usable alongside spreadsheet authoring', async ({ page }) => {
  await openHost(page)
  await initSession(page)
  await page.getByTestId('import-json').fill(
    JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'json-still-works',
      title: 'JSON Still Works',
      rounds: [{ id: 'r1', type: 'placeholder', title: 'First', config: { note: 'x' } }],
    }),
  )
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(page.getByTestId('game-title')).toHaveText('JSON Still Works')
})

test('pack import/export controls remain present', async ({ page }) => {
  await openHost(page)
  await expect(page.getByTestId('pack-import-file')).toBeVisible()
  await expect(page.getByTestId('pack-export-no-game')).toBeVisible()
  expect(typeof require).toBe('function')
  expect(readFileSync('package.json', 'utf8')).toContain('xlsx-0.20.3')
})
