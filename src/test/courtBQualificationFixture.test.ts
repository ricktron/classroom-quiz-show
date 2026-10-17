import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { approveAndImportDraft } from '../authoring/approveAndImport'
import { parseWorkbookBytes } from '../authoring/parseWorkbook'
import { buildTestWorkbookBytes } from '../authoring/testWorkbookFactory'
import {
  CLUE_HEADERS,
  FINAL_HEADERS,
  GAME_HEADERS,
  INSTRUCTIONS_SHEET,
  META_SHEET,
} from '../authoring/contract'
import type { GameDefinition } from '../game/gameDefinition'
import {
  COURT_B_FIXTURE_CATEGORIES,
  COURT_B_FIXTURE_FINAL,
  COURT_B_FIXTURE_TEAMS,
  COURT_B_FIXTURE_TITLE,
  COURT_B_JOURNEYS,
  courtBFixtureGameFile,
  courtBFixtureWorkbookRows,
} from './courtBQualificationFixture'

/**
 * Court B harness guard (CB-07). A blind Court B run must never again be handed a
 * brief that names a journey its starting content cannot reach. This test proves,
 * mechanically and before any run:
 *  - the committed game file equals the canonical fixture byte for byte; the
 *    committed spreadsheet holds exactly the canonical sheets and cells (nothing
 *    extra, no author identity) and imports to the same complete game
 *    definition, both through the canonical import pipeline (no state
 *    injection, no privileged seed);
 *  - the brief's journeys equal the fixture's journey list and the set of active
 *    reachability e2e tests (no commented-out, skipped or focused journey), and
 *    a Final journey has a Final-capable fixture;
 *  - the brief starts from these fixtures at Home, not from the no-Final demo.
 *
 * Regenerate the committed files with: CQS_WRITE_COURT_B_FIXTURE=1 npx vitest run
 * src/test/courtBQualificationFixture.test.ts
 */

const repo = (relative: string) => resolve(process.cwd(), relative)
const JSON_PATH = repo('docs/qualification/fixtures/court-b-final-qualification.game.json')
const XLSX_PATH = repo('docs/qualification/fixtures/court-b-final-qualification.xlsx')
const BRIEF_PATH = repo('docs/qualification/COURT-B-BLACK-BOX-BRIEF.md')
const REACHABILITY_SPEC_PATH = repo('tests/e2e/court-b-fixture-reachability.spec.ts')

const registry = createDefaultRegistry()

function workbookBytes(): Uint8Array {
  const rows = courtBFixtureWorkbookRows()
  return buildTestWorkbookBytes({
    profile: 'board-plus-final',
    gameRows: [[...GAME_HEADERS], [...rows.gameRow]],
    clueRows: [[...CLUE_HEADERS], ...rows.clueRows.map((row) => [...row])],
    finalRows: [[...FINAL_HEADERS], [...rows.finalRow]],
  })
}

function canonicalJsonText(): string {
  return `${JSON.stringify(courtBFixtureGameFile(), null, 2)}\n`
}

/**
 * The whole imported definition, minus only what the two formats cannot share:
 * the nested round/category/tile/team ids (the workbook derives its own from the
 * GameKey) and the tile multiplier default (the workbook writes the implicit 1).
 * The game id itself (the authored GameKey: Play URL, export filename, My Games
 * identity) and every other field a teacher or tester can see must match.
 */
function comparableDefinition(definition: GameDefinition): unknown {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip)
    if (value === null || typeof value !== 'object') return value
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'id') continue
      if (key === 'multiplier' && entry === 1) continue
      out[key] = strip(entry)
    }
    return out
  }
  return { id: definition.id, ...(strip(definition) as object) }
}

/**
 * Everything a person opening the committed spreadsheet can see, read with the
 * same xlsx library on both sides so the comparison does not depend on writer
 * bytes: sheet names in order, every cell of every sheet, and the document
 * identity properties a re-save stamps (author, company, ...).
 */
