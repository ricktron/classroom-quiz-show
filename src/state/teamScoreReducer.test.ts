import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { effectiveEvents, planCommand, replay, teamScoreFor, type RejectionReason } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile, teamsList, twoTeams } from '../test/teamFixtures'
import {
  MAX_TEAM_SCORE,
  MIN_TEAM_SCORE,
  type ScoreAdjustmentMode,
  type ScoreSource,
} from '../game/teams/scoring'
import { placeholderRound } from '../game/roundDefinition'
import { createGameDefinition } from '../game/gameDefinition'
import { createTeamDefinitions } from '../game/teams/definition'

/**
 * Team scoring commands, events, replay and undo (Slice 6).
 *
 * The load-bearing claims proved here:
 *  - the command boundary — not the UI — enforces every domain rule;
 *  - a rejected command appends NO event and does not change the revision;
 *  - every score is DERIVED BY REPLAY, so undo restores the exact prior total and
 *    one team's undo cannot touch another's;
 *  - revealing and scoring are independent facts in both directions;
 *  - replay reads no clock, no random source and no registry.
 */

const AT = 1_000
const ROUND = 'board-round'

/** A trusted definition built through the real import pipeline. */
function definitionWith(teams: unknown = twoTeams()): GameDefinition {
  const result = importGameFromUnknown(teamBoardGameFile(teams))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

/** A store with a session, a team board game loaded, and its round selected. */
function teamStore(teams: unknown = twoTeams()): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definitionWith(teams) })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

const tileSource = (tileId: string, roundId = ROUND): ScoreSource => ({
  kind: 'category-board-tile',
  roundId,
  tileId,
})
const MANUAL: ScoreSource = { kind: 'manual' }

function adjust(
  teamId: string,
  delta: number,
  mode: ScoreAdjustmentMode,
  source: ScoreSource,
): SessionCommand {
  return { type: 'ADJUST_TEAM_SCORE', issuedAt: AT, teamId, delta, mode, source }
}

const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

function select(tileId: string, roundId = ROUND): SessionCommand {
  return { type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId, tileId }
}
const revealPrompt: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_PROMPT',
  issuedAt: AT,
  roundId: ROUND,
}
const revealAnswer: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_ANSWER',
  issuedAt: AT,
  roundId: ROUND,
}
const returnToBoard: SessionCommand = {
  type: 'RETURN_TO_CATEGORY_BOARD',
  issuedAt: AT,
  roundId: ROUND,
}

/** Open a tile all the way to the answer stage. `alpha-100` is worth 100. */
function openTileToAnswer(store: SessionStore, tileId = 'alpha-100'): SessionStore {
  store.dispatch(select(tileId))
  store.dispatch(revealPrompt)
  store.dispatch(revealAnswer)
  return store
}

function scoreOf(store: SessionStore, teamId: string): number {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return teamScoreFor(game, teamId)
}

/** Assert a command is rejected for a given reason AND changes nothing at all. */
function expectRejected(store: SessionStore, command: SessionCommand, reason: RejectionReason) {
  const revisionBefore = store.getState().revision
  const historyBefore = store.getHistory()
  const stateBefore = JSON.stringify(store.getState())
  const publicBefore = JSON.stringify(store.getPublicState())

  const result = store.dispatch(command)

  expect(result).toEqual({ status: 'rejected', reason })
  expect(store.getHistory()).toBe(historyBefore)
  expect(store.getState().revision).toBe(revisionBefore)
  expect(JSON.stringify(store.getState())).toBe(stateBefore)
  expect(JSON.stringify(store.getPublicState())).toBe(publicBefore)
}

