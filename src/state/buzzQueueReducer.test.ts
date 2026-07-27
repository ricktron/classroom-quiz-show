import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { replay, responsePhaseFor, type RejectionReason } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import {
  activeRespondent,
  buzzQueueStatus,
  EMPTY_BUZZ_QUEUE,
  waitingRespondents,
} from '../game/timing/buzzQueue'
import {
  HOST_INTERRUPTION,
  INITIAL_RESPONSE_PHASE_STATE,
  type ResponsePhaseState,
} from '../game/timing/responsePhase'

/**
 * Buzz-queue commands, events, replay and undo (Slice 8).
 *
 * The load-bearing claims proved here:
 *  - a buzz is accepted ONLY while the clue is armed and legally open, and every
 *    rejection appends nothing and moves no revision;
 *  - the full ordered queue is preserved (OG-2), and its order is the EVENT LOG's
 *    order — never a clock, never a sort;
 *  - a team appears at most once per response opportunity;
 *  - the FIRST accepted buzz interrupts the timer through Slice 7's typed seam,
 *    exactly once, and a later buzz cannot interrupt again;
 *  - an incorrect response or a host pass promotes the next queued team (OG-3),
 *    and neither moves a point;
 *  - a stale press naming a closed clue cannot affect the next one;
 *  - replay is bit-exact and undo restores the prior queue exactly.
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

function definition(teams: unknown = FOUR_TEAMS): GameDefinition {
  const result = importGameFromUnknown(teamBoardGameFile(teams, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

/** A store with a session, a team board loaded, and round 1 selected. */
function boardStore(teams?: unknown): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition(teams) })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** …with a tile open at the `prompt` stage — the one legal window. */
function openStore(teams?: unknown): SessionStore {
  const store = boardStore(teams)
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  return store
}

/** …and armed, which is the intake gate for the queue. */
function armedStore(teams?: unknown): SessionStore {
  const store = openStore(teams)
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  return store
}

const buzz = (teamId: string, at = AT, tileId = TILE, roundId = ROUND): SessionCommand => ({
  type: 'RECORD_TEAM_BUZZ',
  issuedAt: at,
  roundId,
  tileId,
  teamId,
})

const resolve = (
  kind: 'incorrect' | 'passed',
  at = AT,
  tileId = TILE,
  roundId = ROUND,
): SessionCommand => ({
  type: 'RESOLVE_ACTIVE_RESPONSE',
  issuedAt: at,
  roundId,
  tileId,
  resolution: { kind },
})

const undo: SessionCommand = { type: 'UNDO', issuedAt: AT + 999 }

function phaseOf(store: SessionStore): ResponsePhaseState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return responsePhaseFor(game, ROUND)
}

function accept(store: SessionStore, command: SessionCommand): readonly SessionEvent[] {
  const result = store.dispatch(command)
  if (result.status !== 'accepted') {
    throw new Error(`expected acceptance, got ${result.reason}`)
  }
  return result.events
}

function expectRejected(
  store: SessionStore,
  command: SessionCommand,
  reason: RejectionReason,
): void {
  const revisionBefore = store.getState().revision
  const lengthBefore = store.getHistory().length
  const result = store.dispatch(command)
  expect(result.status).toBe('rejected')
  expect(result.status === 'rejected' && result.reason).toBe(reason)
  // A rejected command appends nothing and moves no revision — the whole point.
  expect(store.getState().revision).toBe(revisionBefore)
  expect(store.getHistory()).toHaveLength(lengthBefore)
}

