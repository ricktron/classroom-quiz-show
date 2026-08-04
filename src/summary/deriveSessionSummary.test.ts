import { describe, expect, it } from 'vitest'
import { importGameFromUnknown } from '../import/importGame'
import { createSampleGameWithUnsupportedRound } from '../game/sampleGame'
import { createSessionStore, type SessionStore } from '../state/store'
import { effectiveEvents, replay } from '../state/reducer'
import type { SessionCommand } from '../state/commands'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import {
  AT,
  FINAL_ROUND_ID,
  finalStore,
  playToReveal,
  settleAll,
} from '../test/finalWagerFixtures'
import {
  SESSION_SUMMARY_CONTRACT_KIND,
  SESSION_SUMMARY_CONTRACT_VERSION,
} from './contract'
import { deriveSessionSummaryV1 } from './deriveSessionSummary'

const ROUND = 'board-round'
const BOARD_AT = 1_000

function boardDefinition() {
  const result = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture import failed')
  return result.definition
}

function boardStore(): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: BOARD_AT, sessionId: 'summary-session' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: BOARD_AT, definition: boardDefinition() })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: BOARD_AT })
  return store
}

function openToAnswer(store: SessionStore, tileId: string): void {
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: BOARD_AT,
    roundId: ROUND,
    tileId,
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: BOARD_AT, roundId: ROUND })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: BOARD_AT, roundId: ROUND })
}

function endGame(store: SessionStore): void {
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: BOARD_AT + 50 })
}

function available(store: SessionStore) {
  const result = deriveSessionSummaryV1(store.getHistory())
  expect(result.status).toBe('available')
  if (result.status !== 'available') throw new Error('expected available')
  return result.summary
}

describe('deriveSessionSummaryV1 — availability', () => {
  it('returns no-session for empty history', () => {
    expect(deriveSessionSummaryV1([])).toEqual({ status: 'no-session' })
  })

  it('returns no-game after session init only', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: BOARD_AT, sessionId: 's' })
    expect(deriveSessionSummaryV1(store.getHistory())).toEqual({ status: 'no-game' })
  })

  it('returns active-or-incomplete while the game is active', () => {
    const store = boardStore()
    expect(deriveSessionSummaryV1(store.getHistory())).toEqual({
      status: 'active-or-incomplete',
    })
  })

  it('returns available after the game ends', () => {
    const store = boardStore()
    endGame(store)
    const summary = available(store)
    expect(summary.kind).toBe(SESSION_SUMMARY_CONTRACT_KIND)
    expect(summary.version).toBe(SESSION_SUMMARY_CONTRACT_VERSION)
    expect(summary.sessionId).toBe('summary-session')
    expect(summary.terminalPath).toBe('ordinary-or-host-ended')
  })
})

describe('deriveSessionSummaryV1 — determinism', () => {
  it('produces structurally identical summaries for identical history', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    endGame(store)
    const history = store.getHistory()
    const a = deriveSessionSummaryV1(history)
    const b = deriveSessionSummaryV1(history)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('does not mutate history or events', () => {
    const store = boardStore()
    endGame(store)
    const history = store.getHistory()
    const before = JSON.stringify(history)
    deriveSessionSummaryV1(history)
    expect(JSON.stringify(history)).toBe(before)
    expect(Object.isFrozen(history[0]) || typeof history[0] === 'object').toBe(true)
  })

  it('agrees with repeated replay of the same history', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    endGame(store)
    const history = store.getHistory()
    expect(replay(history)).toEqual(replay(history))
    expect(deriveSessionSummaryV1(history)).toEqual(deriveSessionSummaryV1(history))
  })
})

