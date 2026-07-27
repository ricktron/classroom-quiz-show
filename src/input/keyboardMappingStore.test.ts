import { describe, expect, it } from 'vitest'
import {
  clearKeyboardMapping,
  KEYBOARD_MAPPING_LOAD_MESSAGE,
  KEYBOARD_MAPPING_LOAD_OUTCOMES,
  KEYBOARD_MAPPING_STORAGE_KEY,
  loadKeyboardMapping,
  readStoredKeyboardMapping,
  saveKeyboardMapping,
  type LocalConfigStorage,
} from './keyboardMappingStore'
import { KEYBOARD_MAPPING_VERSION, primaryKeyForTeam } from './keyboardMapping'
import { PRIMARY_BUZZ } from './logicalAction'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'

/**
 * Local mapping persistence (Slice 8).
 *
 * The claims proved here:
 *  - a stored mapping is UNTRUSTED input and is validated exactly as the editor's
 *    is — nothing corrupt is repaired into use;
 *  - every failure mode resolves to the DEFAULT mapping, never to a partially
 *    honoured one, so a teacher never gets "some buzzers work";
 *  - a REMOVED team's binding is pruned; a RENAMED team keeps its key;
 *  - storage that throws (private mode, a full quota) degrades rather than
 *    crashing;
 *  - nothing stored identifies a student, and nothing here touches game content,
 *    the event log, or anything Slice 13 will own.
 */

const TEAMS = createTeamDefinitions(twoTeams())

/** An in-memory storage double with the same total surface as `localStorage`. */
function memoryStorage(initial?: string): LocalConfigStorage & { readonly raw: () => string | null } {
  let value: string | null = initial ?? null
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
    raw: () => value,
  }
}

/** A storage that throws on every access, like Safari private mode can. */
const throwingStorage: LocalConfigStorage = {
  getItem() {
    throw new Error('denied')
  },
  setItem() {
    throw new Error('denied')
  },
  removeItem() {
    throw new Error('denied')
  },
}

function stored(bindings: unknown, version: unknown = KEYBOARD_MAPPING_VERSION): string {
  return JSON.stringify({ version, bindings })
}

describe('reading a stored mapping', () => {
  it('accepts a well-formed one', () => {
    const result = readStoredKeyboardMapping({
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [{ code: 'KeyA', teamId: 'red', action: PRIMARY_BUZZ }],
    })
    expect(result?.bindings).toEqual([{ code: 'KeyA', teamId: 'red', action: PRIMARY_BUZZ }])
  })

  it('rebuilds each binding field by field, dropping anything extra', () => {
    const result = readStoredKeyboardMapping({
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [
        { code: 'KeyA', teamId: 'red', action: PRIMARY_BUZZ, studentName: 'Ada', evil: true },
      ],
    })
    expect(Object.keys(result?.bindings[0] ?? {})).toEqual(['code', 'teamId', 'action'])
    expect(JSON.stringify(result)).not.toContain('Ada')
  })

  it('fails closed on anything malformed', () => {
    for (const value of [
      null,
      'text',
      {},
      { version: 2, bindings: [] },
      { version: KEYBOARD_MAPPING_VERSION, bindings: 'nope' },
      { version: KEYBOARD_MAPPING_VERSION, bindings: [null] },
      { version: KEYBOARD_MAPPING_VERSION, bindings: [{ code: 1, teamId: 'red', action: PRIMARY_BUZZ }] },
      { version: KEYBOARD_MAPPING_VERSION, bindings: [{ code: 'KeyA', teamId: '', action: PRIMARY_BUZZ }] },
      { version: KEYBOARD_MAPPING_VERSION, bindings: [{ code: 'KeyA', teamId: 'red' }] },
      { version: KEYBOARD_MAPPING_VERSION, bindings: [{ code: 'KeyA', teamId: 'red', action: { kind: 'x' } }] },
    ]) {
      expect(readStoredKeyboardMapping(value), JSON.stringify(value)).toBeNull()
    }
  })

  it('keeps a secondary binding, which the translator then refuses to act on', () => {
    const result = readStoredKeyboardMapping({
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [{ code: 'KeyS', teamId: 'red', action: { kind: 'secondary', slot: 'secondary2' } }],
    })
    expect(result?.bindings[0].action).toEqual({ kind: 'secondary', slot: 'secondary2' })
  })
})

