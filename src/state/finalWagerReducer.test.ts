import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { finalWagerStateFor, planCommand, replay, type RejectionReason } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { createGameDefinition } from '../game/gameDefinition'
import { roundId, roundType } from '../game/ids'
import {
  AT,
  BOARD_ROUND_ID,
  FINAL_ROUND_ID,
  finalConfig,
  finalDefinition,
  finalOf,
  finalStore,
  playToReveal,
  precedingBoard,
  scoreOf,
  settleAll,
} from '../test/finalWagerFixtures'
import { MAX_TEAM_SCORE } from '../game/teams/scoring'
import { MIN_RESPONSE_SECONDS } from '../game/timing/limits'

/**
 * Final Wager commands, events, replay and undo (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - the phase machine permits only legal transitions, and every illegal one is
 *    a REJECTION that appends no event and changes no revision;
 *  - eligibility, caps and reveal order are frozen at Final start and never
 *    drift, however the scores move afterwards;
 *  - wagers and responses are validated, never clamped or repaired;
 *  - nothing happens automatically — expiry in particular locks, marks, reveals,
 *    adjudicates, settles and completes nothing;
 *  - settlement is atomic, bounded, non-duplicable and exactly reversible;
 *  - all state is DERIVED BY REPLAY, so undo needs no separate bookkeeping.
 */

const ROUND = FINAL_ROUND_ID

function begin(mode: 'classic' | 'inclusive' = 'classic', roundId = ROUND): SessionCommand {
  return { type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId, mode }
}
function wager(teamId: string, value: number, roundId = ROUND): SessionCommand {
  return { type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId, teamId, wager: value }
}
function lockWagers(roundId = ROUND): SessionCommand {
  return { type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId }
}
const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

/** Assert that a command was rejected for a specific reason and appended nothing. */
function expectRejected(store: SessionStore, command: SessionCommand, reason: RejectionReason) {
  const before = store.getHistory().length
  const result = store.dispatch(command)
  expect(result.status, `expected rejection: ${reason}`).toBe('rejected')
  if (result.status === 'rejected') expect(result.reason).toBe(reason)
  expect(store.getHistory().length).toBe(before)
}

