import { importGameFromJsonText, type ImportOptions } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { MANIFEST_PATH, GAME_ENTRY_PATH } from './constants'
import { sha256Hex } from './hash'
import { packFailure, packIssue, type PackIssue } from './issues'
import {
  MAX_PACK_GAME_BYTES,
  MAX_PACK_MANIFEST_BYTES,
  MAX_PACK_MEDIA_BYTES,
  MAX_PACK_MEDIA_COUNT,
  MAX_PACK_TOTAL_MEDIA_BYTES,
} from './limits'
import { inventorySourcePaths } from './mediaInventory'
import { sniffMediaBytes, type SniffedMediaType } from './mediaSniff'
import { parseManifestJson, type PackManifest } from './manifest'
import { sourcePathFromPackMediaPath, toPackMediaPath } from './paths'
import { resourceScopeKeyFromGameBytes } from './resourceScope'
import type { DecodeImage } from './buildPack'
import { decodeUtf8Strict, Utf8DecodeError } from './utf8'
import { readPackZip } from './zipRead'

/**
 * Untrusted portable-pack importer (Slice 19).
 *
 * Validates transport, container, manifest, game integrity, canonical import,
 * and exact-set media before returning staged assets. Durable commit is separate.
 */

export interface PackMediaAsset {
  readonly sourcePath: string
  readonly bytes: Uint8Array
  readonly mediaType: SniffedMediaType
  readonly sha256: string
}

export type ImportPackResult =
  | {
      readonly status: 'success'
      readonly definition: GameDefinition
      readonly gameJsonText: string
      readonly gameSha256: string
      readonly resourceScopeKey: string
      readonly mediaAssets: readonly PackMediaAsset[]
      readonly manifest: PackManifest
    }
  | { readonly status: 'failure'; readonly issues: readonly PackIssue[] }

export interface ImportPackOptions extends ImportOptions {
  readonly decodeImage?: DecodeImage
}

export interface CommitPackAssetsInput {
  readonly resourceScopeKey: string
  readonly gameId: string
  readonly gameSha256: string
  readonly mediaAssets: readonly PackMediaAsset[]
}

export interface PackAssetStorage {
  commitPackAssets(
    input: CommitPackAssetsInput,
  ): Promise<
    | { readonly status: 'success' }
    | { readonly status: 'failure'; readonly issues: readonly PackIssue[] }
  >
}

export async function commitPackAssets(
  storage: PackAssetStorage,
  input: CommitPackAssetsInput,
): Promise<
  | { readonly status: 'success' }
  | { readonly status: 'failure'; readonly issues: readonly PackIssue[] }
> {
  try {
    return await storage.commitPackAssets(input)
  } catch {
    return packFailure([
      packIssue(
        'pack-commit-failed',
        'commit',
        '',
        'Pack assets could not be committed to durable storage.',
      ),
    ])
  }
}

