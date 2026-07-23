import { describe, expect, it } from 'vitest'
import { INITIAL_PRIVATE_STATE, type PrivateState } from './privateState'
import { safeToPublicState, toPublicState } from './sanitize'
import { replay } from './reducer'
import { PUBLIC_STATE_SCHEMA_VERSION } from './publicState'
import type { SessionEvent } from './events'
import { createSampleGame, createSampleGameWithUnsupportedRound } from '../game/sampleGame'

const AT = 1_000

const sessionInit: SessionEvent = {
  id: 'evt-0',
  type: 'SESSION_INITIALIZED',
  seq: 0,
  occurredAt: AT,
  reversible: false,
  sessionId: 'sess',
}

/** A fully-populated private state with secrets in every private field. */
function loadedPrivateState(): PrivateState {
  return replay([
    { id: 'evt-0', type: 'SESSION_INITIALIZED', seq: 0, occurredAt: AT, reversible: false, sessionId: 'SECRET-SESSION-42' },
    { id: 'evt-1', type: 'HOST_NOTE_SET', seq: 1, occurredAt: AT, reversible: true, note: 'ANSWER: mitochondria; teacher score note' },
    { id: 'evt-2', type: 'SEQUENCE_ADVANCED', seq: 2, occurredAt: AT, reversible: true },
  ])
}

/** The exact set of keys a PublicState is allowed to contain. */
const ALLOWED_KEYS = ['schemaVersion', 'revision', 'phase', 'headline', 'detail', 'game'].sort()

