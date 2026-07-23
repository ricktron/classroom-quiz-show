import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { INITIAL_PRIVATE_STATE } from './privateState'
import { findUndoTarget, planCommand, reduce, replay, type PlanDeps } from './reducer'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createGameDefinition, type GameDefinition } from '../game/gameDefinition'
import {
  createSampleGame,
  createSampleGameWithUnsupportedRound,
} from '../game/sampleGame'

const AT = 1_000
const registry = createDefaultRegistry()
const deps: PlanDeps = { isKnownRoundType: (type) => registry.isKnown(type) }

/** Apply a sequence of accepted commands (with registry deps), returning history. */
function run(commands: SessionCommand[]): SessionEvent[] {
  const history: SessionEvent[] = []
  let state = replay(history)
  for (const command of commands) {
    const outcome = planCommand(state, history, command, deps)
    if (outcome.status === 'accepted') {
      history.push(...outcome.events)
      state = replay(history)
    }
  }
  return history
}

const init: SessionCommand = { type: 'INIT_SESSION', issuedAt: AT, sessionId: 'sess-1' }
const initGame: SessionCommand = {
  type: 'INITIALIZE_GAME',
  issuedAt: AT,
  definition: createSampleGame(),
}

describe('INITIALIZE_GAME', () => {
  it('is rejected before a session exists', () => {
    const outcome = planCommand(INITIAL_PRIVATE_STATE, [], initGame, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'session-not-initialized' })
  })

  it('is accepted after a session and produces an irreversible GAME_INITIALIZED', () => {
    const history = run([init])
    const state = replay(history)
    const outcome = planCommand(state, history, initGame, deps)
    expect(outcome.status).toBe('accepted')
    if (outcome.status !== 'accepted') return
    expect(outcome.events[0]).toMatchObject({ type: 'GAME_INITIALIZED', reversible: false })
  })

  it('rejects a structurally invalid definition (fail closed)', () => {
    const history = run([init])
    const state = replay(history)
    const outcome = planCommand(
      state,
      history,
      { type: 'INITIALIZE_GAME', issuedAt: AT, definition: {} as unknown as GameDefinition },
      deps,
    )
    expect(outcome).toEqual({ status: 'rejected', reason: 'invalid-game-definition' })
  })

  it('loads the game into the session with no round selected yet', () => {
    const state = replay(run([init, initGame]))
    expect(state.session?.game).toMatchObject({
      gameLifecycle: 'active',
      currentRoundIndex: null,
      currentRoundSupport: null,
    })
    expect(state.session?.game?.definition.rounds).toHaveLength(3)
  })
})

describe('SELECT_ROUND', () => {
  it('rejects selection before a game is initialized', () => {
    const history = run([init])
    const outcome = planCommand(replay(history), history, {
      type: 'SELECT_ROUND',
      issuedAt: AT,
      roundId: 'round-1',
    }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'game-not-initialized' })
  })

  it('selects a supported round by stable id and records the ordinal + support', () => {
    const state = replay(run([init, initGame, { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'round-2' }]))
    expect(state.session?.game?.currentRoundIndex).toBe(1)
    expect(state.session?.game?.currentRoundSupport).toBe('supported')
  })

  it('rejects an unknown round id', () => {
    const history = run([init, initGame])
    const outcome = planCommand(replay(history), history, {
      type: 'SELECT_ROUND',
      issuedAt: AT,
      roundId: 'does-not-exist',
    }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'unknown-round' })
  })
})