const IDENTITY_PROPS = [
  'Title', 'Subject', 'Author', 'Manager', 'Company', 'Category', 'Keywords', 'Comments', 'LastAuthor',
] as const
function workbookView(bytes: Uint8Array) {
  const workbook = XLSX.read(bytes, { type: 'array' })
  const props = (workbook.Props ?? {}) as Record<string, unknown>
  return {
    sheetNames: workbook.SheetNames,
    sheets: workbook.SheetNames.map((name) =>
      XLSX.utils.sheet_to_json(workbook.Sheets[name]!, { header: 1, raw: true, defval: '' }),
    ),
    identity: Object.fromEntries(IDENTITY_PROPS.map((key) => [key, props[key] ?? null])),
    custom: workbook.Custprops ?? {},
  }
}

function authoredSheetStrings(bytes: Uint8Array): string[] {
  const view = workbookView(bytes)
  return view.sheetNames.flatMap((name, index) =>
    name === INSTRUCTIONS_SHEET || name === META_SHEET ? [] : stringsOf(view.sheets[index]),
  )
}

/** Spec text with comments removed, so a commented-out journey cannot count. */
function activeSpecText(spec: string): string {
  return spec.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** Every string value in a definition, for the synthetic-data scan. */
function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringsOf)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringsOf)
  return []
}

async function importCommittedWorkbook(): Promise<GameDefinition> {
  const parsed = await parseWorkbookBytes(new Uint8Array(readFileSync(XLSX_PATH)), 'court-b.xlsx')
  if (parsed.status !== 'success') throw new Error('committed spreadsheet did not parse')
  const imported = approveAndImportDraft(parsed.draft, { registry })
  if (imported.status !== 'success') throw new Error('committed spreadsheet did not import')
  return imported.importResult.definition
}

function importCanonicalJson(): GameDefinition {
  const imported = importGameFromJsonText(canonicalJsonText(), { registry })
  if (imported.status !== 'success') throw new Error('canonical game file did not import')
  return imported.definition
}

/** Teacher-meaningful content, independent of generated ids. */
function contentOf(definition: GameDefinition) {
  const board = definition.rounds.find((round) => round.type === 'category-board')
  const final = definition.rounds.find((round) => round.type === 'final-wager')
  const boardConfig = board?.config as {
    categories: { title: string; tiles: { value: number; prompt: unknown; answer: string }[] }[]
  }
  const finalConfig = final?.config as { prompt: unknown; answer: string } | undefined
  return {
    title: definition.title,
    teams: definition.teams.map((team) => team.name),
    categories: boardConfig.categories.map((category) => ({
      title: category.title,
      tiles: category.tiles.map((tile) => ({
        value: tile.value,
        prompt: JSON.stringify(tile.prompt),
        answer: tile.answer,
      })),
    })),
    final: finalConfig ? { prompt: JSON.stringify(finalConfig.prompt), answer: finalConfig.answer } : null,
  }
}

if (process.env.CQS_WRITE_COURT_B_FIXTURE === '1') {
  writeFileSync(JSON_PATH, canonicalJsonText())
  writeFileSync(XLSX_PATH, workbookBytes())
}

