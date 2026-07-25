import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createRoundRegistry, type RoundTypeEntry } from '../game/registry'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { placeholderRoundConfigSchema } from '../game/placeholderRound'
import { roundType } from '../game/ids'
import { gameFile, roundFile } from '../test/gameFileFixtures'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import {
  IMPORT_ISSUE_CODES,
  IMPORT_STAGES,
  formatPath,
  sortIssues,
  type ImportIssue,
} from './issues'

/**
 * The structured error model + registry integration.
 *
 * These tests pin the CONTRACT of a failure: stable codes, correct stages,
 * correct paths, actionable messages, multiple independent issues preserved,
 * and deterministic ordering.
 */

function issuesOf(input: unknown, registry?: ReturnType<typeof createDefaultRegistry>) {
  const result = importGameFromUnknown(input, registry ? { registry } : {})
  expect(result.status).toBe('failure')
  if (result.status !== 'failure') throw new Error('unreachable')
  return result.issues
}

describe('issue shape', () => {
  it('every issue carries a known code, a known stage, a path and a message', () => {
    const issues = issuesOf(gameFile({ id: 'bad id', title: 42, theme: 'x' }))
    expect(issues.length).toBeGreaterThan(1)
    for (const issue of issues) {
      expect(IMPORT_ISSUE_CODES).toContain(issue.code)
      expect(IMPORT_STAGES).toContain(issue.stage)
      expect(typeof issue.path).toBe('string')
      expect(issue.message.length).toBeGreaterThan(0)
      // Actionable, not "invalid file".
      expect(issue.message.toLowerCase()).not.toBe('invalid file')
    }
  })

  it('issues are plain serializable data — no exceptions, no stack traces', () => {
    const issues = issuesOf(gameFile({ title: 42 }))
    for (const issue of issues) {
      expect(issue).not.toBeInstanceOf(Error)
      expect(issue).not.toHaveProperty('stack')
      expect(issue).not.toHaveProperty('cause')
    }
    expect(JSON.parse(JSON.stringify(issues))).toEqual(issues)
  })

  it('never echoes the raw document back inside an issue', () => {
    const secret = 'x'.repeat(500)
    const issues = issuesOf(gameFile({ title: secret, id: 'bad id' }))
    for (const issue of issues) expect(issue.message).not.toContain(secret)
  })
})

describe('multiple independent issues are preserved', () => {
  it('reports every bad field rather than stopping at the first', () => {
    const issues = issuesOf(
      gameFile({
        id: 'bad id',
        title: 42,
        rounds: [
          { id: 'r1', type: 'Placeholder', title: '', config: { note: 'n' } },
          { ...roundFile('r2'), extra: true },
        ],
      }),
    )
    const paths = issues.map((i) => i.path)
    expect(paths).toContain('id')
    expect(paths).toContain('title')
    expect(paths).toContain('rounds[0].type')
    expect(paths).toContain('rounds[0].title')
    expect(paths).toContain('rounds[1].extra')
  })

  it('reports a semantic and a registry problem in the same run', () => {
    const issues = issuesOf(
      gameFile({
        title: '   ',
        rounds: [
          roundFile('dup'),
          roundFile('dup'),
          { id: 'r3', type: 'category-board', title: 'R3', config: {} },
        ],
      }),
    )
    const codes = issues.map((i) => i.code)
    expect(codes).toContain('blank-title')
    expect(codes).toContain('duplicate-round-id')
    expect(codes).toContain('unknown-round-type')
  })
})

describe('deterministic ordering', () => {
  it('produces identical issue lists for identical input', () => {
    const build = () =>
      issuesOf(gameFile({ id: 'bad id', title: 42, rounds: [roundFile('a'), roundFile('a')] }))
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()))
  })

  it('orders issues by pipeline stage', () => {
    const stages = issuesOf(
      gameFile({
        title: '  ',
        rounds: [{ id: 'r1', type: 'category-board', title: 'R', config: {} }],
      }),
    ).map((i) => i.stage)
    const indexes = stages.map((s) => IMPORT_STAGES.indexOf(s))
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
  })

  it('sortIssues is stable within a stage (document order is kept)', () => {
    const input: ImportIssue[] = [
      { code: 'unknown-round-type', stage: 'registry', path: 'rounds[0].type', message: 'a' },
      { code: 'blank-title', stage: 'semantic', path: 'title', message: 'b' },
      { code: 'unknown-round-type', stage: 'registry', path: 'rounds[1].type', message: 'c' },
    ]
    expect(sortIssues(input).map((i) => i.message)).toEqual(['b', 'a', 'c'])
  })
})

describe('path formatting', () => {
  it('formats nested array/object paths', () => {
    expect(formatPath([])).toBe('')
    expect(formatPath(['rounds', 2, 'config', 'note'])).toBe('rounds[2].config.note')
  })

  it('uses a friendly phrase for a document-root message', () => {
    const issues = issuesOf('not an object')
    expect(issues[0].path).toBe('')
    expect(issues[0].message).toContain('top level')
  })
})

