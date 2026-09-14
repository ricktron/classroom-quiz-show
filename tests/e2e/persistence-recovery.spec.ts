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

async function openHome(page: Page) {
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-new-game')).toBeEnabled()
}

test('Home Resume performs real recovery and Host has no second Resume gate', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await host.getByRole('button', { name: /advance sequence/i }).click()
  await waitForSaved(host)
  const historyBefore = await eventCount(host)
  const revisionBefore = await host.getByTestId('private-revision').innerText()

  await host.goto('#/')
  await expect(host.getByTestId('home-resume')).toBeVisible()
  await expect(host.getByTestId('home-resume')).toContainText(/your saved games stay/i)
  await host.getByTestId('home-resume-session').click()

  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('game-title')).toHaveText(SAMPLE_TITLE)
  await expect(host.getByTestId('private-revision')).toHaveText(revisionBefore)
  expect(await eventCount(host)).toBe(historyBefore)

  await host.close()
})

test('Home Start fresh discards only the unfinished session and keeps My Games', async ({
  context,
}) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await host.getByTestId('persistence-save').click()
  await expect(host.getByTestId('persistence-library')).toContainText(SAMPLE_TITLE)

  await host.goto('#/')
  await expect(host.getByTestId('home-resume')).toBeVisible()
  await expect(host.getByRole('heading', { name: /my games/i })).toBeVisible()
  await expect(host.getByLabel('My Games').getByText(SAMPLE_TITLE)).toBeVisible()

  await host.getByTestId('home-discard-session').click()
  await expect(host.getByTestId('home-discard-session')).toContainText(/confirm start fresh/i)
  await host.getByTestId('home-discard-session').click()

  await expect(host.getByTestId('home-resume')).toHaveCount(0)
  await expect(host.getByLabel('My Games').getByText(SAMPLE_TITLE)).toBeVisible()

  await host.goto('#/host')
  await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(host.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(host.getByTestId('persistence-library')).toContainText(SAMPLE_TITLE)
  await expect(host.getByText('No events yet.')).toBeVisible()

  await host.close()
})

test('Home can discard an unreadable unfinished session and continue', async ({ context }) => {
  const host = await context.newPage()
  await openHome(host)
  await host.evaluate(async () => {
    const dbName = 'classroom-quiz-show-persistence'
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName)
      request.onerror = () => reject(request.error ?? new Error('open failed'))
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('activeSessions')) {
          db.close()
          reject(new Error('activeSessions store missing'))
          return
        }
        const stores = ['activeSessions']
        if (db.objectStoreNames.contains('coordination')) stores.push('coordination')
        const tx = db.transaction(stores, 'readwrite')
        tx.objectStore('activeSessions').put({ format: 'corrupt-on-purpose' }, 'current')
        if (db.objectStoreNames.contains('coordination')) {
          // Drop any leftover host-writer lease from earlier serial pages so this
          // cold Home can discard as leader.
          tx.objectStore('coordination').delete('host-writer')
        }
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error ?? new Error('put failed'))
      }
    })
  })

  await host.reload()
  await expect(host.getByTestId('home-invalid-recovery')).toBeVisible()
  await expect(host.getByTestId('home-follower-notice')).toHaveCount(0)
  await host.getByTestId('home-discard-session').click()
  await host.getByTestId('home-discard-session').click()
  await expect(host.getByTestId('home-invalid-recovery')).toHaveCount(0)
  await expect(host.getByTestId('home-new-game')).toBeEnabled()

  await host.close()
})

test('Home recovery controls are keyboard operable', async ({ context }) => {
  const host = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await host.goto('#/')
  await expect(host.getByTestId('home-resume')).toBeVisible()

  await host.getByTestId('home-resume-session').focus()
  await expect(host.getByTestId('home-resume-session')).toBeFocused()
  await host.keyboard.press('Tab')
  await expect(host.getByTestId('home-discard-session')).toBeFocused()
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('home-discard-session')).toContainText(/confirm start fresh/i)
  await host.keyboard.press('Enter')
  await expect(host.getByTestId('home-resume')).toHaveCount(0)

  await host.close()
})

test('Display stays free of Home recovery private copy after unfinished session exists', async ({
  context,
}) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await startBoard(host)
  await openDisplay(display)
  await host.goto('#/')
  await expect(host.getByTestId('home-resume')).toBeVisible()

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  for (const label of [
    'resume session',
    'start fresh',
    'unfinished class session',
    'discard',
    'persistence',
    ...FORBIDDEN_DISPLAY_LABELS,
  ]) {
    expect(displayText, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  await expect(display.locator('[data-testid^="home-"]')).toHaveCount(0)
  await expect(display.locator('[data-testid^="persistence"]')).toHaveCount(0)

  await host.close()
  await display.close()
})
