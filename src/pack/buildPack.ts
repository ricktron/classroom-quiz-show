import { exportGameDefinition } from '../export/exportGame'
import { isGameDefinition, type GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { ResolveMediaBytes } from './acquireMedia'
import { GAME_ENTRY_PATH, MANIFEST_PATH, PACK_EXTENSION } from './constants'
import { sha256Hex } from './hash'
import { packFailure, packIssue, type PackIssue } from './issues'
import {
  MAX_PACK_MEDIA_BYTES,
  MAX_PACK_MEDIA_COUNT,
  MAX_PACK_TOTAL_MEDIA_BYTES,
} from './limits'
import { inventoryPackMedia } from './mediaInventory'
import { sniffMediaBytes, type SniffedMediaType } from './mediaSniff'
import { buildManifest, type PackManifest } from './manifest'
import { createPackPathTracker, toPackMediaPath } from './paths'
import { encodeUtf8 } from './utf8'
import { writePackZip } from './zipWrite'

/**
 * Trusted portable-pack builder (Slice 19).
 *
 * Captures the supplied definition, exports canonical JSON through the existing
 * Slice 12 path, acquires media through an injected resolver, and emits a ZIP.
 */

export type DecodeImage = (bytes: Uint8Array, mediaType: SniffedMediaType) => Promise<boolean>

export interface BuildPackOptions {
  readonly registry?: RoundRegistry
  readonly acquireMediaBytes: ResolveMediaBytes
  readonly decodeImage?: DecodeImage
}

export type BuildPackResult =
  | {
      readonly status: 'success'
      readonly bytes: Uint8Array
      readonly filename: string
      readonly manifest: PackManifest
    }
  | { readonly status: 'failure'; readonly issues: readonly PackIssue[] }

export async function buildPackFromDefinition(
  definition: unknown,
  options: BuildPackOptions,
): Promise<BuildPackResult> {
  if (!isGameDefinition(definition)) {
    return packFailure([
      packIssue(
        'pack-canonical-import-failed',
        'game',
        '',
        'Pack export requires a trusted GameDefinition.',
      ),
    ])
  }

  const captured = definition as GameDefinition
  const registry = options.registry ?? createDefaultRegistry()

  const exported = exportGameDefinition(captured, { registry })
  if (exported.status !== 'success') {
    return packFailure([
      packIssue(
        'pack-canonical-import-failed',
        'game',
        '',
        'The game definition could not be exported to canonical JSON.',
      ),
    ])
  }

  const gameBytes = encodeUtf8(exported.jsonText)
  const gameSha256 = await sha256Hex(gameBytes)
  const inventory = inventoryPackMedia(captured)

  if (inventory.length > MAX_PACK_MEDIA_COUNT) {
    return packFailure([
      packIssue(
        'pack-too-many-media',
        'media',
        '',
        `The game references ${inventory.length} media assets, which exceeds the ${MAX_PACK_MEDIA_COUNT}-asset pack limit.`,
      ),
    ])
  }

  const mediaRows: {
    readonly sourcePath: string
    readonly bytes: Uint8Array
    readonly sha256: string
  }[] = []
  const zipMedia = new Map<string, Uint8Array>()
  const pathTracker = createPackPathTracker()
  for (const reserved of [MANIFEST_PATH, GAME_ENTRY_PATH]) {
    const reservedTrack = pathTracker.add(reserved)
    if (!reservedTrack.ok) {
      return packFailure([
        packIssue(
          reservedTrack.reason === 'duplicate' ? 'pack-duplicate-entry' : 'pack-unsafe-path',
          'container',
          reserved,
          `Pack reserved path ${JSON.stringify(reserved)} collides with another entry.`,
        ),
      ])
    }
  }
  let totalMediaBytes = 0

  for (const entry of inventory) {
    const acquired = await options.acquireMediaBytes(entry.sourcePath)
    if (acquired.status !== 'success') {
      return packFailure([acquired.issue])
    }

    const bytes = acquired.bytes
    const sniff = sniffMediaBytes(bytes)
    if (sniff.status !== 'success') {
      return packFailure([
        packIssue(
          'pack-media-type-unsupported',
          'media',
          entry.sourcePath,
          `Media at ${JSON.stringify(entry.sourcePath)} is not a supported portable-pack raster image.`,
        ),
      ])
    }

    if (options.decodeImage) {
      let decoded = false
      try {
        decoded = await options.decodeImage(bytes, sniff.mediaType)
      } catch {
        decoded = false
      }
      if (!decoded) {
        return packFailure([
          packIssue(
            'pack-media-decode-failed',
            'media',
            entry.sourcePath,
            `Media at ${JSON.stringify(entry.sourcePath)} could not be decoded as an image.`,
          ),
        ])
      }
    }

    if (bytes.length > MAX_PACK_MEDIA_BYTES) {
      return packFailure([
        packIssue(
          'pack-media-too-large',
          'media',
          entry.sourcePath,
          `Media at ${JSON.stringify(entry.sourcePath)} exceeds the ${MAX_PACK_MEDIA_BYTES}-byte per-asset limit.`,
        ),
      ])
    }

    totalMediaBytes += bytes.length
    if (totalMediaBytes > MAX_PACK_TOTAL_MEDIA_BYTES) {
      return packFailure([
        packIssue(
          'pack-media-budget-exceeded',
          'media',
          entry.sourcePath,
          `Total pack media size ${totalMediaBytes} exceeds the ${MAX_PACK_TOTAL_MEDIA_BYTES}-byte budget.`,
        ),
      ])
    }

    const packPath = toPackMediaPath(entry.sourcePath)
    if (packPath === null) {
      return packFailure([
        packIssue(
          'pack-unsafe-path',
          'media',
          entry.sourcePath,
          `Media path ${JSON.stringify(entry.sourcePath)} is not a valid pack path.`,
        ),
      ])
    }

    const tracked = pathTracker.add(packPath)
    if (!tracked.ok) {
      return packFailure([
        packIssue(
          tracked.reason === 'duplicate' ? 'pack-duplicate-entry' : 'pack-unsafe-path',
          'media',
          entry.sourcePath,
          tracked.reason === 'duplicate'
            ? `Duplicate pack entry ${JSON.stringify(packPath)}.`
            : `Case-variant collision for pack entry ${JSON.stringify(packPath)}.`,
        ),
      ])
    }

    const digest = await sha256Hex(bytes)
    mediaRows.push({ sourcePath: entry.sourcePath, bytes, sha256: digest })
    zipMedia.set(packPath, bytes)
  }

  const manifest = buildManifest({ gameBytes, gameSha256, media: mediaRows })
  const bytes = writePackZip({ manifest, gameBytes, media: zipMedia })
  const filename = `${captured.id}${PACK_EXTENSION}`

  return { status: 'success', bytes, filename, manifest }
}
