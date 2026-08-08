import { exportGameDefinition } from '../export/exportGame'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import type { PersistenceAdapter } from '../persistence/adapter'
import { OBJECT_STORE_SAVED_DEFINITIONS } from '../persistence/constants'
import { loadPackMediaAssets } from './packMediaPersistence'
import { publishActivePackResourceScope } from './packMediaScopeSync'
import type { PackResourceAsset, PackResourceRegistry } from './resourceRegistry'
import { resourceScopeKeyFromGameText } from './resourceScope'

/**
 * Runtime pack-media hydration (Slice 19).
 *
 * Loads durable assets for a definition's resource scope and activates them in
 * the shared in-memory registry used by media resolution.
 *
 * Callers that fire overlapping hydrations must pass `isCurrent` so a stale
 * asynchronous completion cannot reactivate an older resource scope.
 */

export interface PackMediaHydrationOptions {
  /** Latest-request-wins guard: return false when a newer hydration/clear superseded this one. */
  readonly isCurrent?: () => boolean
}

type PendingPublish = {
  readonly adapter: PersistenceAdapter
  readonly resourceScopeKey: string | null
}

let pendingPublish: PendingPublish | null = null
let publishPumpActive = false

/**
 * Coalesce active-scope publications so the latest requested key wins.
 * Prevents a slow stale `publish(null)` from clobbering a newer hydration.
 */
export function enqueueActivePackResourceScopePublish(
  adapter: PersistenceAdapter,
  resourceScopeKey: string | null,
): void {
  pendingPublish = { adapter, resourceScopeKey }
  void pumpActivePackResourceScopePublish()
}

async function pumpActivePackResourceScopePublish(): Promise<void> {
  if (publishPumpActive) return
  publishPumpActive = true
  try {
    while (pendingPublish !== null) {
      const job = pendingPublish
      pendingPublish = null
      await publishActivePackResourceScope(job.adapter, job.resourceScopeKey)
    }
  } finally {
    publishPumpActive = false
    if (pendingPublish !== null) {
      void pumpActivePackResourceScopePublish()
    }
  }
}

export async function hydratePackMediaForDefinition(
  adapter: PersistenceAdapter,
  definition: GameDefinition,
  packRegistry: PackResourceRegistry,
  roundRegistry: RoundRegistry,
  options: PackMediaHydrationOptions = {},
): Promise<void> {
  const exported = exportGameDefinition(definition, { registry: roundRegistry })
  if (exported.status !== 'success') {
    if (options.isCurrent && !options.isCurrent()) return
    packRegistry.clear()
    return
  }
  await hydratePackMediaForGameText(adapter, exported.jsonText, packRegistry, options)
}

export async function hydratePackMediaForGameText(
  adapter: PersistenceAdapter,
  gameJsonText: string,
  packRegistry: PackResourceRegistry,
  options: PackMediaHydrationOptions = {},
): Promise<void> {
  const scopeKey = await resourceScopeKeyFromGameText(gameJsonText)
  if (options.isCurrent && !options.isCurrent()) return

  const records = await loadPackMediaAssets(adapter, scopeKey)
  if (options.isCurrent && !options.isCurrent()) return

  if (records.length === 0) {
    packRegistry.clear()
    enqueueActivePackResourceScopePublish(adapter, null)
    return
  }

  const assets = new Map<string, PackResourceAsset>()
  for (const record of records) {
    assets.set(record.sourcePath, {
      bytes: record.bytes,
      mediaType: record.mediaType,
      sha256: record.sha256,
    })
  }

  if (options.isCurrent && !options.isCurrent()) return

  packRegistry.setActiveScope(scopeKey, assets)
  enqueueActivePackResourceScopePublish(adapter, scopeKey)
}

export async function collectReferencedPackScopeKeys(
  adapter: PersistenceAdapter,
  options: {
    readonly activeDefinition: GameDefinition | null
    readonly roundRegistry: RoundRegistry
  },
): Promise<ReadonlySet<string>> {
  const keys = new Set<string>()

  if (options.activeDefinition !== null) {
    const exported = exportGameDefinition(options.activeDefinition, {
      registry: options.roundRegistry,
    })
    if (exported.status === 'success') {
      keys.add(await resourceScopeKeyFromGameText(exported.jsonText))
    }
  }

  const jsonTexts: string[] = []
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const records = await tx.getAll(OBJECT_STORE_SAVED_DEFINITIONS)
    for (const stored of records) {
      if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) continue
      const jsonText = (stored as Record<string, unknown>).jsonText
      if (typeof jsonText === 'string' && jsonText.length > 0) {
        jsonTexts.push(jsonText)
      }
    }
  })
  if (!result.ok) return keys

  for (const jsonText of jsonTexts) {
    keys.add(await resourceScopeKeyFromGameText(jsonText))
  }
  return keys
}
