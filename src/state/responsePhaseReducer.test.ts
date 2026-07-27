import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { planCommand, replay, responsePhaseFor, type RejectionReason } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import {
  HOST_INTERRUPTION,
  INITIAL_RESPONSE_PHASE_STATE,
  isResponseInterruptionSource,
  remainingMsAt,
  RESPONSE_INTERRUPTION_KINDS,
  type ResponsePhaseState,
} from '../game/timing/responsePhase'
import {
  DEFAULT_RESPONSE_SECONDS,
  EXPIRY_TOLERANCE_MS,
  MAX_RESPONSE_SECONDS,
  MIN_RESPONSE_SECONDS,
} from '../game/timing/limits'
import { EMPTY_BUZZ_QUEUE } from '../game/timing/buzzQueue'
import { createManualClock, isInstant } from '../time/clock'

/**
 * Slice 8 added the buzz queue to the response phase. Every whole-phase equality
 * in this Slice 7 suite therefore names an EMPTY queue — none of these tests
 * buzzes anything, and asserting the empty queue explicitly is what proves the
 * timer path never populates one by accident. The buzz path has its own suite in
 * `buzzQueueReducer.test.ts`.
 */
const NO_QUEUE = EMPTY_BUZZ_QUEUE

/**
 * Response-phase commands, events, replay and undo (Slice 7).
 *
 * The load-bearing claims proved here:
 *  - the reducer NEVER reads a clock: every instant on every event comes from the
 *    command's `issuedAt`, and replaying a history is bit-exact whenever it runs;
 *  - a rejected command produces NO event and does not change the revision;
 *  - arming, the timer and the transitions are all derived by replay, so undo is
 *    exact with no separate bookkeeping;
 *  - a stale, duplicated or premature expiration cannot become a fact;
 *  - the interruption seam is typed and fails closed on anything else.
 */

const AT = 1_000_000
const ROUND = 'board-round'

function boardDefinition(overrides: Record<string, unknown> = {}): GameDefinition {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig(), overrides))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

/** A store with a session, a board game loaded, and round 1 selected. */
function boardStore(overrides?: Record<string, unknown>): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: boardDefinition(overrides) })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** …and with a tile open at the `prompt` stage — the one legal window. */
function openStore(overrides?: Record<string, unknown>): SessionStore {
  const store = boardStore(overrides)
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: 'alpha-100' })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  return store
}

const arm = (at = AT, roundId = ROUND): SessionCommand => ({
  type: 'ARM_RESPONSE_PHASE',
  issuedAt: at,
  roundId,
})
const disarm = (at = AT, roundId = ROUND): SessionCommand => ({
  type: 'DISARM_RESPONSE_PHASE',
  issuedAt: at,
  roundId,
})
const start = (
  at = AT,
  durationSeconds?: number,
  roundId = ROUND,
): SessionCommand => ({
  type: 'START_RESPONSE_TIMER',
  issuedAt: at,
  roundId,
  ...(durationSeconds === undefined ? {} : { durationSeconds }),
})
const pause = (at: number, roundId = ROUND): SessionCommand => ({
  type: 'PAUSE_RESPONSE_TIMER',
  issuedAt: at,
  roundId,
})
const resume = (at: number, roundId = ROUND): SessionCommand => ({
  type: 'RESUME_RESPONSE_TIMER',
  issuedAt: at,
  roundId,
})
const interrupt = (at: number, roundId = ROUND): SessionCommand => ({
  type: 'INTERRUPT_RESPONSE_TIMER',
  issuedAt: at,
  roundId,
  source: HOST_INTERRUPTION,
})
const expire = (
  at: number,
  timerId: string,
  deadline: number,
  roundId = ROUND,
): SessionCommand => ({
  type: 'EXPIRE_RESPONSE_TIMER',
  issuedAt: at,
  roundId,
  timerId,
  deadline,
})
const reset = (at = AT, roundId = ROUND): SessionCommand => ({
  type: 'RESET_RESPONSE_PHASE',
  issuedAt: at,
  roundId,
})
const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

function phaseOf(store: SessionStore, roundId = ROUND): ResponsePhaseState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return responsePhaseFor(game, roundId)
}