describe('beginning Final freezes the conditions (CQS-OD-005)', () => {
  it('freezes eligibility, scores, caps and reveal order onto the event', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    const snapshot = finalOf(store).snapshot
    expect(snapshot?.mode).toBe('classic')
    expect(snapshot?.teams).toEqual([
      { teamId: 'red', preFinalScore: 300, maxWager: 300 },
      { teamId: 'blue', preFinalScore: 100, maxWager: 100 },
    ])
    expect(snapshot?.revealOrder).toEqual(['blue', 'red'])
    expect(finalOf(store).phase).toBe('wager-entry')
  })

  it('excludes a zero and a negative team under classic', () => {
    const store = finalStore({ scores: { red: 300, blue: -100 } })
    store.dispatch(begin('classic'))
    expect(finalOf(store).snapshot?.teams.map((team) => team.teamId)).toEqual(['red'])
  })

  it('includes every team under inclusive, capping non-positive ones by the board', () => {
    const store = finalStore({ scores: { red: 300, blue: -100 } })
    store.dispatch(begin('inclusive'))
    expect(finalOf(store).snapshot?.teams).toEqual([
      { teamId: 'red', preFinalScore: 300, maxWager: 300 },
      // The fixture board's single tile is worth 400.
      { teamId: 'blue', preFinalScore: -100, maxWager: 400 },
    ])
  })

  it('caps a non-positive team at zero when no board precedes Final', () => {
    const store = finalStore({
      scores: { red: 300 },
      definitionOptions: { board: null },
    })
    store.dispatch(begin('inclusive'))
    expect(
      finalOf(store).snapshot?.teams.find((team) => team.teamId === 'blue')?.maxWager,
    ).toBe(0)
  })

  it('does NOT drift once scores move afterwards', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    const frozen = finalOf(store).snapshot
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: -290,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    expect(finalOf(store).snapshot).toEqual(frozen)
    expect(scoreOf(store, 'red')).toBe(10)
  })

  it('proceeds straight to a result when classic admits nobody', () => {
    const store = finalStore({ scores: {} })
    store.dispatch(begin('classic'))
    const final = finalOf(store)
    expect(final.snapshot?.teams).toEqual([])
    // Both teams sit on zero, so the lead is tied and the host must choose.
    expect(final.phase).toBe('resolution')
    expect(final.wagers).toEqual({})
    expect(final.responses).toEqual({})
  })

  it('lands on ready-to-complete when an empty classic Final has a unique leader', () => {
    const store = finalStore({ scores: { red: -100 } })
    store.dispatch(begin('classic'))
    expect(finalOf(store).phase).toBe('ready-to-complete')
  })

  it('cannot begin twice', () => {
    const store = finalStore({ scores: { red: 100 } })
    store.dispatch(begin())
    expectRejected(store, begin(), 'invalid-final-phase')
  })

  it('rejects an unknown eligibility mode without mutating anything', () => {
    const store = finalStore({ scores: { red: 100 } })
    expectRejected(
      store,
      { type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'everyone' } as never,
      'malformed-command',
    )
  })

  it('rejects a command that names a different round', () => {
    const store = finalStore({ scores: { red: 100 } })
    expectRejected(store, begin('classic', BOARD_ROUND_ID), 'round-mismatch')
  })

  it('rejects a Final command while a BOARD round is current', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: finalDefinition() })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: BOARD_ROUND_ID })
    expectRejected(store, begin('classic', BOARD_ROUND_ID), 'not-a-final-wager-round')
  })

  it('rejects Final in a game with no teams', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    // Built through the TRUSTED constructor rather than the import pipeline: the
    // import boundary already refuses a team-less Final outright, so this is the
    // only way to reach the runtime half of the same rule — the Slice 3 path,
    // which still represents an unplayable configuration and fails closed.
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({
        id: 'teamless-final',
        title: 'Teamless Final',
        rounds: [
          {
            id: roundId(FINAL_ROUND_ID),
            type: roundType('final-wager'),
            title: 'Final Wager',
            config: finalConfig() as never,
          },
        ],
      }),
    })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: ROUND })
    expectRejected(store, begin(), 'no-teams-configured')
  })
})