describe('awarding and deducting a tile value', () => {
  it('awards the full effective value', () => {
    const store = openTileToAnswer(teamStore())
    expect(store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100'))).status).toBe(
      'accepted',
    )
    expect(scoreOf(store, 'red')).toBe(100)
    expect(scoreOf(store, 'blue')).toBe(0)
  })

  it('uses the MULTIPLIED effective value, exactly', () => {
    // alpha-300 is 300 × 2 = 600.
    const store = openTileToAnswer(teamStore(), 'alpha-300')
    expect(store.dispatch(adjust('red', 600, 'full-credit', tileSource('alpha-300'))).status).toBe(
      'accepted',
    )
    expect(scoreOf(store, 'red')).toBe(600)
  })

  it('rejects a full-credit amount that is not the effective value', () => {
    const store = openTileToAnswer(teamStore(), 'alpha-300')
    expectRejected(
      store,
      adjust('red', 300, 'full-credit', tileSource('alpha-300')),
      'score-amount-mismatch',
    )
  })

  it('deducts the full effective value', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', -100, 'deduction', tileSource('alpha-100')))
    expect(scoreOf(store, 'red')).toBe(-100)
  })

  it('rejects a deduction that is not the negated effective value', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 100, 'deduction', tileSource('alpha-100')),
      'score-amount-mismatch',
    )
  })

  it('applies positive partial credit within the tile value', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 50, 'partial-credit', tileSource('alpha-100')))
    expect(scoreOf(store, 'red')).toBe(50)
  })

  it('applies NEGATIVE partial credit within the tile value', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('blue', -25, 'partial-credit', tileSource('alpha-100')))
    expect(scoreOf(store, 'blue')).toBe(-25)
  })

  it('rejects partial credit larger than the tile value', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 101, 'partial-credit', tileSource('alpha-100')),
      'score-amount-mismatch',
    )
  })

  it('scores at the PROMPT stage too — a team may answer before the reveal', () => {
    const store = teamStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    expect(store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100'))).status).toBe(
      'accepted',
    )
  })
})

describe('manual correction', () => {
  it('applies a positive correction with no tile involved', () => {
    const store = teamStore()
    store.dispatch(adjust('red', 25, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(25)
  })

  it('applies a negative correction', () => {
    const store = teamStore()
    store.dispatch(adjust('red', -75, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(-75)
  })

  it('works at the BOARD stage, with no tile open at all', () => {
    const store = teamStore()
    expect(store.getState().session?.game?.categoryBoards).toEqual({})
    expect(store.dispatch(adjust('red', 10, 'manual-correction', MANUAL)).status).toBe('accepted')
  })

  it('works on a non-board round, so scoring is not board-specific', () => {
    const store = createSessionStore()
    const definition = createGameDefinition({
      id: 'g',
      title: 'G',
      rounds: [placeholderRound('r1', 'Round One')],
      teams: createTeamDefinitions(twoTeams()),
    })
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expect(store.dispatch(adjust('red', 30, 'manual-correction', MANUAL)).status).toBe('accepted')
    expect(scoreOf(store, 'red')).toBe(30)
  })

  it('rejects a manual correction that names a tile it did not use', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 25, 'manual-correction', tileSource('alpha-100')),
      'invalid-score-source',
    )
  })

  it('corrects an earlier mistake WITHOUT rewriting history', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    const historyAfterAward = store.getHistory()
    store.dispatch(adjust('red', -100, 'manual-correction', MANUAL))

    expect(scoreOf(store, 'red')).toBe(0)
    // The original award is still there, unedited: a correction is an addition.
    expect(store.getHistory().slice(0, historyAfterAward.length)).toEqual(historyAfterAward)
    const scoreEvents = store.getHistory().filter((e) => e.type === 'TEAM_SCORE_ADJUSTED')
    expect(scoreEvents).toHaveLength(2)
  })
})