/** Dispatch and assert acceptance, returning the single event it produced. */
function accept(store: SessionStore, command: SessionCommand): SessionEvent {
  const result = store.dispatch(command)
  expect(result.status, `expected ${command.type} to be accepted`).toBe('accepted')
  if (result.status !== 'accepted') throw new Error('unreachable')
  expect(result.events).toHaveLength(1)
  return result.events[0]
}

function expectRejected(store: SessionStore, command: SessionCommand, reason: RejectionReason) {
  const before = store.getState().revision
  const historyBefore = store.getHistory().length
  const result = store.dispatch(command)
  expect(result.status).toBe('rejected')
  if (result.status === 'rejected') expect(result.reason).toBe(reason)
  // A rejected command appends NOTHING and moves no revision.
  expect(store.getState().revision).toBe(before)
  expect(store.getHistory()).toHaveLength(historyBefore)
}

/** Start a timer and return its durable identity. */
function startedTimer(store: SessionStore, at = AT, durationSeconds?: number) {
  accept(store, start(at, durationSeconds))
  const timer = phaseOf(store).timer
  if (timer.status !== 'running') throw new Error('expected a running timer')
  return timer
}

describe('legality — the response window is the prompt stage and nothing else', () => {
  it('starts every clue disarmed with no timer', () => {
    expect(phaseOf(openStore())).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('rejects arming while the board grid is showing', () => {
    expectRejected(boardStore(), arm(), 'invalid-board-stage')
  })

  it('rejects arming at the `selected` stage — the class has not seen the question', () => {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: 'alpha-100',
    })
    expectRejected(store, arm(), 'invalid-board-stage')
  })

  it('rejects starting a timer once the answer is public — the window is over', () => {
    const store = openStore()
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND })
    expectRejected(store, start(), 'invalid-board-stage')
  })

  it('rejects a command that names a different round', () => {
    expectRejected(openStore(), arm(AT, 'some-other-round'), 'round-mismatch')
  })

  it('rejects every response command before a session exists', () => {
    const store = createSessionStore()
    expectRejected(store, arm(), 'session-not-initialized')
  })

  it('rejects every response command once the game has ended', () => {
    const store = openStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expectRejected(store, arm(), 'game-already-ended')
  })
})

describe('arming', () => {
  it('arms and disarms as durable, replayed state', () => {
    const store = openStore()
    accept(store, arm())
    expect(phaseOf(store).armed).toBe(true)
    accept(store, disarm())
    expect(phaseOf(store).armed).toBe(false)
  })

  it('refuses to record a no-op: arming an armed clue, disarming a disarmed one', () => {
    const store = openStore()
    expectRejected(store, disarm(), 'invalid-response-phase')
    accept(store, arm())
    expectRejected(store, arm(), 'invalid-response-phase')
  })

  it('is independent of the timer — a clue can be armed with no clock at all', () => {
    const store = openStore()
    accept(store, arm())
    expect(phaseOf(store)).toEqual({ armed: true, timer: { status: 'idle' }, queue: NO_QUEUE })
  })

  it('never arms itself: revealing a prompt leaves the clue disarmed', () => {
    // OG-1 — arming is MANUAL. Nothing in the reveal path may arm a clue.
    expect(phaseOf(openStore()).armed).toBe(false)
  })
})

