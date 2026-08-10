import { describe, expect, it } from 'vitest'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import { replay } from '../state/reducer'
import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import {
  derivePresentationCue,
  derivePresentationCuesForAppendedEvents,
} from './derivePresentationCue'
import type { PresentationCueId } from './presentationCueId'

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

function boardStore(): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function armedStore(): SessionStore {
  const store = boardStore()
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  return store
}

function cueForNext(
  store: SessionStore,
  command: SessionCommand,
): PresentationCueId | null {
  const beforeHistory = store.getHistory()
  const before = store.getState()
  const result = store.dispatch(command)
  if (result.status !== 'accepted') return null
  if (result.events.length === 1) {
    return derivePresentationCue(before, result.events[0]!)
  }
  return (
    derivePresentationCuesForAppendedEvents(beforeHistory, result.events, replay)[0] ?? null
  )
}

function cuesForNext(
  store: SessionStore,
  command: SessionCommand,
): readonly PresentationCueId[] {
  const beforeHistory = store.getHistory()
  const result = store.dispatch(command)
  if (result.status !== 'accepted') return []
  return derivePresentationCuesForAppendedEvents(beforeHistory, result.events, replay)
}

const buzz = (teamId: string, at = AT): SessionCommand => ({
  type: 'RECORD_TEAM_BUZZ',
  issuedAt: at,
  roundId: ROUND,
  tileId: TILE,
  teamId,
})

const resolve = (kind: 'incorrect' | 'passed', at = AT): SessionCommand => ({
  type: 'RESOLVE_ACTIVE_RESPONSE',
  issuedAt: at,
  roundId: ROUND,
  tileId: TILE,
  resolution: { kind },
})

describe('derivePresentationCue — buzz / claim', () => {
  it('first accepted buzz establishing active team → active-claim', () => {
    const store = armedStore()
    expect(cueForNext(store, buzz('red'))).toBe('active-claim')
  })

  it('second and third waiting buzzes → none', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    expect(cueForNext(store, buzz('blue', AT + 1))).toBeNull()
    expect(cueForNext(store, buzz('green', AT + 2))).toBeNull()
  })

  it('duplicate rejected buzz → no event / no cue', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    expect(cueForNext(store, buzz('red', AT + 1))).toBeNull()
  })

  it('pass promotes waiting team → active-claim', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    store.dispatch(buzz('blue', AT + 1))
    expect(cueForNext(store, resolve('passed', AT + 2))).toBe('active-claim')
  })

  it('incorrect promotes waiting team → incorrect only', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    store.dispatch(buzz('blue', AT + 1))
    expect(cueForNext(store, resolve('incorrect', AT + 2))).toBe('incorrect')
  })
})

describe('derivePresentationCue — scoring', () => {
  function openForScoring(): SessionStore {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: TILE,
    })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    return store
  }

  it('full-credit positive → positive-award', () => {
    const store = openForScoring()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: 100,
        mode: 'full-credit',
        source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
      }),
    ).toBe('positive-award')
  })

  it('partial-credit positive → positive-award', () => {
    const store = openForScoring()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: 50,
        mode: 'partial-credit',
        source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
      }),
    ).toBe('positive-award')
  })

  it('partial-credit negative → none', () => {
    const store = openForScoring()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: -50,
        mode: 'partial-credit',
        source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
      }),
    ).toBeNull()
  })

  it('deduction → none', () => {
    const store = openForScoring()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: -100,
        mode: 'deduction',
        source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
      }),
    ).toBeNull()
  })

  it('positive and negative manual correction → none', () => {
    const store = openForScoring()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: 'red',
        delta: 25,
        mode: 'manual-correction',
        source: { kind: 'manual' },
      }),
    ).toBeNull()
    expect(
      cueForNext(store, {
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT + 1,
        teamId: 'red',
        delta: -10,
        mode: 'manual-correction',
        source: { kind: 'manual' },
      }),
    ).toBeNull()
  })
})

describe('derivePresentationCue — ordinary response', () => {
  it('incorrect without waiting teams → incorrect', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    expect(cueForNext(store, resolve('incorrect', AT + 1))).toBe('incorrect')
  })

  it('passed without promotion → none', () => {
    const store = armedStore()
    store.dispatch(buzz('red'))
    expect(cueForNext(store, resolve('passed', AT + 1))).toBeNull()
  })
})