describe('the command boundary rejects what the UI must not be trusted with', () => {
  it('rejects an unknown team', () => {
    const store = teamStore()
    expectRejected(store, adjust('green', 10, 'manual-correction', MANUAL), 'unknown-team')
  })

  it('rejects any scoring when the game configures no teams', () => {
    const store = createSessionStore()
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    if (result.status !== 'success') throw new Error('fixture failed')
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expectRejected(store, adjust('red', 10, 'manual-correction', MANUAL), 'no-teams-configured')
  })

  it('rejects a non-integer, NaN or Infinite delta', () => {
    const store = teamStore()
    for (const delta of [12.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expectRejected(store, adjust('red', delta, 'manual-correction', MANUAL), 'invalid-score-delta')
    }
  })

  it('rejects a zero delta', () => {
    const store = teamStore()
    expectRejected(store, adjust('red', 0, 'manual-correction', MANUAL), 'invalid-score-delta')
  })

  it('rejects a delta that is a numeric STRING — nothing is coerced', () => {
    const store = teamStore()
    expectRejected(
      store,
      adjust('red', '100' as unknown as number, 'manual-correction', MANUAL),
      'invalid-score-delta',
    )
  })

  it('rejects an out-of-range delta', () => {
    const store = teamStore()
    expectRejected(
      store,
      adjust('red', MAX_TEAM_SCORE + 1, 'manual-correction', MANUAL),
      'invalid-score-delta',
    )
  })

  it('rejects a resulting score above the maximum', () => {
    const store = teamStore()
    store.dispatch(adjust('red', MAX_TEAM_SCORE, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(MAX_TEAM_SCORE)
    expectRejected(store, adjust('red', 1, 'manual-correction', MANUAL), 'score-out-of-range')
  })

  it('rejects a resulting score below the minimum', () => {
    const store = teamStore()
    store.dispatch(adjust('red', MIN_TEAM_SCORE, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(MIN_TEAM_SCORE)
    expectRejected(store, adjust('red', -1, 'manual-correction', MANUAL), 'score-out-of-range')
  })

  it('rejects an unknown mode and an unknown source shape', () => {
    const store = teamStore()
    expectRejected(
      store,
      adjust('red', 10, 'bonus' as ScoreAdjustmentMode, MANUAL),
      'malformed-command',
    )
    expectRejected(
      store,
      adjust('red', 10, 'manual-correction', { kind: 'guess' } as unknown as ScoreSource),
      'malformed-command',
    )
  })

  it('rejects a tile mode with a manual source, and vice versa', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(store, adjust('red', 100, 'full-credit', MANUAL), 'invalid-score-source')
  })

  it('rejects a STALE round id', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 100, 'full-credit', tileSource('alpha-100', 'some-other-round')),
      'round-mismatch',
    )
  })

  it('rejects an unknown tile id', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 100, 'full-credit', tileSource('no-such-tile')),
      'unknown-tile',
    )
  })

  it('rejects a tile that exists but is not the open one', () => {
    const store = openTileToAnswer(teamStore())
    expectRejected(
      store,
      adjust('red', 200, 'full-credit', tileSource('alpha-200')),
      'tile-mismatch',
    )
  })

  it('rejects a tile preset at the BOARD stage — nothing is open', () => {
    const store = teamStore()
    expectRejected(
      store,
      adjust('red', 100, 'full-credit', tileSource('alpha-100')),
      'invalid-board-stage',
    )
  })

  it('rejects a tile preset at the SELECTED stage — the class has not seen it', () => {
    const store = teamStore()
    store.dispatch(select('alpha-100'))
    expectRejected(
      store,
      adjust('red', 100, 'full-credit', tileSource('alpha-100')),
      'invalid-board-stage',
    )
  })

  it('rejects a STALE tile control after the host returns to the board', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(returnToBoard)
    expectRejected(
      store,
      adjust('red', 100, 'full-credit', tileSource('alpha-100')),
      'invalid-board-stage',
    )
  })

  it('rejects scoring before a session or a game exists', () => {
    const empty = createSessionStore()
    expectRejected(
      empty,
      adjust('red', 10, 'manual-correction', MANUAL),
      'session-not-initialized',
    )
    empty.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    expectRejected(empty, adjust('red', 10, 'manual-correction', MANUAL), 'game-not-initialized')
  })

  it('rejects scoring after the game has ended', () => {
    const store = teamStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expectRejected(store, adjust('red', 10, 'manual-correction', MANUAL), 'game-already-ended')
  })

  it('rejects a blank team id', () => {
    const store = teamStore()
    expectRejected(store, adjust('', 10, 'manual-correction', MANUAL), 'malformed-command')
  })
})

