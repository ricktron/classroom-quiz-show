import { describe, expect, it, vi } from 'vitest'
import { buildPackFromDefinition } from './buildPack'
import { importPackFromBytes } from './importPack'
import { importGameFromUnknown } from '../import/importGame'
import {
  boardGameFile,
  boardConfig,
  category,
  imagePrompt,
  tile,
} from '../test/categoryBoardFixtures'
import { TINY_PNG_BYTES } from './testFixtures'
import type { ResolveMediaBytes } from './acquireMedia'
import { resourceScopeKeyFromGameText } from './resourceScope'
import { exportGameDefinition } from '../export/exportGame'
import { createRegistryMediaResolver, registryFromAssets } from './acquireMedia'
import type { PackResourceAsset } from './resourceRegistry'
import { buildManifest } from './manifest'
import { sha256Hex } from './hash'
import { encodeUtf8 } from './utf8'
import { writePackZip } from './zipWrite'
import { MAX_PACK_MEDIA_BYTES, MAX_PACK_TOTAL_MEDIA_BYTES } from './limits'

const PNG_PATH = 'media-fixtures/slice-11-clue.png'

function pngResolver(bytes: Uint8Array = TINY_PNG_BYTES): ResolveMediaBytes {
  return async (sourcePath) => ({
    status: 'success',
    bytes: sourcePath === PNG_PATH ? bytes : new Uint8Array([0x00]),
  })
}

function pngSized(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  bytes.set(TINY_PNG_BYTES)
  return bytes
}

function pathResolver(map: ReadonlyMap<string, Uint8Array>): ResolveMediaBytes {
  return async (sourcePath) => {
    const bytes = map.get(sourcePath)
    if (!bytes) {
      return {
        status: 'failure',
        issue: {
          code: 'pack-media-acquisition-failed',
          stage: 'media',
          path: sourcePath,
          message: 'missing',
        },
      }
    }
    return { status: 'success', bytes }
  }
}

async function alwaysDecode(): Promise<boolean> {
  return true
}