describe('wager entry (CQS-OD-006)', () => {
  function wagerStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    return store
  }

  it('accepts an explicit zero as a committed wager', () => {
    const store = wagerStore()
    expect(store.dispatch(wager('red', 0)).status).toBe('accepted')
    expect(finalOf(store).wagers.red).toBe(0)
  })

  it('accepts exactly the cap', () => {
    const store = wagerStore()
    expect(store.dispatch(wager('red', 300)).status).toBe('accepted')
  })

  it.each([
    ['one above the cap', 301],
    ['a negative amount', -1],
    ['a fraction', 10.5],
    ['a non-finite value', Number.NaN],
    ['infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s without mutating anything', (_label, value) => {
    const store = wagerStore()
    expectRejected(store, wager('red', value), 'invalid-final-wager')
    expect(finalOf(store).wagers).toEqual({})
  })

  it('rejects a wager for a team that is not eligible', () => {
    const store = finalStore({ scores: { red: 300 } })
    store.dispatch(begin('classic'))
    expectRejected(store, wager('blue', 0), 'team-not-eligible')
  })

  it('rejects a wager for a team that is not in the game at all', () => {
    const store = wagerStore()
    expectRejected(store, wager('green', 0), 'unknown-team')
  })

  it('records a correction as a NEW event, leaving the earlier one in the log', () => {
    const store = wagerStore()
    store.dispatch(wager('red', 100))
    store.dispatch(wager('red', 250))
    expect(finalOf(store).wagers.red).toBe(250)
    const recorded = store
      .getHistory()
      .filter((event) => event.type === 'FINAL_TEAM_WAGER_RECORDED')
    expect(recorded).toHaveLength(2)
    expect(recorded.map((event) => (event as { wager: number }).wager)).toEqual([100, 250])
  })

  it('undoes a correction back to the previous committed value', () => {
    const store = wagerStore()
    store.dispatch(wager('red', 100))
    store.dispatch(wager('red', 250))
    store.dispatch(undo)
    expect(finalOf(store).wagers.red).toBe(100)
  })

  it('refuses to lock until EVERY eligible team has an explicit wager', () => {
    const store = wagerStore()
    store.dispatch(wager('red', 0))
    expectRejected(store, lockWagers(), 'final-wagers-incomplete')
    store.dispatch(wager('blue', 0))
    expect(store.dispatch(lockWagers()).status).toBe('accepted')
    expect(finalOf(store).phase).toBe('wagers-locked')
  })

  it('refuses a wager after the lock, and allows it again once the lock is undone', () => {
    const store = wagerStore()
    store.dispatch(wager('red', 0))
    store.dispatch(wager('blue', 0))
    store.dispatch(lockWagers())
    expectRejected(store, wager('red', 50), 'invalid-final-phase')
    store.dispatch(undo)
    expect(finalOf(store).phase).toBe('wager-entry')
    expect(store.dispatch(wager('red', 50)).status).toBe('accepted')
  })
})

describe('the wager and response windows', () => {
  function windowStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    return store
  }

  const start = (seconds?: number): SessionCommand => ({
    type: 'START_FINAL_WAGER_WINDOW',
    issuedAt: AT,
    roundId: ROUND,
    ...(seconds === undefined ? {} : { durationSeconds: seconds }),
  })

  it('uses the authored default duration when none is chosen', () => {
    const store = finalStore({
      scores: { red: 300 },
      definitionOptions: { timer: { responseSeconds: 45 } },
    })
    store.dispatch(begin('classic'))
    store.dispatch(start())
    const window = finalOf(store).wagerWindow
    expect(window.status).toBe('running')
    if (window.status !== 'running') return
    expect(window.durationMs).toBe(45_000)
    expect(window.deadline).toBe(AT + 45_000)
  })

  it('accepts a bounded host override and rejects an out-of-range one', () => {
    const store = windowStore()
    expectRejected(store, start(MIN_RESPONSE_SECONDS - 1), 'invalid-timer-duration')
    expectRejected(store, start(601), 'invalid-timer-duration')
    expect(store.dispatch(start(60)).status).toBe('accepted')
  })

  it('refuses a second start while one is already running', () => {
    const store = windowStore()
    store.dispatch(start(60))
    expectRejected(store, start(60), 'invalid-final-phase')
  })

  it('pauses with the remaining time frozen, then resumes with a NEW deadline', () => {
    const store = windowStore()
    store.dispatch(start(60))
    store.dispatch({
      type: 'PAUSE_FINAL_WAGER_WINDOW',
      issuedAt: AT + 20_000,
      roundId: ROUND,
    })
    const paused = finalOf(store).wagerWindow
    expect(paused.status).toBe('paused')
    if (paused.status === 'paused') expect(paused.remainingMs).toBe(40_000)

    store.dispatch({
      type: 'RESUME_FINAL_WAGER_WINDOW',
      issuedAt: AT + 90_000,
      roundId: ROUND,
    })
    const resumed = finalOf(store).wagerWindow
    expect(resumed.status).toBe('running')
    // The wall-clock time spent paused is never charged to the class.
    if (resumed.status === 'running') expect(resumed.deadline).toBe(AT + 90_000 + 40_000)
  })

  it('expires only on a three-way match, and a stale callback appends nothing', () => {
    const store = windowStore()
    store.dispatch(start(60))
    const window = finalOf(store).wagerWindow
    if (window.status !== 'running') throw new Error('expected a running window')

    expectRejected(
      store,
      {
        type: 'EXPIRE_FINAL_WAGER_WINDOW',
        issuedAt: AT + 60_000,
        roundId: ROUND,
        timerId: 'not-the-live-timer',
        deadline: window.deadline,
      },
      'stale-final-window',
    )
    expectRejected(
      store,
      {
        type: 'EXPIRE_FINAL_WAGER_WINDOW',
        issuedAt: AT + 60_000,
        roundId: ROUND,
        timerId: window.timerId,
        deadline: window.deadline + 1,
      },
      'stale-final-window',
    )
    expectRejected(
      store,
      {
        type: 'EXPIRE_FINAL_WAGER_WINDOW',
        issuedAt: AT + 1_000,
        roundId: ROUND,
        timerId: window.timerId,
        deadline: window.deadline,
      },
      'premature-final-window-expiration',
    )

    const expire: SessionCommand = {
      type: 'EXPIRE_FINAL_WAGER_WINDOW',
      issuedAt: AT + 60_000,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    }
    expect(store.dispatch(expire).status).toBe('accepted')
    expect(finalOf(store).wagerWindow.status).toBe('expired')
    // Exactly one effective expiry per countdown, structurally.
    expectRejected(store, expire, 'stale-final-window')
  })

  it('EXPIRY LOCKS NOTHING: the phase, the wagers and the responses are untouched', () => {
    const store = windowStore()
    store.dispatch(start(60))
    const window = finalOf(store).wagerWindow
    if (window.status !== 'running') throw new Error('expected a running window')
    store.dispatch({
      type: 'EXPIRE_FINAL_WAGER_WINDOW',
      issuedAt: AT + 60_000,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
    const final = finalOf(store)
    expect(final.phase).toBe('wager-entry')
    expect(final.wagers).toEqual({})
    expect(final.responses).toEqual({})
    // …and the lock is still refused, because no wager was invented for anyone.
    expectRejected(store, lockWagers(), 'final-wagers-incomplete')
  })

  it('emits no tick event: a window produces exactly one event per transition', () => {
    const store = windowStore()
    const before = store.getHistory().length
    store.dispatch(start(60))
    store.dispatch({ type: 'PAUSE_FINAL_WAGER_WINDOW', issuedAt: AT + 10_000, roundId: ROUND })
    store.dispatch({ type: 'RESUME_FINAL_WAGER_WINDOW', issuedAt: AT + 20_000, roundId: ROUND })
    expect(store.getHistory().length - before).toBe(3)
  })

  it('undoes a start back to an idle window', () => {
    const store = windowStore()
    store.dispatch(start(60))
    store.dispatch(undo)
    expect(finalOf(store).wagerWindow.status).toBe('idle')
  })

  it('runs a separate response window with its own identity', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    store.dispatch(start(60))
    store.dispatch(wager('red', 0))
    store.dispatch(wager('blue', 0))
    store.dispatch(lockWagers())
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'exact-text',
      durationSeconds: 90,
    })
    const final = finalOf(store)
    expect(final.responseWindow.status).toBe('running')
    if (final.responseWindow.status !== 'running') return
    if (final.wagerWindow.status !== 'running') throw new Error('expected the wager window to persist')
    expect(final.responseWindow.timerId).not.toBe(final.wagerWindow.timerId)
    expect(final.responseWindow.durationMs).toBe(90_000)
  })
})