describe('registry integration', () => {
  it('rejects an unregistered round type at the registry stage', () => {
    const issues = issuesOf(
      gameFile({ rounds: [{ id: 'r1', type: 'category-board', title: 'R', config: {} }] }),
    )
    const unknown = issues.find((i) => i.code === 'unknown-round-type')
    expect(unknown?.stage).toBe('registry')
    expect(unknown?.path).toBe('rounds[0].type')
    expect(unknown?.message).toContain('not a registered round type')
    // Actionable: it says what this build CAN play.
    expect(unknown?.message).toContain('placeholder')
  })

  it('rejects a known round type with an invalid config, with an exact path', () => {
    const issues = issuesOf(
      gameFile({ rounds: [{ id: 'r1', type: 'placeholder', title: 'R', config: { note: 7 } }] }),
    )
    const configIssue = issues.find((i) => i.path === 'rounds[0].config.note')
    expect(configIssue?.code).toBe('invalid-type')
    expect(configIssue?.stage).toBe('schema')
  })

  it('reports a MISSING required config field distinctly from a wrong-typed one', () => {
    const issues = issuesOf(
      gameFile({ rounds: [{ id: 'r1', type: 'placeholder', title: 'R', config: {} }] }),
    )
    const missing = issues.find((i) => i.path === 'rounds[0].config.note')
    expect(missing?.code).toBe('missing-field')
    expect(missing?.message).toBe('rounds[0].config.note is required but missing.')
  })

  it('accepts a known round type with a valid config', () => {
    const result = importGameFromUnknown(
      gameFile({
        rounds: [{ id: 'r1', type: 'placeholder', title: 'R', config: { note: 'fine' } }],
      }),
    )
    expect(result.status).toBe('success')
  })

  it('uses the injected registry, and imported content cannot choose or change it', () => {
    const custom = createRoundRegistry()
    const entry: RoundTypeEntry = {
      type: roundType('demo-round'),
      displayName: 'Demo',
      configSchema: z.strictObject({ level: z.number().int() }),
      matches: (definition) => definition.type === 'demo-round',
      createInitialState: (definition) => ({ roundId: definition.id, type: definition.type }),
      toPublicRoundView: () => ({ availability: 'available' }),
    }
    custom.register(entry)

    const document = gameFile({
      rounds: [{ id: 'r1', type: 'demo-round', title: 'R', config: { level: 3 } }],
    })
    // Known in the custom registry...
    expect(importGameFromUnknown(document, { registry: custom }).status).toBe('success')
    // ...and unknown in the default one. Content did not, and cannot, change that.
    expect(issuesOf(document).map((i) => i.code)).toContain('unknown-round-type')
    expect(custom.knownTypes()).toEqual(['demo-round'])
  })

  it('importing many documents never mutates the registry', () => {
    const registry = createDefaultRegistry()
    const before = [...registry.knownTypes()]
    importGameFromUnknown(gameFile(), { registry })
    importGameFromUnknown(gameFile({ rounds: [{ id: 'r', type: 'evil', title: 'E', config: {} }] }), {
      registry,
    })
    importGameFromJsonText('{"format":"classroom-quiz-show/game","schemaVersion":1}', { registry })
    expect(registry.knownTypes()).toEqual(before)
  })

  it('duplicate registration is still rejected (Slice 3 invariant intact)', () => {
    const registry = createDefaultRegistry()
    expect(() =>
      registry.register({
        type: roundType('placeholder'),
        displayName: 'Impostor',
        configSchema: placeholderRoundConfigSchema,
        matches: () => true,
        createInitialState: (definition) => ({ roundId: definition.id, type: definition.type }),
        toPublicRoundView: () => ({ availability: 'available' }),
      }),
    ).toThrow(/already registered/)
  })

  it('registry order does not influence imported round order', () => {
    const registry = createRoundRegistry()
    for (const type of ['z-round', 'a-round']) {
      registry.register({
        type: roundType(type),
        displayName: type,
        configSchema: z.strictObject({}),
        matches: (definition) => definition.type === type,
        createInitialState: (definition) => ({ roundId: definition.id, type: definition.type }),
        toPublicRoundView: () => ({ availability: 'available' }),
      })
    }
    const result = importGameFromUnknown(
      gameFile({
        rounds: [
          { id: 'first', type: 'a-round', title: 'First', config: {} },
          { id: 'second', type: 'z-round', title: 'Second', config: {} },
        ],
      }),
      { registry },
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(registry.knownTypes()).toEqual(['z-round', 'a-round'])
    expect(result.definition.rounds.map((r) => r.id)).toEqual(['first', 'second'])
  })
})
