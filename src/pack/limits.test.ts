import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { readPackZip } from './zipRead'
import {
  MAX_PACK_ENTRY_COUNT,
  MAX_PACK_GAME_BYTES,
  MAX_PACK_INPUT_BYTES,
  MAX_PACK_MANIFEST_BYTES,
  MAX_PACK_MEDIA_BYTES,
  MAX_PACK_MEDIA_COUNT,
  MAX_PACK_TOTAL_EXTRACTED_BYTES,
  MAX_PACK_TOTAL_MEDIA_BYTES,
} from './limits'
import { GAME_ENTRY_PATH, MANIFEST_PATH } from './constants'
import { encodeUtf8 } from './utf8'
import { buildManifest } from './manifest'
import { sha256Hex } from './hash'
import { exportGameDefinition } from '../export/exportGame'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile } from '../test/categoryBoardFixtures'
import { importPackFromBytes } from './importPack'
import { TINY_PNG_BYTES } from './testFixtures'
import { writePackZip } from './zipWrite'

describe('pack limits', () => {
  it('accepts input of exactly MAX_PACK_INPUT_BYTES and rejects +1', async () => {
    const exact = new Uint8Array(MAX_PACK_INPUT_BYTES)
    // Not a valid ZIP — exact-size input must clear the transport cap before container parse.
    const exactResult = await readPackZip(exact)
    expect(exactResult.status).toBe('failure')
    if (exactResult.status !== 'failure') return
    expect(exactResult.issues[0]?.code).not.toBe('pack-input-too-large')

    const oversized = new Uint8Array(MAX_PACK_INPUT_BYTES + 1)
    const result = await readPackZip(oversized)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-input-too-large')
  })

  it('accepts MAX_PACK_ENTRY_COUNT entries and rejects +1', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return
    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const mediaCount = MAX_PACK_ENTRY_COUNT - 2
    const mediaSha = await sha256Hex(TINY_PNG_BYTES)
    const media = Array.from({ length: mediaCount }, (_, index) => ({
      sourcePath: `file-${index}.png`,
      bytes: TINY_PNG_BYTES,
      sha256: mediaSha,
    }))
    // Manifest hash values are not validated at zip-read; only entry count matters here.
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: media.map((row) => ({ sourcePath: row.sourcePath, bytes: row.bytes, sha256: row.sha256 })),
    })
    const exactArchive: Record<string, Uint8Array> = {
      [MANIFEST_PATH]: encodeUtf8(`${JSON.stringify(manifest)}\n`),
      [GAME_ENTRY_PATH]: gameBytes,
    }
    for (const row of media) {
      exactArchive[`media/${row.sourcePath}`] = row.bytes
    }
    expect(Object.keys(exactArchive)).toHaveLength(MAX_PACK_ENTRY_COUNT)
    const exactResult = await readPackZip(zipSync(exactArchive))
    expect(exactResult.status).toBe('success')

    exactArchive[`media/extra-over.png`] = TINY_PNG_BYTES
    const overResult = await readPackZip(zipSync(exactArchive))
    expect(overResult.status).toBe('failure')
    if (overResult.status !== 'failure') return
    expect(overResult.issues[0]?.code).toBe('pack-too-many-entries')
  })

  it('rejects too many ZIP entries', async () => {
    const archive: Record<string, Uint8Array> = {
      [MANIFEST_PATH]: new Uint8Array([0x7b, 0x7d]),
      [GAME_ENTRY_PATH]: new Uint8Array([0x7b, 0x7d]),
    }
    for (let i = 0; i < MAX_PACK_ENTRY_COUNT; i += 1) {
      archive[`media/file-${i}.png`] = new Uint8Array([0x89, 0x50])
    }
    const bytes = zipSync(archive)
    const result = await readPackZip(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-too-many-entries')
  })

  it('rejects extracted bytes over cumulative budget', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return

    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const manifest = buildManifest({ gameBytes, gameSha256, media: [] })
    const manifestBytes = encodeUtf8(`${JSON.stringify(manifest)}\n`)

    const huge = new Uint8Array(MAX_PACK_TOTAL_EXTRACTED_BYTES + 1)
    huge[0] = 0x00
    const bytes = zipSync({
      [MANIFEST_PATH]: manifestBytes,
      [GAME_ENTRY_PATH]: gameBytes,
      'media/huge.png': huge,
    })
    const result = await readPackZip(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(
      result.issues.some((issue) =>
        ['pack-extracted-too-large', 'pack-media-too-large', 'pack-unsafe-path', 'pack-unexpected-entry'].includes(
          issue.code,
        ),
      ),
    ).toBe(true)
  })

  it('rejects manifest larger than MAX_PACK_MANIFEST_BYTES at import stage', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return
    const gameBytes = encodeUtf8(exported.jsonText)
    const manifestBytes = new Uint8Array(MAX_PACK_MANIFEST_BYTES + 1)
    manifestBytes.fill(0x20)
    manifestBytes[0] = 0x7b
    manifestBytes[manifestBytes.length - 2] = 0x7d
    manifestBytes[manifestBytes.length - 1] = 0x0a
    const bytes = zipSync({
      [MANIFEST_PATH]: manifestBytes,
      [GAME_ENTRY_PATH]: gameBytes,
    })
    const result = await readPackZip(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-manifest-too-large')
  })

  it('documents exact-boundary coverage for remaining pack constants', () => {
    // Per-media / cumulative media exact and +1 proofs live in buildImport.test.ts
    // (builder + import round-trip with injected decode).
    expect(MAX_PACK_MEDIA_BYTES).toBe(4 * 1024 * 1024)
    expect(MAX_PACK_TOTAL_MEDIA_BYTES).toBe(24 * 1024 * 1024)
    expect(MAX_PACK_MEDIA_COUNT).toBe(128)
    expect(MAX_PACK_GAME_BYTES).toBe(2 * 1024 * 1024)
    expect(MAX_PACK_TOTAL_EXTRACTED_BYTES).toBe(28 * 1024 * 1024)
    expect(MAX_PACK_MANIFEST_BYTES).toBe(128 * 1024)
  })

  it('rejects game entry larger than MAX_PACK_GAME_BYTES', async () => {
    const gameBytes = new Uint8Array(MAX_PACK_GAME_BYTES + 1)
    gameBytes.fill(0x20)
    gameBytes[0] = 0x7b
    gameBytes[gameBytes.length - 1] = 0x7d
    const manifest = buildManifest({
      gameBytes: encodeUtf8('{}\n'),
      gameSha256: '0'.repeat(64),
      media: [],
    })
    const bytes = writePackZip({
      manifest,
      gameBytes,
      media: new Map(),
    })
    const result = await readPackZip(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((issue) => issue.code === 'pack-game-too-large')).toBe(true)
  })

  it('rejects more than MAX_PACK_MEDIA_COUNT media entries', async () => {
    const archive: Record<string, Uint8Array> = {
      [MANIFEST_PATH]: new Uint8Array([0x7b, 0x7d]),
      [GAME_ENTRY_PATH]: new Uint8Array([0x7b, 0x7d]),
    }
    for (let i = 0; i < MAX_PACK_MEDIA_COUNT + 1; i += 1) {
      archive[`media/file-${i}.png`] = new Uint8Array([0x89, 0x50])
    }
    const result = await readPackZip(zipSync(archive))
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(
      result.issues.some((issue) =>
        ['pack-too-many-media', 'pack-too-many-entries'].includes(issue.code),
      ),
    ).toBe(true)
  })

  it('rejects a single extracted media entry over MAX_PACK_MEDIA_BYTES', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return
    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const mediaBytes = new Uint8Array(MAX_PACK_MEDIA_BYTES + 1)
    mediaBytes.set(TINY_PNG_BYTES)
    const mediaSha = await sha256Hex(mediaBytes)
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: [{ sourcePath: 'huge.png', bytes: mediaBytes, sha256: mediaSha }],
    })
    const bytes = writePackZip({
      manifest,
      gameBytes,
      media: new Map([['media/huge.png', mediaBytes]]),
    })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(
      result.issues.some((issue) =>
        ['pack-media-too-large', 'pack-extracted-too-large'].includes(issue.code),
      ),
    ).toBe(true)
  })
})