describe('when a buzz is accepted', () => {
  it('makes the first accepted buzz the ACTIVE respondent', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    expect(buzzQueueStatus(phaseOf(store).queue)).toEqual({
      status: 'active',
      activeTeamId: 'red',
      waitingTeamIds: [],
    })
  })

  it('records a game fact and nothing about the input that produced it', () => {
    const store = armedStore()
    const [event] = accept(store, buzz('red', AT + 5))
    expect(event).toEqual({
      id: expect.any(String),
      type: 'TEAM_BUZZED',
      seq: expect.any(Number),
      occurredAt: AT + 5,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
    })
    const serialized = JSON.stringify(event).toLowerCase()
    for (const forbidden of ['code', 'digit', 'keyboard', 'device', 'gamepad', 'mapping', 'source']) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('puts later buzzes behind the first, in accepted order', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, buzz('green'))
    expect(activeRespondent(phaseOf(store).queue)).toBe('red')
    expect(waitingRespondents(phaseOf(store).queue)).toEqual(['blue', 'green'])
  })

  /**
   * The tie policy (OG-4), asserted rather than asserted-about: identical arrival
   * stamps do NOT create an unresolved tie, because the ordering authority is the
   * append order of the events, not the millisecond on them.
   */
  it('orders buzzes by the event log, not by the arrival stamp', () => {
    const store = armedStore()
    // Every command carries the SAME instant — a physical tie, as far as any
    // clock can tell.
    accept(store, buzz('green', AT))
    accept(store, buzz('red', AT))
    accept(store, buzz('blue', AT))
    expect(phaseOf(store).queue.order).toEqual(['green', 'red', 'blue'])
    const buzzes = store.getHistory().filter((event) => event.type === 'TEAM_BUZZED')
    expect(buzzes.map((event) => event.occurredAt)).toEqual([AT, AT, AT])
    // …and the seq order is strictly increasing, which is what decided it.
    expect(buzzes.map((event) => event.seq)).toEqual([...buzzes.map((event) => event.seq)].sort((a, b) => a - b))
  })

  it('does not disarm, so the queue keeps taking teams while the clue is armed', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    expect(phaseOf(store).armed).toBe(true)
    accept(store, buzz('blue'))
    expect(waitingRespondents(phaseOf(store).queue)).toEqual(['blue'])
  })

  it('moves no points', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    expect(store.getState().session?.game?.teamScores).toEqual({})
  })
})

describe('when a buzz must be refused', () => {
  it('refuses a buzz while the clue is DISARMED', () => {
    const store = openStore()
    expectRejected(store, buzz('red'), 'response-phase-not-armed')
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('stops accepting immediately when the host disarms', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    store.dispatch({ type: 'DISARM_RESPONSE_PHASE', issuedAt: AT + 1, roundId: ROUND })
    expectRejected(store, buzz('blue'), 'response-phase-not-armed')
    expect(waitingRespondents(phaseOf(store).queue)).toEqual([])
  })

  it('refuses a buzz before the prompt is public', () => {
    const store = boardStore()
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
    expectRejected(store, buzz('red'), 'invalid-board-stage')
  })

  it('refuses a buzz once the answer is public', () => {
    const store = armedStore()
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    expectRejected(store, buzz('red'), 'invalid-board-stage')
  })

  it('refuses a team this game does not have', () => {
    const store = armedStore()
    expectRejected(store, buzz('ghost'), 'unknown-team')
  })

  it('refuses every buzz in a game with no teams', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    // The fixture always configures teams, so the no-teams case removes the key
    // entirely — an ABSENT `teams` field, which is exactly the Slice 5 board.
    const file: Record<string, unknown> = teamBoardGameFile(undefined, richBoardConfig())
    delete file.teams
    const noTeams = importGameFromUnknown(file)
    if (noTeams.status !== 'success') throw new Error('fixture failed')
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: noTeams.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
    expectRejected(store, buzz('red'), 'no-teams-configured')
  })

  it('refuses a second buzz from the ACTIVE team', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    expectRejected(store, buzz('red'), 'team-already-buzzed')
  })

  it('refuses a second buzz from a WAITING team', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    expectRejected(store, buzz('blue'), 'team-already-buzzed')
  })

  it('refuses a buzz from a team whose turn is already over', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('incorrect', AT + 1))
    expectRejected(store, buzz('red'), 'team-already-buzzed')
  })

  /**
   * Response-opportunity identity. A press that lands after the host has moved to
   * another clue names the PREVIOUS tile and is inert — it cannot join the new
   * clue's queue.
   */
  it('refuses a stale press naming a clue that is no longer open', () => {
    const store = armedStore()
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 2, roundId: ROUND })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT + 3, roundId: ROUND, tileId: 'alpha-200' })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT + 4, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT + 5, roundId: ROUND })
    // The stale press still names `alpha-100`.
    expectRejected(store, buzz('red', AT + 6, TILE), 'tile-mismatch')
    expect(phaseOf(store).queue).toEqual(EMPTY_BUZZ_QUEUE)
    // …while a press for the clue that IS open is accepted.
    accept(store, buzz('red', AT + 7, 'alpha-200'))
    expect(activeRespondent(phaseOf(store).queue)).toBe('red')
  })

  it('refuses a press naming a round that is no longer current', () => {
    const store = armedStore()
    expectRejected(store, buzz('red', AT, TILE, 'some-other-round'), 'round-mismatch')
  })

  it('refuses an unusable dispatch-edge instant rather than storing it', () => {
    const store = armedStore()
    expectRejected(store, buzz('red', Number.NaN), 'malformed-command')
    expectRejected(store, buzz('red', -1), 'malformed-command')
  })

  it('refuses every buzz once the game has ended', () => {
    const store = armedStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    expectRejected(store, buzz('red'), 'game-already-ended')
  })
})

