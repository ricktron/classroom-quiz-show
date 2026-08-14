import { test, expect, type Page } from '@playwright/test'
import {
  HOST_WRITER_LEASE_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  OBJECT_STORE_COORDINATION,
  OBJECT_STORE_PACK_MEDIA_ASSETS,
  OBJECT_STORE_SAVED_DEFINITIONS,
  OBJECT_STORE_SONY_BUZZ_MAPPINGS,
  PERSISTENCE_DB_NAME,
  PERSISTENCE_DB_VERSION,
  ACTIVE_PACK_RESOURCE_SCOPE_KEY,
} from '../../src/persistence/constants'
import { SONY_BUZZ_MAPPING_RECORD_KEY } from '../../src/persistence/sonyBuzzMappingStore'
import { KEYBOARD_MAPPING_STORAGE_KEY } from '../../src/input/keyboardMappingStore'
import {
  SONY_BUZZ_MAPPING_VERSION,
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_VERSION,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
} from '../../src/input/sonyBuzzSupportedProfile'

/**
 * Slice 23 Class-A repair — aggregate local-data reset (CQS-Q23-HIGH-03).
 *
 * Uses teacher-visible Host controls for the wipe. Technical IndexedDB inspection
 * proves store deletion afterward. Does not inject success through internals.
 */

test.describe.configure({ mode: 'serial' })

const SAMPLE_TITLE = 'Earth & Space Science Board'

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(/loading/i)
}

async function waitForSaved(host: Page) {
  await expect(host.getByTestId('persistence-status')).toHaveText(/saved locally|ready/i)
}

async function startBoard(host: Page) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByRole('button', { name: /load category-board sample file/i }).click()
  await host.getByTestId('import-run').click()
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await expect(host.getByTestId('game-title')).toHaveText(SAMPLE_TITLE)
  await waitForSaved(host)
}

/** Seed stores that are awkward to create through the ordinary Host path. */
async function seedSupplementalStores(page: Page): Promise<void> {
  await page.evaluate(
    async ({
      dbName,
      dbVersion,
      completedStore,
      packStore,
      sonyStore,
      coordinationStore,
      packScopeKey,
      summaryKey,
      packAssetKey,
      sonyKey,
      keyboardKey,
      sonyRecord,
    }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(dbName, dbVersion)
        open.onerror = () => reject(open.error ?? new Error('seed open failed'))
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(
            [completedStore, packStore, sonyStore, coordinationStore],
            'readwrite',
          )
          tx.objectStore(completedStore).put(
            {
              kind: 'classroom-quiz-show/completed-summary-record',
              recordVersion: 1,
              recordId: summaryKey,
              savedAt: Date.now(),
            },
            summaryKey,
          )
          tx.objectStore(packStore).put(
            {
              resourceScopeKey: 'seed-scope',
              sourcePath: 'media/seed.png',
              mediaType: 'image/png',
              bytes: new Uint8Array([1, 2, 3]),
            },
            packAssetKey,
          )
          tx.objectStore(sonyStore).put(sonyRecord, sonyKey)
          tx.objectStore(coordinationStore).put(
            { resourceScopeKey: 'seed-scope', updatedAt: Date.now() },
            packScopeKey,
          )
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error ?? new Error('seed tx failed'))
        }
      })
      localStorage.setItem(
        keyboardKey,
        JSON.stringify({
          version: 1,
          bindings: [{ code: 'KeyQ', teamId: 'team-a', action: { kind: 'primary-buzz' } }],
        }),
      )
    },
    {
      dbName: PERSISTENCE_DB_NAME,
      dbVersion: PERSISTENCE_DB_VERSION,
      completedStore: OBJECT_STORE_COMPLETED_SUMMARIES,
      packStore: OBJECT_STORE_PACK_MEDIA_ASSETS,
      sonyStore: OBJECT_STORE_SONY_BUZZ_MAPPINGS,
      coordinationStore: OBJECT_STORE_COORDINATION,
      packScopeKey: ACTIVE_PACK_RESOURCE_SCOPE_KEY,
      summaryKey: 'seed-summary',
      packAssetKey: 'seed-scope\0media/seed.png',
      sonyKey: SONY_BUZZ_MAPPING_RECORD_KEY,
      keyboardKey: KEYBOARD_MAPPING_STORAGE_KEY,
      sonyRecord: {
        mappingVersion: SONY_BUZZ_MAPPING_VERSION,
        supportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
        supportedProfileVersion: SONY_BUZZ_SUPPORTED_PROFILE_VERSION,
        vendorId: SONY_BUZZ_SUPPORTED_VENDOR_ID,
        productId: SONY_BUZZ_SUPPORTED_PRODUCT_ID,
        gameId: 'seed-game',
        teamSignature: 'team-a',
        associations: [{ slotId: 1, teamId: 'team-a' }],
        updatedAt: new Date().toISOString(),
        optedIn: true,
      },
    },
  )
}