describe('response entry (CQS-OD-007)', () => {
  function responseStore(captureMode: 'exact-text' | 'host-only' = 'exact-text'): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    store.dispatch(wager('red', 100))
    store.dispatch(wager('blue', 50))
    store.dispatch(lockWagers())
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode,
    })
    return store
  }

  const record = (
    teamId: string,
    response: unknown,
  ): SessionCommand =>
    ({ type: 'RECORD_FINAL_RESPONSE', issuedAt: AT, roundId: ROUND, teamId, response }) as SessionCommand

  it('opening the response window is what records the capture mode', () => {
    const store = responseStore('host-only')
    expect(finalOf(store).captureMode).toBe('host-only')
    expect(finalOf(store).phase).toBe('response-entry')
  })

  it('records all three durable states as DISTINCT facts', () => {
    const store = responseStore()
    store.dispatch(record('red', { kind: 'exact', text: 'Mantle convection' }))
    store.dispatch(record('blue', { kind: 'no-response' }))
    expect(finalOf(store).responses).toEqual({
      red: { kind: 'exact', text: 'Mantle convection' },
      blue: { kind: 'no-response' },
    })
  })

  it('rejects whitespace-only exact text rather than treating it as no response', () => {
    const store = responseStore()
    expectRejected(store, record('red', { kind: 'exact', text: '   ' }), 'invalid-final-response')
    expect(finalOf(store).responses).toEqual({})
  })

  it('rejects exact text when the host chose host-only adjudication', () => {
    const store = responseStore('host-only')
    expectRejected(
      store,
      record('red', { kind: 'exact', text: 'Mantle convection' }),
      'invalid-final-response',
    )
    expect(store.dispatch(record('red', { kind: 'not-captured' })).status).toBe('accepted')
  })

  it('rejects an unknown response kind', () => {
    const store = responseStore()
    expectRejected(store, record('red', { kind: 'maybe' }), 'invalid-final-response')
  })

  it('refuses to lock until every eligible team has an explicit state', () => {
    const store = responseStore()
    store.dispatch(record('red', { kind: 'not-captured' }))
    expectRejected(store, { type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND }, 'final-responses-incomplete')
    store.dispatch(record('blue', { kind: 'no-response' }))
    expect(
      store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND }).status,
    ).toBe('accepted')
    expect(finalOf(store).phase).toBe('responses-locked')
  })

  it('records a correction as a NEW event', () => {
    const store = responseStore()
    store.dispatch(record('red', { kind: 'no-response' }))
    store.dispatch(record('red', { kind: 'exact', text: 'Convection' }))
    expect(finalOf(store).responses.red).toEqual({ kind: 'exact', text: 'Convection' })
    store.dispatch(undo)
    expect(finalOf(store).responses.red).toEqual({ kind: 'no-response' })
  })
})

