import { describe, expect, it } from 'vitest'
import { toPublicState } from './sanitize'
import {
  PUBLIC_MAX_WAITING_COUNT,
  PUBLIC_STATE_SCHEMA_VERSION,
  PUBLIC_TEAM_KEY_PATTERN,
  isPublicResponseState,
  isPublicState,
} from './publicState'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { decodeEnvelope, encodeEnvelope, SYNC_SCHEMA_VERSION } from '../sync/protocol'
import { MAX_TEAMS } from '../game/teams/limits'
import { KEYBOARD_MAPPING_VERSION } from '../input/keyboardMapping'

/**
 * The buzz queue at the private→public boundary (Slice 8).
 *
 * The claims proved here:
 *  - the projector learns WHO is answering and HOW MANY are waiting, and nothing
 *    else about the queue;
 *  - the ordered waiting list, the authored team ids, the resolved teams and the
 *    internal pointer never cross;
 *  - nothing about the INPUT — key, code, mapping, adapter, device — is reachable
 *    from the public state at all;
 *  - the active team is named by the same positional key the scoreboard uses, so
 *    the two cannot disagree;
 *  - the wire version moved 5 → 6 and an older payload is rejected, not guessed.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const FOUR_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
  { id: 'gold', name: 'Gold Team', accent: 'amber' },
]

function armedStore(): SessionStore {
  const store = createSessionStore()
  const imported = importGameFromUnknown(teamBoardGameFile(FOUR_TEAMS, richBoardConfig()))
  if (imported.status !== 'success') throw new Error('fixture failed to import')
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  return store
}

function buzz(store: SessionStore, teamId: string, at = AT): void {
  const result = store.dispatch({
    type: 'RECORD_TEAM_BUZZ',
    issuedAt: at,
    roundId: ROUND,
    tileId: TILE,
    teamId,
  })
  if (result.status !== 'accepted') throw new Error(`buzz refused: ${result.reason}`)
}

describe('what the projector receives about the queue', () => {
  it('publishes nothing until somebody buzzes', () => {
    const store = armedStore()
    expect(store.getPublicState().response?.buzz).toEqual({ status: 'none' })
  })

  it('publishes the active team by POSITIONAL key, plus a waiting count', () => {
    const store = armedStore()
    buzz(store, 'blue')
    buzz(store, 'green')
    buzz(store, 'gold')
    expect(store.getPublicState().response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't1',
      waitingCount: 2,
    })
  })

  it('uses exactly the key the scoreboard uses, so the two cannot disagree', () => {
    const store = armedStore()
    buzz(store, 'green')
    const publicState = store.getPublicState()
    const buzzState = publicState.response?.buzz
    const key = buzzState && buzzState.status === 'active' ? buzzState.activeTeamKey : ''
    const teams = publicState.teams
    const named = teams && teams.status === 'available' ? teams.teams.find((t) => t.key === key) : null
    expect(named?.name).toBe('Green Team')
    expect(PUBLIC_TEAM_KEY_PATTERN.test(key)).toBe(true)
  })

  it('advances the published active team when the host promotes', () => {
    const store = armedStore()
    buzz(store, 'red')
    buzz(store, 'blue')
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT + 1,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    })
    expect(store.getPublicState().response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't1',
      waitingCount: 0,
    })
  })

  it('publishes an EXHAUSTED queue distinctly from an empty one', () => {
    const store = armedStore()
    buzz(store, 'red')
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT + 1,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'passed' },
    })
    expect(store.getPublicState().response?.buzz).toEqual({ status: 'exhausted' })
  })

  it('stops publishing a queue once the clue closes', () => {
    const store = armedStore()
    buzz(store, 'red')
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    expect(store.getPublicState().response).toBeNull()
  })

  it('is PURE — two calls at any two moments are identical', () => {
    const store = armedStore()
    buzz(store, 'red')
    buzz(store, 'blue')
    const first = toPublicState(store.getState())
    const second = toPublicState(store.getState())
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe('what never crosses the boundary', () => {
  it('never carries the ordered waiting list or any authored team id', () => {
    const store = armedStore()
    buzz(store, 'red')
    buzz(store, 'blue')
    buzz(store, 'green')
    const serialized = JSON.stringify(store.getPublicState())
    // The authored ids are `red`, `blue`, `green`, `gold`. Only the NAMES and the
    // positional keys are public, and a name is not an id.
    expect(serialized).not.toContain('"red"')
    expect(serialized).not.toContain('"blue"')
    expect(serialized).not.toContain('"green"')
    for (const forbidden of ['order', 'resolvedCount', 'waitingTeamIds', 'activeTeamId', 'teamId']) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('never carries the teams whose turn is already over', () => {
    const store = armedStore()
    buzz(store, 'red')
    buzz(store, 'blue')
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT + 1,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    })
    const buzzState = store.getPublicState().response?.buzz
    // `blue` is active and `red` is done. Nothing published says `red` ever buzzed.
    expect(buzzState).toEqual({ status: 'active', activeTeamKey: 't1', waitingCount: 0 })
  })

  /**
   * The strongest privacy claim in this slice: nothing about the INPUT is
   * reachable from the public state, because none of it is in the durable state
   * to begin with.
   */
  it('never carries a key, a mapping, an adapter or a device', () => {
    const store = armedStore()
    buzz(store, 'red')
    const serialized = JSON.stringify(store.getPublicState()).toLowerCase()
    for (const forbidden of [
      'digit1',
      'keycode',
      'keyboard',
      'binding',
      'mapping',
      'adapter',
      'device',
      'gamepad',
      'webhid',
      'bluetooth',
      'usb',
      'sony',
      'handset',
      'controller',
      'button',
      'vendor',
      'product',
      'primary-buzz',
      'secondary',
      'localstorage',
      String(KEYBOARD_MAPPING_VERSION === 1 ? 'input:keyboard-mapping' : 'unreachable'),
    ]) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('never carries the interruption SOURCE, even when a buzz caused it', () => {
    const store = armedStore()
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 30,
    })
    buzz(store, 'red', AT + 5_000)
    const timer = store.getPublicState().response?.timer
    expect(timer).toEqual({ status: 'interrupted', durationMs: 30_000, remainingMs: 25_000 })
    expect(JSON.stringify(timer)).not.toContain('team-buzz')
    expect(JSON.stringify(timer)).not.toContain('source')
  })

  it('never leaks the answer just because a team buzzed', () => {
    const store = armedStore()
    buzz(store, 'red')
    const round = store.getPublicState().round
    expect(round && round.stage === 'prompt' && round.selection.answer).toBeNull()
  })
})

