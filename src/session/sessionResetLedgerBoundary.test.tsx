import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TeamScoringPanel } from '../host/TeamScoringPanel'
import { createSessionStore, type DispatchResult, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { findUndoTarget } from '../state/reducer'
import { lastScoreChangeOf } from '../host/lastScoreChange'
import { deriveSessionSummaryV1 } from '../summary/deriveSessionSummary'
import { deriveCompetitiveProfileV1 } from '../summary/completedSummary/competitiveProfile'
import { FINAL_ROUND_ID, finalDefinition, playToReveal } from '../test/finalWagerFixtures'

/**
 * CBN-NEW-1 — the Reset / Session ledger boundary.
 *
 * "Reset this class session" starts a NEW class session over the SAME append-only
 * history: `FoundationControls` dispatches `INIT_SESSION` then `INITIALIZE_GAME`,
 * and the store never rewrites history (it cannot — `getState()` is by contract
 * `replay(getHistory())`).
 *
 * Replayed STATE is therefore already correct after a reset: `SESSION_INITIALIZED`
 * builds a brand-new `PrivateSessionState`, so scores, boards, timers, buzzes and
 * wagers all start clean. The defect lives entirely in the surfaces that ask the
 * history a question directly — "has this team already been awarded this tile?",
 * "what changed last?", "what does this class session's summary say?", "what would
 * Undo touch?" — because those read the WHOLE log and so answer for the previous
 * class as well as this one.
 *
 * These are the lower-layer detectors for that boundary. Each one is written
 * against an ordinary teacher-observable consequence, not against the helper that
 * fixes it, so it keeps proving the product claim if the implementation changes.
 *
 * `reloadOf` re-derives every claim from the full persisted history, which is
 * exactly what a reload hands back: `activeSession` persists the entire event
 * array, so a boundary enforced only in memory would not survive F5.
 */

const AT = 1_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

function importedDefinition() {
  const result = importGameFromUnknown(teamBoardGameFile(twoTeams()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

const definition = importedDefinition()

/** Start a class session on the fixture and open Round 1. */
function freshSession(sessionId: string): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** Open a tile to the answer stage — the state in which the presets are live. */
function openTile(store: SessionStore, tileId = TILE): void {
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND })
}

/** Award a tile's full value to a team, the ordinary way. */
function awardFull(store: SessionStore, teamId: string, tileId = TILE, value = 100): void {
  store.dispatch({
    type: 'ADJUST_TEAM_SCORE',
    issuedAt: AT,
    teamId,
    delta: value,
    mode: 'full-credit',
    source: { kind: 'category-board-tile', roundId: ROUND, tileId },
  })
}

/**
 * Exactly what the "Reset this class session" control dispatches
 * (`FoundationControls.tsx`): a new session id, then the same Game re-seeded.
 */
function resetClassSession(store: SessionStore, sessionId: string): void {
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition })
}

/** A store rehydrated from the persisted history — the reload path. */
function reloadOf(store: SessionStore): SessionStore {
  return createSessionStore({ initialHistory: store.getHistory() })
}

/**
 * Render the panel, select a scoring target the ordinary way, and read back
 * whether full credit is offered for the live tile.
 *
 * `dispatch` rejects everything on purpose: every claim here is about what the
 * panel DERIVES from history, so a detector that could score would be testing
 * its own side effects.
 */
function fullCreditEnabledFor(store: SessionStore, teamId: string): boolean {
  const inert = (): DispatchResult => ({ status: 'rejected', reason: 'malformed-command' })
  const view = render(
    <TeamScoringPanel
      dispatch={inert}
      game={store.getState().session!.game!}
      history={store.getHistory()}
    />,
  )
  try {
    fireEvent.click(screen.getByTestId(`tsp-target-${teamId}`))
    return !(screen.getByTestId('tsp-award-full') as HTMLButtonElement).disabled
  } finally {
    view.unmount()
  }
}