describe('Court B qualification fixture (CB-07)', () => {
  it('the committed game file equals the canonical fixture and imports canonically', () => {
    const committed = readFileSync(JSON_PATH, 'utf8')
    expect(committed).toBe(canonicalJsonText())
    const imported = importGameFromJsonText(committed, { registry })
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const content = contentOf(imported.definition)
    expect(content.title).toBe(COURT_B_FIXTURE_TITLE)
    expect(content.teams).toEqual([...COURT_B_FIXTURE_TEAMS])
    expect(content.categories).toHaveLength(2)
    expect(content.categories.every((c) => c.tiles.length === 2)).toBe(true)
    expect(content.final?.answer).toBe(COURT_B_FIXTURE_FINAL.answer)
  })

  it('the committed spreadsheet has exactly the canonical sheets, cells and no author identity', () => {
    expect(existsSync(XLSX_PATH)).toBe(true)
    const committed = workbookView(new Uint8Array(readFileSync(XLSX_PATH)))
    expect(committed).toEqual(workbookView(workbookBytes()))
    expect(Object.values(committed.identity).every((value) => value === null)).toBe(true)
  })

  it('the committed spreadsheet imports to the same complete game as the game file', async () => {
    const fromWorkbook = await importCommittedWorkbook()
    expect(fromWorkbook.rounds.some((round) => round.type === 'final-wager')).toBe(true)
    expect(comparableDefinition(fromWorkbook)).toEqual(comparableDefinition(importCanonicalJson()))
  })

  it('the synthetic content carries no real class data markers, in either committed file', async () => {
    for (const category of COURT_B_FIXTURE_CATEGORIES) {
      for (const tile of category.tiles) expect(tile.prompt.startsWith('Synthetic prompt')).toBe(true)
    }
    const committedStrings = [
      readFileSync(JSON_PATH, 'utf8'),
      ...stringsOf(await importCommittedWorkbook()),
      // Authored sheets only: the product's own INSTRUCTIONS and CQS_META text
      // is fixed by the exact-cells check above.
      ...authoredSheetStrings(new Uint8Array(readFileSync(XLSX_PATH))),
    ]
    for (const text of committedStrings) expect(text).not.toMatch(/student|school|teacher name|@/i)
  })

  it('brief journeys, fixture journeys and active reachability e2e tests are the same set', () => {
    const brief = readFileSync(BRIEF_PATH, 'utf8')
    const spec = activeSpecText(readFileSync(REACHABILITY_SPEC_PATH, 'utf8'))
    const briefIds = [...brief.matchAll(/^\|\s*(CBJ-\d{2})\s*\|/gm)].map((m) => m[1]!)
    const fixtureIds = COURT_B_JOURNEYS.map((journey) => journey.id)
    // Only an uncommented top-level `test('[CBJ-nn] ...` counts.
    const specIds = [...spec.matchAll(/^test\(\s*['"`]\[(CBJ-\d{2})\]/gm)].map((m) => m[1]!)
    expect(briefIds.length).toBeGreaterThan(0)
    expect(briefIds).toEqual(fixtureIds)
    expect([...specIds].sort()).toEqual([...fixtureIds].sort())
    // No journey may be skipped, parked or focused: the only modifier allowed is
    // the one project gate in beforeEach (journeys run once, on desktop-1080p).
    const modifiers = [...spec.matchAll(/\b(?:test|describe)\.(?:skip|fixme|only|fail)\b[^\n]*/g)].map(
      (m) => m[0].trim(),
    )
    expect(modifiers).toEqual([
      "test.skip(info.project.name !== 'desktop-1080p', 'journey reachability runs once (1080p)')",
    ])
  })

  it('a brief journey that requires a Final is paired with a Final-capable fixture, never the demo', () => {
    const brief = readFileSync(BRIEF_PATH, 'utf8')
    const needsFinal = COURT_B_JOURNEYS.some((journey) => journey.requiresFinal)
    const imported = importGameFromJsonText(canonicalJsonText(), { registry })
    if (imported.status !== 'success') throw new Error('canonical game file did not import')
    const hasFinal = imported.definition.rounds.some((round) => round.type === 'final-wager')
    expect(needsFinal && !hasFinal).toBe(false)
    expect(brief).toContain('fixtures/court-b-final-qualification.game.json')
    expect(brief).toContain('fixtures/court-b-final-qualification.xlsx')
    expect(brief).toMatch(/Begin at Home/)
    expect(brief).not.toMatch(/Import demo game[^\n]*(to|for) (reach|run|play) (the )?Final/i)
  })
})
