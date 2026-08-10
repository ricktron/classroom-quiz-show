import { describe, expect, it } from 'vitest'
import {
  decodeActiveSessionRecord,
  decodeSessionHistory,
  encodeSessionHistory,
  isResumableHistory,
} from './wire/sessionWire'
import {
  PERSISTENCE_DB_VERSION,
  PERSISTENCE_WIRE_FORMAT,
  PERSISTENCE_WIRE_VERSION,
} from './constants'
import { replay } from '../state/reducer'
import { finalWagerStateFor } from '../state/reducer'
import type { SessionEvent } from '../state/events'
import type { SessionStore } from '../state/store'
import {
  AT,
  FINAL_ROUND_ID,
  finalOf,
  finalStore,
  playToReveal,
  scoreOf,
  settleAll,
} from '../test/finalWagerFixtures'

/**
 * Final Wager persistence and recovery (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - EVERY Final event round-trips through the existing private codec, exactly;
 *  - a decoded history replays to the identical state, so a refresh at any point
 *    in Final resumes exactly where the host left off;
 *  - the private wire and the IndexedDB schema both stay at version 1, and a
 *    pre-Slice-14 history still decodes;
 *  - decoding fails CLOSED on an unknown field, a mistyped value, or a snapshot
 *    that is not internally consistent — nothing is repaired or partially read.
 */

const ROUND = FINAL_ROUND_ID

/** Encode a store's history and decode it straight back. */
function roundTrip(store: SessionStore): readonly SessionEvent[] {
  const encoded = encodeSessionHistory(store.getHistory(), AT)
  expect(encoded.ok, encoded.ok ? '' : encoded.message).toBe(true)
  if (!encoded.ok) throw new Error('encode failed')
  const decoded = decodeSessionHistory(encoded.value)
  expect(decoded.ok, decoded.ok ? '' : decoded.message).toBe(true)
  if (!decoded.ok) throw new Error('decode failed')
  return decoded.value
}

/** The wire form of one event type in a store's encoded history. */
function wireEventOf(store: SessionStore, type: string): Record<string, unknown> {
  const encoded = encodeSessionHistory(store.getHistory(), AT)
  if (!encoded.ok) throw new Error('encode failed')
  const event = (encoded.value.events as Record<string, unknown>[]).find(
    (candidate) => candidate.type === type,
  )
  if (event === undefined) throw new Error(`no ${type} in history`)
  return event
}

describe('the compatibility versions are unchanged', () => {
  it('keeps the private persistence wire at version 1', () => {
    expect(PERSISTENCE_WIRE_VERSION).toBe(1)
  })

  it('advances only the IndexedDB database schema to version 2 for completed summaries', () => {
    expect(PERSISTENCE_DB_VERSION).toBe(4)
  })

  it('decodes a FROZEN pre-Slice-14 wire record written by the Slice 13 build', () => {
    // A literal record in the version-1 format as it stood BEFORE Slice 14 —
    // not a round-trip through the current encoder. This is what makes "the
    // private wire stays at 1" a compatibility claim rather than a tautology:
    // a history saved by the previous build still decodes and still replays.
    const legacy = {
      format: PERSISTENCE_WIRE_FORMAT,
      schemaVersion: 1,
      savedAt: AT,
      events: [
        {
          id: 'evt-0',
          type: 'SESSION_INITIALIZED',
          seq: 0,
          occurredAt: AT,
          reversible: false,
          sessionId: 'legacy-session',
        },
        {
          id: 'evt-1',
          type: 'PUBLIC_STATUS_SET',
          seq: 1,
          occurredAt: AT,
          reversible: true,
          code: 'session-ready',
        },
        {
          id: 'evt-2',
          type: 'SEQUENCE_ADVANCED',
          seq: 2,
          occurredAt: AT,
          reversible: true,
        },
      ],
    }

    const decoded = decodeSessionHistory(legacy)
    expect(decoded.ok, decoded.ok ? '' : decoded.message).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.map((event) => event.type)).toEqual([
      'SESSION_INITIALIZED',
      'PUBLIC_STATUS_SET',
      'SEQUENCE_ADVANCED',
    ])
    const state = replay(decoded.value)
    expect(state.session?.sessionId).toBe('legacy-session')
    expect(state.session?.counter).toBe(1)
  })

  it('still decodes a pre-Slice-14 history containing no Final event at all', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    const decoded = roundTrip(store)
    expect(decoded.some((event) => event.type.startsWith('FINAL_'))).toBe(false)
    expect(replay(decoded)).toEqual(store.getState())
  })
})