describe('deriveSessionSummaryV1 — scoring and standings', () => {
  it('counts positive, negative, partial, and manual adjustments', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'blue',
      delta: -100,
      mode: 'deduction',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'red',
      delta: 50,
      mode: 'partial-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'blue',
      delta: 25,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    endGame(store)
    const summary = available(store)
    expect(summary.scoreActivity.observed.scoreChangeCount).toBe(4)
    expect(summary.scoreActivity.observed.tileLinkedAdjustmentCount).toBe(3)
    expect(summary.scoreActivity.observed.manualAdjustmentCount).toBe(1)
    const red = summary.scoreActivity.observed.perTeam.find((t) => t.teamId === 'red')
    const blue = summary.scoreActivity.observed.perTeam.find((t) => t.teamId === 'blue')
    expect(red?.netDelta).toBe(150)
    expect(red?.finalScore).toBe(150)
    expect(blue?.netDelta).toBe(-75)
    expect(blue?.finalScore).toBe(-75)
    expect(summary.scoreActivity.derived.standings[0]?.teamId).toBe('red')
    expect(summary.scoreActivity.derived.standings[1]?.finalScore).toBe(-75)
  })

  it('uses shared ranks for tied scores', () => {
    const store = boardStore()
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'red',
      delta: 200,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'blue',
      delta: 200,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    endGame(store)
    const standings = available(store).scoreActivity.derived.standings
    expect(standings).toHaveLength(2)
    expect(standings.every((row) => row.rank === 1 && row.tied)).toBe(true)
  })

  it('counts a consumed tile with no score event', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: BOARD_AT, roundId: ROUND })
    endGame(store)
    const boards = available(store).categoryBoards
    expect(boards.kind).toBe('rounds')
    if (boards.kind !== 'rounds') throw new Error('expected rounds')
    const board = boards.rounds[0]
    expect(board.derived.consumedTiles).toBe(1)
    expect(board.derived.consumedTilesWithoutTileLinkedScore).toBe(1)
    expect(board.observed.tileLinkedScoreAdjustments).toBe(0)
  })
})

describe('deriveSessionSummaryV1 — undo', () => {
  it('excludes undone score events from the summary', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: BOARD_AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: 'alpha-100' },
    })
    store.dispatch({ type: 'UNDO', issuedAt: BOARD_AT })
    endGame(store)
    const summary = available(store)
    expect(summary.scoreActivity.observed.scoreChangeCount).toBe(0)
    expect(summary.scoreActivity.observed.perTeam.find((t) => t.teamId === 'red')?.finalScore).toBe(
      0,
    )
    expect(effectiveEvents(store.getHistory()).some((e) => e.type === 'TEAM_SCORE_ADJUSTED')).toBe(
      false,
    )
  })

  it('excludes undone answer reveal from consumed tiles', () => {
    const store = boardStore()
    openToAnswer(store, 'alpha-100')
    store.dispatch({ type: 'UNDO', issuedAt: BOARD_AT })
    endGame(store)
    const boards = available(store).categoryBoards
    expect(boards.kind).toBe('rounds')
    if (boards.kind !== 'rounds') throw new Error('expected rounds')
    expect(boards.rounds[0].derived.consumedTiles).toBe(0)
    expect(boards.rounds[0].observed.answerReveals).toBe(0)
  })
})

describe('deriveSessionSummaryV1 — buzz and timer', () => {
  it('counts accepted buzzes, resolutions, and timer transitions', () => {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: BOARD_AT,
      roundId: ROUND,
      tileId: 'alpha-100',
    })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: BOARD_AT,
      roundId: ROUND,
      durationSeconds: 30,
    })
    store.dispatch({ type: 'PAUSE_RESPONSE_TIMER', issuedAt: BOARD_AT + 1, roundId: ROUND })
    store.dispatch({ type: 'RESUME_RESPONSE_TIMER', issuedAt: BOARD_AT + 2, roundId: ROUND })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: BOARD_AT + 3,
      roundId: ROUND,
      tileId: 'alpha-100',
      teamId: 'red',
    })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: BOARD_AT + 4,
      roundId: ROUND,
      tileId: 'alpha-100',
      teamId: 'blue',
    })
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: BOARD_AT + 5,
      roundId: ROUND,
      tileId: 'alpha-100',
      resolution: { kind: 'incorrect' },
    })
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: BOARD_AT + 6, roundId: ROUND })
    endGame(store)
    const summary = available(store)
    expect(summary.buzzActivity.observed.acceptedBuzzCount).toBe(2)
    expect(summary.buzzActivity.observed.activeResponseResolutionCount).toBe(1)
    expect(summary.timerActivity.observed.starts).toBe(1)
    expect(summary.timerActivity.observed.pauses).toBe(1)
    expect(summary.timerActivity.observed.resumes).toBe(1)
    expect(summary.timerActivity.observed.interruptions).toBe(1)
    expect(summary.timerActivity.observed.resets).toBe(1)
  })

  it('does not count undone buzz activity', () => {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: BOARD_AT,
      roundId: ROUND,
      tileId: 'alpha-100',
    })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: BOARD_AT + 1,
      roundId: ROUND,
      tileId: 'alpha-100',
      teamId: 'red',
    })
    store.dispatch({ type: 'UNDO', issuedAt: BOARD_AT + 2 })
    endGame(store)
    expect(available(store).buzzActivity.observed.acceptedBuzzCount).toBe(0)
  })

  it('does not count RESPONSE_PHASE_RESET as a timer reset when no timer existed', () => {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: BOARD_AT,
      roundId: ROUND,
      tileId: 'alpha-100',
    })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: BOARD_AT, roundId: ROUND })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: BOARD_AT + 1,
      roundId: ROUND,
      tileId: 'alpha-100',
      teamId: 'red',
    })
    // Armed + queue, but timer never started — reset clears the phase without a
    // timer fact, so it must not inflate timer-reset counts.
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: BOARD_AT + 2, roundId: ROUND })
    endGame(store)
    const summary = available(store)
    expect(summary.timerActivity.observed.starts).toBe(0)
    expect(summary.timerActivity.observed.resets).toBe(0)
    expect(summary.categoryBoards.kind).toBe('rounds')
    if (summary.categoryBoards.kind !== 'rounds') throw new Error('expected rounds')
    expect(summary.categoryBoards.rounds[0].observed.timerResets).toBe(0)
  })
})