describe('toPublicState — allow-list projection', () => {
  it('produces exactly the allow-listed keys and nothing else', () => {
    const publicState = toPublicState(loadedPrivateState())
    expect(Object.keys(publicState).sort()).toEqual(ALLOWED_KEYS)
  })

  it('emits a fixed, safe projection for the no-session initial state', () => {
    expect(toPublicState(INITIAL_PRIVATE_STATE)).toEqual({
      schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
      revision: 0,
      phase: 'no-session',
      headline: 'Waiting for the host',
      detail: 'No active round.',
      game: null,
    })
  })

  it('omits private top-level and nested fields', () => {
    const publicState = toPublicState(loadedPrivateState()) as unknown as Record<string, unknown>
    expect(publicState.session).toBeUndefined()
    expect(publicState.diagnostics).toBeUndefined()
    expect(publicState.sessionId).toBeUndefined()
    expect(publicState.hostNotes).toBeUndefined()
    expect(publicState.counter).toBeUndefined()
  })

  it('does NOT leak a future/unknown private field', () => {
    // Simulate a later slice adding a private field the sanitizer never learned.
    const withFutureField = {
      ...loadedPrivateState(),
      futureSecret: 'UPCOMING-ANSWER-KEY',
    } as unknown as PrivateState
    const serialized = JSON.stringify(toPublicState(withFutureField))
    expect(serialized).not.toContain('futureSecret')
    expect(serialized).not.toContain('UPCOMING-ANSWER-KEY')
  })

  it('serialized public state contains none of the private secret values', () => {
    const serialized = JSON.stringify(toPublicState(loadedPrivateState())).toLowerCase()
    for (const forbidden of ['secret-session-42', 'mitochondria', 'answer', 'teacher', 'score', 'note']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it('maps status codes to fixed public copy', () => {
    const waiting = replay([
      { id: 'evt-0', type: 'SESSION_INITIALIZED', seq: 0, occurredAt: AT, reversible: false, sessionId: 's' },
      { id: 'evt-1', type: 'WAITING_MARKED', seq: 1, occurredAt: AT, reversible: true },
    ])
    expect(toPublicState(waiting)).toMatchObject({
      phase: 'waiting',
      headline: 'Waiting for the host',
    })
  })
})

describe('toPublicState — game projection (allow-list, no leak)', () => {
  const GAME_VIEW_KEYS = ['status', 'roundCount', 'currentRound', 'roundAvailability'].sort()

  it('projects a loaded game to counts + coarse status only, no round selected', () => {
    const state = replay([
      sessionInit,
      { id: 'evt-1', type: 'GAME_INITIALIZED', seq: 1, occurredAt: AT, reversible: false, definition: createSampleGame() },
    ])
    const view = toPublicState(state).game
    expect(view).toEqual({
      status: 'active',
      roundCount: 3,
      currentRound: null,
      roundAvailability: 'none',
    })
    expect(Object.keys(view ?? {}).sort()).toEqual(GAME_VIEW_KEYS)
  })

  it('projects a selected supported round as available with a 1-based ordinal', () => {
    const state = replay([
      sessionInit,
      { id: 'evt-1', type: 'GAME_INITIALIZED', seq: 1, occurredAt: AT, reversible: false, definition: createSampleGame() },
      { id: 'evt-2', type: 'CURRENT_ROUND_SELECTED', seq: 2, occurredAt: AT, reversible: true, roundIndex: 0, roundId: 'round-1', support: 'supported' },
    ])
    expect(toPublicState(state).game).toMatchObject({
      currentRound: 1,
      roundAvailability: 'available',
    })
  })

  it('projects an unsupported current round as a neutral "unavailable" (fail closed)', () => {
    const state = replay([
      sessionInit,
      { id: 'evt-1', type: 'GAME_INITIALIZED', seq: 1, occurredAt: AT, reversible: false, definition: createSampleGameWithUnsupportedRound() },
      { id: 'evt-2', type: 'CURRENT_ROUND_SELECTED', seq: 2, occurredAt: AT, reversible: true, roundIndex: 1, roundId: 'mystery-round', support: 'unsupported' },
    ])
    expect(toPublicState(state).game).toMatchObject({
      currentRound: 2,
      roundAvailability: 'unavailable',
    })
  })

  it('projects an ended game as ended with no active round', () => {
    const state = replay([
      sessionInit,
      { id: 'evt-1', type: 'GAME_INITIALIZED', seq: 1, occurredAt: AT, reversible: false, definition: createSampleGame() },
      { id: 'evt-2', type: 'GAME_SESSION_ENDED', seq: 2, occurredAt: AT, reversible: false },
    ])
    expect(toPublicState(state).game).toMatchObject({ status: 'ended', roundAvailability: 'none' })
  })

  it('never leaks the game title, round ids, round types, or config into the projection', () => {
    const state = replay([
      sessionInit,
      { id: 'evt-1', type: 'GAME_INITIALIZED', seq: 1, occurredAt: AT, reversible: false, definition: createSampleGameWithUnsupportedRound() },
      { id: 'evt-2', type: 'CURRENT_ROUND_SELECTED', seq: 2, occurredAt: AT, reversible: true, roundIndex: 1, roundId: 'mystery-round', support: 'unsupported' },
    ])
    const serialized = JSON.stringify(toPublicState(state)).toLowerCase()
    for (const forbidden of [
      'foundation', // from the game title
      'mystery', // round title / id
      'supported-1', // round id
      'placeholder', // round type
      'unsupported-sample', // unsupported round type
      'plumbing', // placeholder config note
      'reason', // unsupported config key
    ]) {
      expect(serialized, `must not leak "${forbidden}"`).not.toContain(forbidden)
    }
  })
})

describe('safeToPublicState — projection failure fails closed', () => {
  it('returns the safe initial public state when projection throws', () => {
    // A getter that throws simulates a projection-time failure.
    const hostile = {
      schemaVersion: 1,
      revision: 0,
      diagnostics: { lastAppliedEventType: null, appliedEventCount: 0 },
      get session(): never {
        throw new Error('boom')
      },
    } as unknown as PrivateState
    const result = safeToPublicState(hostile)
    expect(result).toEqual({
      schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
      revision: 0,
      phase: 'no-session',
      headline: 'Waiting for the host',
      detail: 'No active round.',
      game: null,
    })
  })

  it('returns a valid projection for normal state', () => {
    const result = safeToPublicState(loadedPrivateState())
    expect(Object.keys(result).sort()).toEqual(ALLOWED_KEYS)
  })
})