describe('derivePresentationCue — timers and completion', () => {
  it('response timer expiry → timer-expired', () => {
    const store = armedStore()
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 5,
    })
    const phase = store.getState().session!.game!.responsePhases[ROUND]!
    if (phase.timer.status !== 'running') throw new Error('expected running')
    expect(
      cueForNext(store, {
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: phase.timer.deadline,
        roundId: ROUND,
        timerId: phase.timer.timerId,
        deadline: phase.timer.deadline,
      }),
    ).toBe('timer-expired')
  })

  it('pause does not produce timer-expired', () => {
    const store = armedStore()
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 5,
    })
    expect(
      cueForNext(store, { type: 'PAUSE_RESPONSE_TIMER', issuedAt: AT + 100, roundId: ROUND }),
    ).toBeNull()
  })

  it('live game end → game-complete', () => {
    const store = boardStore()
    expect(cueForNext(store, { type: 'END_GAME_SESSION', issuedAt: AT })).toBe('game-complete')
  })

  it('already-ended recovered history yields no completion cue for past end', () => {
    const store = boardStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const history = store.getHistory()
    const ended = history.find((event) => event.type === 'GAME_SESSION_ENDED')
    if (ended === undefined) throw new Error('missing end')
    const beforeEnd = history.slice(0, history.indexOf(ended))
    const afterEndState = replay(history)
    expect(derivePresentationCue(afterEndState, ended)).toBeNull()
    expect(derivePresentationCue(replay(beforeEnd), ended)).toBe('game-complete')
  })

  it('multi-event append with GAME_SESSION_ENDED yields one completion cue', () => {
    const store = boardStore()
    const before = store.getHistory()
    const endOnly = store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    if (endOnly.status !== 'accepted') throw new Error('end rejected')
    const suffix: SessionEvent[] = [
      {
        id: 'noise',
        type: 'WAITING_MARKED',
        seq: 999,
        occurredAt: AT,
        reversible: true,
      },
      endOnly.events[0]!,
    ]
    expect(derivePresentationCuesForAppendedEvents(before, suffix, replay)).toEqual([
      'game-complete',
    ])
  })
})

describe('derivePresentationCue — Final outcomes', () => {
  it('maps Final settle outcomes by correctness, not delta', () => {
    const before = replay([])
    const base = {
      id: 'f1',
      seq: 1,
      occurredAt: AT,
      reversible: true as const,
      roundId: 'final-round',
      teamId: 'red',
    }

    expect(
      derivePresentationCue(before, {
        ...base,
        type: 'FINAL_TEAM_SETTLED',
        wager: 100,
        outcome: 'correct',
        delta: 100,
      }),
    ).toBe('positive-award')

    expect(
      derivePresentationCue(before, {
        ...base,
        id: 'f2',
        type: 'FINAL_TEAM_SETTLED',
        wager: 0,
        outcome: 'correct',
        delta: 0,
      }),
    ).toBe('positive-award')

    expect(
      derivePresentationCue(before, {
        ...base,
        id: 'f3',
        type: 'FINAL_TEAM_SETTLED',
        wager: 50,
        outcome: 'incorrect',
        delta: -50,
      }),
    ).toBe('incorrect')

    expect(
      derivePresentationCue(before, {
        ...base,
        id: 'f4',
        type: 'FINAL_TEAM_SETTLED',
        wager: 0,
        outcome: 'incorrect',
        delta: 0,
      }),
    ).toBe('incorrect')

    expect(
      derivePresentationCue(before, {
        ...base,
        id: 'f5',
        type: 'FINAL_TEAM_SETTLED',
        wager: 25,
        outcome: 'no-response',
        delta: -25,
      }),
    ).toBeNull()
  })

  it('Final window expiry events → timer-expired', () => {
    const before = replay([])
    expect(
      derivePresentationCue(before, {
        id: 'e1',
        type: 'FINAL_WAGER_WINDOW_EXPIRED',
        seq: 1,
        occurredAt: AT,
        reversible: true,
        roundId: 'final-round',
        timerId: 't1',
        deadline: AT + 1,
      }),
    ).toBe('timer-expired')
    expect(
      derivePresentationCue(before, {
        id: 'e2',
        type: 'FINAL_RESPONSE_WINDOW_EXPIRED',
        seq: 2,
        occurredAt: AT,
        reversible: true,
        roundId: 'final-round',
        timerId: 't2',
        deadline: AT + 1,
      }),
    ).toBe('timer-expired')
  })
})

describe('derivePresentationCue — EVENT_UNDONE', () => {
  it('undo marker itself produces no cue', () => {
    const store = boardStore()
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(cuesForNext(store, { type: 'UNDO', issuedAt: AT + 1 })).toEqual([])
  })
})