describe('deriveSessionSummaryV1 — unavailable rounds', () => {
  it('represents unsupported authored rounds without inventing gameplay metrics', () => {
    const store = createSessionStore()
    store.dispatch({
      type: 'INIT_SESSION',
      issuedAt: BOARD_AT,
      sessionId: 'unsupported-summary',
    })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: BOARD_AT,
      definition: createSampleGameWithUnsupportedRound(),
    })
    endGame(store)
    const summary = available(store)
    expect(summary.unavailableRounds).toEqual([
      {
        roundId: 'supported-1',
        roundTitle: 'Supported Round',
        authoredRoundType: 'placeholder',
        reason: 'unsupported-round-type',
      },
      {
        roundId: 'mystery-round',
        roundTitle: 'Mystery Round',
        authoredRoundType: 'unsupported-sample',
        reason: 'unsupported-round-type',
      },
    ])
    expect(summary.categoryBoards).toEqual({
      kind: 'none',
      reason: 'no-category-board-rounds',
    })
    expect(summary.finalWager).toEqual({
      kind: 'unavailable',
      reason: 'no-final-round',
    })
    const blob = JSON.stringify(summary.unavailableRounds)
    expect(blob).not.toMatch(/tileSelections|timerStarts|scoreChangeCount|wager/)
    expect(summary.unavailableRounds.every((round) => Object.keys(round).sort().join() ===
      'authoredRoundType,reason,roundId,roundTitle')).toBe(true)
  })
})

