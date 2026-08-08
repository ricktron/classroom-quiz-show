import type { PersistenceAdapter } from '../persistence/adapter'
import { OBJECT_STORE_PACK_MEDIA_ASSETS } from '../persistence/constants'
import type { CommitPackAssetsInput, PackAssetStorage, PackMediaAsset } from './importPack'
import { packFailure, packIssue } from './issues'
import type { SniffedMediaType } from './mediaSniff'

/**
 * Durable pack media persistence (Slice 19).
 *
 * Stores validated media bytes keyed by resource scope + source path. Scope
 * replacement is atomic: one transaction deletes prior keys for the scope then
 * writes the new asset set.
 */

export interface PackMediaAssetRecord {
  readonly resourceScopeKey: string
  readonly gameId: string
  readonly gameSha256: string
  readonly sourcePath: string
  readonly byteLength: number
  readonly sha256: string
  readonly mediaType: SniffedMediaType
  readonly bytes: Uint8Array
}

const SCOPE_KEY_SEPARATOR = '\0'

export function packMediaStorageKey(resourceScopeKey: string, sourcePath: string): string {
  return `${resourceScopeKey}${SCOPE_KEY_SEPARATOR}${sourcePath}`
}

export function parsePackMediaStorageKey(
  key: string,
): { readonly resourceScopeKey: string; readonly sourcePath: string } | null {
  const index = key.indexOf(SCOPE_KEY_SEPARATOR)
  if (index <= 0 || index >= key.length - 1) return null
  return {
    resourceScopeKey: key.slice(0, index),
    sourcePath: key.slice(index + SCOPE_KEY_SEPARATOR.length),
  }
}

export async function commitPackMediaAssets(
  adapter: PersistenceAdapter,
  input: CommitPackAssetsInput,
): Promise<
  | { readonly status: 'success' }
  | { readonly status: 'failure'; readonly issues: readonly import('./issues').PackIssue[] }
> {
  const records = input.mediaAssets.map((asset) => toRecord(input, asset))
  let failed = false

  const result = await adapter.withTransaction([OBJECT_STORE_PACK_MEDIA_ASSETS], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
    for (const key of keys) {
      const parsed = parsePackMediaStorageKey(key)
      if (parsed?.resourceScopeKey === input.resourceScopeKey) {
        await tx.delete(OBJECT_STORE_PACK_MEDIA_ASSETS, key)
      }
    }
    for (const record of records) {
      await tx.put(
        OBJECT_STORE_PACK_MEDIA_ASSETS,
        packMediaStorageKey(record.resourceScopeKey, record.sourcePath),
        serializeRecord(record),
      )
    }
  })

  if (!result.ok) {
    failed = true
  }

  if (failed) {
    return packFailure([
      packIssue(
        'pack-commit-failed',
        'commit',
        '',
        'Pack assets could not be committed to durable storage.',
      ),
    ])
  }
  return { status: 'success' }
}

export async function loadPackMediaAssets(
  adapter: PersistenceAdapter,
  resourceScopeKey: string,
): Promise<readonly PackMediaAssetRecord[]> {
  const loaded: PackMediaAssetRecord[] = []
  const result = await adapter.withTransaction([OBJECT_STORE_PACK_MEDIA_ASSETS], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
    for (const key of keys) {
      const parsed = parsePackMediaStorageKey(key)
      if (parsed?.resourceScopeKey !== resourceScopeKey) continue
      const stored = await tx.get(OBJECT_STORE_PACK_MEDIA_ASSETS, key)
      const record = deserializeRecord(stored)
      if (record !== null) loaded.push(record)
    }
  })
  if (!result.ok) return []
  loaded.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  return loaded
}

export async function deletePackMediaScope(
  adapter: PersistenceAdapter,
  resourceScopeKey: string,
): Promise<void> {
  await adapter.withTransaction([OBJECT_STORE_PACK_MEDIA_ASSETS], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
    for (const key of keys) {
      const parsed = parsePackMediaStorageKey(key)
      if (parsed?.resourceScopeKey === resourceScopeKey) {
        await tx.delete(OBJECT_STORE_PACK_MEDIA_ASSETS, key)
      }
    }
  })
}