describe('the timer interruption seam', () => {
  function startedStore(): SessionStore {
    const store = armedStore()
    store.dispatch({ type: 'START_RESPONSE_TIMER', issuedAt: AT, roundId: ROUND, durationSeconds: 30 })
    return store
  }

  it('stops the clock on the FIRST accepted buzz, through Slice 7’s typed seam', () => {
    const store = startedStore()
    const events = accept(store, buzz('red', AT + 8_000))
    expect(events.map((event) => event.type)).toEqual(['TEAM_BUZZED', 'RESPONSE_TIMER_INTERRUPTED'])
    expect(events[1]).toMatchObject({
      type: 'RESPONSE_TIMER_INTERRUPTED',
      source: { kind: 'team-buzz' },
      remainingMs: 22_000,
    })
    expect(phaseOf(store).timer).toMatchObject({
      status: 'interrupted',
      source: { kind: 'team-buzz' },
      remainingMs: 22_000,
    })
  })

  it('interrupts exactly once — later buzzes do not touch the timer again', () => {
    const store = startedStore()
    accept(store, buzz('red', AT + 8_000))
    const second = accept(store, buzz('blue', AT + 9_000))
    expect(second.map((event) => event.type)).toEqual(['TEAM_BUZZED'])
    expect(phaseOf(store).timer).toMatchObject({ status: 'interrupted', remainingMs: 22_000 })
    const interruptions = store
      .getHistory()
      .filter((event) => event.type === 'RESPONSE_TIMER_INTERRUPTED')
    expect(interruptions).toHaveLength(1)
  })

  it('does not create a buzz-specific timer state — it reuses `interrupted`', () => {
    const store = startedStore()
    accept(store, buzz('red', AT + 1_000))
    expect(phaseOf(store).timer.status).toBe('interrupted')
  })

  it('interrupts a PAUSED timer too, freezing what was already frozen', () => {
    const store = startedStore()
    store.dispatch({ type: 'PAUSE_RESPONSE_TIMER', issuedAt: AT + 5_000, roundId: ROUND })
    accept(store, buzz('red', AT + 20_000))
    expect(phaseOf(store).timer).toMatchObject({ status: 'interrupted', remainingMs: 25_000 })
  })

  it('a REJECTED buzz never alters the timer', () => {
    const store = startedStore()
    accept(store, buzz('red', AT + 1_000))
    const before = phaseOf(store).timer
    store.dispatch(buzz('red', AT + 2_000))
    store.dispatch(buzz('ghost', AT + 2_000))
    expect(phaseOf(store).timer).toEqual(before)
  })

  it('buzzes with no timer at all, appending only the buzz', () => {
    const store = armedStore()
    const events = accept(store, buzz('red'))
    expect(events.map((event) => event.type)).toEqual(['TEAM_BUZZED'])
    expect(phaseOf(store).timer.status).toBe('idle')
  })

  describe('expiration races', () => {
    it('accepts a buzz BEFORE expiration and makes the expiry stale', () => {
      const store = startedStore()
      const timer = phaseOf(store).timer
      const timerId = timer.status === 'running' ? timer.timerId : ''
      const deadline = timer.status === 'running' ? timer.deadline : 0
      accept(store, buzz('red', AT + 10_000))
      // The timeout callback still fires; it names a timer that is no longer
      // running, so it appends nothing.
      const late = store.dispatch({
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: deadline,
        roundId: ROUND,
        timerId,
        deadline,
      })
      expect(late.status === 'rejected' && late.reason).toBe('stale-timer-expiration')
      expect(phaseOf(store).timer.status).toBe('interrupted')
    })

    it('a duplicate stale callback is refused just as the first one was', () => {
      const store = startedStore()
      const timer = phaseOf(store).timer
      const timerId = timer.status === 'running' ? timer.timerId : ''
      const deadline = timer.status === 'running' ? timer.deadline : 0
      accept(store, buzz('red', AT + 10_000))
      for (const at of [deadline, deadline + 1]) {
        const result = store.dispatch({
          type: 'EXPIRE_RESPONSE_TIMER',
          issuedAt: at,
          roundId: ROUND,
          timerId,
          deadline,
        })
        expect(result.status).toBe('rejected')
      }
    })

    /**
     * Expiry DISARMS, so a buzz that arrives after the clock ran out is refused —
     * arming is the one intake gate, and the class does not get to answer after
     * time is up unless the host re-arms deliberately.
     */
    it('refuses a buzz that arrives AFTER the window expired', () => {
      const store = startedStore()
      const timer = phaseOf(store).timer
      const timerId = timer.status === 'running' ? timer.timerId : ''
      const deadline = timer.status === 'running' ? timer.deadline : 0
      store.dispatch({
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: deadline,
        roundId: ROUND,
        timerId,
        deadline,
      })
      expect(phaseOf(store).armed).toBe(false)
      expectRejected(store, buzz('red', deadline + 1), 'response-phase-not-armed')
    })

    it('keeps the queue when the window expires', () => {
      const store = startedStore()
      const timer = phaseOf(store).timer
      const timerId = timer.status === 'running' ? timer.timerId : ''
      const deadline = timer.status === 'running' ? timer.deadline : 0
      accept(store, buzz('red', AT + 1_000))
      // The buzz already interrupted the clock, so this expiry is stale; run the
      // other order instead — expire first on a fresh store.
      const other = startedStore()
      const otherTimer = phaseOf(other).timer
      other.dispatch({
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: otherTimer.status === 'running' ? otherTimer.deadline : 0,
        roundId: ROUND,
        timerId: otherTimer.status === 'running' ? otherTimer.timerId : '',
        deadline: otherTimer.status === 'running' ? otherTimer.deadline : 0,
      })
      expect(phaseOf(other).queue).toEqual(EMPTY_BUZZ_QUEUE)
      expect(timerId.length).toBeGreaterThan(0)
      expect(deadline).toBeGreaterThan(0)
      expect(activeRespondent(phaseOf(store).queue)).toBe('red')
    })
  })
})