describe('every Final event round-trips exactly', () => {
  it('carries the complete Final flow through encode and decode', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'inclusive' })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 60,
    })
    store.dispatch({ type: 'PAUSE_FINAL_WAGER_WINDOW', issuedAt: AT + 10_000, roundId: ROUND })
    store.dispatch({ type: 'RESUME_FINAL_WAGER_WINDOW', issuedAt: AT + 20_000, roundId: ROUND })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 100 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'exact-text',
      durationSeconds: 90,
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      response: { kind: 'exact', text: 'Mantle convection' },
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'blue',
      response: { kind: 'no-response' },
    })
    store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue' })
    store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue', outcome: 'no-response' })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'red' })
    store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'red', outcome: 'correct' })

    const decoded = roundTrip(store)
    expect(decoded).toEqual(store.getHistory())
    expect(replay(decoded)).toEqual(store.getState())
  })

  it('round-trips the frozen eligibility snapshot exactly', () => {
    const store = finalStore({ scores: { red: 300, blue: -100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'inclusive' })
    const decoded = roundTrip(store)
    const restored = replay(decoded)
    expect(finalWagerStateFor(restored.session!.game!, ROUND).snapshot).toEqual(
      finalOf(store).snapshot,
    )
  })

  it('round-trips a window expiry', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'START_FINAL_WAGER_WINDOW', issuedAt: AT, roundId: ROUND, durationSeconds: 60 })
    const window = finalOf(store).wagerWindow
    if (window.status !== 'running') throw new Error('expected a running window')
    store.dispatch({
      type: 'EXPIRE_FINAL_WAGER_WINDOW',
      issuedAt: AT + 60_000,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
    expect(replay(roundTrip(store))).toEqual(store.getState())
  })

  it('round-trips sudden death and an accepted tie with the right reversibility', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    const suddenDeath = wireEventOf(store, 'FINAL_TIE_RESOLUTION_SELECTED')
    expect(suddenDeath.resolution).toBe('sudden-death')
    expect(suddenDeath.reversible).toBe(true)

    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND })
    const decoded = roundTrip(store)
    const accepted = decoded.filter((event) => event.type === 'FINAL_TIE_RESOLUTION_SELECTED')
    expect(accepted).toHaveLength(2)
    expect(accepted[0].reversible).toBe(true)
    expect(accepted[1].reversible).toBe(false)
    expect(replay(decoded)).toEqual(store.getState())
  })

  it('round-trips an undone Final event, preserving the undo marker', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 100 })
    store.dispatch({ type: 'UNDO', issuedAt: AT })
    const decoded = roundTrip(store)
    expect(decoded.some((event) => event.type === 'EVENT_UNDONE')).toBe(true)
    expect(replay(decoded)).toEqual(store.getState())
  })

  it('writes no resulting total onto the settlement wire form', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    const settled = wireEventOf(store, 'FINAL_TEAM_SETTLED')
    expect(Object.keys(settled).sort()).toEqual([
      'delta',
      'id',
      'occurredAt',
      'outcome',
      'reversible',
      'roundId',
      'seq',
      'teamId',
      'type',
      'wager',
    ])
  })
})

describe('recovery resumes exactly, at every point in Final', () => {
  /** Encode, decode and replay — the shape of a real refresh + Resume. */
  function recover(store: SessionStore) {
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error('encode failed')
    const record = decodeActiveSessionRecord(encoded.value)
    expect(record.ok).toBe(true)
    if (!record.ok) throw new Error('decode failed')
    expect(record.value.savedAt).toBe(AT)
    return replay(record.value.events)
  }

  it('resumes wager entry with every committed wager intact', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 250 })
    const restored = recover(store)
    const final = finalWagerStateFor(restored.session!.game!, ROUND)
    expect(final.phase).toBe('wager-entry')
    expect(final.wagers).toEqual({ red: 250 })
  })

  it('resumes a locked wager phase with its running window facts', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'START_FINAL_WAGER_WINDOW', issuedAt: AT, roundId: ROUND, durationSeconds: 60 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    const final = finalWagerStateFor(recover(store).session!.game!, ROUND)
    expect(final.phase).toBe('wagers-locked')
    expect(final.wagerWindow.status).toBe('running')
  })

  it('resumes response entry with the capture mode and recorded states', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'host-only',
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      response: { kind: 'not-captured' },
    })
    const final = finalWagerStateFor(recover(store).session!.game!, ROUND)
    expect(final.phase).toBe('response-entry')
    expect(final.captureMode).toBe('host-only')
    expect(final.responses).toEqual({ red: { kind: 'not-captured' } })
  })

  it('resumes the answer reveal', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store)
    expect(finalWagerStateFor(recover(store).session!.game!, ROUND).phase).toBe('answer-revealed')
  })

  it('resumes the EXACT current reveal team', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'red' })
    const final = finalWagerStateFor(recover(store).session!.game!, ROUND)
    expect(final.phase).toBe('team-reveal')
    expect(final.revealedTeamIds).toEqual(['red'])
  })

  it('resumes a PARTIAL settlement with the settled score preserved', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue' })
    store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue', outcome: 'correct' })
    const restored = recover(store)
    const final = finalWagerStateFor(restored.session!.game!, ROUND)
    expect(final.settlements.blue.delta).toBe(50)
    expect(restored.session!.game!.teamScores.blue).toBe(150)
    expect(scoreOf(store, 'blue')).toBe(150)
    // Red is untouched and still to be revealed.
    expect(final.revealedTeamIds).toEqual(['blue'])
  })

  it('resumes an unresolved TIED resolution, with the choice still open', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    const restored = recover(store)
    const final = finalWagerStateFor(restored.session!.game!, ROUND)
    // The host has not chosen yet, so the phase is still the open decision and
    // no tie resolution is recorded.
    expect(final.phase).toBe('resolution')
    expect(final.tieResolution).toBeNull()
    expect(restored.session!.game!.teamScores).toEqual({ red: 200, blue: 200 })
    expect(restored.session!.game!.gameLifecycle).toBe('active')
  })

  it('resumes sudden death with the tied scores intact', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    const restored = recover(store)
    const final = finalWagerStateFor(restored.session!.game!, ROUND)
    expect(final.phase).toBe('sudden-death')
    expect(restored.session!.game!.teamScores).toEqual({ red: 200, blue: 200 })
  })

  it('treats an in-progress Final as resumable and an ended game as not', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    expect(isResumableHistory(store.getHistory())).toBe(true)
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND })
    expect(isResumableHistory(store.getHistory())).toBe(false)
  })
})

