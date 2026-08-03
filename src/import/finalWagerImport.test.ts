import { describe, expect, it } from 'vitest'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import {
  CANONICAL_SAMPLE_CATEGORY_BOARD_FILE,
  CANONICAL_SAMPLE_FINAL_WAGER_FILE,
  CANONICAL_SAMPLE_GAME_FILE,
  importBuiltInFinalWagerGame,
} from './sampleGameFile'
import { createDefaultRegistry } from '../game/defaultRegistry'
import {
  FINAL_WAGER_ROUND_TYPE,
  readFinalWagerDefinition,
} from '../game/finalWager/definition'
import { exportGameDefinition } from '../export/exportGame'
import {
  finalConfig,
  finalGameFile,
  precedingBoard,
} from '../test/finalWagerFixtures'

/**
 * Final Wager import, cross-round rules and export round-trip (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - a Final round travels the ONE existing pipeline; nothing about it is a
 *    second importer, and content can never register or replace its schema;
 *  - the three cross-round rules (one Final, terminal, teams required) report
 *    precise codes at exact paths and REJECT rather than repairing;
 *  - every game file that was valid before Slice 14 is still valid and unchanged;
 *  - a Final game exports, re-imports structurally equal, and re-exports
 *    byte-identically — with the existing board output unchanged.
 */

function codesOf(issues: readonly ImportIssue[]): readonly string[] {
  return issues.map((issue) => issue.code)
}

describe('a Final round travels the existing pipeline', () => {
  it('imports through the registry-supplied config schema', () => {
    const result = importGameFromUnknown(finalGameFile())
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const final = result.definition.rounds.at(-1)
    expect(final?.type).toBe(FINAL_WAGER_ROUND_TYPE)
    expect(readFinalWagerDefinition(final!)).not.toBeNull()
  })

  it('imports the built-in board + Final sample', () => {
    const result = importBuiltInFinalWagerGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.rounds).toHaveLength(2)
    expect(result.definition.teams).toHaveLength(2)
  })

  it('reports an unknown Final config field at an exact path', () => {
    const result = importGameFromUnknown(
      finalGameFile({ config: finalConfig({ wagerCap: 500 }) }),
    )
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    expect(codesOf(result.issues)).toContain('unknown-field')
    expect(result.issues.map((issue) => issue.path)).toContain('rounds[1].config.wagerCap')
  })

  it('reports a blank Final answer at an exact path with a precise code', () => {
    const result = importGameFromUnknown(
      finalGameFile({ config: finalConfig({ answer: '   ' }) }),
    )
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    const issue = result.issues.find((candidate) => candidate.path === 'rounds[1].config.answer')
    expect(issue?.code).toBe('blank-text')
  })

  it('rejects an unsafe media source in a Final prompt', () => {
    const result = importGameFromUnknown(
      finalGameFile({
        config: finalConfig({
          prompt: {
            kind: 'image',
            source: { kind: 'same-origin-path', path: '../secrets/key.png' },
            alt: 'a',
          },
        }),
      }),
    )
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    expect(codesOf(result.issues)).toContain('invalid-media-source')
  })

  it('cannot register a round type or replace the Final schema from content', () => {
    const registry = createDefaultRegistry()
    const before = registry.lookup(FINAL_WAGER_ROUND_TYPE)
    importGameFromUnknown(finalGameFile(), { registry })
    expect(registry.lookup(FINAL_WAGER_ROUND_TYPE)).toEqual(before)
    expect(registry.knownTypes()).toEqual([
      'placeholder',
      'category-board',
      FINAL_WAGER_ROUND_TYPE,
    ])
  })

  it('rejects a function smuggled into a Final config', () => {
    const config = finalConfig() as Record<string, unknown>
    config.onReveal = () => 'pwned'
    const result = importGameFromUnknown(finalGameFile({ config }))
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    expect(codesOf(result.issues)).toContain('non-data-value')
  })
})

