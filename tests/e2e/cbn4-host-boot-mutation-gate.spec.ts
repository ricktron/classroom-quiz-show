import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * CBN-4 — a teacher action must never be accepted and then silently discarded
 * by Host persistence boot.
 *
 * `dispatchSessionCommand` refuses every session command while
 * `bootPhase !== 'ready'`, so an *enabled* mutation control during boot is a
 * control that appears to work and then does nothing. These run the natural
 * Host route against the production build with a real, controlled delay on the
 * first IndexedDB open, and assert the gate plus the truthful boot status.
 *
 * The delay is installed by wrapping the standard `IDBFactory.prototype.open`
 * from the test side. Product code exposes no test hook (see
 * production-bundle-test-hooks.spec.ts), so nothing here can leak into a
 * teacher's bundle.
 */

const VALID_GAME_FILE = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'cbn4-boot-gate-game',
  title: 'CBN-4 Boot Gate Game',
  rounds: [{ id: 'r1', type: 'placeholder', title: 'First', config: { note: 'engine plumbing' } }],
})

/**
 * Delay the FIRST `indexedDB.open` of this document by `delayMs`, forwarding the
 * real request's events and `result`/`error` once it finally runs.
 */
async function delayFirstStorageOpen(page: Page, delayMs: number): Promise<void> {
  await page.addInitScript((ms: number) => {
    const realOpen = IDBFactory.prototype.open
    let delayed = false
    IDBFactory.prototype.open = function patchedOpen(
      this: IDBFactory,
      name: string,
      version?: number,
    ) {
      if (delayed) return realOpen.call(this, name, version)
      delayed = true
      const stub = {
        onupgradeneeded: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onblocked: null as ((event: Event) => void) | null,
        result: undefined as IDBDatabase | undefined,
        error: null as DOMException | null,
        transaction: null,
        readyState: 'pending' as const,
      }
      setTimeout(() => {
        const request = realOpen.call(this, name, version)
        request.onupgradeneeded = (event) => {
          stub.result = request.result
          stub.onupgradeneeded?.call(stub as unknown as IDBOpenDBRequest, event)
        }
        request.onsuccess = (event) => {
          stub.result = request.result
          stub.onsuccess?.call(stub as unknown as IDBOpenDBRequest, event)
        }
        request.onerror = (event) => {
          stub.error = request.error
          stub.onerror?.call(stub as unknown as IDBOpenDBRequest, event)
        }
        request.onblocked = (event) => {
          stub.onblocked?.call(stub as unknown as IDBOpenDBRequest, event)
        }
      }, ms)
      return stub as unknown as IDBOpenDBRequest
    } as typeof IDBFactory.prototype.open
  }, delayMs)
}

const initialize = (page: Page) =>
  page.getByRole('button', { name: /initialize \/ reset session/i })

async function openHost(page: Page): Promise<void> {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await ensureHostMoreOpen(page)
}

for (const delayMs of [0, 500, 1500]) {
  test(`Host boot at ${delayMs}ms storage delay never offers an actionable Initialize before it settles`, async ({
    page,
  }) => {
    await delayFirstStorageOpen(page, delayMs)
    await openHost(page)

    const status = page.getByTestId('persistence-status')
    const button = initialize(page)
    await expect(button).toBeAttached()

    // While the Host truthfully reports that it is still opening saved games,
    // the mutation control must not be actionable.
    if (/opening saved games/i.test((await status.textContent()) ?? '')) {
      await expect(button).toBeDisabled()
    }

    // It becomes actionable once boot settles, and one activation has one
    // durable visible effect — no phantom and no double activation.
    await expect(button).toBeEnabled()
    await expect(status).not.toHaveText(/opening saved games/i)
    await button.click()

    await expect(page.getByTestId('private-session')).not.toHaveText('—')
    await expect(page.getByTestId('private-revision')).toHaveText('1')
    await expect(
      page.getByTestId('event-history').getByText('SESSION_INITIALIZED', { exact: true }),
    ).toHaveCount(1)
  })

  test(`import through the Host harness survives a ${delayMs}ms storage-open delay`, async ({
    page,
  }) => {
    await delayFirstStorageOpen(page, delayMs)
    await openHost(page)

    // The natural teacher route: press Initialize, then import. Playwright's
    // actionability wait is the teacher's "the control is available now" —
    // nothing here extends a timeout to paper over the race.
    await initialize(page).click()
    await page.getByTestId('import-json').fill(VALID_GAME_FILE)
    await page.getByTestId('import-run').click()

    await expect(page.getByTestId('import-result')).toContainText(/import succeeded/i)
    await expect(page.getByTestId('game-title')).toHaveText('CBN-4 Boot Gate Game')
    await expect(page.getByTestId('event-history')).toContainText('GAME_INITIALIZED')
  })
}

test('a reloaded Host with an existing saved session still gates until recovery is offered', async ({
  page,
}) => {
  await openHost(page)
  await initialize(page).click()
  await page.getByTestId('import-json').fill(VALID_GAME_FILE)
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('game-title')).toHaveText('CBN-4 Boot Gate Game')

  // Reload behind a delayed storage open: the unfinished session must be
  // offered for recovery, and nothing may mutate it before that choice.
  await delayFirstStorageOpen(page, 1500)
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await ensureHostMoreOpen(page)

  const status = page.getByTestId('persistence-status')
  if (/opening saved games/i.test((await status.textContent()) ?? '')) {
    await expect(initialize(page)).toBeDisabled()
  }
  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  // Recovery is a choice, not a settled boot: session commands stay unavailable.
  await expect(initialize(page)).toBeDisabled()

  await page.getByTestId('persistence-resume').click()
  await expect(initialize(page)).toBeEnabled()
  await expect(page.getByTestId('game-title')).toHaveText('CBN-4 Boot Gate Game')
})