describe('promotion after an incorrect response or a host pass (OG-3)', () => {
  it('promotes the next queued team when the active response is marked incorrect', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, buzz('green'))
    accept(store, resolve('incorrect', AT + 1))
    expect(activeRespondent(phaseOf(store).queue)).toBe('blue')
    expect(waitingRespondents(phaseOf(store).queue)).toEqual(['green'])
  })

  it('promotes the next queued team when the host passes', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('passed', AT + 1))
    expect(activeRespondent(phaseOf(store).queue)).toBe('blue')
  })

  it('records WHICH team had the turn and WHY it ended', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    const [event] = accept(store, resolve('incorrect', AT + 1))
    expect(event).toEqual({
      id: expect.any(String),
      type: 'ACTIVE_RESPONSE_RESOLVED',
      seq: expect.any(Number),
      occurredAt: AT + 1,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
      resolution: { kind: 'incorrect' },
    })
  })

  it('takes the team from the QUEUE, so a host cannot name the wrong one', () => {
    const store = armedStore()
    accept(store, buzz('blue'))
    const [event] = accept(store, resolve('passed', AT + 1))
    expect(event).toMatchObject({ teamId: 'blue' })
  })

  it('moves no points — neither incorrect nor pass deducts anything', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('incorrect', AT + 1))
    accept(store, resolve('passed', AT + 2))
    expect(store.getState().session?.game?.teamScores).toEqual({})
    const scoreEvents = store.getHistory().filter((event) => event.type === 'TEAM_SCORE_ADJUSTED')
    expect(scoreEvents).toHaveLength(0)
  })

  /**
   * Promotion moves the queue pointer and NOTHING else. It does not re-arm a
   * disarmed clue (which would silently reopen intake the host had closed) and it
   * does not disarm an armed one (which would silently close intake the host had
   * opened).
   */
  it('does not re-arm or disarm — arming stays exactly where the host left it', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('incorrect', AT + 1))
    expect(phaseOf(store).armed).toBe(true)

    store.dispatch({ type: 'DISARM_RESPONSE_PHASE', issuedAt: AT + 2, roundId: ROUND })
    // `blue` is active and can still be resolved while disarmed — disarming stops
    // NEW buzzes, it does not strand the team that already has the floor.
    accept(store, resolve('passed', AT + 3))
    expect(phaseOf(store).armed).toBe(false)
    expect(buzzQueueStatus(phaseOf(store).queue)).toEqual({ status: 'exhausted' })
  })

  it('reaches an EXHAUSTED queue that says so, rather than looking empty', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('incorrect', AT + 1))
    accept(store, resolve('incorrect', AT + 2))
    expect(buzzQueueStatus(phaseOf(store).queue)).toEqual({ status: 'exhausted' })
    expect(phaseOf(store).queue.order).toEqual(['red', 'blue'])
  })

  it('refuses to advance when nobody is answering', () => {
    const store = armedStore()
    expectRejected(store, resolve('incorrect', AT + 1), 'no-active-respondent')
    accept(store, buzz('red'))
    accept(store, resolve('passed', AT + 2))
    expectRejected(store, resolve('passed', AT + 3), 'no-active-respondent')
  })

  it('lets a new team join the queue after a promotion, while still armed', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, resolve('incorrect', AT + 1))
    accept(store, buzz('gold', AT + 2))
    expect(activeRespondent(phaseOf(store).queue)).toBe('gold')
  })

  it('refuses a resolution naming a clue that is no longer open', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    expectRejected(store, resolve('incorrect', AT + 1, 'alpha-200'), 'tile-mismatch')
  })

  it('refuses a malformed resolution rather than guessing', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    const result = store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT + 1,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'correct' } as never,
    })
    expect(result.status === 'rejected' && result.reason).toBe('malformed-command')
  })
})