describe('starting a timer', () => {
  it('records duration, start and deadline as durable facts', () => {
    const store = openStore()
    const event = accept(store, start(AT, 30))
    expect(event).toMatchObject({
      type: 'RESPONSE_TIMER_STARTED',
      roundId: ROUND,
      durationMs: 30_000,
      startedAt: AT,
      deadline: AT + 30_000,
      reversible: true,
    })
  })

  it('uses the AUTHORED default when the command names no duration', () => {
    const store = openStore({ timer: { responseSeconds: 45 } })
    expect(phaseOf(store).timer.status).toBe('idle')
    accept(store, start())
    const timer = phaseOf(store).timer
    expect(timer.status === 'running' && timer.durationMs).toBe(45_000)
  })

  it('falls back to the documented default for a game that authored no timer', () => {
    const store = openStore()
    accept(store, start())
    const timer = phaseOf(store).timer
    expect(timer.status === 'running' && timer.durationMs).toBe(DEFAULT_RESPONSE_SECONDS * 1000)
  })

  it('validates a host-chosen duration against the same bounds as authored data', () => {
    const store = openStore()
    expectRejected(store, start(AT, MIN_RESPONSE_SECONDS - 1), 'invalid-timer-duration')
    expectRejected(store, start(AT, MAX_RESPONSE_SECONDS + 1), 'invalid-timer-duration')
    expectRejected(store, start(AT, 30.5), 'invalid-timer-duration')
    expectRejected(store, start(AT, Number.NaN), 'invalid-timer-duration')
    expectRejected(store, start(AT, Number.POSITIVE_INFINITY), 'invalid-timer-duration')
    expectRejected(store, start(AT, -30), 'invalid-timer-duration')
  })

  it('accepts exactly the bounds', () => {
    accept(openStore(), start(AT, MIN_RESPONSE_SECONDS))
    accept(openStore(), start(AT, MAX_RESPONSE_SECONDS))
  })

  it('rejects an unusable dispatch-edge instant rather than storing it', () => {
    expectRejected(openStore(), start(Number.NaN), 'malformed-command')
    expectRejected(openStore(), start(-1), 'malformed-command')
    expectRejected(openStore(), start(1.5), 'malformed-command')
  })

  it('refuses a second start while one is live — restarting needs an explicit reset', () => {
    const store = openStore()
    accept(store, start())
    expectRejected(store, start(), 'invalid-response-phase')
    accept(store, reset())
    accept(store, start())
  })

  it('gives each countdown a deterministic identity derived from the append index', () => {
    const store = openStore()
    const first = startedTimer(store)
    accept(store, reset())
    const second = startedTimer(store)
    expect(first.timerId).not.toBe(second.timerId)
    // Replaying the same history reproduces the same ids — nothing is generated.
    expect(replay(store.getHistory())).toEqual(store.getState())
  })
})

describe('pause and resume (OG-8, resolved for Slice 7)', () => {
  it('pause freezes the remaining time as a durable fact', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 10_000))
    expect(phaseOf(store).timer).toMatchObject({
      status: 'paused',
      durationMs: 30_000,
      remainingMs: 20_000,
    })
  })

  it('resume derives a NEW deadline from the dispatch-edge clock', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 10_000))
    // Five minutes of real time pass while the class discusses something else.
    accept(store, resume(AT + 310_000))
    expect(phaseOf(store).timer).toMatchObject({
      status: 'running',
      deadline: AT + 310_000 + 20_000,
    })
  })

  it('does not charge the paused wall-clock time to the class', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 10_000))
    accept(store, resume(AT + 999_000))
    const timer = phaseOf(store).timer
    // Exactly the 20 s that were left, however long the pause lasted.
    expect(remainingMsAt(timer, AT + 999_000)).toBe(20_000)
  })

  it('keeps the timer identity across a pause and resume', () => {
    const store = openStore()
    const started = startedTimer(store, AT, 30)
    accept(store, pause(AT + 1_000))
    accept(store, resume(AT + 2_000))
    const timer = phaseOf(store).timer
    expect(timer.status === 'running' && timer.timerId).toBe(started.timerId)
  })

  it('clamps a pause past the deadline to zero rather than storing a negative', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 45_000))
    expect(phaseOf(store).timer).toMatchObject({ status: 'paused', remainingMs: 0 })
  })

  it('rejects pausing what is not running and resuming what is not paused', () => {
    const store = openStore()
    expectRejected(store, pause(AT), 'invalid-response-phase')
    startedTimer(store, AT, 30)
    expectRejected(store, resume(AT), 'invalid-response-phase')
    accept(store, pause(AT + 1_000))
    expectRejected(store, pause(AT + 2_000), 'invalid-response-phase')
  })
})