describe('ADVANCE_TO_NEXT_ROUND', () => {
  it('advances within bounds', () => {
    const state = replay(
      run([init, initGame, { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }]),
    )
    expect(state.session?.game?.currentRoundIndex).toBe(0)
  })

  it('advances step by step through the rounds', () => {
    const state = replay(
      run([
        init,
        initGame,
        { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
        { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
      ]),
    )
    expect(state.session?.game?.currentRoundIndex).toBe(1)
  })

  it('safely rejects advancing past the final round (no mutation)', () => {
    const history = run([
      init,
      initGame,
      { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
      { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
      { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
    ])
    const before = replay(history)
    const outcome = planCommand(before, history, { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'no-next-round' })
    expect(replay(history)).toEqual(before)
  })

  it('safely rejects advancing an empty-round game', () => {
    const emptyGame: SessionCommand = {
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({ id: 'empty', title: 'Empty', rounds: [] }),
    }
    const history = run([init, emptyGame])
    const outcome = planCommand(replay(history), history, {
      type: 'ADVANCE_TO_NEXT_ROUND',
      issuedAt: AT,
    }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'no-next-round' })
  })
})

describe('END_GAME_SESSION', () => {
  it('ends the game (irreversible) and marks the lifecycle ended', () => {
    const history = run([init, initGame, { type: 'END_GAME_SESSION', issuedAt: AT }])
    const ended = history.find((e) => e.type === 'GAME_SESSION_ENDED')
    expect(ended?.reversible).toBe(false)
    expect(replay(history).session?.game?.gameLifecycle).toBe('ended')
  })

  it('is rejected when no game is loaded', () => {
    const history = run([init])
    const outcome = planCommand(replay(history), history, {
      type: 'END_GAME_SESSION',
      issuedAt: AT,
    }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'game-not-initialized' })
  })
})

describe('replay & undo for game events', () => {
  const scripted: SessionCommand[] = [
    init,
    initGame,
    { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'round-1' },
    { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT },
  ]

  it('replay is deterministic and idempotent', () => {
    const history = run(scripted)
    expect(replay(history)).toEqual(replay(history))
  })

  it('undo of a round selection reverts to the prior selection, preserving audit history', () => {
    const history = run([
      init,
      initGame,
      { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'round-1' }, // index 0
      { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'round-3' }, // index 2
      { type: 'UNDO', issuedAt: AT }, // neutralizes the second selection
    ])
    expect(replay(history).session?.game?.currentRoundIndex).toBe(0)
    // Append-only: the undone selection event is still present in the log.
    expect(history.map((e) => e.type)).toContain('CURRENT_ROUND_SELECTED')
    expect(history.at(-1)?.type).toBe('EVENT_UNDONE')
  })

  it('never undoes GAME_INITIALIZED or GAME_SESSION_ENDED (both irreversible)', () => {
    const history = run([init, initGame, { type: 'END_GAME_SESSION', issuedAt: AT }])
    // The only reversible-or-not scan finds nothing reversible to undo here.
    expect(findUndoTarget(history)).toBeNull()
    const outcome = planCommand(replay(history), history, { type: 'UNDO', issuedAt: AT }, deps)
    expect(outcome).toEqual({ status: 'rejected', reason: 'nothing-to-undo' })
  })
})

describe('unknown / unsupported round types (fail closed)', () => {
  const initUnsupported: SessionCommand = {
    type: 'INITIALIZE_GAME',
    issuedAt: AT,
    definition: createSampleGameWithUnsupportedRound(),
  }

  it('initializes a game containing an unsupported round without crashing', () => {
    const state = replay(run([init, initUnsupported]))
    expect(state.session?.game?.definition.rounds).toHaveLength(2)
    // No round selected yet → support is null, nothing has failed.
    expect(state.session?.game?.currentRoundSupport).toBeNull()
  })

  it('selecting the unsupported round records support = unsupported (never coerced)', () => {
    const state = replay(
      run([init, initUnsupported, { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'mystery-round' }]),
    )
    expect(state.session?.game?.currentRoundIndex).toBe(1)
    expect(state.session?.game?.currentRoundSupport).toBe('unsupported')
  })

  it('advancing onto the unsupported round also records unsupported', () => {
    const state = replay(
      run([
        init,
        initUnsupported,
        { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }, // index 0 (supported)
        { type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }, // index 1 (unsupported)
      ]),
    )
    expect(state.session?.game?.currentRoundSupport).toBe('unsupported')
  })

  it('replay of an unsupported selection is deterministic (no registry needed)', () => {
    const history = run([
      init,
      initUnsupported,
      { type: 'SELECT_ROUND', issuedAt: AT, roundId: 'mystery-round' },
    ])
    // Replaying with NO deps still reproduces the same state, because support
    // was frozen onto the event at plan time.
    expect(replay(history)).toEqual(replay(history))
  })
})

describe('event application fails safe for game events', () => {
  it('a game event before a game exists leaves state unchanged', () => {
    const afterSession = replay(run([init]))
    const stray = {
      id: 'evt-9',
      type: 'CURRENT_ROUND_SELECTED',
      seq: 9,
      occurredAt: AT,
      reversible: true,
      roundIndex: 0,
      roundId: 'round-1',
      support: 'supported',
    } as unknown as SessionEvent
    expect(reduce(afterSession, stray)).toEqual(afterSession)
  })
})
