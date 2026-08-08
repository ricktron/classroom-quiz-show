import {
  ACTIVE_PACK_RESOURCE_SCOPE_KEY,
  OBJECT_STORE_COORDINATION,
  PACK_MEDIA_SCOPE_BROADCAST_CHANNEL,
} from '../persistence/constants'
import type { PersistenceAdapter } from '../persistence/adapter'
import { createIndexedDbPersistenceAdapter } from '../persistence/indexedDbAdapter'
import { loadPackMediaAssets } from './packMediaPersistence'
import {
  getSharedPackResourceRegistry,
  type PackResourceAsset,
  type PackResourceRegistry,
} from './resourceRegistry'

/**
 * Cross-tab pack resource-scope sync (Slice 19).
 *
 * Host writes the active resource-scope key into the coordination store and
 * announces the key (never bytes) on a dedicated BroadcastChannel. The display
 * tab reads IndexedDB and hydrates the shared in-memory registry so projector
 * image prompts resolve without changing PublicState.
 */

export type PackScopeAnnouncement =
  | { readonly kind: 'active'; readonly resourceScopeKey: string }
  | { readonly kind: 'clear' }

let announcedScopeKey: string | null | undefined

export async function publishActivePackResourceScope(
  adapter: PersistenceAdapter,
  resourceScopeKey: string | null,
): Promise<void> {
  const result = await adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    if (resourceScopeKey === null) {
      await tx.delete(OBJECT_STORE_COORDINATION, ACTIVE_PACK_RESOURCE_SCOPE_KEY)
    } else {
      await tx.put(OBJECT_STORE_COORDINATION, ACTIVE_PACK_RESOURCE_SCOPE_KEY, {
        resourceScopeKey,
      })
    }
  })
  if (!result.ok) return
  announcedScopeKey = resourceScopeKey
  announcePackScope(
    resourceScopeKey === null
      ? { kind: 'clear' }
      : { kind: 'active', resourceScopeKey },
  )
}

export async function readActivePackResourceScope(
  adapter: PersistenceAdapter,
): Promise<string | null> {
  let scope: string | null = null
  await adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    const stored = await tx.get(OBJECT_STORE_COORDINATION, ACTIVE_PACK_RESOURCE_SCOPE_KEY)
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return
    const key = (stored as Record<string, unknown>).resourceScopeKey
    if (typeof key === 'string' && /^[0-9a-f]{64}$/.test(key)) {
      scope = key
    }
  })
  return scope
}

export async function hydratePackRegistryFromActiveScope(
  adapter: PersistenceAdapter,
  packRegistry: PackResourceRegistry = getSharedPackResourceRegistry(),
): Promise<boolean> {
  const scopeKey = await readActivePackResourceScope(adapter)
  if (scopeKey === null) {
    if (packRegistry.scopeKey !== null) {
      packRegistry.clear()
      return true
    }
    return false
  }
  if (packRegistry.scopeKey === scopeKey) {
    return false
  }
  const records = await loadPackMediaAssets(adapter, scopeKey)
  if (records.length === 0) {
    if (packRegistry.scopeKey !== null) {
      packRegistry.clear()
      return true
    }
    return false
  }
  const assets = new Map<string, PackResourceAsset>()
  for (const record of records) {
    assets.set(record.sourcePath, {
      bytes: record.bytes,
      mediaType: record.mediaType,
      sha256: record.sha256,
    })
  }
  packRegistry.setActiveScope(scopeKey, assets)
  return true
}

/**
 * Display-safe hydration: open IndexedDB, load the published active pack scope
 * into the shared registry. Returns true when the registry changed.
 */
export async function ensureDisplayPackMediaHydration(
  packRegistry: PackResourceRegistry = getSharedPackResourceRegistry(),
): Promise<boolean> {
  const adapter = createIndexedDbPersistenceAdapter()
  const opened = await adapter.open()
  if (!opened.ok) return false
  try {
    return await hydratePackRegistryFromActiveScope(adapter, packRegistry)
  } finally {
    await adapter.close()
  }
}

export function subscribePackScopeAnnouncements(
  onAnnouncement: (announcement: PackScopeAnnouncement) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => undefined
  }
  const channel = new BroadcastChannel(PACK_MEDIA_SCOPE_BROADCAST_CHANNEL)
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return
    const record = data as Record<string, unknown>
    if (record.kind === 'clear') {
      onAnnouncement({ kind: 'clear' })
      return
    }
    if (
      record.kind === 'active' &&
      typeof record.resourceScopeKey === 'string' &&
      /^[0-9a-f]{64}$/.test(record.resourceScopeKey)
    ) {
      onAnnouncement({
        kind: 'active',
        resourceScopeKey: record.resourceScopeKey,
      })
    }
  }
  return () => {
    channel.close()
  }
}

function announcePackScope(announcement: PackScopeAnnouncement): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(PACK_MEDIA_SCOPE_BROADCAST_CHANNEL)
    channel.postMessage(announcement)
    channel.close()
  } catch {
    // Best-effort only — IndexedDB remains the durable pointer.
  }
}

/** Test helper: last announced scope in this process (undefined = never). */
export function getAnnouncedPackScopeKeyForTests(): string | null | undefined {
  return announcedScopeKey
}