export async function listPackMediaScopeKeys(
  adapter: PersistenceAdapter,
): Promise<readonly string[]> {
  const scopes = new Set<string>()
  const result = await adapter.withTransaction([OBJECT_STORE_PACK_MEDIA_ASSETS], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
    for (const key of keys) {
      const parsed = parsePackMediaStorageKey(key)
      if (parsed) scopes.add(parsed.resourceScopeKey)
    }
  })
  if (!result.ok) return []
  return [...scopes].sort((a, b) => a.localeCompare(b, 'en'))
}

export async function clearAllPackMediaAssets(adapter: PersistenceAdapter): Promise<void> {
  await adapter.withTransaction([OBJECT_STORE_PACK_MEDIA_ASSETS], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
    for (const key of keys) {
      await tx.delete(OBJECT_STORE_PACK_MEDIA_ASSETS, key)
    }
  })
}

export async function gcUnreferencedPackScopes(
  adapter: PersistenceAdapter,
  options: { readonly keepScopeKeys: ReadonlySet<string> },
): Promise<void> {
  const existing = await listPackMediaScopeKeys(adapter)
  for (const scopeKey of existing) {
    if (!options.keepScopeKeys.has(scopeKey)) {
      await deletePackMediaScope(adapter, scopeKey)
    }
  }
}

export function createPackAssetStorage(adapter: PersistenceAdapter): PackAssetStorage {
  return {
    commitPackAssets: (input) => commitPackMediaAssets(adapter, input),
  }
}

function toRecord(input: CommitPackAssetsInput, asset: PackMediaAsset): PackMediaAssetRecord {
  return {
    resourceScopeKey: input.resourceScopeKey,
    gameId: input.gameId,
    gameSha256: input.gameSha256,
    sourcePath: asset.sourcePath,
    byteLength: asset.bytes.length,
    sha256: asset.sha256,
    mediaType: asset.mediaType,
    bytes: asset.bytes,
  }
}

interface StoredPackMediaAssetRecord {
  readonly resourceScopeKey: string
  readonly gameId: string
  readonly gameSha256: string
  readonly sourcePath: string
  readonly byteLength: number
  readonly sha256: string
  readonly mediaType: SniffedMediaType
  readonly bytes: number[]
}

function serializeRecord(record: PackMediaAssetRecord): StoredPackMediaAssetRecord {
  return {
    resourceScopeKey: record.resourceScopeKey,
    gameId: record.gameId,
    gameSha256: record.gameSha256,
    sourcePath: record.sourcePath,
    byteLength: record.byteLength,
    sha256: record.sha256,
    mediaType: record.mediaType,
    bytes: [...record.bytes],
  }
}

function deserializeRecord(input: unknown): PackMediaAssetRecord | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const record = input as StoredPackMediaAssetRecord
  if (typeof record.resourceScopeKey !== 'string' || record.resourceScopeKey.length === 0) return null
  if (typeof record.gameId !== 'string' || record.gameId.length === 0) return null
  if (typeof record.gameSha256 !== 'string' || record.gameSha256.length === 0) return null
  if (typeof record.sourcePath !== 'string' || record.sourcePath.length === 0) return null
  if (typeof record.byteLength !== 'number' || !Number.isInteger(record.byteLength)) return null
  if (typeof record.sha256 !== 'string' || record.sha256.length === 0) return null
  if (typeof record.mediaType !== 'string') return null
  if (!Array.isArray(record.bytes)) return null
  const bytes = Uint8Array.from(record.bytes)
  if (bytes.length !== record.byteLength) return null
  return {
    resourceScopeKey: record.resourceScopeKey,
    gameId: record.gameId,
    gameSha256: record.gameSha256,
    sourcePath: record.sourcePath,
    byteLength: record.byteLength,
    sha256: record.sha256,
    mediaType: record.mediaType,
    bytes,
  }
}
