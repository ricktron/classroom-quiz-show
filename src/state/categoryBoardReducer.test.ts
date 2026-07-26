import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { categoryBoardStateFor, planCommand, replay, type RejectionReason } from './reducer'
import type { PrivateState } from './privateState'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { boardGameFile, category, richBoardConfig, tile } from '../test/categoryBoardFixtures'

/**
 * Category-board commands, events, replay and undo (Slice 5).
 *
 * The load-bearing claims proved here:
 *  - the reveal-stage state machine only permits legal transitions;
 *  - a rejected command produces NO event and does not change the revision;
 *  - all gameplay state — including used tiles — is DERIVED BY REPLAY, so undo
 *    is exact and needs no separate bookkeeping;
 *  - replay is deterministic and touches no clock, random source, or registry.
 */

const AT = 1_000

/** A trusted definition built through the real import pipeline. */
function boardDefinition(config: Record<string, unknown> = richBoardConfig()): GameDefinition {
  const result = importGameFromUnknown(boardGameFile(config))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

/** A store with a session, the imported board game loaded, and round 1 selected. */
function boardStore(config?: Record<string, unknown>): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: boardDefinition(config) })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

const ROUND = 'board-round'

function select(tileId: string, roundId = ROUND): SessionCommand {
  return { type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId, tileId }
}
function revealPrompt(roundId = ROUND): SessionCommand {
  return { type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId }
}
function revealAnswer(roundId = ROUND): SessionCommand {
  return { type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId }
}
function returnToBoard(roundId = ROUND): SessionCommand {
  return { type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT, roundId }
}
const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

/** The board state of the round in a store. */
function boardOf(store: SessionStore, roundId = ROUND) {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return categoryBoardStateFor(game, roundId)
}

/** Assert a command is rejected for a given reason AND changes nothing at all. */
function expectRejected(store: SessionStore, command: SessionCommand, reason: RejectionReason) {
  const revisionBefore = store.getState().revision
  const historyBefore = store.getHistory()
  const publicBefore = JSON.stringify(store.getPublicState())

  const result = store.dispatch(command)

  expect(result.status).toBe('rejected')
  if (result.status === 'rejected') expect(result.reason).toBe(reason)
  expect(store.getHistory()).toHaveLength(historyBefore.length)
  expect(store.getHistory()).toBe(historyBefore)
  expect(store.getState().revision).toBe(revisionBefore)
  expect(JSON.stringify(store.getPublicState())).toBe(publicBefore)
}