describe('loading for a game', () => {
  it('uses the defaults when nothing is stored', () => {
    const result = loadKeyboardMapping(memoryStorage(), TEAMS)
    expect(result.outcome).toBe('absent')
    expect(result.usedDefault).toBe(true)
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('Digit1')
  })

  it('uses the defaults when there is no storage at all', () => {
    const result = loadKeyboardMapping(null, TEAMS)
    expect(result.outcome).toBe('absent')
    expect(result.usedDefault).toBe(true)
  })

  it('restores a valid stored mapping', () => {
    const storage = memoryStorage(
      stored([
        { code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ },
        { code: 'KeyP', teamId: 'blue', action: PRIMARY_BUZZ },
      ]),
    )
    const result = loadKeyboardMapping(storage, TEAMS)
    expect(result.outcome).toBe('loaded')
    expect(result.usedDefault).toBe(false)
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('KeyQ')
  })

  it('falls back to the defaults on corrupt JSON', () => {
    const result = loadKeyboardMapping(memoryStorage('{not json'), TEAMS)
    expect(result.outcome).toBe('malformed')
    expect(result.usedDefault).toBe(true)
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('Digit1')
  })

  it('distinguishes an older format from nonsense', () => {
    const older = loadKeyboardMapping(memoryStorage(stored([], 0)), TEAMS)
    expect(older.outcome).toBe('unsupported-version')
    const nonsense = loadKeyboardMapping(memoryStorage(JSON.stringify([1, 2, 3])), TEAMS)
    expect(nonsense.outcome).toBe('malformed')
  })

  /**
   * The load-bearing failure rule: a stored mapping that is INVALID for this game
   * falls back WHOLESALE, never partially. Half-honouring it would leave a
   * teacher with some buzzers working and no way to tell which.
   */
  it('falls back wholesale when a stored mapping is invalid, never partially', () => {
    const storage = memoryStorage(
      stored([
        { code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ },
        // Two teams, one key — the same conflict the editor refuses.
        { code: 'KeyQ', teamId: 'blue', action: PRIMARY_BUZZ },
      ]),
    )
    const result = loadKeyboardMapping(storage, TEAMS)
    expect(result.outcome).toBe('invalid')
    expect(result.usedDefault).toBe(true)
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('Digit1')
    expect(primaryKeyForTeam(result.mapping, 'blue')).toBe('Digit2')
  })

  it('falls back when a stored mapping claims a reserved key', () => {
    const storage = memoryStorage(stored([{ code: 'Escape', teamId: 'red', action: PRIMARY_BUZZ }]))
    expect(loadKeyboardMapping(storage, TEAMS).outcome).toBe('invalid')
  })

  it('prunes a REMOVED team’s binding and keeps the rest', () => {
    const storage = memoryStorage(
      stored([
        { code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ },
        { code: 'KeyG', teamId: 'ghost', action: PRIMARY_BUZZ },
      ]),
    )
    const result = loadKeyboardMapping(storage, TEAMS)
    expect(result.outcome).toBe('pruned')
    expect(result.usedDefault).toBe(false)
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('KeyQ')
    expect(result.mapping.bindings).toHaveLength(1)
  })

  it('keeps a RENAMED team’s key', () => {
    const renamed = createTeamDefinitions([
      { id: 'red', name: 'The Tectonics', accent: 'crimson' },
      { id: 'blue', name: 'Blue Team', accent: 'azure' },
    ])
    const storage = memoryStorage(stored([{ code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ }]))
    const result = loadKeyboardMapping(storage, renamed)
    expect(result.outcome).toBe('loaded')
    expect(primaryKeyForTeam(result.mapping, 'red')).toBe('KeyQ')
  })

  it('degrades rather than throwing when storage denies access', () => {
    const result = loadKeyboardMapping(throwingStorage, TEAMS)
    expect(result.outcome).toBe('unreadable')
    expect(result.usedDefault).toBe(true)
  })

  it('has host-facing copy for every outcome', () => {
    for (const outcome of KEYBOARD_MAPPING_LOAD_OUTCOMES) {
      expect(KEYBOARD_MAPPING_LOAD_MESSAGE[outcome].length).toBeGreaterThan(0)
    }
  })
})

describe('saving and clearing', () => {
  it('round-trips a mapping through storage', () => {
    const storage = memoryStorage()
    const mapping = {
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [{ code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ }],
    }
    expect(saveKeyboardMapping(storage, mapping)).toBe(true)
    expect(loadKeyboardMapping(storage, TEAMS).mapping.bindings).toEqual(mapping.bindings)
  })

  it('reports failure rather than pretending a mapping was saved', () => {
    expect(saveKeyboardMapping(throwingStorage, { version: KEYBOARD_MAPPING_VERSION, bindings: [] })).toBe(
      false,
    )
    expect(saveKeyboardMapping(null, { version: KEYBOARD_MAPPING_VERSION, bindings: [] })).toBe(false)
  })

  it('clears the stored mapping', () => {
    const storage = memoryStorage(stored([{ code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ }]))
    expect(clearKeyboardMapping(storage)).toBe(true)
    expect(storage.raw()).toBeNull()
    expect(clearKeyboardMapping(throwingStorage)).toBe(false)
  })
})

describe('the storage boundary itself', () => {
  /**
   * This is host-DEVICE configuration and must not look like the start of Slice
   * 13. The stored document is a version and a list of `{code, teamId, action}`
   * triples: no event, no revision, no session id, no game state, no student.
   */
  it('stores nothing but a version and key→team→action triples', () => {
    const storage = memoryStorage()
    saveKeyboardMapping(storage, {
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [{ code: 'KeyQ', teamId: 'red', action: PRIMARY_BUZZ }],
    })
    const raw = storage.raw() ?? ''
    expect(JSON.parse(raw)).toEqual({
      version: 1,
      bindings: [{ code: 'KeyQ', teamId: 'red', action: { kind: 'primary-buzz' } }],
    })
    for (const forbidden of [
      'revision',
      'sessionId',
      'history',
      'event',
      'score',
      'prompt',
      'answer',
      'student',
      'name',
    ]) {
      expect(raw, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('uses a version-tagged key, so a future format lands beside this one', () => {
    expect(KEYBOARD_MAPPING_STORAGE_KEY).toContain(':v1')
    expect(KEYBOARD_MAPPING_STORAGE_KEY).toContain('classroom-quiz-show')
  })
})