describe('event provenance', () => {
  it('records team, signed delta, mode and the exact tile source', () => {
    const store = openTileToAnswer(teamStore(), 'alpha-300')
    store.dispatch(adjust('blue', 600, 'full-credit', tileSource('alpha-300')))
    const event = store.getHistory().at(-1)
    expect(event).toMatchObject({
      type: 'TEAM_SCORE_ADJUSTED',
      reversible: true,
      teamId: 'blue',
      delta: 600,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-300' },
    })
  })

  it('does NOT freeze a resulting total onto the event', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    const event = store.getHistory().at(-1)
    expect(event).not.toHaveProperty('resultingScore')
    expect(event).not.toHaveProperty('score')
    expect(event).not.toHaveProperty('total')
  })

  it('records each mode distinctly, so a bare integer never loses the reason', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('blue', -100, 'deduction', tileSource('alpha-100')))
    store.dispatch(adjust('red', 25, 'partial-credit', tileSource('alpha-100')))
    store.dispatch(adjust('blue', -5, 'manual-correction', MANUAL))
    const modes = store
      .getHistory()
      .filter((event) => event.type === 'TEAM_SCORE_ADJUSTED')
      .map((event) => (event as { mode: string }).mode)
    expect(modes).toEqual(['full-credit', 'deduction', 'partial-credit', 'manual-correction'])
  })

  it('does not alias a caller source object that is mutated afterwards', () => {
    const store = openTileToAnswer(teamStore())
    const source = { kind: 'category-board-tile' as const, roundId: ROUND, tileId: 'alpha-100' }
    store.dispatch(adjust('red', 100, 'full-credit', source))
    ;(source as { tileId: string }).tileId = 'alpha-200'
    const event = store.getHistory().at(-1) as { source: { tileId: string } }
    expect(event.source.tileId).toBe('alpha-100')
  })

  it('carries no free-text note anywhere in the payload', () => {
    const store = teamStore()
    store.dispatch(adjust('red', 10, 'manual-correction', MANUAL))
    const serialized = JSON.stringify(store.getHistory().at(-1))
    expect(serialized).not.toContain('note')
    expect(serialized).not.toContain('reasonText')
  })
})

describe('replay determinism', () => {
  it('accumulates multiple adjustments in order', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', 50, 'partial-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', -30, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(120)
  })

  it('keeps teams independent', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('blue', -100, 'deduction', tileSource('alpha-100')))
    expect(scoreOf(store, 'red')).toBe(100)
    expect(scoreOf(store, 'blue')).toBe(-100)
  })

  it('lets several teams be scored deliberately for ONE tile', () => {
    const store = openTileToAnswer(teamStore(teamsList(4)))
    for (const id of ['t1', 't2', 't3', 't4']) {
      expect(store.dispatch(adjust(id, 25, 'partial-credit', tileSource('alpha-100'))).status).toBe(
        'accepted',
      )
    }
    expect(['t1', 't2', 't3', 't4'].map((id) => scoreOf(store, id))).toEqual([25, 25, 25, 25])
  })

  it('replays the same history to the same scores, every time', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('blue', -25, 'partial-credit', tileSource('alpha-100')))
    const history = store.getHistory()

    const first = replay(history)
    const second = replay(history)
    expect(first).toEqual(second)
    expect(first).toEqual(store.getState())
    expect(first.session?.game?.teamScores).toEqual({ red: 100, blue: -25 })
  })

  it('replays a negative total correctly', () => {
    const store = teamStore()
    store.dispatch(adjust('red', -400, 'manual-correction', MANUAL))
    expect(replay(store.getHistory()).session?.game?.teamScores).toEqual({ red: -400 })
  })

  it('records nothing for a team that has never been adjusted', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    const scores = store.getState().session?.game?.teamScores
    expect(scores).toEqual({ red: 100 })
    // "No entry" and "zero" are the same fact.
    expect(scoreOf(store, 'blue')).toBe(0)
  })

  it('is unaffected by the order commands were ISSUED at (no clock dependence)', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch({
      ...(adjust('red', 100, 'full-credit', tileSource('alpha-100')) as object),
      issuedAt: 99_999,
    } as SessionCommand)
    store.dispatch({
      ...(adjust('blue', 50, 'partial-credit', tileSource('alpha-100')) as object),
      issuedAt: 1,
    } as SessionCommand)
    expect(replay(store.getHistory()).session?.game?.teamScores).toEqual({ red: 100, blue: 50 })
  })

  it('fails SAFE on a stored event for a team the game does not have', () => {
    const store = openTileToAnswer(teamStore())
    const corrupt: SessionEvent = {
      id: 'evt-corrupt',
      type: 'TEAM_SCORE_ADJUSTED',
      seq: 99,
      occurredAt: AT,
      reversible: true,
      teamId: 'ghost',
      delta: 500,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    }
    const state = replay([...store.getHistory(), corrupt])
    expect(state.session?.game?.teamScores).toEqual({})
  })

  it('fails SAFE on a stored event that would leave the bounds, rather than clamping', () => {
    const store = teamStore()
    store.dispatch(adjust('red', MAX_TEAM_SCORE, 'manual-correction', MANUAL))
    const corrupt: SessionEvent = {
      id: 'evt-corrupt',
      type: 'TEAM_SCORE_ADJUSTED',
      seq: 99,
      occurredAt: AT,
      reversible: true,
      teamId: 'red',
      delta: 1_000,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    }
    const state = replay([...store.getHistory(), corrupt])
    expect(state.session?.game?.teamScores).toEqual({ red: MAX_TEAM_SCORE })
  })
})