describe('the public buzz guard', () => {
  const running = { status: 'running', durationMs: 30_000, deadline: AT + 30_000 } as const

  it('accepts every well-formed member', () => {
    for (const buzzState of [
      { status: 'none' },
      { status: 'exhausted' },
      { status: 'active', activeTeamKey: 't0', waitingCount: 0 },
      { status: 'active', activeTeamKey: 't7', waitingCount: PUBLIC_MAX_WAITING_COUNT },
    ]) {
      expect(
        isPublicResponseState({ armed: true, timer: running, buzz: buzzState }),
        JSON.stringify(buzzState),
      ).toBe(true)
    }
  })

  it('rejects a payload the status does not define', () => {
    for (const buzzState of [
      { status: 'none', activeTeamKey: 't0' },
      { status: 'exhausted', waitingCount: 1 },
      { status: 'active' },
      { status: 'active', activeTeamKey: 't0' },
      { status: 'active', waitingCount: 1 },
      { status: 'nonsense' },
      null,
      'active',
    ]) {
      expect(
        isPublicResponseState({ armed: true, timer: running, buzz: buzzState }),
        JSON.stringify(buzzState),
      ).toBe(false)
    }
  })

  it('rejects a key that is not a positional render key', () => {
    for (const key of ['red', 'team-red', '', 't', 'T0', 't100']) {
      expect(
        isPublicResponseState({
          armed: true,
          timer: running,
          buzz: { status: 'active', activeTeamKey: key, waitingCount: 0 },
        }),
        key,
      ).toBe(false)
    }
  })

  it('rejects an unusable waiting count rather than rendering it', () => {
    for (const waitingCount of [-1, 1.5, Number.NaN, PUBLIC_MAX_WAITING_COUNT + 1, '2']) {
      expect(
        isPublicResponseState({
          armed: true,
          timer: running,
          buzz: { status: 'active', activeTeamKey: 't0', waitingCount },
        }),
        JSON.stringify(waitingCount),
      ).toBe(false)
    }
  })

  it('rejects a response DTO with no buzz field — the field is required, not optional', () => {
    expect(isPublicResponseState({ armed: true, timer: running })).toBe(false)
  })

  it('bounds the waiting count by the same team limit the engine enforces', () => {
    expect(PUBLIC_MAX_WAITING_COUNT).toBe(MAX_TEAMS)
  })
})

describe('the wire protocol', () => {
  it('is at public-state version 7 and envelope version 2', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(7)
    // The envelope did NOT change: `sentAt` is unchanged and no new transport
    // metadata was needed, so version 2 stands.
    expect(SYNC_SCHEMA_VERSION).toBe(2)
  })

  it('round-trips a snapshot carrying a queue', () => {
    const store = armedStore()
    buzz(store, 'red')
    buzz(store, 'blue')
    const payload = store.getPublicState()
    const decoded = decodeEnvelope(
      encodeEnvelope({ type: 'public-state', revision: payload.revision, sentAt: AT, payload }),
    )
    expect(decoded.ok).toBe(true)
    expect(decoded.ok && decoded.message.type === 'public-state' && decoded.message.payload).toEqual(
      payload,
    )
  })

  /**
   * A version-5 consumer fails CLOSED rather than rendering a snapshot whose buzz
   * state it cannot see. That is the whole reason the field is required and the
   * version moved: a display that silently omitted "Red Team is answering" would
   * be wrong without looking broken.
   */
  it('rejects a stale version-5 payload rather than reinterpreting it', () => {
    const store = armedStore()
    buzz(store, 'red')
    const stale = { ...store.getPublicState(), schemaVersion: 5 }
    expect(isPublicState(stale)).toBe(false)
    const decoded = decodeEnvelope(
      encodeEnvelope({ type: 'public-state', revision: 1, sentAt: AT, payload: stale as never }),
    )
    expect(decoded.ok).toBe(false)
    expect(decoded.ok === false && decoded.reason).toBe('malformed-payload')
  })

  it('rejects a version-6 payload whose response is missing the buzz field', () => {
    const store = armedStore()
    buzz(store, 'red')
    const payload = store.getPublicState()
    const response = payload.response
    if (!response) throw new Error('expected a response')
    const withoutBuzz: Record<string, unknown> = { ...response }
    delete withoutBuzz.buzz
    expect(isPublicState({ ...payload, response: withoutBuzz })).toBe(false)
  })
})