async function readStorageInventory(page: Page): Promise<{
  storeCounts: Record<string, number>
  keyboardPresent: boolean
  coordinationKeys: string[]
}> {
  return page.evaluate(
    async ({ dbName, stores, keyboardKey }) => {
      const keyboardPresent = localStorage.getItem(keyboardKey) !== null
      const empty = {
        storeCounts: Object.fromEntries(stores.map((store) => [store, 0])) as Record<
          string,
          number
        >,
        keyboardPresent,
        coordinationKeys: [] as string[],
      }

      const databases =
        typeof indexedDB.databases === 'function' ? await indexedDB.databases() : null
      if (databases !== null && !databases.some((entry) => entry.name === dbName)) {
        return empty
      }

      return new Promise((resolve, reject) => {
        const open = indexedDB.open(dbName)
        open.onerror = () => reject(open.error ?? new Error('inventory open failed'))
        open.onsuccess = () => {
          const db = open.result
          const existing = stores.filter((store) => db.objectStoreNames.contains(store))
          if (existing.length === 0) {
            db.close()
            resolve(empty)
            return
          }
          const tx = db.transaction(existing, 'readonly')
          const storeCounts: Record<string, number> = Object.fromEntries(
            stores.map((store) => [store, 0]),
          )
          let coordinationKeys: string[] = []
          let pending = existing.length
          for (const store of existing) {
            const countReq = tx.objectStore(store).count()
            countReq.onsuccess = () => {
              storeCounts[store] = countReq.result
              if (store === 'coordination') {
                const keysReq = tx.objectStore(store).getAllKeys()
                keysReq.onsuccess = () => {
                  coordinationKeys = keysReq.result
                    .map(String)
                    .filter((key) => typeof key === 'string')
                  pending -= 1
                  if (pending === 0) {
                    db.close()
                    resolve({ storeCounts, keyboardPresent, coordinationKeys })
                  }
                }
                keysReq.onerror = () => reject(keysReq.error ?? new Error('keys failed'))
                return
              }
              pending -= 1
              if (pending === 0) {
                db.close()
                resolve({ storeCounts, keyboardPresent, coordinationKeys })
              }
            }
            countReq.onerror = () => reject(countReq.error ?? new Error('count failed'))
          }
        }
      })
    },
    {
      dbName: PERSISTENCE_DB_NAME,
      stores: [
        OBJECT_STORE_SAVED_DEFINITIONS,
        OBJECT_STORE_ACTIVE_SESSIONS,
        OBJECT_STORE_COORDINATION,
        OBJECT_STORE_COMPLETED_SUMMARIES,
        OBJECT_STORE_PACK_MEDIA_ASSETS,
        OBJECT_STORE_SONY_BUZZ_MAPPINGS,
      ],
      keyboardKey: KEYBOARD_MAPPING_STORAGE_KEY,
    },
  )
}

test('teacher clear-all removes every CQS local store and returns a clean first-run host', async ({
  page,
}) => {
  await openHost(page)
  await startBoard(page)
  await page.getByTestId('persistence-save').click()
  await expect(page.getByTestId('persistence-library')).toContainText(SAMPLE_TITLE)

  // Leave Host so the live adapter releases IndexedDB before supplemental seeding.
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await page.waitForTimeout(250)
  await seedSupplementalStores(page)

  const before = await readStorageInventory(page)
  expect(before.keyboardPresent).toBe(true)
  expect(before.storeCounts[OBJECT_STORE_SAVED_DEFINITIONS] ?? 0).toBeGreaterThan(0)
  expect(before.storeCounts[OBJECT_STORE_ACTIVE_SESSIONS] ?? 0).toBeGreaterThan(0)
  expect(before.storeCounts[OBJECT_STORE_COORDINATION] ?? 0).toBeGreaterThan(0)
  expect(before.storeCounts[OBJECT_STORE_COMPLETED_SUMMARIES] ?? 0).toBeGreaterThan(0)
  expect(before.storeCounts[OBJECT_STORE_PACK_MEDIA_ASSETS] ?? 0).toBeGreaterThan(0)
  expect(before.storeCounts[OBJECT_STORE_SONY_BUZZ_MAPPINGS] ?? 0).toBeGreaterThan(0)

  await openHost(page)
  await expect(page.getByTestId('persistence-clear-all')).toBeVisible()
  await expect(page.getByRole('heading', { name: /clear all local cqs data/i })).toBeVisible()

  // Cancel confirmation changes nothing.
  await page.getByTestId('persistence-clear-all-action').click()
  await expect(page.getByTestId('persistence-clear-all-warning')).toBeVisible()
  await page.getByTestId('persistence-clear-all-cancel').click()
  await expect(page.getByTestId('persistence-clear-all-warning')).toHaveCount(0)

  await page.getByTestId('persistence-clear-all-action').click()
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.getByTestId('persistence-clear-all-action').click(),
  ])

  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(/loading/i)
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('persistence-library')).toContainText(/no saved definitions yet/i)
  await expect(page.getByRole('heading', { name: /ready to run class/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /load a game/i })).toBeVisible()

  const after = await readStorageInventory(page)
  expect(after.keyboardPresent).toBe(false)
  expect(after.storeCounts[OBJECT_STORE_SAVED_DEFINITIONS] ?? 0).toBe(0)
  expect(after.storeCounts[OBJECT_STORE_ACTIVE_SESSIONS] ?? 0).toBe(0)
  expect(after.storeCounts[OBJECT_STORE_COMPLETED_SUMMARIES] ?? 0).toBe(0)
  expect(after.storeCounts[OBJECT_STORE_PACK_MEDIA_ASSETS] ?? 0).toBe(0)
  expect(after.storeCounts[OBJECT_STORE_SONY_BUZZ_MAPPINGS] ?? 0).toBe(0)
  // Fresh boot may recreate only the live host-writer lease — never the seeded pack scope.
  expect(after.coordinationKeys).not.toContain(ACTIVE_PACK_RESOURCE_SCOPE_KEY)
  for (const key of after.coordinationKeys) {
    expect(key === HOST_WRITER_LEASE_KEY || key === ACTIVE_PACK_RESOURCE_SCOPE_KEY).toBe(true)
  }

  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('persistence-library')).toContainText(/no saved definitions yet/i)
})