describe('the cross-round Final rules', () => {
  it('rejects a second Final round, naming the first', () => {
    const result = importGameFromUnknown(finalGameFile({ extraFinal: true }))
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    const issue = result.issues.find((candidate) => candidate.code === 'duplicate-final-round')
    expect(issue).toBeDefined()
    expect(issue?.path).toBe('rounds[2].type')
    expect(issue?.stage).toBe('semantic')
  })

  it('rejects a Final that is not the terminal round', () => {
    const result = importGameFromUnknown(
      finalGameFile({
        extraRoundsAfter: [
          {
            id: 'after',
            type: 'category-board',
            title: 'After Final',
            config: precedingBoard(),
          },
        ],
      }),
    )
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    const issue = result.issues.find((candidate) => candidate.code === 'final-round-not-terminal')
    expect(issue).toBeDefined()
    expect(issue?.path).toBe('rounds[1]')
  })

  it('rejects a Final in a game with no teams', () => {
    const result = importGameFromUnknown(finalGameFile({ teams: null }))
    expect(result.status).toBe('failure')
    if (result.status === 'success') return
    const issue = result.issues.find(
      (candidate) => candidate.code === 'final-round-requires-teams',
    )
    expect(issue).toBeDefined()
    expect(issue?.path).toBe('teams')
  })

  it('rejects a Final in a game whose teams list is empty', () => {
    // `teams: []` is already rejected by the team schema, so this proves the
    // Final rule does not have to be the one that catches it.
    const result = importGameFromUnknown(finalGameFile({ teams: [] }))
    expect(result.status).toBe('failure')
  })

  it('accepts a Final-only game with teams and no preceding board', () => {
    const result = importGameFromUnknown(finalGameFile({ board: null }))
    expect(result.status).toBe('success')
  })

  it('leaves a game with NO Final round completely unaffected', () => {
    const board = importGameFromJsonText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)
    const three = importGameFromJsonText(CANONICAL_SAMPLE_GAME_FILE)
    expect(board.status).toBe('success')
    expect(three.status).toBe('success')
  })
})

describe('previously valid games are unchanged', () => {
  it.each([
    ['the three-round sample', CANONICAL_SAMPLE_GAME_FILE],
    ['the single-board sample', CANONICAL_SAMPLE_CATEGORY_BOARD_FILE],
  ])('%s still imports with the same rounds and teams', (_label, text) => {
    const result = importGameFromJsonText(text)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const parsed = JSON.parse(text) as { rounds: unknown[]; teams?: unknown[] }
    expect(result.definition.rounds).toHaveLength(parsed.rounds.length)
    expect(result.definition.teams).toHaveLength(parsed.teams?.length ?? 0)
  })

  it('produces byte-identical export output for the pre-Slice-14 board sample', () => {
    const imported = importGameFromJsonText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const first = exportGameDefinition(imported.definition)
    expect(first.status).toBe('success')
    if (first.status !== 'success') return
    const reimported = importGameFromJsonText(first.jsonText)
    expect(reimported.status).toBe('success')
    if (reimported.status !== 'success') return
    const second = exportGameDefinition(reimported.definition)
    expect(second.status).toBe('success')
    if (second.status !== 'success') return
    expect(second.jsonText).toBe(first.jsonText)
  })
})

describe('Final export round-trips through the canonical format', () => {
  it('exports, re-imports structurally equal, and re-exports byte-identically', () => {
    const imported = importGameFromJsonText(CANONICAL_SAMPLE_FINAL_WAGER_FILE)
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    // The exporter itself performs the re-import + byte-stability gate, so a
    // successful export is already proof of both.
    const first = exportGameDefinition(imported.definition)
    expect(first.status).toBe('success')
    if (first.status !== 'success') return
    expect(first.document.schemaVersion).toBe(1)

    const reimported = importGameFromJsonText(first.jsonText)
    expect(reimported.status).toBe('success')
    if (reimported.status !== 'success') return

    const final = reimported.definition.rounds.at(-1)
    const read = readFinalWagerDefinition(final!)
    expect(read?.answer).toBe('Mantle convection')
    expect(read?.alternates).toEqual(['Convection currents', 'Convection in the mantle'])
    expect(read?.notes).toContain('press for the mechanism')

    const second = exportGameDefinition(reimported.definition)
    expect(second.status).toBe('success')
    if (second.status !== 'success') return
    expect(second.jsonText).toBe(first.jsonText)
  })

  it('preserves a same-origin media path through the round trip', () => {
    const imported = importGameFromUnknown(
      finalGameFile({
        config: finalConfig({
          prompt: {
            kind: 'image',
            source: { kind: 'same-origin-path', path: 'media-fixtures/final.png' },
            alt: 'A cross-section',
            caption: 'Figure 1',
          },
        }),
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return
    expect(exported.jsonText).toContain('media-fixtures/final.png')
    expect(exported.metadata.hasMediaReferences).toBe(true)
  })

  it('keeps the game-file schema at version 1', () => {
    const imported = importGameFromJsonText(CANONICAL_SAMPLE_FINAL_WAGER_FILE)
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(imported.metadata.schemaVersion).toBe(1)
    expect(imported.definition.modelVersion).toBe(1)
  })

  it('exports a stable identity and a deterministic filename', () => {
    const imported = importGameFromJsonText(CANONICAL_SAMPLE_FINAL_WAGER_FILE)
    if (imported.status !== 'success') throw new Error('fixture failed to import')
    const exported = exportGameDefinition(imported.definition)
    if (exported.status !== 'success') throw new Error('export failed')
    expect(exported.filename).toBe('imported-sample-final.classroom-quiz-show.json')
    expect(exported.metadata.roundCount).toBe(2)
  })
})