describe('the typed interruption seam', () => {
  it('stops a running timer and freezes what was left', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, interrupt(AT + 12_000))
    expect(phaseOf(store).timer).toMatchObject({
      status: 'interrupted',
      remainingMs: 18_000,
      source: { kind: 'host' },
    })
  })

  it('can interrupt a paused timer too', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 5_000))
    accept(store, interrupt(AT + 60_000))
    expect(phaseOf(store).timer).toMatchObject({ status: 'interrupted', remainingMs: 25_000 })
  })

  it('does NOT end the clue or disarm it — a later slice promotes the next respondent', () => {
    const store = openStore()
    accept(store, arm())
    startedTimer(store, AT, 30)
    accept(store, interrupt(AT + 1_000))
    expect(phaseOf(store).armed).toBe(true)
    // The prompt is still public and the tile is still un-consumed.
    const game = store.getState().session?.game
    expect(game?.categoryBoards[ROUND].progress.stage).toBe('prompt')
    expect(game?.categoryBoards[ROUND].usedTileIds).toEqual([])
  })

  it('supports another window after an interruption, without a redesign', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, interrupt(AT + 1_000))
    accept(store, reset())
    accept(store, arm())
    const second = startedTimer(store, AT + 2_000, 15)
    expect(second.durationMs).toBe(15_000)
  })

  it('is bounded: an unrecognized source never reaches the log', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    // Slice 8 added `team-buzz` as a real member, so the unrecognized examples
    // are now other things. The CLAIM is unchanged: whatever is not a member
    // fails closed at the command boundary and never reaches the log.
    for (const source of [
      { kind: 'gamepad-buzz' },
      { kind: 'student-phone' },
      { kind: '' },
      'host',
      null,
      undefined,
      { kind: 'host', teamId: 'red' },
    ]) {
      const result = store.dispatch({
        type: 'INTERRUPT_RESPONSE_TIMER',
        issuedAt: AT + 1_000,
        roundId: ROUND,
        source: source as never,
      })
      // The extra-field case IS accepted structurally, but the event is rebuilt
      // from `kind` alone, so the extra field cannot travel. Everything else is
      // rejected outright.
      if (result.status === 'accepted') {
        expect(result.events[0]).toMatchObject({ source: { kind: 'host' } })
        expect(
          Object.keys((result.events[0] as { source: object }).source),
        ).toEqual(['kind'])
      } else {
        expect(result.reason).toBe('malformed-command')
      }
    }
  })

  /**
   * Slice 7 shipped one member and predicted the second would be an ADDITION.
   * Slice 8 added it. This test is updated to the new membership rather than
   * deleted, because the property it protects is the one that mattered: the union
   * is BOUNDED and a non-member fails closed.
   */
  it('exposes exactly the two source kinds that have consumers, and a guard that says so', () => {
    expect(RESPONSE_INTERRUPTION_KINDS).toEqual(['host', 'team-buzz'])
    expect(isResponseInterruptionSource({ kind: 'host' })).toBe(true)
    expect(isResponseInterruptionSource({ kind: 'team-buzz' })).toBe(true)
    // Nothing hardware-shaped is, or ever becomes, a member: Slice 9's and Slice
    // 10's adapters produce a team buzz, not a source of their own.
    expect(isResponseInterruptionSource({ kind: 'gamepad' })).toBe(false)
    expect(isResponseInterruptionSource({ kind: 'sony-buzz' })).toBe(false)
    expect(isResponseInterruptionSource({})).toBe(false)
    expect(isResponseInterruptionSource(null)).toBe(false)
  })

  it('rejects interrupting when there is nothing to interrupt', () => {
    const store = openStore()
    expectRejected(store, interrupt(AT), 'invalid-response-phase')
  })
})

