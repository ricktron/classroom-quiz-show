import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { readPackZip } from './zipRead'
import { GAME_ENTRY_PATH, MANIFEST_PATH } from './constants'
import { encodeUtf8 } from './utf8'
import { buildManifest } from './manifest'
import { sha256Hex } from './hash'
import { exportGameDefinition } from '../export/exportGame'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile } from '../test/categoryBoardFixtures'

async function validEmptyPackBytes(): Promise<Uint8Array> {
  const imported = importGameFromUnknown(boardGameFile())
  if (imported.status !== 'success') throw new Error('fixture failed')
  const exported = exportGameDefinition(imported.definition)
  if (exported.status !== 'success') throw new Error('export failed')
  const gameBytes = encodeUtf8(exported.jsonText)
  const manifest = buildManifest({
    gameBytes,
    gameSha256: await sha256Hex(gameBytes),
    media: [],
  })
  return zipSync({
    [MANIFEST_PATH]: encodeUtf8(`${JSON.stringify(manifest)}\n`),
    [GAME_ENTRY_PATH]: gameBytes,
  })
}

describe('pack zip read safety', () => {
  it('accepts a valid minimal pack archive', async () => {
    const bytes = await validEmptyPackBytes()
    const result = await readPackZip(bytes)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.entries.has(MANIFEST_PATH)).toBe(true)
    expect(result.entries.has(GAME_ENTRY_PATH)).toBe(true)
  })

  it('rejects traversal and unexpected entries during streaming read', async () => {
    const bytes = zipSync({
      [MANIFEST_PATH]: new Uint8Array([0x7b, 0x7d]),
      '../evil.txt': new Uint8Array([0x01]),
    })
    const result = await readPackZip(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(['pack-unsafe-path', 'pack-unexpected-entry']).toContain(result.issues[0]?.code)
  })

  it('rejects malformed container bytes', async () => {
    const result = await readPackZip(new Uint8Array([0x00, 0x01, 0x02, 0x03]))
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-malformed-container')
  })

  it('accepts a pack archive that includes one distinct media entry path', async () => {
    // Exact duplicate ZIP entry names cannot be expressed via zipSync's object map.
    // Duplicate/case-collision rejection is covered by createPackPathTracker unit tests
    // and by import-time tracker usage in readPackZip.
    const gameBytes = new Uint8Array([0x7b, 0x7d])
    const archive: Record<string, Uint8Array> = {
      [MANIFEST_PATH]: new Uint8Array([0x7b, 0x7d]),
      [GAME_ENTRY_PATH]: gameBytes,
      'media/a.png': new Uint8Array([0x01]),
    }
    const first = zipSync(archive)
    const result = await readPackZip(first)
    expect(result.status).toBe('success')
  })
})