export async function importPackFromBytes(
  bytes: Uint8Array,
  options: ImportPackOptions = {},
): Promise<ImportPackResult> {
  const zip = await readPackZip(bytes)
  if (zip.status !== 'success') {
    return zip
  }

  const manifestBytes = zip.entries.get(MANIFEST_PATH)
  if (manifestBytes === undefined) {
    return packFailure([
      packIssue(
        'pack-manifest-missing',
        'manifest',
        MANIFEST_PATH,
        `Required manifest entry ${JSON.stringify(MANIFEST_PATH)} is missing.`,
      ),
    ])
  }

  if (manifestBytes.length > MAX_PACK_MANIFEST_BYTES) {
    return packFailure([
      packIssue(
        'pack-manifest-too-large',
        'manifest',
        MANIFEST_PATH,
        `Manifest size ${manifestBytes.length} exceeds the ${MAX_PACK_MANIFEST_BYTES}-byte limit.`,
      ),
    ])
  }

  let manifestText: string
  try {
    manifestText = decodeUtf8Strict(manifestBytes)
  } catch {
    return packFailure([
      packIssue(
        'pack-manifest-invalid',
        'manifest',
        MANIFEST_PATH,
        'Manifest is not valid UTF-8.',
      ),
    ])
  }

  const parsedManifest = parseManifestJson(manifestText)
  if (!parsedManifest.success) {
    const unknownField = parsedManifest.error.issues.find((issue) => issue.code === 'unrecognized_keys')
    if (unknownField) {
      return packFailure([
        packIssue(
          'pack-manifest-unknown-field',
          'manifest',
          MANIFEST_PATH,
          'Manifest contains unknown fields.',
        ),
      ])
    }
    return packFailure([
      packIssue(
        'pack-manifest-invalid',
        'manifest',
        MANIFEST_PATH,
        'Manifest structure is invalid.',
      ),
    ])
  }

  const manifest = parsedManifest.data

  if (manifest.media.length > MAX_PACK_MEDIA_COUNT) {
    return packFailure([
      packIssue(
        'pack-too-many-media',
        'manifest',
        'media',
        `Manifest lists ${manifest.media.length} media assets, which exceeds the ${MAX_PACK_MEDIA_COUNT}-asset limit.`,
      ),
    ])
  }

  const gameBytes = zip.entries.get(GAME_ENTRY_PATH)
  if (gameBytes === undefined) {
    return packFailure([
      packIssue(
        'pack-game-entry-missing',
        'game',
        GAME_ENTRY_PATH,
        `Required game entry ${JSON.stringify(GAME_ENTRY_PATH)} is missing.`,
      ),
    ])
  }

  if (gameBytes.length > MAX_PACK_GAME_BYTES) {
    return packFailure([
      packIssue(
        'pack-game-too-large',
        'game',
        GAME_ENTRY_PATH,
        `Game entry size ${gameBytes.length} exceeds the ${MAX_PACK_GAME_BYTES}-byte limit.`,
      ),
    ])
  }

  if (gameBytes.length !== manifest.game.byteLength) {
    return packFailure([
      packIssue(
        'pack-game-integrity-mismatch',
        'integrity',
        GAME_ENTRY_PATH,
        `Game byte length ${gameBytes.length} does not match manifest ${manifest.game.byteLength}.`,
      ),
    ])
  }

  const gameSha256 = await sha256Hex(gameBytes)
  if (gameSha256 !== manifest.game.sha256) {
    return packFailure([
      packIssue(
        'pack-game-integrity-mismatch',
        'integrity',
        GAME_ENTRY_PATH,
        'Game SHA-256 does not match the manifest.',
      ),
    ])
  }

  let gameJsonText: string
  try {
    gameJsonText = decodeUtf8Strict(gameBytes)
  } catch (error) {
    if (error instanceof Utf8DecodeError) {
      return packFailure([
        packIssue(
          'pack-canonical-import-failed',
          'game',
          GAME_ENTRY_PATH,
          'Game JSON is not valid UTF-8.',
        ),
      ])
    }
    throw error
  }

  const registry = options.registry ?? createDefaultRegistry()
  const imported = importGameFromJsonText(gameJsonText, {
    registry,
    onInternalError: options.onInternalError,
  })
  if (imported.status !== 'success') {
    return packFailure([
      packIssue(
        'pack-canonical-import-failed',
        'game',
        GAME_ENTRY_PATH,
        'Canonical game import failed.',
        { importIssues: imported.issues },
      ),
    ])
  }

  const referencedPaths = inventorySourcePaths(imported.definition)
  const manifestPaths = manifest.media.map((entry) => entry.sourcePath).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const referencedSorted = [...referencedPaths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  if (manifestPaths.length !== referencedSorted.length) {
    return packFailure([
      packIssue(
        referencedSorted.length > manifestPaths.length ? 'pack-media-missing' : 'pack-media-unreferenced',
        'media',
        '',
        'Manifest media set does not match the trusted game definition.',
      ),
    ])
  }

  for (let i = 0; i < referencedSorted.length; i += 1) {
    if (referencedSorted[i] !== manifestPaths[i]) {
      return packFailure([
        packIssue(
          'pack-media-missing',
          'media',
          referencedSorted[i] ?? '',
          'Manifest media set does not match the trusted game definition.',
        ),
      ])
    }
  }

  const zipMediaPaths = [...zip.entries.keys()]
    .filter((path) => sourcePathFromPackMediaPath(path) !== null)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const expectedZipMediaPaths = manifest.media
    .map((entry) => entry.packPath)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  if (zipMediaPaths.length !== expectedZipMediaPaths.length) {
    return packFailure([
      packIssue(
        'pack-media-unreferenced',
        'media',
        '',
        'ZIP media entries do not match the manifest.',
      ),
    ])
  }

  for (let i = 0; i < expectedZipMediaPaths.length; i += 1) {
    if (zipMediaPaths[i] !== expectedZipMediaPaths[i]) {
      return packFailure([
        packIssue(
          'pack-media-unreferenced',
          'media',
          zipMediaPaths[i] ?? '',
          'ZIP media entries do not match the manifest.',
        ),
      ])
    }
  }

  const unexpectedEntries = [...zip.entries.keys()].filter(
    (path) => path !== MANIFEST_PATH && path !== GAME_ENTRY_PATH && sourcePathFromPackMediaPath(path) === null,
  )
  if (unexpectedEntries.length > 0) {
    return packFailure([
      packIssue(
        'pack-unexpected-entry',
        'container',
        unexpectedEntries[0] ?? '',
        `Unexpected pack entry ${JSON.stringify(unexpectedEntries[0])}.`,
      ),
    ])
  }

  const mediaAssets: PackMediaAsset[] = []
  let totalMediaBytes = 0

  for (const row of manifest.media) {
    const expectedPackPath = toPackMediaPath(row.sourcePath)
    if (expectedPackPath === null || expectedPackPath !== row.packPath) {
      return packFailure([
        packIssue(
          'pack-media-missing',
          'media',
          row.sourcePath,
          `Manifest pack path ${JSON.stringify(row.packPath)} is not the deterministic mapping for ${JSON.stringify(row.sourcePath)}.`,
        ),
      ])
    }

    const mediaBytes = zip.entries.get(row.packPath)
    if (mediaBytes === undefined) {
      return packFailure([
        packIssue(
          'pack-media-missing',
          'media',
          row.sourcePath,
          `Media entry ${JSON.stringify(row.packPath)} is missing from the pack.`,
        ),
      ])
    }

    if (mediaBytes.length !== row.byteLength) {
      return packFailure([
        packIssue(
          'pack-media-integrity-mismatch',
          'integrity',
          row.packPath,
          `Media byte length ${mediaBytes.length} does not match manifest ${row.byteLength}.`,
        ),
      ])
    }

    const mediaSha256 = await sha256Hex(mediaBytes)
    if (mediaSha256 !== row.sha256) {
      return packFailure([
        packIssue(
          'pack-media-integrity-mismatch',
          'integrity',
          row.packPath,
          'Media SHA-256 does not match the manifest.',
        ),
      ])
    }

    if (mediaBytes.length > MAX_PACK_MEDIA_BYTES) {
      return packFailure([
        packIssue(
          'pack-media-too-large',
          'media',
          row.sourcePath,
          `Media at ${JSON.stringify(row.sourcePath)} exceeds the ${MAX_PACK_MEDIA_BYTES}-byte limit.`,
        ),
      ])
    }

    totalMediaBytes += mediaBytes.length
    if (totalMediaBytes > MAX_PACK_TOTAL_MEDIA_BYTES) {
      return packFailure([
        packIssue(
          'pack-media-budget-exceeded',
          'media',
          row.sourcePath,
          `Total media size ${totalMediaBytes} exceeds the ${MAX_PACK_TOTAL_MEDIA_BYTES}-byte budget.`,
        ),
      ])
    }

    const sniff = sniffMediaBytes(mediaBytes)
    if (sniff.status !== 'success') {
      return packFailure([
        packIssue(
          'pack-media-type-unsupported',
          'media',
          row.sourcePath,
          `Media at ${JSON.stringify(row.sourcePath)} is not a supported portable-pack raster image.`,
        ),
      ])
    }

    if (options.decodeImage) {
      let decoded = false
      try {
        decoded = await options.decodeImage(mediaBytes, sniff.mediaType)
      } catch {
        decoded = false
      }
      if (!decoded) {
        return packFailure([
          packIssue(
            'pack-media-decode-failed',
            'media',
            row.sourcePath,
            `Media at ${JSON.stringify(row.sourcePath)} could not be decoded as an image.`,
          ),
        ])
      }
    }

    mediaAssets.push({
      sourcePath: row.sourcePath,
      bytes: mediaBytes,
      mediaType: sniff.mediaType,
      sha256: mediaSha256,
    })
  }

  const resourceScopeKey = await resourceScopeKeyFromGameBytes(gameBytes)

  return {
    status: 'success',
    definition: imported.definition,
    gameJsonText,
    gameSha256,
    resourceScopeKey,
    mediaAssets,
    manifest,
  }
}