describe('undo', () => {
  it('restores the exact prior score', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', 50, 'partial-credit', tileSource('alpha-100')))
    expect(scoreOf(store, 'red')).toBe(150)

    store.dispatch(undo)
    expect(scoreOf(store, 'red')).toBe(100)
    store.dispatch(undo)
    expect(scoreOf(store, 'red')).toBe(0)
  })

  it('does not touch another team', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('blue', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', 25, 'partial-credit', tileSource('alpha-100')))
    store.dispatch(undo)
    expect(scoreOf(store, 'red')).toBe(0)
    expect(scoreOf(store, 'blue')).toBe(100)
  })

  it('is auditable — the award stays in history, neutralized by a marker', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    const awardId = store.getHistory().at(-1)?.id
    store.dispatch(undo)

    const history = store.getHistory()
    expect(history.some((event) => event.id === awardId)).toBe(true)
    expect(history.at(-1)).toMatchObject({ type: 'EVENT_UNDONE', targetEventId: awardId })
    expect(effectiveEvents(history).some((event) => event.id === awardId)).toBe(false)
  })

  it('does NOT mark the tile unused, and does not un-reveal the answer', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(undo)

    const board = store.getState().session?.game?.categoryBoards[ROUND]
    expect(board?.usedTileIds).toEqual(['alpha-100'])
    expect(board?.progress.stage).toBe('answer')
    expect(scoreOf(store, 'red')).toBe(0)
  })

  it('undoing the ANSWER REVEAL leaves an independent score adjustment standing', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))

    // `UNDO` always targets the LATEST reversible event, so it cannot skip the
    // score to reach the reveal. Neutralize the reveal DIRECTLY at the replay
    // level, which is exactly the causal question: does removing the reveal drag
    // the score out with it?
    const history = store.getHistory()
    const reveal = history.find((event) => event.type === 'CATEGORY_BOARD_ANSWER_REVEALED')
    if (!reveal) throw new Error('no answer reveal in history')
    const marker: SessionEvent = {
      id: `evt-${history.length}`,
      type: 'EVENT_UNDONE',
      seq: history.length,
      occurredAt: AT,
      reversible: false,
      targetEventId: reveal.id,
    }
    const state = replay([...history, marker])

    // The tile is back on the board and the answer is no longer revealed …
    const board = state.session?.game?.categoryBoards[ROUND]
    expect(board?.usedTileIds).toEqual([])
    expect(board?.progress.stage).toBe('prompt')
    // … and the 100 points the team actually earned are untouched. There is no
    // causal invalidation: the two are independent facts (ADR-006 §9).
    expect(state.session?.game?.teamScores).toEqual({ red: 100 })
  })

  it('undoing the SCORE leaves the reveal and the used tile standing', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(undo)
    const board = store.getState().session?.game?.categoryBoards[ROUND]
    expect(board?.progress.stage).toBe('answer')
    expect(board?.usedTileIds).toEqual(['alpha-100'])
    expect(scoreOf(store, 'red')).toBe(0)
  })

  it('lets a correction be undone, restoring the corrected-away score', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', -100, 'manual-correction', MANUAL))
    expect(scoreOf(store, 'red')).toBe(0)
    store.dispatch(undo)
    expect(scoreOf(store, 'red')).toBe(100)
  })

  it('replays a compensating correction deterministically', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(adjust('red', -40, 'manual-correction', MANUAL))
    const history = store.getHistory()
    expect(replay(history).session?.game?.teamScores).toEqual({ red: 60 })
    expect(replay(history)).toEqual(replay(history))
  })
})

