import { describe, expect, it } from 'vitest'
import { toPublicState, safeToPublicState } from './sanitize'
import {
  PUBLIC_MAX_TIMER_DURATION_MS,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicResponseState,
  isPublicState,
  publicRemainingMsAt,
  type PublicResponseTimer,
} from './publicState'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { HOST_INTERRUPTION } from '../game/timing/responsePhase'
import { MAX_RESPONSE_SECONDS } from '../game/timing/limits'
import { decodeEnvelope, encodeEnvelope, SYNC_SCHEMA_VERSION } from '../sync/protocol'
import { clampOffset, MAX_CLOCK_OFFSET_CORRECTION_MS } from '../sync/receiver'

/**
 * The response phase at the private→public boundary (Slice 7).
 *
 * The claims proved here:
 *  - a running window projects an absolute DEADLINE, never a countdown value;
 *  - the projection is PURE — two calls at any two moments are identical;
 *  - the internal timer id, the interruption source, the authored configuration
 *    and the private phase map never cross;
 *  - a clue that was never armed and never timed projects nothing at all;
 *  - the wire version moved 4 → 5 and an older payload is rejected, not guessed.
 */

const AT = 1_000_000
const ROUND = 'board-round'

function openStore(overrides: Record<string, unknown> = {}): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig(), overrides))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: ROUND,
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  return store
}

function startedStore(durationSeconds = 30): SessionStore {
  const store = openStore()
  store.dispatch({
    type: 'START_RESPONSE_TIMER',
    issuedAt: AT,
    roundId: ROUND,
    durationSeconds,
  })
  return store
}

describe('what the projector receives', () => {
  it('projects nothing for a clue that was never armed and never timed', () => {
    expect(openStore().getPublicState().response).toBeNull()
  })

  it('projects the armed flag on its own, with no timer', () => {
    const store = openStore()
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
    expect(store.getPublicState().response).toEqual({ armed: true, timer: { status: 'idle' } })
  })

  it('projects a running window as an ABSOLUTE deadline plus the duration', () => {
    const store = startedStore(30)
    expect(store.getPublicState().response).toEqual({
      armed: false,
      timer: { status: 'running', durationMs: 30_000, deadline: AT + 30_000 },
    })
  })

  it('projects a paused window as frozen remaining time, with NO deadline', () => {
    const store = startedStore(30)
    store.dispatch({ type: 'PAUSE_RESPONSE_TIMER', issuedAt: AT + 10_000, roundId: ROUND })
    const timer = store.getPublicState().response?.timer
    expect(timer).toEqual({ status: 'paused', durationMs: 30_000, remainingMs: 20_000 })
    expect(timer && 'deadline' in timer).toBe(false)
  })

  it('projects an expired window with no deadline and no remaining value', () => {
    const store = startedStore(30)
    store.dispatch({
      type: 'EXPIRE_RESPONSE_TIMER',
      issuedAt: AT + 30_000,
      roundId: ROUND,
      timerId: 'tmr-5',
      deadline: AT + 30_000,
    })
    const response = store.getPublicState().response
    expect(response).toEqual({ armed: false, timer: { status: 'expired', durationMs: 30_000 } })
  })

  it('projects an interruption WITHOUT saying who or why', () => {
    const store = startedStore(30)
    store.dispatch({
      type: 'INTERRUPT_RESPONSE_TIMER',
      issuedAt: AT + 8_000,
      roundId: ROUND,
      source: HOST_INTERRUPTION,
    })
    const timer = store.getPublicState().response?.timer
    expect(timer).toEqual({ status: 'interrupted', durationMs: 30_000, remainingMs: 22_000 })
    expect(JSON.stringify(timer)).not.toContain('host')
    expect(JSON.stringify(timer)).not.toContain('source')
  })
})

