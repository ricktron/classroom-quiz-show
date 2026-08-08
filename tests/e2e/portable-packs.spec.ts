import { writeFile, unlink, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../../src/import/canonicalFormat'
import { PERSISTENCE_DB_NAME } from '../../src/persistence/constants'

/**
 * Slice 19 — self-contained portable packs, end to end in a real browser.
 *
 * Proves clean-environment pack round-trip, zero-media packs, Save/Load durability,
 * refresh/recovery with embedded media, and export-after-import without hosted media.
 */

test.describe.configure({ mode: 'serial' })

const MEDIA_PATH = 'media-fixtures/slice-11-clue.png'
const MEDIA_ROUTE = `**/${MEDIA_PATH}`

const IMAGE_PACK_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'e2e-portable-pack-image',
  title: 'E2E Portable Pack Image',
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Image Board',
      config: {
        categories: [
          {
            id: 'image-cat',
            title: 'Image Clues',
            tiles: [
              {
                id: 'pack-image-100',
                value: 100,
                prompt: {
                  kind: 'image',
                  source: {
                    kind: 'same-origin-path',
                    path: MEDIA_PATH,
                  },
                  alt: 'Teal fixture pixel for portable pack E2E',
                  caption: 'Pack fixture caption',
                  attribution: 'CI test asset',
                },
                answer: 'PACK-IMAGE-ANSWER-PRIVATE',
              },
            ],
          },
        ],
      },
    },
  ],
}

const TEXT_PACK_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'e2e-portable-pack-text',
  title: 'E2E Portable Pack Text',
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Text Board',
      config: {
        categories: [
          {
            id: 'text-cat',
            title: 'Text Clues',
            tiles: [
              {
                id: 'pack-text-100',
                value: 100,
                prompt: 'Which layer lies beneath the crust?',
                answer: 'The mantle',
              },
            ],
          },
        ],
      },
    },
  ],
}

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
  await expect(host.getByTestId('persistence-status')).toHaveText(/saved locally|ready/i)
}

async function initSession(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
}

async function importJson(host: Page, document: unknown) {
  await host.getByTestId('import-json').fill(JSON.stringify(document, null, 2))
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
}

async function startBoard(host: Page, document: unknown) {
  await initSession(host)
  await importJson(host, document)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

async function blockHostedMedia(page: Page) {
  await page.route(MEDIA_ROUTE, (route) => route.abort('failed'))
}

async function clearClassroomQuizShowStorage(page: Page) {
  await page.evaluate(async (dbName) => {
    const databases =
      typeof indexedDB.databases === 'function' ? await indexedDB.databases() : []
    const names = new Set<string>([dbName])
    for (const db of databases) {
      if (db.name && db.name.includes('classroom-quiz-show')) {
        names.add(db.name)
      }
    }
    await Promise.all(
      [...names].map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error ?? new Error(`delete ${name}`))
            request.onblocked = () => resolve()
          }),
      ),
    )
  }, PERSISTENCE_DB_NAME)
}

async function downloadPackFromLoadedGame(host: Page): Promise<Buffer> {
  const downloadPromise = host.waitForEvent('download')
  await host.getByTestId('pack-export-download').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.cqs-pack$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const { readFile } = await import('node:fs/promises')
  return readFile(path!)
}

async function importPackFile(host: Page, bytes: Buffer) {
  const dir = await mkdtemp(join(tmpdir(), 'cqs-pack-e2e-'))
  const filePath = join(dir, 'import.cqs-pack')
  await writeFile(filePath, bytes)
  try {
    await host.getByTestId('pack-import-file').setInputFiles(filePath)
    await expect(host.getByTestId('pack-import-result')).toContainText(
      /pack import succeeded.*game loaded/i,
      { timeout: 30_000 },
    )
  } finally {
    await unlink(filePath).catch(() => undefined)
  }
}

async function assertImagePromptVisible(host: Page, display: Page, tileTestId: string) {
  await host.getByTestId(tileTestId).click()
  await expect(host.getByTestId('cbh-prompt-image')).toBeVisible()
  await expect(host.getByTestId('mcd-img')).toHaveCount(0)

  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('mcd-img')).toBeVisible()
  await expect(display.getByTestId('mcd-image-fallback')).toHaveCount(0)
  const displaySrc = await display.getByTestId('mcd-img').getAttribute('src')
  expect(displaySrc, 'display image must resolve from pack blob, not hosted path').toMatch(/^blob:/)
  expect(displaySrc).not.toContain(MEDIA_PATH)

  const hostSrc = await host.getByTestId('cbh-prompt-image').getAttribute('src')
  expect(hostSrc).toMatch(/^blob:/)
}

async function openHostDisplayWithBlockedMedia(context: BrowserContext) {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)
  return { host, display }
}

/** Playwright routes do not survive navigation — re-apply after every reload. */
async function applyHostedMediaBlock(host: Page, display: Page) {
  const abort = (route: Parameters<Parameters<Page['route']>[1]>[0]) => route.abort('failed')
  await host.route(MEDIA_ROUTE, abort)
  await display.route(MEDIA_ROUTE, abort)
}

