import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * FRC-1 — a teacher action must never be accepted and then silently discarded
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
  id: 'frc1-boot-gate-game',
  title: 'FRC-1 Boot Gate Game',
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

/**
 * Hold the FIRST `indexedDB.open` until the test releases it, so the boot window
 * is a fact the test controls rather than a wall-clock delay it races.
 *
 * `delayFirstStorageOpen` is still used where the point is a realistic delay;
 * this is used where the point is observing the unsettled state itself. The
 * release hook is installed by `addInitScript` only — product code never
 * defines or reads it (see production-bundle-test-hooks.spec.ts, which forbids
 * `__cqs*` window globals in the shipped bundle).
 */
const RELEASE_HOOK = '__cqsReleaseStorageOpen'

async function gateFirstStorageOpen(page: Page): Promise<() => Promise<void>> {
  await page.addInitScript((hook: string) => {
    const realOpen = IDBFactory.prototype.open
    let gated = false
    let release = () => undefined as void
    const opened = new Promise<void>((resolve) => {
      release = () => resolve()
    })
    ;(window as unknown as Record<string, () => void>)[hook] = () => release()
    IDBFactory.prototype.open = function patchedOpen(
      this: IDBFactory,
      name: string,
      version?: number,
    ) {
      if (gated) return realOpen.call(this, name, version)
      gated = true
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
      void opened.then(() => {
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
      })
      return stub as unknown as IDBOpenDBRequest
    } as typeof IDBFactory.prototype.open
  }, RELEASE_HOOK)
  return async () => {
    await page.evaluate((hook: string) => {
      ;(window as unknown as Record<string, () => void>)[hook]()
    }, RELEASE_HOOK)
  }
}

const initialize = (page: Page) =>
  page.getByRole('button', { name: /initialize \/ reset session/i })

async function openHost(page: Page): Promise<void> {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await ensureHostMoreOpen(page)
}

test('the Host offers no actionable Initialize while saved-state boot is unsettled', async ({
  page,
}) => {
  const releaseStorage = await gateFirstStorageOpen(page)
  await openHost(page)

  const status = page.getByTestId('persistence-status')
  const button = initialize(page)

  // Deterministic: storage is held open, so this IS the unsettled state. No
  // wall-clock race, and nothing here can pass vacuously.
  await expect(status).toHaveText(/opening saved games/i)
  await expect(button).toBeDisabled()
  await expect(page.getByTestId('import-run')).toBeDisabled()
  await expect(page.getByTestId('private-session')).toHaveText('—')

  // Pressing it while unavailable cannot queue an action for later either. The
  // press must actually be delivered: a swallowed failure here would make the
  // assertion below prove nothing.
  await button.click({ force: true, timeout: 5_000 })
  await expect(page.getByTestId('private-session')).toHaveText('—')

  await releaseStorage()

  // Once boot settles the same control becomes actionable, and one activation
  // has one durable visible effect — no phantom and no double activation.
  await expect(button).toBeEnabled()
  await expect(status).not.toHaveText(/opening saved games/i)
  await expect(page.getByTestId('private-session')).toHaveText('—')
  await button.click()

  await expect(page.getByTestId('private-session')).not.toHaveText('—')
  await expect(page.getByTestId('private-revision')).toHaveText('1')
  await expect(
    page.getByTestId('event-history').getByText('SESSION_INITIALIZED', { exact: true }),
  ).toHaveCount(1)
})

for (const delayMs of [0, 500, 1500]) {
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
    await expect(page.getByTestId('game-title')).toHaveText('FRC-1 Boot Gate Game')
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
  await expect(page.getByTestId('game-title')).toHaveText('FRC-1 Boot Gate Game')

  // Reload behind a delayed storage open: the unfinished session must be
  // offered for recovery, and nothing may mutate it before that choice.
  await delayFirstStorageOpen(page, 1500)
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await ensureHostMoreOpen(page)

  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  // Recovery is a choice, not a settled boot: session commands stay unavailable.
  await expect(initialize(page)).toBeDisabled()

  await page.getByTestId('persistence-resume').click()
  await expect(initialize(page)).toBeEnabled()
  await expect(page.getByTestId('game-title')).toHaveText('FRC-1 Boot Gate Game')
})