describe('reveal and settlement (CQS-OD-008)', () => {
  function revealStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'exact', blue: 'no-response' },
    })
    return store
  }

  const reveal = (teamId: string): SessionCommand => ({
    type: 'REVEAL_FINAL_TEAM',
    issuedAt: AT,
    roundId: ROUND,
    teamId,
  })
  const settle = (
    teamId: string,
    outcome: 'correct' | 'incorrect' | 'no-response',
  ): SessionCommand => ({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId, outcome })

  it('keeps the answer private until an explicit reveal', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    expectRejected(store, { type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND }, 'invalid-final-phase')
  })

  it('offers the default low-to-high order but accepts any unrevealed team', () => {
    const store = revealStore()
    // Default order is blue (100) then red (300); the host picks red first.
    expect(finalOf(store).snapshot?.revealOrder).toEqual(['blue', 'red'])
    expect(store.dispatch(reveal('red')).status).toBe('accepted')
    expect(finalOf(store).revealedTeamIds).toEqual(['red'])
  })

  it('refuses a second reveal while the first team is unsettled', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    expectRejected(store, reveal('red'), 'invalid-final-phase')
  })

  it('refuses to reveal the same team twice', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    expectRejected(store, reveal('blue'), 'team-already-revealed')
  })

  it('refuses to settle a team that is not on screen', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    expectRejected(store, settle('red', 'correct'), 'team-not-revealed')
  })

  it('refuses an outcome that contradicts the recorded response', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    expectRejected(store, settle('blue', 'correct'), 'final-outcome-mismatch')
    store.dispatch(settle('blue', 'no-response'))
    store.dispatch(reveal('red'))
    expectRejected(store, settle('red', 'no-response'), 'final-outcome-mismatch')
  })

  it('adds the wager on correct and subtracts it otherwise, atomically', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    expect(scoreOf(store, 'blue')).toBe(50)
    store.dispatch(reveal('red'))
    store.dispatch(settle('red', 'correct'))
    expect(scoreOf(store, 'red')).toBe(400)
  })

  it('records an auditable zero-delta settlement for a zero wager', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 }, responses: { red: 'exact', blue: 'exact' } })
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'correct'))
    const settlement = finalOf(store).settlements.blue
    expect(settlement).toEqual({ teamId: 'blue', wager: 0, outcome: 'correct', delta: 0 })
    expect(scoreOf(store, 'blue')).toBe(100)
    const event = store.getHistory().find((candidate) => candidate.type === 'FINAL_TEAM_SETTLED')
    expect(event).toBeDefined()
  })

  it('never stores a resulting total on the settlement', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    const event = store.getHistory().find((candidate) => candidate.type === 'FINAL_TEAM_SETTLED')
    expect(Object.keys(event as unknown as Record<string, unknown>)).toEqual(
      expect.arrayContaining(['teamId', 'wager', 'outcome', 'delta']),
    )
    expect(event).not.toHaveProperty('resultingScore')
    expect(event).not.toHaveProperty('total')
  })

  it('cannot settle the same team twice', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    expectRejected(store, settle('blue', 'no-response'), 'team-not-revealed')
  })

  it('rejects a settlement that would leave the score bounds', () => {
    const store = finalStore({ scores: { red: MAX_TEAM_SCORE - 10, blue: 100 } })
    // The cap already bounds a wager to the headroom, so an in-bounds wager is
    // the only one that reaches settlement — proving the cap and the bound agree.
    store.dispatch(begin('classic'))
    const cap = finalOf(store).snapshot?.teams.find((team) => team.teamId === 'red')?.maxWager
    expect(cap).toBe(10)
    expectRejected(store, wager('red', 11), 'invalid-final-wager')
  })

  it('undoes a settlement, restoring both the score and the unsettled reveal', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    expect(scoreOf(store, 'blue')).toBe(50)
    store.dispatch(undo)
    expect(scoreOf(store, 'blue')).toBe(100)
    const final = finalOf(store)
    expect(final.settlements).toEqual({})
    // The reveal, the wager and the response all survive the undo.
    expect(final.revealedTeamIds).toEqual(['blue'])
    expect(final.wagers.blue).toBe(50)
    expect(final.responses.blue).toEqual({ kind: 'no-response' })
    // …and it can be re-settled.
    expect(store.dispatch(settle('blue', 'no-response')).status).toBe('accepted')
  })

  it('moves to a resolution phase only once EVERY eligible team is settled', () => {
    const store = revealStore()
    store.dispatch(reveal('blue'))
    store.dispatch(settle('blue', 'no-response'))
    expect(finalOf(store).phase).toBe('team-reveal')
    store.dispatch(reveal('red'))
    store.dispatch(settle('red', 'correct'))
    expect(finalOf(store).phase).toBe('ready-to-complete')
  })
})

