/**
 * Court B image-clue qualification fixture: a committed portable pack (CBJ-08).
 *
 * WHY A THIRD STARTING FILE, AND WHY A PACK
 *
 * The shared Court B fixture
 * (`courtBQualificationFixture.ts`) cannot carry an image clue. Its freshness
 * guard requires the committed `.game.json` and `.xlsx` to import to the same
 * definition, and the authoring workbook contract (`CLUE_HEADERS` in
 * `src/authoring/contract.ts`) has no image column, so an image clue could
 * never round-trip through the spreadsheet half. Adding one would break the
 * guard rather than extend the fixture.
 *
 * A portable pack is also the faithful route for the defect class this journey
 * exists to catch: pack-media hydration (FRC-6). A teacher who receives an
 * image clue receives it in a `.cqs-pack`.
 *
 * THE DELIBERATE COLLISION (what makes the defect detectable)
 *
 * The image clue is authored at `media-fixtures/s05-f1-stress-diagram.png` —
 * a path a REAL build asset already occupies, shipped from `public/`. The pack
 * carries a DIFFERENT image at that path. Authored clue paths are not
 * namespaced away from build output, so before pack media hydrate, resolving
 * the authored path to its hosted URL paints another clue's picture on the
 * projector.
 *
 *  - correct behaviour: a loading state, then the pack's image from a `blob:`
 *    URL;
 *  - the defect: the hosted build asset paints first.
 *
 * The two images are told apart two independent ways — the `blob:` scheme and
 * the natural dimensions (pack 48x16; the shipped asset 960x540) — so a
 * journey cannot be satisfied by the wrong picture arriving through the right
 * scheme, or the reverse.
 *
 * No new asset enters the production bundle: the colliding build asset already
 * ships, and the pack is committed as qualification content under `docs/`.
 *
 * DETERMINISM
 *
 * The PNG is a solid-colour raster emitted here, and `writePackZip` /
 * `buildManifest` record no timestamps, so the committed pack regenerates byte
 * for byte. That is what lets the freshness guard hold the committed file to
 * this definition.
 *
 * Test support only. The application never imports this module, so it cannot
 * reach the production bundle.
 */

import { deflateSync } from 'node:zlib'
import { buildPackFromDefinition } from '../pack/buildPack'
import { packIssue } from '../pack/issues'
import { importGameFromUnknown } from '../import/importGame'
import { createDefaultRegistry } from '../game/defaultRegistry'

export const COURT_B_IMAGE_FIXTURE_TITLE = 'Court B Image Clue'
export const COURT_B_IMAGE_FIXTURE_ID = 'court-b-image-clue'
export const COURT_B_IMAGE_FIXTURE_TEAMS = ['Team Granite', 'Team Nimbus'] as const

/**
 * The authored clue path. Deliberately the path of a shipped build asset in
 * `public/media-fixtures/`; see the collision note above. Changing this to an
 * unused path would silently disarm CBJ-08.
 */
export const COURT_B_IMAGE_AUTHORED_PATH = 'media-fixtures/s05-f1-stress-diagram.png'

/** The pack image's natural size, chosen to differ from the colliding asset. */
export const COURT_B_PACK_IMAGE_WIDTH = 48
export const COURT_B_PACK_IMAGE_HEIGHT = 16

/** The colliding shipped asset's natural size, asserted by the guard. */
export const COURT_B_HOSTED_ASSET_WIDTH = 960
export const COURT_B_HOSTED_ASSET_HEIGHT = 540

export const COURT_B_IMAGE_ALT = 'Synthetic diagram D1: three labelled layers.'
export const COURT_B_IMAGE_ANSWER = 'Three layers'

/** CRC32 over a PNG chunk body. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const body = new Uint8Array(typeBytes.length + data.length)
  body.set(typeBytes, 0)
  body.set(data, typeBytes.length)
  const out = new Uint8Array(4 + body.length + 4)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(body, 4)
  view.setUint32(4 + body.length, crc32(body))
  return out
}

/**
 * A real, decodable, solid-colour PNG.
 *
 * Deterministic: fixed filter byte, fixed palette, and `deflateSync` at its
 * default level, so the same inputs always produce the same bytes.
 */
export function solidPng(
  width: number,
  height: number,
  rgb: readonly [number, number, number],
): Uint8Array {
  const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  const raw = new Uint8Array(height * (1 + width * 3))
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 3)
    raw[row] = 0 // filter: none
    for (let x = 0; x < width; x += 1) {
      const at = row + 1 + x * 3
      raw[at] = rgb[0]
      raw[at + 1] = rgb[1]
      raw[at + 2] = rgb[2]
    }
  }
  const parts = [
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', new Uint8Array(deflateSync(raw))),
    pngChunk('IEND', new Uint8Array(0)),
  ]
  const png = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    png.set(part, at)
    at += part.length
  }
  return png
}

/** The exact image bytes the committed pack carries. */
export function courtBPackImageBytes(): Uint8Array {
  return solidPng(COURT_B_PACK_IMAGE_WIDTH, COURT_B_PACK_IMAGE_HEIGHT, [0, 128, 128])
}

/** The canonical game file the pack is built from. */
export function courtBImageClueGameFile(): Record<string, unknown> {
  return {
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: COURT_B_IMAGE_FIXTURE_ID,
    title: COURT_B_IMAGE_FIXTURE_TITLE,
    teams: COURT_B_IMAGE_FIXTURE_TEAMS.map((name, index) => ({
      id: index === 0 ? 'granite' : 'nimbus',
      name,
      accent: index === 0 ? 'crimson' : 'azure',
    })),
    timer: { responseSeconds: 30 },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: COURT_B_IMAGE_FIXTURE_TITLE,
        config: {
          categories: [
            {
              id: 'category-1',
              title: 'Diagrams',
              tiles: [
                {
                  id: 'category-1-100',
                  value: 100,
                  prompt: {
                    kind: 'image',
                    source: { kind: 'same-origin-path', path: COURT_B_IMAGE_AUTHORED_PATH },
                    alt: COURT_B_IMAGE_ALT,
                  },
                  answer: COURT_B_IMAGE_ANSWER,
                  notes: 'Host-only note D1: never projected.',
                },
                {
                  id: 'category-1-200',
                  value: 200,
                  prompt: 'Synthetic prompt D2: which layer is outermost?',
                  answer: 'The top layer',
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

/**
 * Build the committed pack from the canonical definition, through the ordinary
 * canonical import pipeline and the product's own pack builder — never a
 * hand-written zip. A fixture assembled by hand could encode a container the
 * product cannot actually produce.
 */
export async function buildCourtBImageCluePackBytes(): Promise<Uint8Array> {
  const imported = importGameFromUnknown(courtBImageClueGameFile(), {
    registry: createDefaultRegistry(),
  })
  if (imported.status !== 'success') {
    throw new Error('Court B image-clue fixture did not import through the canonical pipeline')
  }
  const image = courtBPackImageBytes()
  const built = await buildPackFromDefinition(imported.definition, {
    acquireMediaBytes: async (sourcePath: string) =>
      sourcePath === COURT_B_IMAGE_AUTHORED_PATH
        ? { status: 'success' as const, bytes: image }
        : {
            status: 'failure' as const,
            issue: packIssue(
              'pack-media-acquisition-failed',
              'media',
              sourcePath,
              `Court B image-clue fixture has no media for ${JSON.stringify(sourcePath)}.`,
            ),
          },
  })
  if (built.status !== 'success') {
    throw new Error(
      `Court B image-clue pack did not build: ${JSON.stringify(built.issues).slice(0, 400)}`,
    )
  }
  return built.bytes
}