describe('command validation', () => {
  it('accepts selecting a valid, unused tile', () => {
    const store = boardStore()
    const result = store.dispatch(select('alpha-100'))
    expect(result.status).toBe('accepted')
    expect(boardOf(store).progress).toEqual({ stage: 'selected', selectedTileId: 'alpha-100' })
  })

  it('rejects every gameplay command when no session exists', () => {
    const store = createSessionStore()
    for (const command of [select('alpha-100'), revealPrompt(), revealAnswer(), returnToBoard()]) {
      expectRejected(store, command, 'session-not-initialized')
    }
  })

  it('rejects every gameplay command when no game is loaded', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    expectRejected(store, select('alpha-100'), 'game-not-initialized')
  })

  it('rejects gameplay commands after the game has ended', () => {
    const store = boardStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expectRejected(store, select('alpha-100'), 'game-already-ended')
  })

  it('rejects gameplay commands when no round is selected', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: boardDefinition() })
    expectRejected(store, select('alpha-100'), 'no-current-round')
  })

  it('rejects a command whose roundId is not the current round (stale control)', () => {
    const store = boardStore()
    expectRejected(store, select('alpha-100', 'some-other-round'), 'round-mismatch')
  })

  it('rejects gameplay commands when the current round is not a category board', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({
        id: 'g',
        title: 'G',
        rounds: [placeholderRound('p1', 'P1')],
      }),
    })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expectRejected(store, select('x', 'p1'), 'not-a-category-board-round')
  })

  it('rejects an unknown tile id', () => {
    expectRejected(boardStore(), select('no-such-tile'), 'unknown-tile')
  })

  it('rejects a malformed tile id', () => {
    expectRejected(boardStore(), select(''), 'malformed-command')
  })

  it('rejects selecting an already-used tile', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch(returnToBoard())
    expectRejected(store, select('alpha-100'), 'tile-already-used')
  })

  it('rejects selecting a second tile while one is already open', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    expectRejected(store, select('alpha-200'), 'invalid-board-stage')
  })

  it('rejects revealing a prompt with nothing selected', () => {
    expectRejected(boardStore(), revealPrompt(), 'invalid-board-stage')
  })

  it('rejects revealing a prompt twice', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    expectRejected(store, revealPrompt(), 'invalid-board-stage')
  })

  it('rejects revealing the answer before the prompt', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    expectRejected(store, revealAnswer(), 'invalid-board-stage')
  })

  it('rejects revealing the answer twice', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    expectRejected(store, revealAnswer(), 'invalid-board-stage')
  })

  it('rejects returning to the board when already on the board', () => {
    expectRejected(boardStore(), returnToBoard(), 'invalid-board-stage')
  })

  it('allows returning from selected, prompt and answer stages', () => {
    for (const setup of [
      [select('alpha-100')],
      [select('alpha-100'), revealPrompt()],
      [select('alpha-100'), revealPrompt(), revealAnswer()],
    ]) {
      const store = boardStore()
      setup.forEach((command) => store.dispatch(command))
      expect(store.dispatch(returnToBoard()).status).toBe('accepted')
      expect(boardOf(store).progress.stage).toBe('board')
    }
  })

  it('rejects gameplay commands against a category-board round with unusable config', () => {
    // A trusted in-memory definition may still carry a broken board (Slice 3
    // deliberately allows an unusable round to be REPRESENTED).
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({
        id: 'g',
        title: 'G',
        rounds: [
          { id: 'broken', type: 'category-board', title: 'Broken', config: { categories: [] } } as never,
        ],
      }),
    })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expectRejected(store, select('x', 'broken'), 'invalid-category-board-config')
  })
})

describe('the reveal-stage state machine', () => {
  it('walks board → selected → prompt → answer → board', () => {
    const store = boardStore()
    const stages: string[] = [boardOf(store).progress.stage]
    for (const command of [select('alpha-100'), revealPrompt(), revealAnswer(), returnToBoard()]) {
      expect(store.dispatch(command).status).toBe('accepted')
      stages.push(boardOf(store).progress.stage)
    }
    expect(stages).toEqual(['board', 'selected', 'prompt', 'answer', 'board'])
  })

  it('keeps the selection through prompt and answer, and clears it on return', () => {
    const store = boardStore()
    store.dispatch(select('beta-500'))
    store.dispatch(revealPrompt())
    expect(boardOf(store).progress.selectedTileId).toBe('beta-500')
    store.dispatch(revealAnswer())
    expect(boardOf(store).progress.selectedTileId).toBe('beta-500')
    store.dispatch(returnToBoard())
    expect(boardOf(store).progress.selectedTileId).toBeNull()
  })
})

describe('used-tile policy', () => {
  it('selecting a tile does NOT mark it used', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    expect(boardOf(store).usedTileIds).toEqual([])
  })

  it('revealing the prompt does NOT mark it used', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    expect(boardOf(store).usedTileIds).toEqual([])
  })

  it('revealing the ANSWER marks it used', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    expect(boardOf(store).usedTileIds).toEqual(['alpha-100'])
  })

  it('returning to the board preserves used state', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch(returnToBoard())
    expect(boardOf(store).usedTileIds).toEqual(['alpha-100'])
  })

  it('completes two tiles in sequence and records both, in order', () => {
    const store = boardStore()
    for (const tileId of ['beta-500', 'alpha-200']) {
      store.dispatch(select(tileId))
      store.dispatch(revealPrompt())
      store.dispatch(revealAnswer())
      store.dispatch(returnToBoard())
    }
    expect(boardOf(store).usedTileIds).toEqual(['beta-500', 'alpha-200'])
  })

  it('an accidental selection can be cancelled without consuming the tile', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(returnToBoard())
    expect(boardOf(store).usedTileIds).toEqual([])
    expect(store.dispatch(select('alpha-100')).status).toBe('accepted')
  })
})