describe('expiration — exactly one effective fact per countdown', () => {
  it('records the expiry and disarms the clue', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline, timer.timerId, timer.deadline))
    expect(phaseOf(store)).toEqual({
      armed: false,
      timer: {
        status: 'expired',
        timerId: timer.timerId,
        durationMs: 30_000,
        deadline: timer.deadline,
      },
      queue: NO_QUEUE,
    })
  })

  it('awards and deducts nothing', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline, timer.timerId, timer.deadline))
    expect(store.getState().session?.game?.teamScores).toEqual({})
  })

  it('rejects a REPEATED expiration of the same timer', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline, timer.timerId, timer.deadline))
    expectRejected(
      store,
      expire(timer.deadline + 1, timer.timerId, timer.deadline),
      'stale-timer-expiration',
    )
  })

  it('rejects an expiration naming a timer that is not the live one', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    expectRejected(store, expire(timer.deadline, 'tmr-999', timer.deadline), 'stale-timer-expiration')
  })

  it('rejects an expiration naming the wrong deadline', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    expectRejected(
      store,
      expire(timer.deadline, timer.timerId, timer.deadline + 1),
      'stale-timer-expiration',
    )
  })

  it('rejects a callback left over from a timer that was RESET', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, reset())
    expectRejected(store, expire(timer.deadline, timer.timerId, timer.deadline), 'stale-timer-expiration')
  })

  it('rejects a callback left over from a timer that was RESTARTED', () => {
    const store = openStore()
    const stale = startedTimer(store, AT, 30)
    accept(store, reset())
    startedTimer(store, AT + 1_000, 30)
    expectRejected(store, expire(stale.deadline, stale.timerId, stale.deadline), 'stale-timer-expiration')
  })

  it('rejects a callback that fires while the timer is PAUSED', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, pause(AT + 5_000))
    expectRejected(store, expire(timer.deadline, timer.timerId, timer.deadline), 'stale-timer-expiration')
  })

  it('rejects a callback whose deadline was superseded by a RESUME', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, pause(AT + 5_000))
    accept(store, resume(AT + 100_000))
    expectRejected(store, expire(AT + 125_000, timer.timerId, timer.deadline), 'stale-timer-expiration')
  })

  it('rejects a callback left over after the clue changed', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 1, roundId: ROUND })
    // The window is gone with the clue, so the callback finds nothing to expire.
    expectRejected(store, expire(timer.deadline, timer.timerId, timer.deadline), 'invalid-board-stage')
  })

  it('rejects a callback left over after the ROUND changed', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    // Re-selecting the round restores the board's reveal stage (that resumes by
    // design) but NOT the response window (that does not), so the gate is passed
    // and the callback then finds no live timer to expire.
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT + 1, roundId: 'board-round' })
    expect(store.getState().session?.game?.responsePhases).toEqual({})
    expectRejected(
      store,
      expire(timer.deadline, timer.timerId, timer.deadline),
      'stale-timer-expiration',
    )
  })

  it('rejects an expiration dispatched meaningfully BEFORE the deadline', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    expectRejected(
      store,
      expire(timer.deadline - EXPIRY_TOLERANCE_MS - 1, timer.timerId, timer.deadline),
      'premature-timer-expiration',
    )
  })

  it('tolerates a callback that fires a hair early', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline - EXPIRY_TOLERANCE_MS, timer.timerId, timer.deadline))
    expect(phaseOf(store).timer.status).toBe('expired')
  })

  it('rejects an unusable deadline on the command', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    expectRejected(
      store,
      expire(timer.deadline, timer.timerId, Number.NaN),
      'stale-timer-expiration',
    )
  })
})

describe('transitions — a window belongs to one clue in one round', () => {
  it('is cleared when the host returns to the board', () => {
    const store = openStore()
    accept(store, arm())
    startedTimer(store, AT, 30)
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 1, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('is cleared when the ANSWER is revealed — the opportunity has ended', () => {
    const store = openStore()
    accept(store, arm())
    startedTimer(store, AT, 30)
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('is cleared when the next tile is selected', () => {
    const store = openStore()
    accept(store, arm())
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 1, roundId: ROUND })
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT + 2,
      roundId: ROUND,
      tileId: 'alpha-200',
    })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('does NOT survive a round change, unlike board progress', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT + 1, roundId: ROUND })
    expect(store.getState().session?.game?.responsePhases).toEqual({})
    // Board progress DOES resume — the two rules are deliberately different.
    expect(store.getState().session?.game?.categoryBoards[ROUND].progress.stage).toBe('prompt')
  })

  it('does not survive the end of the game', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    expect(store.getState().session?.game?.responsePhases).toEqual({})
  })

  it('does not survive loading a new game', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: boardDefinition() })
    expect(store.getState().session?.game?.responsePhases).toEqual({})
  })

  it('refuses a reset that would record nothing', () => {
    expectRejected(openStore(), reset(), 'invalid-response-phase')
  })

  it('resets arming and the timer together', () => {
    const store = openStore()
    accept(store, arm())
    startedTimer(store, AT, 30)
    accept(store, reset())
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })
})