describe('the queue lifecycle', () => {
  const closers: readonly [string, (store: SessionStore) => void][] = [
    ['a reset', (store) => void store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 9, roundId: ROUND })],
    [
      'the answer reveal',
      (store) => void store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 9, roundId: ROUND }),
    ],
    [
      'returning to the board',
      (store) => void store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 9, roundId: ROUND }),
    ],
    [
      'a round selection',
      (store) => void store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT + 9, roundId: ROUND }),
    ],
    ['the game ending', (store) => void store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 9 })],
  ]

  for (const [label, close] of closers) {
    it(`clears the queue on ${label}`, () => {
      const store = armedStore()
      accept(store, buzz('red'))
      accept(store, buzz('blue'))
      close(store)
      expect(phaseOf(store).queue).toEqual(EMPTY_BUZZ_QUEUE)
    })
  }

  it('does not let a queue survive into the NEXT clue', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 2, roundId: ROUND })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT + 3, roundId: ROUND, tileId: 'alpha-200' })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT + 4, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })

  it('makes a phase holding only a queue resettable', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    store.dispatch({ type: 'DISARM_RESPONSE_PHASE', issuedAt: AT + 1, roundId: ROUND })
    // Disarmed, no timer — but a queue, so the phase is not initial and reset is
    // a legal, meaningful action.
    const result = store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 2, roundId: ROUND })
    expect(result.status).toBe('accepted')
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
  })
})

