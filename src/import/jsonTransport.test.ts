import { describe, expect, it, vi } from 'vitest'
import { MAX_IMPORT_TEXT_LENGTH } from './canonicalFormat'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import {
  CANONICAL_SAMPLE_GAME_FILE,
  CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE,
  importBuiltInSampleGame,
} from './sampleGameFile'

/**
 * JSON transport adapter — text in, canonical pipeline out.
 *
 * The adapter's ONLY job is transport decoding (emptiness, size, `JSON.parse`).
 * Everything after that is the same pipeline the object-level entry point uses,
 * which is what makes "one authoritative pipeline" true rather than aspirational.
 */

function failureIssues(result: ReturnType<typeof importGameFromJsonText>): readonly ImportIssue[] {
  expect(result.status).toBe('failure')
  if (result.status !== 'failure') throw new Error('unreachable')
  return result.issues
}

describe('JSON text transport', () => {
  it('imports valid canonical JSON text', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_GAME_FILE)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.rounds).toHaveLength(3)
  })

  it('reports malformed JSON at the json-parse stage', () => {
    const issues = failureIssues(importGameFromJsonText('{ "format": '))
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('invalid-json')
    expect(issues[0].stage).toBe('json-parse')
    expect(issues[0].message).toContain('not valid JSON')
  })

  it('rejects empty and whitespace-only input at the transport stage', () => {
    for (const input of ['', '   ', '\n\t']) {
      const issues = failureIssues(importGameFromJsonText(input))
      expect(issues[0].code).toBe('empty-input')
      expect(issues[0].stage).toBe('transport')
    }
  })

  it('rejects non-text input at the transport stage', () => {
    const issues = failureIssues(importGameFromJsonText({ format: 'classroom-quiz-show/game' }))
    expect(issues[0].code).toBe('input-not-text')
    expect(issues[0].stage).toBe('transport')
  })

  it('rejects input larger than the documented size guard', () => {
    const oversized = `"${'x'.repeat(MAX_IMPORT_TEXT_LENGTH)}"`
    const issues = failureIssues(importGameFromJsonText(oversized))
    expect(issues[0].code).toBe('input-too-large')
    expect(issues[0].context).toEqual({
      length: oversized.length,
      limit: MAX_IMPORT_TEXT_LENGTH,
    })
  })

  it('rejects every non-object JSON root', () => {
    for (const text of ['null', '[]', '[{"id":"a"}]', '"a string"', '42', 'true']) {
      const issues = failureIssues(importGameFromJsonText(text))
      expect(issues[0].code, `root: ${text}`).toBe('root-not-object')
      expect(issues[0].stage).toBe('json-parse')
    }
  })

  it('rejects trailing content after a complete JSON value (JSON.parse semantics)', () => {
    const issues = failureIssues(importGameFromJsonText(`${CANONICAL_SAMPLE_GAME_FILE} trailing`))
    expect(issues[0].code).toBe('invalid-json')
  })

  it('reports valid JSON with an invalid canonical shape past the parse stage', () => {
    const issues = failureIssues(importGameFromJsonText('{"hello":"world"}'))
    expect(issues.map((i) => i.stage)).not.toContain('json-parse')
    expect(issues.map((i) => i.code)).toEqual(['missing-format', 'missing-schema-version'])
  })
})

describe('no executable path through the transport', () => {
  it('never evaluates imported text — a JS expression is only ever a parse error', () => {
    const globals = globalThis as unknown as Record<string, unknown>
    delete globals.__cqs_pwned__
    const issues = failureIssues(
      importGameFromJsonText('{"format": (globalThis.__cqs_pwned__ = true)}'),
    )
    expect(issues[0].code).toBe('invalid-json')
    expect(globals.__cqs_pwned__).toBeUndefined()
  })

  it('treats code-like strings as ordinary data, not as code', () => {
    // Educational content legitimately mentions functions and scripts. Those are
    // plain strings; they must not be rejected, and must not be executed.
    const globals = globalThis as unknown as Record<string, unknown>
    delete globals.__cqs_pwned__
    const text = JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'code-words',
      title: 'What does the function eval() do?',
      rounds: [
        {
          id: 'r1',
          type: 'placeholder',
          title: 'Scripts, constructors and <script> tags',
          config: { note: 'globalThis.__cqs_pwned__ = true; new Function("return 1")()' },
        },
      ],
    })
    const result = importGameFromJsonText(text)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.rounds[0].config.note).toBe(
      'globalThis.__cqs_pwned__ = true; new Function("return 1")()',
    )
    expect(globals.__cqs_pwned__).toBeUndefined()
  })

  it('imported content cannot register a round type or mutate the registry', () => {
    const globals = globalThis as unknown as Record<string, unknown>
    delete globals.__cqs_pwned__
    const text = JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'hostile',
      title: 'Hostile',
      register: { type: 'evil', module: 'https://example.invalid/evil.js' },
      rounds: [{ id: 'r1', type: 'evil', title: 'Evil', config: {} }],
    })
    const result = importGameFromJsonText(text)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    // The `register` field is simply an unknown field — never an instruction.
    expect(result.issues.some((i) => i.code === 'unknown-field' && i.path === 'register')).toBe(true)
    expect(globals.__cqs_pwned__).toBeUndefined()

    // ...and the round type it tried to introduce is still unregistered.
    const again = importGameFromUnknown({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'hostile-2',
      title: 'Hostile 2',
      rounds: [{ id: 'r1', type: 'evil', title: 'Evil', config: {} }],
    })
    expect(failureIssues(again).some((i) => i.code === 'unknown-round-type')).toBe(true)
  })
})

describe('built-in sample content', () => {
  it('goes through the canonical pipeline rather than bypassing it', () => {
    const result = importBuiltInSampleGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata.gameId).toBe('imported-sample-game')
    expect(result.metadata.roundCount).toBe(3)
  })

  it('the built-in "unregistered type" sample is rejected like any other import', () => {
    const issues = failureIssues(importGameFromJsonText(CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE))
    expect(issues.some((i) => i.code === 'unknown-round-type')).toBe(true)
  })
})

describe('unexpected internal failure containment', () => {
  it('converts an unexpected throw into a safe generic issue', () => {
    const onInternalError = vi.fn()
    const exploding = {
      get format(): unknown {
        throw new Error('sensitive internal detail')
      },
    }
    const result = importGameFromUnknown(exploding, { onInternalError })
    const issues = failureIssues(result)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('internal-error')
    expect(issues[0].stage).toBe('construction')
    // The safe message carries no internal detail...
    expect(issues[0].message).not.toContain('sensitive internal detail')
    expect(JSON.stringify(issues)).not.toContain('sensitive internal detail')
    // ...but the developer reporter still receives the real error.
    expect(onInternalError).toHaveBeenCalledTimes(1)
    expect(onInternalError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('never exposes a stack trace in any issue', () => {
    const result = importGameFromUnknown({
      get format(): unknown {
        throw new Error('boom')
      },
    })
    const serialized = JSON.stringify(failureIssues(result))
    expect(serialized).not.toContain('at ')
    expect(serialized).not.toContain('.ts:')
    expect(serialized).not.toContain('stack')
  })
})