describe('scoring stays independent of the response phase', () => {
  it('a running timer neither blocks nor triggers a score', () => {
    const store = openStore({
      teams: [{ id: 'red', name: 'Red', accent: 'crimson' }],
    })
    startedTimer(store, AT, 30)
    const result = store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT + 1,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    expect(result.status).toBe('accepted')
    // Scoring does not stop the clock: ending the window is its own decision.
    expect(phaseOf(store).timer.status).toBe('running')
  })

  it('an expired window does not stop the teacher scoring the clue', () => {
    const store = openStore({ teams: [{ id: 'red', name: 'Red', accent: 'crimson' }] })
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline, timer.timerId, timer.deadline))
    const result = store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: timer.deadline + 1,
      teamId: 'red',
      delta: -100,
      mode: 'deduction',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    expect(result.status).toBe('accepted')
    expect(store.getState().session?.game?.teamScores).toEqual({ red: -100 })
  })
})

describe('replay and undo', () => {
  it('replays bit-exactly, whenever the replay happens', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    accept(store, pause(AT + 5_000))
    accept(store, resume(AT + 9_000))
    accept(store, expire(AT + 9_000 + 25_000, timer.timerId, AT + 9_000 + 25_000))
    const history = store.getHistory()
    // Two replays, notionally years apart. `replay` reads no clock, so nothing
    // about the result can depend on when it runs.
    expect(replay(history)).toEqual(replay(history))
    expect(replay(history)).toEqual(store.getState())
  })

  it('never reads a clock: every instant on every event came from a command', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    accept(store, pause(AT + 5_000))
    accept(store, resume(AT + 9_000))
    accept(store, interrupt(AT + 10_000))
    const issued = new Set([AT, AT + 5_000, AT + 9_000, AT + 10_000])
    for (const event of store.getHistory()) {
      expect(isInstant(event.occurredAt)).toBe(true)
      if (event.type.startsWith('RESPONSE_')) {
        expect(issued.has(event.occurredAt)).toBe(true)
      }
    }
    expect(timer.deadline).toBe(AT + 30_000)
  })

  it('planning is pure: the same inputs always plan the same events', () => {
    const store = openStore()
    const history = store.getHistory()
    const state = store.getState()
    const first = planCommand(state, history, start(AT, 30))
    const second = planCommand(state, history, start(AT, 30))
    expect(first).toEqual(second)
    // …and planning mutated nothing.
    expect(store.getState()).toEqual(state)
  })

  it('undoes an arm', () => {
    const store = openStore()
    accept(store, arm())
    store.dispatch(undo)
    expect(phaseOf(store).armed).toBe(false)
  })

  it('undoes a disarm back to armed', () => {
    const store = openStore()
    accept(store, arm())
    accept(store, disarm())
    store.dispatch(undo)
    expect(phaseOf(store).armed).toBe(true)
  })

  it('undoes a start back to no timer at all', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    store.dispatch(undo)
    expect(phaseOf(store).timer).toEqual({ status: 'idle' })
  })

  it('undoes a pause back to the ORIGINAL deadline', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, pause(AT + 10_000))
    store.dispatch(undo)
    expect(phaseOf(store).timer).toEqual({
      status: 'running',
      timerId: timer.timerId,
      durationMs: 30_000,
      startedAt: AT,
      deadline: timer.deadline,
    })
  })

  it('undoes a resume back to the paused remaining time', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    accept(store, pause(AT + 10_000))
    accept(store, resume(AT + 50_000))
    store.dispatch(undo)
    expect(phaseOf(store).timer).toMatchObject({ status: 'paused', remainingMs: 20_000 })
  })

  it('undoes an interruption back to a running timer', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    accept(store, interrupt(AT + 4_000))
    store.dispatch(undo)
    expect(phaseOf(store).timer).toMatchObject({ status: 'running', deadline: timer.deadline })
  })

  it('undoes an expiry back to a running timer, and it may then expire again', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    accept(store, expire(timer.deadline, timer.timerId, timer.deadline))
    store.dispatch(undo)
    // Arming is restored too, because the expiry event carried both effects.
    expect(phaseOf(store)).toEqual({ armed: true, timer, queue: NO_QUEUE })
    accept(store, expire(timer.deadline + 5_000, timer.timerId, timer.deadline))
  })

  it('undoes a reset back to the whole prior window', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    accept(store, reset())
    store.dispatch(undo)
    expect(phaseOf(store)).toEqual({ armed: true, timer, queue: NO_QUEUE })
  })

  it('undoes an answer reveal back to the window it closed', () => {
    const store = openStore()
    accept(store, arm())
    const timer = startedTimer(store, AT, 30)
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
    store.dispatch(undo)
    expect(phaseOf(store)).toEqual({ armed: true, timer, queue: NO_QUEUE })
  })

  it('keeps undo latest-only — an older window is not reachable directly', () => {
    const store = openStore()
    accept(store, arm())
    startedTimer(store, AT, 30)
    // One undo reaches the START, not the ARM. That limit is documented, not new.
    store.dispatch(undo)
    expect(phaseOf(store)).toEqual({ armed: true, timer: { status: 'idle' }, queue: NO_QUEUE })
  })
})