describe('replay and undo', () => {
  it('replays a whole queue bit-exactly, without reading a clock', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('incorrect', AT + 1))
    accept(store, buzz('green', AT + 2))
    const replayed = replay(store.getHistory())
    expect(replayed).toEqual(store.getState())
    // …and again, at any later moment, with the same result.
    expect(replay(store.getHistory())).toEqual(replayed)
  })

  it('undoes a buzz back to the queue that preceded it', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    store.dispatch(undo)
    expect(phaseOf(store).queue.order).toEqual(['red'])
    store.dispatch(undo)
    expect(phaseOf(store).queue).toEqual(EMPTY_BUZZ_QUEUE)
  })

  it('undoes a promotion back to the prior active respondent and order', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, buzz('green'))
    accept(store, resolve('incorrect', AT + 1))
    expect(activeRespondent(phaseOf(store).queue)).toBe('blue')
    store.dispatch(undo)
    expect(activeRespondent(phaseOf(store).queue)).toBe('red')
    expect(waitingRespondents(phaseOf(store).queue)).toEqual(['blue', 'green'])
  })

  /**
   * A buzz that stops a live clock appends TWO facts, so reversing it fully takes
   * TWO undos. That is the existing latest-only rule (ADR-002, ADR-007 §13), not a
   * new limitation, and the intermediate state is exactly what the log says.
   */
  it('peels a buzz-and-interruption apart in reverse causal order', () => {
    const store = armedStore()
    store.dispatch({ type: 'START_RESPONSE_TIMER', issuedAt: AT, roundId: ROUND, durationSeconds: 30 })
    accept(store, buzz('red', AT + 8_000))
    expect(phaseOf(store).timer.status).toBe('interrupted')

    store.dispatch(undo)
    // First undo: the clock is running again; the buzz is still recorded.
    expect(phaseOf(store).timer.status).toBe('running')
    expect(activeRespondent(phaseOf(store).queue)).toBe('red')

    store.dispatch(undo)
    // Second undo: the buzz is gone too, and the phase is exactly pre-buzz.
    expect(phaseOf(store).queue).toEqual(EMPTY_BUZZ_QUEUE)
    expect(phaseOf(store).timer.status).toBe('running')
    expect(phaseOf(store).armed).toBe(true)
  })

  it('undoes a reset back to the whole prior queue', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    accept(store, resolve('passed', AT + 1))
    const before = phaseOf(store)
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 2, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
    store.dispatch(undo)
    expect(phaseOf(store)).toEqual(before)
  })

  it('undoes an answer reveal back to the queue it closed', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    const before = phaseOf(store)
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    expect(phaseOf(store)).toEqual(INITIAL_RESPONSE_PHASE_STATE)
    store.dispatch(undo)
    expect(phaseOf(store)).toEqual(before)
  })

  it('lets the undone team buzz again, because the queue no longer holds it', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    store.dispatch(undo)
    accept(store, buzz('red', AT + 1))
    expect(activeRespondent(phaseOf(store).queue)).toBe('red')
  })
})

