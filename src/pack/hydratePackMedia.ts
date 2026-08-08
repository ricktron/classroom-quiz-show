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
 */

export async function hydratePackMediaForDefinition(
  adapter: PersistenceAdapter,
  definition: GameDefinition,
  packRegistry: PackResourceRegistry,
  roundRegistry: RoundRegistry,
): Promise<void> {
  const exported = exportGameDefinition(definition, { registry: roundRegistry })
  if (exported.status !== 'success') {
    packRegistry.clear()
    return
  }
  await hydratePackMediaForGameText(adapter, exported.jsonText, packRegistry)
}

export async function hydratePackMediaForGameText(
  adapter: PersistenceAdapter,
  gameJsonText: string,
  packRegistry: PackResourceRegistry,
): Promise<void> {
  const scopeKey = await resourceScopeKeyFromGameText(gameJsonText)
  const records = await loadPackMediaAssets(adapter, scopeKey)
  if (records.length === 0) {
    packRegistry.clear()
    await publishActivePackResourceScope(adapter, null)
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
  packRegistry.setActiveScope(scopeKey, assets)
  await publishActivePackResourceScope(adapter, scopeKey)
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
