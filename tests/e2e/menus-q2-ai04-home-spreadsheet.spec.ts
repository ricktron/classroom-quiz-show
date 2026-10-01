import { test, expect } from '@playwright/test'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildTestWorkbookBytes } from '../../src/authoring/testWorkbookFactory'
import { GAME_HEADERS } from '../../src/authoring/contract'
import { openHomeImport, expectClassSetup } from './helpers/menusQ2'

/**
 * Q2-R1 / AI-04 — Home ordinary-surface spreadsheet template download +
 * completed workbook import → Play → Class Setup.
 *
 * Presence-only CD Import checks are insufficient. Host `#/host` spreadsheet
 * panel e2e is not Q2 ordinary-surface proof. Do not re-upload a blank
 * pristine template as playable; use `buildTestWorkbookBytes` for a completed
 * fixture (same helper as spreadsheet-authoring.spec.ts).
 */

test.describe.configure({ mode: 'serial' })

function writeWorkbookFixture(filename: string, bytes: Uint8Array): string {
  const dir = mkdtempSync(join(tmpdir(), 'cqs-q2-ai04-'))
  const path = join(dir, filename)
  writeFileSync(path, bytes)
  return path
}

test('Q2 AI-04: Home download Board+Final template yields Board+Final .xlsx', async ({
  page,
}) => {
  await page.goto('./')
  await openHomeImport(page)
  await expect(page.getByTestId('home-import-templates')).toBeVisible()
  await expect(page.getByTestId('home-download-board-plus-final')).toBeVisible()
  await expect(page.getByTestId('home-download-classic-board')).toBeVisible()
  await expect(page.getByTestId('home-import-spreadsheet')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('home-download-board-plus-final').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/board-plus-final.*\.xlsx$/i)
})

test('Q2 AI-04: Home Import spreadsheet completed workbook → Play → Class Setup', async ({
  page,
}) => {
  const title = 'Q2 AI-04 Board Final Home'
  const gameKey = 'q2-ai04-board-final-home'
  const path = writeWorkbookFixture(
    'q2-ai04-board-plus-final-completed.xlsx',
    buildTestWorkbookBytes({
      profile: 'board-plus-final',
      gameRows: [
        [...GAME_HEADERS],
        [title, gameKey, 30, 'Team A', 'Team B', '', '', '', '', '', ''],
      ],
    }),
  )

  await page.goto('./')
  await openHomeImport(page)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('home-import-spreadsheet').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles(path)

  await expect(page.getByTestId('home-status')).toContainText(/ready to play/i, {
    timeout: 20_000,
  })
  await expect(page.getByTestId('home-hero-playable')).toBeVisible()
  await expect(page.getByTestId('home-hero-playable')).toContainText(title)

  await page.getByTestId('home-hero-play').click()
  await expect(page).toHaveURL(/[?&]play=/)
  await expectClassSetup(page)
  await expect(page.getByTestId('setup-row-buzzers')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
})