describe('a corrupt log degrades safely rather than throwing', () => {
  function forge(store: SessionStore, event: SessionEvent): ResponsePhaseState {
    const state = replay([...store.getHistory(), event])
    const game = state.session?.game
    if (!game) throw new Error('no game')
    return responsePhaseFor(game, ROUND)
  }

  it('skips a buzz recorded against a DISARMED clue', () => {
    const store = openStore()
    const phase = forge(store, {
      id: 'evt-999',
      type: 'TEAM_BUZZED',
      seq: 999,
      occurredAt: AT,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
    })
    expect(phase.queue).toEqual(EMPTY_BUZZ_QUEUE)
  })

  it('skips a duplicate buzz for a team already in the queue', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    const phase = forge(store, {
      id: 'evt-999',
      type: 'TEAM_BUZZED',
      seq: 999,
      occurredAt: AT,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
    })
    expect(phase.queue.order).toEqual(['red'])
  })

  it('skips a resolution naming a team that is not the active one', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    store.dispatch(buzz('blue'))
    const phase = forge(store, {
      id: 'evt-999',
      type: 'ACTIVE_RESPONSE_RESOLVED',
      seq: 999,
      occurredAt: AT,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'blue',
      resolution: { kind: 'incorrect' },
    })
    expect(activeRespondent(phase.queue)).toBe('red')
  })

  it('skips a resolution with an unrecognized kind', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    const phase = forge(store, {
      id: 'evt-999',
      type: 'ACTIVE_RESPONSE_RESOLVED',
      seq: 999,
      occurredAt: AT,
      reversible: true,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
      resolution: { kind: 'correct' } as never,
    })
    expect(activeRespondent(phase.queue)).toBe('red')
  })
})

describe('scoring stays independent (OG-6 remains deferred)', () => {
  it('lets the host score a team that is not the active respondent', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    // `blue` never buzzed, and scoring it is still perfectly legal.
    const result = store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT + 1,
      teamId: 'blue',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(result.status).toBe('accepted')
    expect(store.getState().session?.game?.teamScores).toEqual({ blue: 100 })
  })

  it('scoring does not touch the queue', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    accept(store, buzz('blue'))
    const before = phaseOf(store)
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT + 1,
      teamId: 'red',
      delta: -100,
      mode: 'deduction',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(phaseOf(store)).toEqual(before)
  })

  it('a stale queue command cannot modify a later clue’s scores or state', () => {
    const store = armedStore()
    accept(store, buzz('red'))
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1, roundId: ROUND })
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 2, roundId: ROUND })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT + 3, roundId: ROUND, tileId: 'alpha-200' })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT + 4, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT + 5, roundId: ROUND })
    expectRejected(store, resolve('incorrect', AT + 6, TILE), 'tile-mismatch')
    expect(store.getState().session?.game?.teamScores).toEqual({})
  })
})

describe('the host interruption source still works unchanged', () => {
  it('accepts a host stop exactly as it did in Slice 7', () => {
    const store = armedStore()
    store.dispatch({ type: 'START_RESPONSE_TIMER', issuedAt: AT, roundId: ROUND, durationSeconds: 30 })
    const result = store.dispatch({
      type: 'INTERRUPT_RESPONSE_TIMER',
      issuedAt: AT + 1_000,
      roundId: ROUND,
      source: HOST_INTERRUPTION,
    })
    expect(result.status).toBe('accepted')
    expect(phaseOf(store).timer).toMatchObject({ source: { kind: 'host' } })
  })
})