describe('undo restores the previous stage exactly', () => {
  it('undoing the answer reveal makes the tile unused again and restores the prompt stage', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    expect(boardOf(store).usedTileIds).toEqual(['alpha-100'])

    expect(store.dispatch(undo).status).toBe('accepted')
    expect(boardOf(store).progress).toEqual({ stage: 'prompt', selectedTileId: 'alpha-100' })
    expect(boardOf(store).usedTileIds).toEqual([])
  })

  it('undoing the prompt reveal restores the selected stage', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(undo)
    expect(boardOf(store).progress).toEqual({ stage: 'selected', selectedTileId: 'alpha-100' })
  })

  it('undoing the selection restores the board stage', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(undo)
    expect(boardOf(store).progress).toEqual({ stage: 'board', selectedTileId: null })
  })

  it('undoing the whole sequence returns the board to untouched', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch(returnToBoard())
    for (let i = 0; i < 4; i += 1) store.dispatch(undo)
    expect(boardOf(store).progress).toEqual({ stage: 'board', selectedTileId: null })
    expect(boardOf(store).usedTileIds).toEqual([])
  })

  it('undo never deletes history — it appends auditable markers', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    const before = store.getHistory().length
    store.dispatch(undo)
    expect(store.getHistory()).toHaveLength(before + 1)
    expect(store.getHistory().at(-1)?.type).toBe('EVENT_UNDONE')
    expect(store.getState().revision).toBe(before + 1)
  })

  it('undo does not corrupt an earlier completed tile', () => {
    const store = boardStore()
    // Complete beta-500 fully.
    store.dispatch(select('beta-500'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch(returnToBoard())
    // Start alpha-200 and undo back to the board.
    store.dispatch(select('alpha-200'))
    store.dispatch(revealPrompt())
    store.dispatch(undo)
    store.dispatch(undo)

    expect(boardOf(store).usedTileIds).toEqual(['beta-500'])
    expect(boardOf(store).progress.stage).toBe('board')
    expectRejected(store, select('beta-500'), 'tile-already-used')
  })
})

