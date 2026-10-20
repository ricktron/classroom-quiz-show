import { describe, expect, it, beforeAll } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importPackFromBytes } from '../pack/importPack'
import { readPackZip } from '../pack/zipRead'
import {
  COURT_B_HOSTED_ASSET_HEIGHT,
  COURT_B_HOSTED_ASSET_WIDTH,
  COURT_B_IMAGE_ALT,
  COURT_B_IMAGE_AUTHORED_PATH,
  COURT_B_IMAGE_FIXTURE_ID,
  COURT_B_IMAGE_FIXTURE_TITLE,
  COURT_B_PACK_IMAGE_HEIGHT,
  COURT_B_PACK_IMAGE_WIDTH,
  buildCourtBImageCluePackBytes,
  courtBPackImageBytes,
} from './courtBImageClueFixture'

/**
 * Court B image-clue pack guard (CBJ-08).
 *
 * The journey this fixture serves can only catch its defect while three
 * preconditions hold at once, and all three are easy to break by accident
 * somewhere else in the repository. This test holds them:
 *
 *  1. FRESHNESS — every entry of the committed `.cqs-pack` equals what the
 *     canonical definition builds today, and the pack still round-trips through
 *     the product's own importer. A stale pack would qualify a container the
 *     product can no longer produce.
 *
 *     Freshness is asserted on DECODED ENTRIES, not on the container's bytes.
 *     `writePackZip` delegates to `fflate`'s `zipSync`, which stamps each
 *     entry's ZIP modification time from the clock, so two builds of the same
 *     pack differ in six timestamp bytes and a byte comparison would fail on
 *     every run. (Confirmed by diffing two builds: six bytes, all inside the
 *     local-header time fields.) Comparing the manifest, the canonical game
 *     JSON and every media entry's bytes is strictly stronger than comparing
 *     the archive bytes anyway — it is insensitive only to the build clock.
 *  2. THE COLLISION IS STILL ARMED — a real build asset still ships at the
 *     authored clue path. If someone renames or deletes
 *     `public/media-fixtures/s05-f1-stress-diagram.png`, the authored path
 *     resolves to nothing, the wrong-image defect becomes unreachable, and
 *     CBJ-08 would keep passing while proving nothing. That is the vacuous
 *     pass this test exists to prevent.
 *  3. THE TWO IMAGES REMAIN DISTINGUISHABLE BY SIZE — the pack image and the
 *     colliding asset must keep different natural dimensions, so the journey's
 *     size assertion is a real discriminator and not a tautology.
 *
 * Regenerate the committed pack with:
 *   CQS_WRITE_COURT_B_FIXTURE=1 npx vitest run src/test/courtBImageClueFixture.test.ts
 */

const repo = (relative: string) => resolve(process.cwd(), relative)
const PACK_PATH = repo('docs/qualification/fixtures/court-b-image-clue.cqs-pack')
const HOSTED_ASSET_PATH = repo('public/media-fixtures/s05-f1-stress-diagram.png')
const BRIEF_PATH = repo('docs/qualification/COURT-B-BLACK-BOX-BRIEF.md')

/** Natural dimensions from a PNG IHDR, so "different image" is a measured claim. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (const [index, byte] of signature.entries()) {
    if (bytes[index] !== byte) throw new Error('not a PNG')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

/**
 * Decoded archive entries, keyed by pack path. Comparing these compares the
 * manifest, the canonical game JSON and every media asset byte for byte,
 * without depending on the container's build timestamps.
 */
async function entriesOf(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const zip = await readPackZip(bytes)
  if (zip.status !== 'success') {
    throw new Error(`pack did not read: ${JSON.stringify(zip.issues).slice(0, 400)}`)
  }
  return new Map([...zip.entries].map(([path, entry]) => [path, new Uint8Array(entry)]))
}

let built: Uint8Array

beforeAll(async () => {
  built = await buildCourtBImageCluePackBytes()
  if (process.env.CQS_WRITE_COURT_B_FIXTURE === '1') writeFileSync(PACK_PATH, built)
})