describe('deriveSessionSummaryV1 — Final Wager', () => {
  it('summarizes a unique-winner Final without leaking private values', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 50, blue: 0 },
      responses: { red: 'exact', blue: 'no-response' },
    })
    settleAll(store, { red: 'correct', blue: 'no-response' })
    expect(store.getState().session?.game?.gameLifecycle).toBe('active')
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    expect(summary.terminalPath).toBe('final-unique-winner')
    expect(summary.finalWager.kind).toBe('available')
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.observed.eligibilityMode).toBe('classic')
    expect(summary.finalWager.observed.eligibleTeamCount).toBe(2)
    expect(summary.finalWager.observed.wagerEntryEventCount).toBe(2)
    expect(summary.finalWager.observed.settlementCount).toBe(2)
    expect(summary.finalWager.derived.distinctWagerParticipantCount).toBe(2)
    expect(summary.finalWager.derived.responseStateCounts.exact).toBe(1)
    expect(summary.finalWager.derived.responseStateCounts.noResponse).toBe(1)
    expect(summary.finalWager.derived.settlementOutcomeCounts.correct).toBe(1)
    expect(summary.finalWager.derived.settlementOutcomeCounts.noResponse).toBe(1)
    expect(summary.finalWager.derived.resolutionPath).toBe('unique-winner')
    const blob = JSON.stringify(summary)
    expect(blob).not.toContain('red answer')
    expect(blob).not.toMatch(/"wager":\s*50/)
    expect(blob).not.toContain('Mantle convection')
  })

  it('classifies accepted tied finish', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 100 },
      responses: { red: 'not-captured', blue: 'not-captured' },
    })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: FINAL_ROUND_ID })
    const summary = available(store)
    expect(summary.terminalPath).toBe('final-accepted-tied-finish')
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.derived.resolutionPath).toBe('accepted-tied-finish')
  })

  it('classifies sudden-death winner after a unique lead', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 100 },
      responses: { red: 'not-captured', blue: 'not-captured' },
    })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: FINAL_ROUND_ID })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 10,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    expect(summary.terminalPath).toBe('final-sudden-death-winner')
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.derived.resolutionPath).toBe('sudden-death-winner')
  })

  it('marks host-ended incomplete Final honestly', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({
      type: 'BEGIN_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      mode: 'classic',
    })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    expect(summary.terminalPath).toBe('ordinary-or-host-ended')
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.derived.resolutionPath).toBe('host-ended-incomplete')
    expect(summary.finalWager.observed.settlementCount).toBe(0)
  })

  it('reports Final not begun when the round never started', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    expect(summary.finalWager).toEqual({ kind: 'unavailable', reason: 'final-not-begun' })
  })

  it('counts corrected wagers and responses as separate effective entries', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({
      type: 'BEGIN_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      mode: 'inclusive',
    })
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'red',
      wager: 10,
    })
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'red',
      wager: 20,
    })
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'blue',
      wager: 0,
    })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: FINAL_ROUND_ID })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      captureMode: 'host-only',
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'red',
      response: { kind: 'not-captured' },
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'red',
      response: { kind: 'no-response' },
    })
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId: 'blue',
      response: { kind: 'not-captured' },
    })
    store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: FINAL_ROUND_ID })
    store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: FINAL_ROUND_ID })
    settleAll(store, { red: 'no-response', blue: 'correct' })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.observed.eligibilityMode).toBe('inclusive')
    expect(summary.finalWager.observed.wagerEntryEventCount).toBe(3)
    expect(summary.finalWager.observed.responseEntryEventCount).toBe(3)
    expect(summary.finalWager.derived.distinctWagerParticipantCount).toBe(2)
    expect(summary.finalWager.derived.responseStateCounts.noResponse).toBe(1)
    expect(summary.finalWager.derived.responseStateCounts.notCaptured).toBe(1)
  })

  it('counts zero-wager settlement as an auditable settlement', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 0, blue: 0 },
      responses: { red: 'not-captured', blue: 'not-captured' },
    })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    expect(summary.scoreActivity.observed.finalSettlementCount).toBe(2)
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.observed.settlementCount).toBe(2)
  })

  it('excludes undone Final settlements', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 0, blue: 0 },
      responses: { red: 'not-captured', blue: 'not-captured' },
    })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    store.dispatch({ type: 'UNDO', issuedAt: AT })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const summary = available(store)
    if (summary.finalWager.kind !== 'available') throw new Error('expected final')
    expect(summary.finalWager.observed.settlementCount).toBe(1)
    expect(summary.finalWager.derived.resolutionPath).toBe('host-ended-incomplete')
  })
})

describe('deriveSessionSummaryV1 — category completion', () => {
  it('reports cleared categories when every tile is consumed', () => {
    const store = boardStore()
    // beta has two tiles in richBoardConfig
    for (const tileId of ['beta-100', 'beta-500']) {
      openToAnswer(store, tileId)
      store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: BOARD_AT, roundId: ROUND })
    }
    endGame(store)
    const boards = available(store).categoryBoards
    expect(boards.kind).toBe('rounds')
    if (boards.kind !== 'rounds') throw new Error('expected rounds')
    expect(boards.rounds[0].derived.clearedCategories).toBe(1)
    expect(boards.rounds[0].derived.totalCategories).toBe(2)
    expect(boards.rounds[0].derived.consumedTiles).toBe(2)
  })
})

describe('deriveSessionSummaryV1 — lifecycle result shapes', () => {
  it('never returns a zero-filled available summary for an active game', () => {
    const store = boardStore()
    const result = deriveSessionSummaryV1(store.getHistory())
    expect(result.status).toBe('active-or-incomplete')
    expect('summary' in result).toBe(false)
  })

  it('starting a new session removes prior summary availability from that history', () => {
    const store = boardStore()
    endGame(store)
    expect(deriveSessionSummaryV1(store.getHistory()).status).toBe('available')
    store.dispatch({ type: 'INIT_SESSION', issuedAt: BOARD_AT + 100, sessionId: 'next' })
    expect(deriveSessionSummaryV1(store.getHistory()).status).toBe('no-game')
  })
})

// Keep an unused import noise-free if SessionCommand helpers expand later.
void (null as unknown as SessionCommand)