describe('replay is deterministic and derived only from events', () => {
  it('the same definition plus the same events yields the same state', () => {
    const store = boardStore()
    for (const command of [select('alpha-100'), revealPrompt(), revealAnswer(), returnToBoard()]) {
      store.dispatch(command)
    }
    const history = store.getHistory()
    expect(replay(history)).toEqual(replay(history))
    expect(replay(history)).toEqual(store.getState())
  })

  it('replay is idempotent when run repeatedly on a growing history', () => {
    const store = boardStore()
    const snapshots: PrivateState[] = []
    for (const command of [select('beta-100'), revealPrompt(), revealAnswer()]) {
      store.dispatch(command)
      snapshots.push(replay(store.getHistory()))
    }
    expect(snapshots.at(-1)).toEqual(replay(store.getHistory()))
  })

  it('derives used tiles ONLY from effective events — an undone reveal leaves none', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch(undo)

    const derived = replay(store.getHistory())
    const game = derived.session?.game
    expect(game && categoryBoardStateFor(game, ROUND).usedTileIds).toEqual([])
  })

  it('produces identical events for identical (state, history, command) triples', () => {
    const store = boardStore()
    const state = store.getState()
    const history = store.getHistory()
    const a = planCommand(state, history, select('alpha-100'))
    const b = planCommand(state, history, select('alpha-100'))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('emits no runtime-generated identity — ids and timestamps come from inputs', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    const event = store.getHistory().at(-1) as SessionEvent
    expect(event.id).toBe(`evt-${event.seq}`)
    expect(event.occurredAt).toBe(AT)
  })

  it('replay needs no registry — a fresh replay of a stored log reproduces the board', () => {
    const store = boardStore()
    store.dispatch(select('alpha-300'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    const history: readonly SessionEvent[] = JSON.parse(JSON.stringify(store.getHistory()))
    const replayed = replay(history)
    const game = replayed.session?.game
    expect(game && categoryBoardStateFor(game, ROUND).usedTileIds).toEqual(['alpha-300'])
    expect(game && categoryBoardStateFor(game, ROUND).progress.stage).toBe('answer')
  })
})

describe('round transitions', () => {
  const twoBoards = () => {
    const document = boardGameFile(richBoardConfig(), {
      rounds: [
        { id: 'board-a', type: 'category-board', title: 'A', config: richBoardConfig() },
        {
          id: 'board-b',
          type: 'category-board',
          title: 'B',
          config: { categories: [category('gamma', { tiles: [tile('gamma-100')] })] },
        },
      ],
    })
    const result = importGameFromUnknown(document)
    if (result.status !== 'success') throw new Error('fixture failed to import')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    return store
  }

  it('keeps each round board independent', () => {
    const store = twoBoards()
    store.dispatch(select('alpha-100', 'board-a'))
    store.dispatch(revealPrompt('board-a'))
    store.dispatch(revealAnswer('board-a'))
    store.dispatch(returnToBoard('board-a'))

    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expect(boardOf(store, 'board-b').usedTileIds).toEqual([])
    expect(boardOf(store, 'board-b').progress.stage).toBe('board')
  })

  it('RESUMES a board when the host returns to that round', () => {
    const store = twoBoards()
    store.dispatch(select('alpha-100', 'board-a'))
    store.dispatch(revealPrompt('board-a'))
    store.dispatch(revealAnswer('board-a'))

    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'board-a' })

    expect(boardOf(store, 'board-a').usedTileIds).toEqual(['alpha-100'])
    expect(boardOf(store, 'board-a').progress).toEqual({
      stage: 'answer',
      selectedTileId: 'alpha-100',
    })
  })

  it('rejects a command aimed at a round that is no longer current', () => {
    const store = twoBoards()
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expectRejected(store, select('alpha-100', 'board-a'), 'round-mismatch')
  })

  it('starts every board fresh when a new game is initialized', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: boardDefinition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expect(boardOf(store).usedTileIds).toEqual([])
    expect(boardOf(store).progress.stage).toBe('board')
  })
})

describe('revealing is not scoring', () => {
  /**
   * Slice 5 asserted here that NO scoring field existed at all. Slice 6 adds
   * scoring, so the durable claim this test protects is the one that still
   * matters: playing a tile end to end — select, prompt, answer — moves no
   * points and appends no score event on its own. A teacher must act
   * deliberately to award anything.
   */
  it('appends no score event and leaves scores untouched when a tile is played', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    store.dispatch(revealAnswer())

    const scoreEvents = store.getHistory().filter((event) => event.type === 'TEAM_SCORE_ADJUSTED')
    expect(scoreEvents).toHaveLength(0)
    // This fixture game configures no teams at all, so there is nothing to score.
    const game = store.getState().session?.game
    expect(game?.definition.teams).toEqual([])
    expect(game?.teamScores).toEqual({})
    expect(store.getPublicState().teams).toBeNull()
  })

  it('still adds no timer, buzzer or wager field to private state', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt())
    const serialized = JSON.stringify(store.getState())
    for (const forbidden of ['"timer"', '"wager"', '"buzzer"', '"countdown"']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