describe('tie handling and completion (CQS-OD-011)', () => {
  /** A Final that settles into an exact tie at 200 apiece. */
  function tiedStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 100 },
      responses: { red: 'not-captured', blue: 'not-captured' },
    })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    return store
  }

  it('reaches `resolution` on a tied lead and `ready-to-complete` otherwise', () => {
    const tied = tiedStore()
    expect(scoreOf(tied, 'red')).toBe(200)
    expect(scoreOf(tied, 'blue')).toBe(200)
    expect(finalOf(tied).phase).toBe('resolution')
  })

  it('settlement alone does NOT end the game', () => {
    const store = tiedStore()
    expect(store.getState().session?.game?.gameLifecycle).toBe('active')
  })

  it('enters sudden death only from a tied resolution', () => {
    const store = tiedStore()
    expect(
      store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND }).status,
    ).toBe('accepted')
    expect(finalOf(store).phase).toBe('sudden-death')
    expect(finalOf(store).tieResolution).toBe('sudden-death')
    expect(store.getState().session?.game?.gameLifecycle).toBe('active')
  })

  it('refuses sudden death when one team leads outright', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 }, responses: { red: 'not-captured', blue: 'not-captured' } })
    settleAll(store, { red: 'correct', blue: 'correct' })
    expectRejected(store, { type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND }, 'invalid-final-phase')
  })

  it('undoes sudden death back to the tied resolution', () => {
    const store = tiedStore()
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    store.dispatch(undo)
    expect(finalOf(store).phase).toBe('resolution')
    expect(finalOf(store).tieResolution).toBeNull()
  })

  it('restricts manual correction to a TIED LEADER during sudden death', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 100 },
      responses: { red: 'not-captured', blue: 'not-captured', green: 'not-captured' },
    })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    // Both teams are tied leaders here, so both may be corrected.
    expect(
      store.dispatch({
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: 10,
        mode: 'manual-correction',
        source: { kind: 'manual' },
      }).status,
    ).toBe('accepted')
    // Red now leads alone, so blue is no longer a tied leader.
    expectRejected(
      store,
      {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'blue',
        delta: 10,
        mode: 'manual-correction',
        source: { kind: 'manual' },
      },
      'not-a-tied-leader',
    )
  })

  it('accepts a tied finish irreversibly, ending the game through the existing boundary', () => {
    const store = tiedStore()
    const before = store.getHistory().length
    expect(
      store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND }).status,
    ).toBe('accepted')
    const appended = store.getHistory().slice(before)
    expect(appended.map((event) => event.type)).toEqual([
      'FINAL_TIE_RESOLUTION_SELECTED',
      'GAME_SESSION_ENDED',
    ])
    expect(appended.every((event) => event.reversible)).toBe(false)
    expect(store.getState().session?.game?.gameLifecycle).toBe('ended')
    // The tie is preserved, not broken.
    expect(scoreOf(store, 'red')).toBe(200)
    expect(scoreOf(store, 'blue')).toBe(200)
    expect(finalOf(store).phase).toBe('ended')
  })

  it('can accept a continuing tie after entering sudden death', () => {
    const store = tiedStore()
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    expect(
      store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND }).status,
    ).toBe('accepted')
    expect(store.getState().session?.game?.gameLifecycle).toBe('ended')
  })

  it('refuses to accept a tie when the lead is not tied', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 }, responses: { red: 'not-captured', blue: 'not-captured' } })
    settleAll(store, { red: 'correct', blue: 'correct' })
    expectRejected(store, { type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND }, 'invalid-final-phase')
  })

  it('refuses every Final command once the game has ended', () => {
    const store = tiedStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expectRejected(store, { type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND }, 'game-already-ended')
    expect(finalOf(store).phase).toBe('ended')
  })
})