describe('pack build/import round trip', () => {
  it('builds and imports a text-only pack', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const roundTrip = await importPackFromBytes(built.bytes)
    expect(roundTrip.status).toBe('success')
    if (roundTrip.status !== 'success') return
    expect(roundTrip.mediaAssets).toEqual([])
    expect(roundTrip.definition.id).toBe(imported.definition.id)
    expect(roundTrip.gameJsonText).toBe(
      (() => {
        const exported = exportGameDefinition(imported.definition)
        if (exported.status !== 'success') throw new Error('export failed')
        return exported.jsonText
      })(),
    )
  })

  it('round-trips synthetic PNG media bytes', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.filename.endsWith('.cqs-pack')).toBe(true)

    const roundTrip = await importPackFromBytes(built.bytes)
    expect(roundTrip.status).toBe('success')
    if (roundTrip.status !== 'success') return
    expect(roundTrip.mediaAssets).toHaveLength(1)
    expect(roundTrip.mediaAssets[0]?.sourcePath).toBe(PNG_PATH)
    expect(roundTrip.mediaAssets[0]?.mediaType).toBe('image/png')
    expect([...roundTrip.mediaAssets[0]?.bytes ?? []]).toEqual([...TINY_PNG_BYTES])

    const scope = await resourceScopeKeyFromGameText(roundTrip.gameJsonText)
    expect(roundTrip.resourceScopeKey).toBe(scope)
  })

  it('re-exports imported pack media from a local registry without network fetch', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const staged = await importPackFromBytes(built.bytes)
    expect(staged.status).toBe('success')
    if (staged.status !== 'success') return

    const assets = new Map<string, PackResourceAsset>()
    for (const asset of staged.mediaAssets) {
      assets.set(asset.sourcePath, {
        bytes: asset.bytes,
        mediaType: asset.mediaType,
        sha256: asset.sha256,
      })
    }

    const reexported = await buildPackFromDefinition(staged.definition, {
      acquireMediaBytes: createRegistryMediaResolver(registryFromAssets(assets)),
    })
    expect(reexported.status).toBe('success')
    if (reexported.status !== 'success') return

    const secondImport = await importPackFromBytes(reexported.bytes)
    expect(secondImport.status).toBe('success')
  })

  it('surfaces nested canonical import diagnostics for invalid game JSON', async () => {
    const gameBytes = encodeUtf8('{ "format": ')
    const gameSha256 = await sha256Hex(gameBytes)
    const manifest = buildManifest({ gameBytes, gameSha256, media: [] })
    const bytes = writePackZip({ manifest, gameBytes, media: new Map() })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-canonical-import-failed')
    expect(result.issues[0]?.importIssues?.length).toBeGreaterThan(0)
  })

  it('accepts a single media asset of exactly MAX_PACK_MEDIA_BYTES and rejects +1', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const exact = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(pngSized(MAX_PACK_MEDIA_BYTES)),
      decodeImage: alwaysDecode,
    })
    expect(exact.status).toBe('success')
    if (exact.status !== 'success') return

    const roundTrip = await importPackFromBytes(exact.bytes, { decodeImage: alwaysDecode })
    expect(roundTrip.status).toBe('success')

    const over = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(pngSized(MAX_PACK_MEDIA_BYTES + 1)),
      decodeImage: alwaysDecode,
    })
    expect(over.status).toBe('failure')
    if (over.status !== 'failure') return
    expect(over.issues[0]?.code).toBe('pack-media-too-large')
  })

  it('rejects MAX_PACK_MEDIA_BYTES + 1 before decodeImage runs', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const decodeImage = vi.fn(async () => true)
    const over = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(pngSized(MAX_PACK_MEDIA_BYTES + 1)),
      decodeImage,
    })
    expect(over.status).toBe('failure')
    if (over.status !== 'failure') return
    expect(over.issues[0]?.code).toBe('pack-media-too-large')
    expect(decodeImage).toHaveBeenCalledTimes(0)
  })

  it('rejects cumulative over-budget media before decoding the over-budget asset', async () => {
    const paths = Array.from({ length: 7 }, (_, index) => `media-fixtures/decode-budget-${index}.png`)
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: paths.map((path, index) =>
              tile(`a-${index}`, {
                prompt: imagePrompt({
                  source: { kind: 'same-origin-path', path },
                }),
              }),
            ),
          }),
        ],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const base = Math.floor(MAX_PACK_TOTAL_MEDIA_BYTES / 7)
    const sizes = Array.from({ length: 7 }, () => base)
    let sum = base * 7
    let cursor = 0
    while (sum < MAX_PACK_TOTAL_MEDIA_BYTES + 1) {
      sizes[cursor % sizes.length]! += 1
      sum += 1
      cursor += 1
    }
    expect(sizes.every((size) => size <= MAX_PACK_MEDIA_BYTES)).toBe(true)

    const decodeImage = vi.fn(async () => true)
    const overBudget = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pathResolver(
        new Map(paths.map((path, index) => [path, pngSized(sizes[index]!)])),
      ),
      decodeImage,
    })
    expect(overBudget.status).toBe('failure')
    if (overBudget.status !== 'failure') return
    expect(overBudget.issues[0]?.code).toBe('pack-media-budget-exceeded')
    // The failing asset must not be decoded; prior in-budget assets may be.
    expect(decodeImage.mock.calls.length).toBeLessThan(paths.length)
  })

  it('accepts cumulative media of exactly MAX_PACK_TOTAL_MEDIA_BYTES and rejects +1', async () => {
    // Six max-sized assets are the only way to hit the cumulative ceiling exactly
    // without exceeding the per-asset cap (6 × 4 MiB = 24 MiB).
    const exactPaths = Array.from({ length: 6 }, (_, index) => `media-fixtures/budget-${index}.png`)
    const exactImported = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: exactPaths.map((path, index) =>
              tile(`a-${index}`, {
                prompt: imagePrompt({
                  source: { kind: 'same-origin-path', path },
                }),
              }),
            ),
          }),
        ],
      }),
    )
    expect(exactImported.status).toBe('success')
    if (exactImported.status !== 'success') return
    expect(6 * MAX_PACK_MEDIA_BYTES).toBe(MAX_PACK_TOTAL_MEDIA_BYTES)

    const exact = await buildPackFromDefinition(exactImported.definition, {
      acquireMediaBytes: pathResolver(
        new Map(exactPaths.map((path) => [path, pngSized(MAX_PACK_MEDIA_BYTES)])),
      ),
      decodeImage: alwaysDecode,
    })
    expect(exact.status).toBe('success')
    if (exact.status !== 'success') return

    const roundTrip = await importPackFromBytes(exact.bytes, { decodeImage: alwaysDecode })
    expect(roundTrip.status).toBe('success')

    // Cumulative +1 cannot be formed from six ≤4 MiB assets (max sum equals the budget).
    // Seven smaller assets can sum to TOTAL+1 while each remains ≤ per-asset max.
    const overPaths = Array.from({ length: 7 }, (_, index) => `media-fixtures/over-${index}.png`)
    const overImported = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: overPaths.map((path, index) =>
              tile(`o-${index}`, {
                prompt: imagePrompt({
                  source: { kind: 'same-origin-path', path },
                }),
              }),
            ),
          }),
        ],
      }),
    )
    expect(overImported.status).toBe('success')
    if (overImported.status !== 'success') return

    const base = Math.floor(MAX_PACK_TOTAL_MEDIA_BYTES / 7)
    const sizes = Array.from({ length: 7 }, () => base)
    let sum = base * 7
    let cursor = 0
    while (sum < MAX_PACK_TOTAL_MEDIA_BYTES + 1) {
      sizes[cursor % sizes.length]! += 1
      sum += 1
      cursor += 1
    }
    expect(sizes.every((size) => size <= MAX_PACK_MEDIA_BYTES)).toBe(true)
    expect(sizes.reduce((total, size) => total + size, 0)).toBe(MAX_PACK_TOTAL_MEDIA_BYTES + 1)

    const overBudget = await buildPackFromDefinition(overImported.definition, {
      acquireMediaBytes: pathResolver(
        new Map(overPaths.map((path, index) => [path, pngSized(sizes[index]!)])),
      ),
      decodeImage: alwaysDecode,
    })
    expect(overBudget.status).toBe('failure')
    if (overBudget.status !== 'failure') return
    expect(overBudget.issues[0]?.code).toBe('pack-media-budget-exceeded')
  })

  it('rejects case-variant media path collisions before ZIP emission', async () => {
    const upper = 'images/A.png'
    const lower = 'images/a.png'
    const imported = importGameFromUnknown(
      boardGameFile(
        boardConfig({
          categories: [
            category('a', {
              tiles: [
                tile('a-1', {
                  prompt: imagePrompt({
                    source: { kind: 'same-origin-path', path: upper },
                  }),
                }),
                tile('a-2', {
                  prompt: imagePrompt({
                    source: { kind: 'same-origin-path', path: lower },
                  }),
                }),
              ],
            }),
          ],
        }),
      ),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const before = structuredClone(imported.definition)

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pathResolver(
        new Map([
          [upper, TINY_PNG_BYTES],
          [lower, TINY_PNG_BYTES],
        ]),
      ),
      decodeImage: alwaysDecode,
    })
    expect(built.status).toBe('failure')
    if (built.status !== 'failure') return
    expect(built.issues[0]?.code).toBe('pack-unsafe-path')
    expect(built.issues[0]?.message).toMatch(/case-variant collision/i)
    expect(imported.definition).toEqual(before)
    expect(imported.definition.rounds[0]).toEqual(before.rounds[0])
  })

  it('fails closed when magic matches but decodeImage returns false', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
      decodeImage: async () => false,
    })
    expect(built.status).toBe('failure')
    if (built.status !== 'failure') return
    expect(built.issues[0]?.code).toBe('pack-media-decode-failed')

    const packed = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(packed.status).toBe('success')
    if (packed.status !== 'success') return
    const importedFail = await importPackFromBytes(packed.bytes, {
      decodeImage: async () => false,
    })
    expect(importedFail.status).toBe('failure')
    if (importedFail.status !== 'failure') return
    expect(importedFail.issues.some((issue) => issue.code === 'pack-media-decode-failed')).toBe(true)
  })

  it('fails closed when decodeImage throws', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
      decodeImage: async () => {
        throw new Error('decoder boom')
      },
    })
    expect(built.status).toBe('failure')
    if (built.status !== 'failure') return
    expect(built.issues[0]?.code).toBe('pack-media-decode-failed')
  })
})