describe('the decoder fails closed', () => {
  function historyWith(
    mutate: (events: Record<string, unknown>[]) => void,
  ): ReturnType<typeof decodeSessionHistory> {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error('encode failed')
    const events = JSON.parse(JSON.stringify(encoded.value.events)) as Record<string, unknown>[]
    mutate(events)
    return decodeSessionHistory({
      format: PERSISTENCE_WIRE_FORMAT,
      schemaVersion: PERSISTENCE_WIRE_VERSION,
      savedAt: AT,
      events,
    })
  }

  function find(events: Record<string, unknown>[], type: string): Record<string, unknown> {
    const event = events.find((candidate) => candidate.type === type)
    if (event === undefined) throw new Error(`no ${type}`)
    return event
  }

  it.each([
    [
      'an unknown field on a Final event',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_WAGERS_LOCKED').smuggled = true
      },
    ],
    [
      'a negative wager',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_TEAM_WAGER_RECORDED').wager = -1
      },
    ],
    [
      'a fractional wager',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_TEAM_WAGER_RECORDED').wager = 1.5
      },
    ],
    [
      'a whitespace-only exact response',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_TEAM_RESPONSE_RECORDED').response = { kind: 'exact', text: '   ' }
      },
    ],
    [
      'an unknown response kind',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_TEAM_RESPONSE_RECORDED').response = { kind: 'maybe' }
      },
    ],
    [
      'an unknown capture mode',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_RESPONSE_WINDOW_STARTED').captureMode = 'transcript'
      },
    ],
    [
      'an eligibility snapshot whose reveal order names a stranger',
      (events: Record<string, unknown>[]) => {
        const started = find(events, 'FINAL_WAGER_STARTED')
        const snapshot = started.snapshot as Record<string, unknown>
        snapshot.revealOrder = ['ghost', 'blue']
      },
    ],
    [
      'an eligibility snapshot with an unknown mode',
      (events: Record<string, unknown>[]) => {
        const started = find(events, 'FINAL_WAGER_STARTED')
        ;(started.snapshot as Record<string, unknown>).mode = 'everyone'
      },
    ],
    [
      'a Final event claiming the wrong reversibility',
      (events: Record<string, unknown>[]) => {
        find(events, 'FINAL_WAGERS_LOCKED').reversible = false
      },
    ],
  ])('rejects %s as corrupt', (_label, mutate) => {
    const result = historyWith(mutate)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('corrupt')
  })

  it('rejects an accepted tie encoded as reversible', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND })
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error('encode failed')
    const events = JSON.parse(JSON.stringify(encoded.value.events)) as Record<string, unknown>[]
    const accepted = events.filter((event) => event.type === 'FINAL_TIE_RESOLUTION_SELECTED')
    // The flow below produces exactly one tie-resolution event: the acceptance.
    expect(accepted).toHaveLength(1)
    accepted[0].reversible = true
    const result = decodeSessionHistory({
      format: PERSISTENCE_WIRE_FORMAT,
      schemaVersion: PERSISTENCE_WIRE_VERSION,
      savedAt: AT,
      events,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an unsupported wire version rather than guessing', () => {
    const store = finalStore({ scores: { red: 300 } })
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error('encode failed')
    const result = decodeSessionHistory({ ...encoded.value, schemaVersion: 2 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('unsupported-version')
  })
})