describe('replay, determinism and isolation', () => {
  it('replays bit-exactly from the history alone', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'exact', blue: 'no-response' },
    })
    settleAll(store, { red: 'correct', blue: 'no-response' })
    const history: readonly SessionEvent[] = store.getHistory()
    expect(replay(history)).toEqual(store.getState())
    // Idempotent: a second replay of the same log is identical again.
    expect(replay(history)).toEqual(replay(history))
  })

  it('survives leaving Final for another round and coming back', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch(begin('classic'))
    store.dispatch(wager('red', 100))
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: BOARD_ROUND_ID })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: ROUND })
    const final = finalOf(store)
    expect(final.phase).toBe('wager-entry')
    expect(final.wagers.red).toBe(100)
  })

  it('starts every Final fresh when a new game is initialized', () => {
    const store = finalStore({ scores: { red: 300 } })
    store.dispatch(begin('classic'))
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: finalDefinition() })
    const game = store.getState().session?.game
    expect(game?.finalWagers).toEqual({})
  })

  it('does not record an entry for a Final that never began', () => {
    const store = finalStore({ scores: { red: 300 } })
    expect(store.getState().session?.game?.finalWagers).toEqual({})
    expect(finalOf(store).phase).toBe('setup')
  })

  it('leaves the board round completely untouched', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 } })
    const game = store.getState().session?.game
    expect(game?.categoryBoards).toEqual({})
    expect(game?.responsePhases).toEqual({})
  })

  it('plans purely: the same inputs always yield the same events', () => {
    const store = finalStore({ scores: { red: 300 } })
    const state = store.getState()
    const history = store.getHistory()
    const first = planCommand(state, history, begin('classic'))
    const second = planCommand(state, history, begin('classic'))
    expect(first).toEqual(second)
  })

  it('fails safe on a corrupt log rather than throwing', () => {
    const store = finalStore({ scores: { red: 300 } })
    const history = [
      ...store.getHistory(),
      {
        id: `evt-${store.getHistory().length}`,
        type: 'FINAL_TEAM_SETTLED',
        seq: store.getHistory().length,
        occurredAt: AT,
        reversible: true,
        roundId: ROUND,
        teamId: 'red',
        wager: 100,
        outcome: 'correct',
        delta: 100,
      } as SessionEvent,
    ]
    const state = replay(history)
    const game = state.session?.game
    expect(game).toBeDefined()
    // The settlement referenced a team that was never revealed, so it did not apply.
    expect(game?.teamScores.red).toBe(300)
    expect(finalWagerStateFor(game!, ROUND).settlements).toEqual({})
  })

  it('rejects every Final command before a round is selected', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: finalDefinition({ board: precedingBoard() }),
    })
    expectRejected(store, begin(), 'no-current-round')
  })
})