describe('a corrupt log degrades safely rather than throwing', () => {
  const base = openStore()
  const validHistory = base.getHistory()

  it('skips an expiry that does not match the live timer', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    const forged: SessionEvent = {
      id: 'evt-999',
      type: 'RESPONSE_TIMER_EXPIRED',
      seq: 999,
      occurredAt: AT + 30_000,
      reversible: true,
      roundId: ROUND,
      timerId: 'tmr-not-this-one',
      deadline: timer.deadline,
    }
    const state = replay([...store.getHistory(), forged])
    const game = state.session?.game
    expect(game && responsePhaseFor(game, ROUND).timer.status).toBe('running')
  })

  it('skips a pause for a timer that is not running', () => {
    const forged: SessionEvent = {
      id: 'evt-999',
      type: 'RESPONSE_TIMER_PAUSED',
      seq: 999,
      occurredAt: AT,
      reversible: true,
      roundId: ROUND,
      timerId: 'tmr-1',
      remainingMs: 1_000,
    }
    const state = replay([...validHistory, forged])
    const game = state.session?.game
    expect(game && responsePhaseFor(game, ROUND)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('skips an interruption whose source is not a recognized member', () => {
    const store = openStore()
    startedTimer(store, AT, 30)
    const timer = phaseOf(store).timer
    const forged: SessionEvent = {
      id: 'evt-999',
      type: 'RESPONSE_TIMER_INTERRUPTED',
      seq: 999,
      occurredAt: AT + 1_000,
      reversible: true,
      roundId: ROUND,
      timerId: timer.status === 'running' ? timer.timerId : '',
      source: { kind: 'gamepad-buzz' } as never,
      remainingMs: 1_000,
    }
    const state = replay([...store.getHistory(), forged])
    const game = state.session?.game
    expect(game && responsePhaseFor(game, ROUND).timer.status).toBe('running')
  })
})

describe('the clock seam itself', () => {
  it('a manual clock is fully deterministic', () => {
    const clock = createManualClock(AT)
    expect(clock.now()).toBe(AT)
    clock.advance(1_500)
    expect(clock.now()).toBe(AT + 1_500)
    clock.set(42)
    expect(clock.now()).toBe(42)
  })

  it('rejects instants the engine will not store', () => {
    expect(isInstant(AT)).toBe(true)
    expect(isInstant(0)).toBe(true)
    expect(isInstant(-1)).toBe(false)
    expect(isInstant(1.5)).toBe(false)
    expect(isInstant(Number.NaN)).toBe(false)
    expect(isInstant(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isInstant('1000')).toBe(false)
    expect(isInstant(null)).toBe(false)
  })

  it('derives remaining time purely, with no clock of its own', () => {
    const store = openStore()
    const timer = startedTimer(store, AT, 30)
    expect(remainingMsAt(timer, AT)).toBe(30_000)
    expect(remainingMsAt(timer, AT + 10_000)).toBe(20_000)
    expect(remainingMsAt(timer, timer.deadline)).toBe(0)
    // Clamped at both ends: never negative, never more than the window started.
    expect(remainingMsAt(timer, timer.deadline + 60_000)).toBe(0)
    expect(remainingMsAt(timer, AT - 60_000)).toBe(30_000)
  })
})
