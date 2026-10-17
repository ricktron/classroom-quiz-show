import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { approveAndImportDraft } from '../authoring/approveAndImport'
import { parseWorkbookBytes } from '../authoring/parseWorkbook'
import { buildTestWorkbookBytes } from '../authoring/testWorkbookFactory'
import { CLUE_HEADERS, FINAL_HEADERS, GAME_HEADERS } from '../authoring/contract'
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
 *  - the committed game file equals the canonical fixture byte for byte, and the
 *    committed spreadsheet imports to the same complete game definition (every
 *    teacher-facing field: notes, alternates, timers, Final title), both through
 *    the canonical import pipeline (no state injection, no privileged seed);
 *  - the brief's journeys equal the fixture's journey list and the set of active
 *    (non-skipped) reachability e2e tests, and a Final journey has a
 *    Final-capable fixture;
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
 * generated ids (the workbook derives its own), the board round title (the
 * workbook has no column for it and uses the game title), and the tile
 * multiplier default (the workbook writes the implicit 1). Everything else a
 * teacher or tester can see or edit must match.
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
  const comparable = strip(definition) as { rounds: { type: string; title?: string }[] }
  for (const round of comparable.rounds) if (round.type === 'category-board') delete round.title
  return comparable
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

  it('the committed spreadsheet imports to the same complete game as the game file', async () => {
    expect(existsSync(XLSX_PATH)).toBe(true)
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
    ]
    for (const text of committedStrings) expect(text).not.toMatch(/student|school|teacher name|@/i)
  })

  it('brief journeys, fixture journeys and active reachability e2e tests are the same set', () => {
    const brief = readFileSync(BRIEF_PATH, 'utf8')
    const spec = readFileSync(REACHABILITY_SPEC_PATH, 'utf8')
    const briefIds = [...brief.matchAll(/^\|\s*(CBJ-\d{2})\s*\|/gm)].map((m) => m[1]!)
    const fixtureIds = COURT_B_JOURNEYS.map((journey) => journey.id)
    // Only a top-level `test('[CBJ-nn] ...` counts: a comment, `test.skip` or
    // `test.fixme` does not make a journey reachable.
    const specIds = [...spec.matchAll(/^test\(\s*['"`]\[(CBJ-\d{2})\]/gm)].map((m) => m[1]!)
    expect(briefIds.length).toBeGreaterThan(0)
    expect(briefIds).toEqual(fixtureIds)
    expect([...specIds].sort()).toEqual([...fixtureIds].sort())
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