describe('Reset this class session — the score-ledger boundary', () => {
  it('re-enables full credit on a tile the PREVIOUS class already won', () => {
    const store = freshSession('period-1')
    openTile(store)
    awardFull(store, 'red')
    expect(fullCreditEnabledFor(store, 'red')).toBe(false)

    resetClassSession(store, 'period-2')
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    openTile(store)

    // The new class has won nothing. Full credit must be available to it.
    expect(fullCreditEnabledFor(store, 'red')).toBe(true)
  })

  it('still re-enables it after a reload, which replays the whole persisted log', () => {
    const store = freshSession('period-1')
    openTile(store)
    awardFull(store, 'red')
    resetClassSession(store, 'period-2')

    const reloaded = reloadOf(store)
    reloaded.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    openTile(reloaded)
    expect(fullCreditEnabledFor(reloaded, 'red')).toBe(true)
  })

  it('reports no last score change for a class that has not scored yet', () => {
    const store = freshSession('period-1')
    openTile(store)
    awardFull(store, 'red')
    expect(lastScoreChangeOf(store.getHistory())).not.toBeNull()

    resetClassSession(store, 'period-2')
    expect(lastScoreChangeOf(store.getHistory())).toBeNull()
    expect(lastScoreChangeOf(reloadOf(store).getHistory())).toBeNull()
  })

  it('offers Undo nothing from before the reset', () => {
    const store = freshSession('period-1')
    openTile(store)
    awardFull(store, 'red')
    const beforeReset = findUndoTarget(store.getHistory())
    expect(beforeReset?.type).toBe('TEAM_SCORE_ADJUSTED')

    resetClassSession(store, 'period-2')

    // Undo must not reach across the boundary into the previous class's events:
    // reversing one of those changes nothing a teacher can see, yet it spends the
    // Undo affordance and writes an EVENT_UNDONE marker against another class.
    //
    // The exact claim is NULL, not merely "not that one event": a reset session
    // holds only `SESSION_INITIALIZED` and `GAME_INITIALIZED`, both irreversible.
    // Asserting null also pins the cut's position — an implementation that cut at
    // the wrong index and returned a DIFFERENT pre-reset event would pass a
    // weaker check.
    expect(findUndoTarget(store.getHistory())).toBeNull()
    expect(findUndoTarget(reloadOf(store).getHistory())).toBeNull()

    // Once this class does something reversible, Undo targets THAT.
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    expect(findUndoTarget(store.getHistory())?.type).toBe('ROUND_ADVANCED')
  })

  it('still honours undo markers inside the current class session', () => {
    // The session cut must NARROW the effective log, never replace it: an event
    // this class already undid must stay uncounted.
    const store = freshSession('period-1')
    resetClassSession(store, 'period-2')
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    openTile(store)
    awardFull(store, 'red')
    expect(fullCreditEnabledFor(store, 'red')).toBe(false)

    store.dispatch({ type: 'UNDO', issuedAt: AT })
    expect(lastScoreChangeOf(store.getHistory())).toBeNull()
    expect(fullCreditEnabledFor(store, 'red')).toBe(true)
  })

  it('summarises the class that was actually played, not the one before it', () => {
    const store = freshSession('period-1')
    openTile(store)
    awardFull(store, 'red')
    awardFull(store, 'blue', TILE, -100)

    const resetAt = AT + 5_000
    store.dispatch({ type: 'INIT_SESSION', issuedAt: resetAt, sessionId: 'period-2' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: resetAt, definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: resetAt })
    openTile(store)
    awardFull(store, 'red')
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: resetAt + 1_000 })

    const result = deriveSessionSummaryV1(store.getHistory())
    expect(result.status).toBe('available')
    if (result.status !== 'available') return
    const summary = result.summary

    expect(summary.sessionId).toBe('period-2')
    // The new class started when it was reset, not when the first class started.
    expect(summary.recordedSessionStartAt).toBe(resetAt)
    // The derivation basis still describes the WHOLE log, as its contract says:
    // the window is what narrowed, not the meaning of these two counts. If this
    // reported the window instead, the pair would imply undone events that never
    // existed.
    expect(summary.derivationBasis.historyEventCount).toBe(store.getHistory().length)
    expect(summary.derivationBasis.effectiveEventCount).toBe(
      store.getHistory().filter((event) => event.type !== 'EVENT_UNDONE').length,
    )
    expect(summary.derivationBasis.effectiveEventCount).toBeGreaterThan(5)

    // One award in this class — not the three the log holds across both.
    expect(summary.scoreActivity.observed.scoreChangeCount).toBe(1)
    expect(summary.scoreActivity.observed.tileLinkedAdjustmentCount).toBe(1)
    const blue = summary.scoreActivity.observed.perTeam.find((team) => team.teamId === 'blue')
    expect(blue?.scoreChangeCount).toBe(0)
    expect(blue?.netDelta).toBe(0)
  })

  it('does not report the previous class\'s Final semantics for a class that never reached the Final', async () => {
    // A competitive profile's `finalSemantics` is compared field-for-field when
    // the Host decides whether two completed classes may be rolled up together.
    // Inheriting the previous class's Final semantics makes an honest class look
    // incompatible, and the ledger then quietly leaves it out of the cross-class
    // totals a teacher is reading.
    const definition = finalDefinition()
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'period-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 200,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: FINAL_ROUND_ID })

    // Period 1 runs its Final with deliberately NON-default semantics.
    playToReveal(store, { mode: 'inclusive', captureMode: 'host-only' })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })

    const first = await deriveCompetitiveProfileV1(store.getHistory())
    expect(first.status).toBe('available')
    if (first.status !== 'available') return
    expect(first.profile.finalSemantics).toEqual({
      presence: 'present',
      eligibilityMode: 'inclusive',
      responseCaptureMode: 'host-only',
    })

    // Reset, then a second class that ends WITHOUT ever reaching the Final.
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT + 1_000, sessionId: 'period-2' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1_000, definition })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 2_000 })

    const second = await deriveCompetitiveProfileV1(store.getHistory())
    expect(second.status).toBe('available')
    if (second.status !== 'available') return
    expect(second.profile.finalSemantics).toEqual({
      // The GAME still has a Final round; THIS class simply never played it.
      presence: 'present',
      eligibilityMode: 'unavailable',
      responseCaptureMode: 'unavailable',
    })
  })
})