describe('what never crosses the boundary', () => {
  it('never carries the internal timer id', () => {
    const store = startedStore(30)
    const serialized = JSON.stringify(store.getPublicState())
    expect(serialized).not.toContain('timerId')
    expect(serialized).not.toContain('tmr-')
  })

  it('never carries the private phase map, the authored config, or the round id', () => {
    const store = startedStore(45)
    const serialized = JSON.stringify(store.getPublicState())
    for (const forbidden of [
      'responsePhases',
      'responseSeconds',
      'startedAt',
      ROUND,
      'categoryBoards',
    ]) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('never carries anything about a future buzzer', () => {
    const store = startedStore(30)
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
    const serialized = JSON.stringify(store.getPublicState()).toLowerCase()
    for (const forbidden of ['buzz', 'queue', 'device', 'gamepad', 'controller', 'button', 'teamid']) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('never leaks the answer just because a timer is running', () => {
    const store = startedStore(30)
    const round = store.getPublicState().round
    expect(round && round.stage === 'prompt' && round.selection.answer).toBeNull()
  })

  it('stops projecting a window once the clue closes', () => {
    const store = startedStore(30)
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 1, roundId: ROUND })
    expect(store.getPublicState().response).toBeNull()
  })

  it('projects nothing once the game has ended', () => {
    const store = startedStore(30)
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    expect(store.getPublicState().response).toBeNull()
  })
})

describe('the projection is pure', () => {
  it('produces an identical snapshot however many times it is called', () => {
    const store = startedStore(30)
    const first = toPublicState(store.getState())
    const second = toPublicState(store.getState())
    expect(first).toEqual(second)
    // It reads no clock, so nothing in it can change between two calls.
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('publishes no per-second revision: the revision only moves on a FACT', () => {
    const store = startedStore(30)
    const revision = store.getState().revision
    // Nothing happens for the whole window — no command, so no event, so no
    // revision. The display derives every intervening second by itself.
    expect(store.getPublicState().revision).toBe(revision)
    expect(store.getPublicState().revision).toBe(revision)
    expect(store.getHistory().filter((event) => event.type.startsWith('RESPONSE_'))).toHaveLength(1)
  })

  it('still fails closed if projection throws', () => {
    const hostile = {
      schemaVersion: 1,
      revision: 0,
      diagnostics: { lastAppliedEventType: null, appliedEventCount: 0 },
      get session(): never {
        throw new Error('boom')
      },
    } as unknown as Parameters<typeof safeToPublicState>[0]
    expect(safeToPublicState(hostile).response).toBeNull()
  })
})

describe('the public response guard', () => {
  const running: PublicResponseTimer = {
    status: 'running',
    durationMs: 30_000,
    deadline: AT + 30_000,
  }

  it('accepts every well-formed status', () => {
    expect(isPublicResponseState(null)).toBe(true)
    expect(isPublicResponseState({ armed: false, timer: { status: 'idle' } })).toBe(true)
    expect(isPublicResponseState({ armed: true, timer: running })).toBe(true)
    expect(
      isPublicResponseState({
        armed: false,
        timer: { status: 'paused', durationMs: 1_000, remainingMs: 500 },
      }),
    ).toBe(true)
    expect(
      isPublicResponseState({ armed: false, timer: { status: 'expired', durationMs: 1_000 } }),
    ).toBe(true)
  })

  it('rejects a status/payload pairing that cannot exist', () => {
    // A running timer with a leftover remaining value, or a paused one with a
    // deadline, means the sender is confused — it is rejected, not rendered.
    expect(
      isPublicResponseState({ armed: false, timer: { ...running, remainingMs: 1_000 } }),
    ).toBe(false)
    expect(
      isPublicResponseState({
        armed: false,
        timer: { status: 'paused', durationMs: 1_000, remainingMs: 1, deadline: 2 },
      }),
    ).toBe(false)
    expect(
      isPublicResponseState({
        armed: false,
        timer: { status: 'expired', durationMs: 1_000, deadline: 2 },
      }),
    ).toBe(false)
  })

  it('rejects unusable numbers rather than rendering them on a projector', () => {
    for (const timer of [
      { status: 'running', durationMs: Number.NaN, deadline: 1 },
      { status: 'running', durationMs: 1_000, deadline: Number.POSITIVE_INFINITY },
      { status: 'running', durationMs: 30.5, deadline: 1 },
      { status: 'paused', durationMs: 1_000, remainingMs: -1 },
      { status: 'running', durationMs: PUBLIC_MAX_TIMER_DURATION_MS + 1, deadline: 1 },
      { status: 'nonsense' },
    ]) {
      expect(isPublicResponseState({ armed: false, timer }), JSON.stringify(timer)).toBe(false)
    }
    expect(isPublicResponseState({ armed: 'yes', timer: { status: 'idle' } })).toBe(false)
  })

  it('mirrors the domain duration ceiling', () => {
    expect(PUBLIC_MAX_TIMER_DURATION_MS).toBe(MAX_RESPONSE_SECONDS * 1000)
  })

  it('fails the WHOLE snapshot when the response is malformed', () => {
    const valid = startedStore(30).getPublicState()
    expect(isPublicState(valid)).toBe(true)
    expect(
      isPublicState({ ...valid, response: { armed: false, timer: { status: 'running' } } }),
    ).toBe(false)
  })
})

describe('the derived countdown', () => {
  const running: PublicResponseTimer = {
    status: 'running',
    durationMs: 30_000,
    deadline: AT + 30_000,
  }

  it('is computed from the deadline against a supplied instant', () => {
    expect(publicRemainingMsAt(running, AT)).toBe(30_000)
    expect(publicRemainingMsAt(running, AT + 20_000)).toBe(10_000)
  })

  it('never goes negative and never exceeds the window that was started', () => {
    expect(publicRemainingMsAt(running, AT + 60_000)).toBe(0)
    expect(publicRemainingMsAt(running, AT - 60_000)).toBe(30_000)
    expect(publicRemainingMsAt(running, Number.NaN)).toBe(0)
  })

  it('reports zero for expired and idle, and the frozen value for paused', () => {
    expect(publicRemainingMsAt({ status: 'idle' }, AT)).toBe(0)
    expect(publicRemainingMsAt({ status: 'expired', durationMs: 30_000 }, AT)).toBe(0)
    expect(
      publicRemainingMsAt({ status: 'paused', durationMs: 30_000, remainingMs: 7_000 }, AT),
    ).toBe(7_000)
  })
})

describe('the wire protocol', () => {
  it('is at public-state version 5 and envelope version 2', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(5)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
  })

  it('carries a sending stamp on every public-state envelope', () => {
    const state = startedStore(30).getPublicState()
    const envelope = encodeEnvelope({
      type: 'public-state',
      revision: state.revision,
      sentAt: AT,
      payload: state,
    })
    const decoded = decodeEnvelope(envelope)
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.message.type === 'public-state') {
      expect(decoded.message.sentAt).toBe(AT)
    }
  })

  it('rejects a version-1 envelope outright rather than guessing at the missing stamp', () => {
    const state = startedStore(30).getPublicState()
    const decoded = decodeEnvelope({
      protocol: 'classroom-quiz-show/sync',
      schemaVersion: 1,
      message: { type: 'public-state', revision: state.revision, payload: state },
    })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('unsupported-version')
  })

  it('rejects an unusable sending stamp rather than defaulting it', () => {
    const state = startedStore(30).getPublicState()
    for (const sentAt of [Number.NaN, -1, 1.5, '1000', null, undefined]) {
      const decoded = decodeEnvelope({
        protocol: 'classroom-quiz-show/sync',
        schemaVersion: SYNC_SCHEMA_VERSION,
        message: { type: 'public-state', revision: state.revision, sentAt, payload: state },
      })
      expect(decoded.ok, `sentAt ${String(sentAt)}`).toBe(false)
      if (!decoded.ok) expect(decoded.reason).toBe('malformed-payload')
    }
  })

  it('rejects a version-4 payload — the display never reinterprets an old shape', () => {
    const state = startedStore(30).getPublicState()
    const withoutResponse: Record<string, unknown> = { ...state }
    delete withoutResponse.response
    expect(isPublicState({ ...withoutResponse, schemaVersion: 4 })).toBe(false)
    expect(isPublicState(withoutResponse)).toBe(false)
  })
})

describe('the clock-offset estimate', () => {
  it('is bounded in both directions', () => {
    expect(clampOffset(0)).toBe(0)
    expect(clampOffset(250)).toBe(250)
    expect(clampOffset(-250)).toBe(-250)
    expect(clampOffset(60_000)).toBe(MAX_CLOCK_OFFSET_CORRECTION_MS)
    expect(clampOffset(-60_000)).toBe(-MAX_CLOCK_OFFSET_CORRECTION_MS)
  })

  it('corrects nothing when the estimate is unusable', () => {
    expect(clampOffset(Number.NaN)).toBe(0)
    expect(clampOffset(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampOffset(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})