test('media pack clean-environment chain survives hosted media block', async ({ context }) => {
  const buildHost = await context.newPage()
  await openHost(buildHost)
  await startBoard(buildHost, IMAGE_PACK_GAME)

  const packBytes = await downloadPackFromLoadedGame(buildHost)
  expect(packBytes.length).toBeGreaterThan(0)
  await buildHost.close()

  const { host, display } = await openHostDisplayWithBlockedMedia(context)

  let hostedMediaAttempts = 0
  const countingAbort = (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    hostedMediaAttempts += 1
    return route.abort('failed')
  }
  await host.unroute(MEDIA_ROUTE)
  await display.unroute(MEDIA_ROUTE)
  await host.route(MEDIA_ROUTE, countingAbort)
  await display.route(MEDIA_ROUTE, countingAbort)

  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await display.reload()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)

  await initSession(host)
  await importPackFile(host, packBytes)
  await expect(host.getByTestId('game-title')).toHaveText('E2E Portable Pack Image')
  await expect(host.getByTestId('pack-import-media-count')).toHaveText('1')

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await assertImagePromptVisible(host, display, 'cbh-tile-pack-image-100')

  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toContainText('PACK-IMAGE-ANSWER-PRIVATE')
  await expect(display.getByTestId('mcd-img')).toBeVisible()

  expect(hostedMediaAttempts, 'pack-resolved media must not fetch hosted fixture').toBe(0)

  await host.close()
  await display.close()
})

test('zero-media pack export and import succeeds', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await initSession(host)
  await importJson(host, TEXT_PACK_GAME)
  await expect(host.getByTestId('game-title')).toHaveText('E2E Portable Pack Text')

  const packBytes = await downloadPackFromLoadedGame(host)
  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await openHost(host)
  await blockHostedMedia(host)

  await initSession(host)
  await importPackFile(host, packBytes)
  await expect(host.getByTestId('pack-import-media-count')).toHaveText('0')
  await expect(host.getByTestId('game-title')).toHaveText('E2E Portable Pack Text')

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await host.getByTestId('cbh-tile-pack-text-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('cbh-prompt')).toContainText('Which layer lies beneath the crust?')

  await host.close()
})

test('Save/Load keeps pack media when hosted path is blocked', async ({ context }) => {
  const buildHost = await context.newPage()
  await openHost(buildHost)
  await startBoard(buildHost, IMAGE_PACK_GAME)
  const packBytes = await downloadPackFromLoadedGame(buildHost)
  await buildHost.close()

  const { host, display } = await openHostDisplayWithBlockedMedia(context)
  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await display.reload()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)

  await initSession(host)
  await importPackFile(host, packBytes)
  await waitForSaved(host)

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await assertImagePromptVisible(host, display, 'cbh-tile-pack-image-100')
  await host.getByTestId('cbh-return').click()

  await host.getByTestId('persistence-save').click()
  await expect(host.getByTestId('persistence-library')).toContainText('E2E Portable Pack Image')

  await host.getByRole('button', { name: /^initialize sample game$/i }).click()
  await expect(host.getByTestId('game-title')).toHaveText('Foundation Sample Game')
  await waitForSaved(host)

  await host.getByTestId('persistence-load').click()
  await expect(host.getByTestId('persistence-load')).toHaveText(/confirm load and replace current game/i)
  await host.getByTestId('persistence-load').click()
  await expect(host.getByTestId('game-title')).toHaveText('E2E Portable Pack Image')
  await waitForSaved(host)

  await host.getByRole('button', { name: /advance to next round/i }).click()
  await assertImagePromptVisible(host, display, 'cbh-tile-pack-image-100')

  await host.close()
  await display.close()
})

test('refresh recovery keeps pack media when hosted path is blocked', async ({ context }) => {
  const buildHost = await context.newPage()
  await openHost(buildHost)
  await startBoard(buildHost, IMAGE_PACK_GAME)
  const packBytes = await downloadPackFromLoadedGame(buildHost)
  await buildHost.close()

  const { host, display } = await openHostDisplayWithBlockedMedia(context)
  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await display.reload()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)

  await initSession(host)
  await importPackFile(host, packBytes)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  // Persist while still on the board (tile buttons remount after Resume).
  await waitForSaved(host)

  await host.reload()
  await display.reload()
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await applyHostedMediaBlock(host, display)

  const recovery = host.getByTestId('persistence-recovery')
  await expect(recovery).toBeVisible({ timeout: 15_000 })
  await expect(recovery).toContainText(/unfinished session found/i)
  await host.getByTestId('persistence-resume').click()
  await expect(recovery).toHaveCount(0)
  await expect(host.getByTestId('game-title')).toHaveText('E2E Portable Pack Image')
  await waitForSaved(host)

  // Allow pack-media hydration from IndexedDB before revealing the image.
  await expect
    .poll(async () => host.getByTestId('cbh-tile-pack-image-100').count(), { timeout: 15_000 })
    .toBeGreaterThan(0)

  await assertImagePromptVisible(host, display, 'cbh-tile-pack-image-100')

  await host.close()
  await display.close()
})

test('export-after-import produces an independent pack without hosted media', async ({
  context,
}) => {
  const buildHost = await context.newPage()
  await openHost(buildHost)
  await startBoard(buildHost, IMAGE_PACK_GAME)
  const packA = await downloadPackFromLoadedGame(buildHost)
  await buildHost.close()

  const { host, display } = await openHostDisplayWithBlockedMedia(context)
  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await display.reload()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)

  await initSession(host)
  await importPackFile(host, packA)
  await expect(host.getByTestId('pack-import-media-count')).toHaveText('1')

  const packBPromise = host.waitForEvent('download')
  await host.getByTestId('pack-export-download').click()
  const packBDownload = await packBPromise
  const packBPath = await packBDownload.path()
  expect(packBPath).toBeTruthy()
  const { readFile } = await import('node:fs/promises')
  const packB = await readFile(packBPath!)

  await clearClassroomQuizShowStorage(host)
  await host.reload()
  await display.reload()
  await openHost(host)
  await openDisplay(display)
  await applyHostedMediaBlock(host, display)

  await initSession(host)
  await importPackFile(host, packB)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await assertImagePromptVisible(host, display, 'cbh-tile-pack-image-100')

  await host.close()
  await display.close()
})