describe('score independence from the reveal lifecycle', () => {
  it('the reveal events themselves move no points', () => {
    const store = teamStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)
    store.dispatch(returnToBoard)
    expect(store.getState().session?.game?.teamScores).toEqual({})
    expect(store.getHistory().some((e) => e.type === 'TEAM_SCORE_ADJUSTED')).toBe(false)
  })

  it('returning to the board with NO score assigned is allowed', () => {
    const store = openTileToAnswer(teamStore())
    expect(store.dispatch(returnToBoard).status).toBe('accepted')
    expect(store.getState().session?.game?.teamScores).toEqual({})
    // The tile is still used: a question nobody answered is still spent.
    expect(store.getState().session?.game?.categoryBoards[ROUND].usedTileIds).toEqual([
      'alpha-100',
    ])
  })

  it('a score does not consume a tile, and the tile state is untouched by it', () => {
    const store = teamStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    const board = store.getState().session?.game?.categoryBoards[ROUND]
    // Still only the PROMPT stage; the tile is not used, because scoring is not
    // what consumes a tile — revealing the answer is.
    expect(board?.progress.stage).toBe('prompt')
    expect(board?.usedTileIds).toEqual([])
  })
})

describe('round transitions and game lifecycle', () => {
  it('preserves scores across a round change', () => {
    const result = importGameFromUnknown({
      ...teamBoardGameFile(),
      rounds: [
        { id: 'board-round', type: 'category-board', title: 'Board', config: richBoardConfig() },
        { id: 'r2', type: 'placeholder', title: 'Second', config: { note: 'n' } },
      ],
    })
    if (result.status !== 'success') throw new Error('fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    openTileToAnswer(store)
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))

    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expect(scoreOf(store, 'red')).toBe(100)
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'board-round' })
    expect(scoreOf(store, 'red')).toBe(100)
  })

  it('preserves scores when the game ENDS', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(scoreOf(store, 'red')).toBe(100)
  })

  it('RESETS every score when a genuinely new game is initialized', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    expect(scoreOf(store, 'red')).toBe(100)

    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definitionWith() })
    expect(store.getState().session?.game?.teamScores).toEqual({})
    expect(scoreOf(store, 'red')).toBe(0)
  })

  it('RESETS every score when the session is re-initialized', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's2' })
    expect(store.getState().session?.game).toBeNull()
  })
})

describe('planCommand purity', () => {
  it('never mutates its inputs', () => {
    const store = openTileToAnswer(teamStore())
    const state = store.getState()
    const history = store.getHistory()
    const stateBefore = JSON.stringify(state)
    const historyBefore = JSON.stringify(history)

    planCommand(state, history, adjust('red', 100, 'full-credit', tileSource('alpha-100')))

    expect(JSON.stringify(state)).toBe(stateBefore)
    expect(JSON.stringify(history)).toBe(historyBefore)
  })

  it('plans the same events for the same inputs', () => {
    const store = openTileToAnswer(teamStore())
    const command = adjust('red', 100, 'full-credit', tileSource('alpha-100'))
    const first = planCommand(store.getState(), store.getHistory(), command)
    const second = planCommand(store.getState(), store.getHistory(), command)
    expect(first).toEqual(second)
  })
})

describe('effectiveEvents', () => {
  it('excludes undo markers and everything they neutralized', () => {
    const store = openTileToAnswer(teamStore())
    store.dispatch(adjust('red', 100, 'full-credit', tileSource('alpha-100')))
    store.dispatch(undo)
    const effective = effectiveEvents(store.getHistory())
    expect(effective.some((event) => event.type === 'TEAM_SCORE_ADJUSTED')).toBe(false)
    expect(effective.some((event) => event.type === 'EVENT_UNDONE')).toBe(false)
    // The full history still holds both, for audit.
    expect(store.getHistory().some((event) => event.type === 'EVENT_UNDONE')).toBe(true)
  })
})

describe('teamScoreFor', () => {
  it('defaults to zero and never reads an inherited property', () => {
    const store = teamStore()
    const game = store.getState().session?.game
    if (!game) throw new Error('no game')
    expect(teamScoreFor(game, 'red')).toBe(0)
    expect(teamScoreFor(game, 'toString')).toBe(0)
    expect(teamScoreFor(game, 'constructor')).toBe(0)
  })
})