describe('Court B image-clue pack fixture (CBJ-08)', () => {
  it('every entry of the committed pack equals what the canonical definition builds today', async () => {
    expect(existsSync(PACK_PATH)).toBe(true)
    const committed = await entriesOf(new Uint8Array(readFileSync(PACK_PATH)))
    expect(committed).toEqual(await entriesOf(built))
  })

  it('rebuilds to the same entries, which is what makes the freshness claim meaningful', async () => {
    const again = await buildCourtBImageCluePackBytes()
    expect(await entriesOf(again)).toEqual(await entriesOf(built))
  })

  it('the committed pack carries the exact image bytes this fixture defines', async () => {
    const committed = await entriesOf(new Uint8Array(readFileSync(PACK_PATH)))
    const packed = committed.get(`media/${COURT_B_IMAGE_AUTHORED_PATH}`)
    expect(packed, 'the pack must carry media at the authored path').toBeDefined()
    expect(Buffer.from(packed!).equals(Buffer.from(courtBPackImageBytes()))).toBe(true)
  })

  it('the committed pack round-trips through the product’s own pack importer', async () => {
    const committed = new Uint8Array(readFileSync(PACK_PATH))
    const imported = await importPackFromBytes(committed, { registry: createDefaultRegistry() })
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(imported.definition.id).toBe(COURT_B_IMAGE_FIXTURE_ID)
    expect(imported.definition.title).toBe(COURT_B_IMAGE_FIXTURE_TITLE)
    const board = imported.definition.rounds.find((round) => round.type === 'category-board')
    const config = board?.config as {
      categories: { tiles: { prompt: unknown }[] }[]
    }
    expect(config.categories[0]!.tiles[0]!.prompt).toEqual({
      kind: 'image',
      source: { kind: 'same-origin-path', path: COURT_B_IMAGE_AUTHORED_PATH },
      alt: COURT_B_IMAGE_ALT,
    })
  })

  it('the authored clue path still collides with a shipped build asset (the defect stays reachable)', () => {
    expect(
      existsSync(HOSTED_ASSET_PATH),
      'CBJ-08 needs a real build asset at the authored clue path; without it the wrong-image defect cannot occur and the journey would pass vacuously',
    ).toBe(true)
    expect(HOSTED_ASSET_PATH.endsWith(`public/${COURT_B_IMAGE_AUTHORED_PATH}`)).toBe(true)
  })

  it('the pack image and the colliding asset differ in bytes and in natural size', () => {
    const packImage = courtBPackImageBytes()
    const hosted = new Uint8Array(readFileSync(HOSTED_ASSET_PATH))
    expect(Buffer.from(packImage).equals(Buffer.from(hosted))).toBe(false)
    expect(pngSize(packImage)).toEqual({
      width: COURT_B_PACK_IMAGE_WIDTH,
      height: COURT_B_PACK_IMAGE_HEIGHT,
    })
    expect(pngSize(hosted)).toEqual({
      width: COURT_B_HOSTED_ASSET_WIDTH,
      height: COURT_B_HOSTED_ASSET_HEIGHT,
    })
  })

  it('the brief hands the tester this pack as starting content', () => {
    const brief = readFileSync(BRIEF_PATH, 'utf8')
    expect(brief).toContain('fixtures/court-b-image-clue.cqs-pack')
  })

  it('the fixture carries no real class data markers', async () => {
    const committed = new Uint8Array(readFileSync(PACK_PATH))
    const imported = await importPackFromBytes(committed, { registry: createDefaultRegistry() })
    if (imported.status !== 'success') throw new Error('committed pack did not import')
    const strings = (value: unknown): string[] => {
      if (typeof value === 'string') return [value]
      if (Array.isArray(value)) return value.flatMap(strings)
      if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings)
      return []
    }
    for (const text of strings(imported.definition)) {
      expect(text).not.toMatch(/student|school|teacher name|@/i)
    }
  })
})
