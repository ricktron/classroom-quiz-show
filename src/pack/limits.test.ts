import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { readPackZip } from './zipRead'
import {
  MAX_PACK_ENTRY_COUNT,
  MAX_PACK_INPUT_BYTES,
  MAX_PACK_MANIFEST_BYTES,
  MAX_PACK_TOTAL_EXTRACTED_BYTES,
} from './limits'
import { GAME_ENTRY_PATH, MANIFEST_PATH } from './constants'
import { encodeUtf8 } from './utf8'
import { buildManifest } from './manifest'
import { sha256Hex } from './hash'
import { exportGameDefinition } from '../export/exportGame'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile } from '../test/categoryBoardFixtures'

describe('pack limits', () => {
  it('rejects input larger than MAX_PACK_INPUT_BYTES', async () => {
    const oversized = new Uint8Array(MAX_PACK_INPUT_BYTES + 1)
    const result = await readPackZip(oversized)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-input-too-large')
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
})
