import { describe, expect, it } from 'vitest'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { findUndoTarget, responsePhaseFor } from './reducer'
import { undoLabelFor } from '../host/liveUndo'
import { deriveSessionSummaryV1 } from '../summary/deriveSessionSummary'

/**
 * FRC-4 — after start timer → disarm → expiry, what does ONE "Undo disarm clue"
 * actually do?
 *
 * The previous campaign reported "one Undo produces no visible effect" and left
 * it unverified.
 *
 * ENGINE VERDICT: EXPECTED. The Undo has a truthful reversible target and
 * reverses a genuine teacher action, but the clue stays closed because
 * RESPONSE_TIMER_EXPIRED is an irreversible clock fact (CBN-2) that
 * independently disarms (see the reducer's `RESPONSE_TIMER_EXPIRED` case). The
 * disarm-free replay genuinely ends disarmed, so this is not a masked bug.
 * Latest-only Undo (ADR-002) is unchanged: the teacher's second press reaches
 * the timer start and really does reopen the clue. That is what this file pins.
 *
 * USABILITY IS A SEPARATE VERDICT and is NOT settled here (EXECUTION-GUIDANCE
 * §6.1). An earlier version of this adjudication argued the press is
 * "acknowledged" because the Live Undo control re-labels itself, and folded
 * that into the engine verdict. An independent reviewer measured every Host
 * surface across one press and found the label is the ONLY teacher-visible
 * change — and that offering "Undo disarm clue" while the clue is already
 * disarmed and will stay disarmed collides with `CQS-UX-P08`'s first
 * consequence, "do not make an action look available when the system is already
 * in the resulting state". There is also no live region, so a screen-reader
 * user gets no announcement at all. Routed to docs/design rather than decided
 * in an engine test; the surface-inventory entry records it.
 */

const AT = 1_000_000
const ROUND = 'board-round'

function boardStoreAtExpiredAfterDisarm(): SessionStore {
  const imported = importGameFromUnknown(boardGameFile(richBoardConfig()))
  if (imported.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: ROUND,
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  const started = store.dispatch({
    type: 'START_RESPONSE_TIMER',
    issuedAt: AT,
    roundId: ROUND,
    durationSeconds: 30,
  })
  if (started.status !== 'accepted') throw new Error('timer fixture failed')
  store.dispatch({ type: 'DISARM_RESPONSE_PHASE', issuedAt: AT + 1_000, roundId: ROUND })
  const timer = responsePhaseFor(store.getState().session!.game!, ROUND).timer
  if (timer.status !== 'running') throw new Error('expected a running timer')
  store.dispatch({
    type: 'EXPIRE_RESPONSE_TIMER',
    issuedAt: timer.deadline,
    roundId: ROUND,
    timerId: timer.timerId,
    deadline: timer.deadline,
  })
  return store
}

const phase = (store: SessionStore) => responsePhaseFor(store.getState().session!.game!, ROUND)
const label = (store: SessionStore): string | null => {
  const target = findUndoTarget(store.getHistory())
  return target === null ? null : undoLabelFor(target, store.getState().session!.game!)
}

describe('board Undo after a disarm that an expiry already subsumed (FRC-4)', () => {
  it('offers the disarm as a truthful target, and the press is acknowledged', () => {
    const store = boardStoreAtExpiredAfterDisarm()
    expect(phase(store).armed).toBe(false)
    expect(phase(store).timer.status).toBe('expired')
    expect(label(store)).toBe('Undo disarm clue')

    const undo = store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })
    expect(undo.status).toBe('accepted')

    // The one teacher-visible change: the control the teacher used now names the
    // next thing it would reverse. Recorded as the observed fact — NOT as a
    // finding that this is sufficient acknowledgement, which is a UX verdict
    // routed to docs/design.
    expect(label(store)).toBe('Undo timer start')
  })

  it('leaves the clue closed, because the expiry disarmed it independently', () => {
    const store = boardStoreAtExpiredAfterDisarm()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })

    // Not a masked failure: replaying effective history without the disarm still
    // ends at `armed: false`, because RESPONSE_TIMER_EXPIRED disarms. Re-arming
    // here would reopen a window whose clock has already run out.
    expect(phase(store).armed).toBe(false)
    expect(phase(store).timer.status).toBe('expired')
  })

  it('lets a second Undo reach the timer start and really reopen the clue', () => {
    const store = boardStoreAtExpiredAfterDisarm()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })
    expect(label(store)).toBe('Undo timer start')

    store.dispatch({ type: 'UNDO', issuedAt: AT + 61_000 })

    // Latest-only Undo is intact and the teacher gets where they intended: the
    // timer start is neutralized, so no expiry applies and the clue is armed.
    expect(phase(store).timer.status).toBe('idle')
    expect(phase(store).armed).toBe(true)
    expect(label(store)).toBe('Undo arm clue')
  })

  it('leaves the original expiry in history as a fact after the start is undone', () => {
    const store = boardStoreAtExpiredAfterDisarm()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })
    store.dispatch({ type: 'UNDO', issuedAt: AT + 61_000 })
    const expiries = store
      .getHistory()
      .filter((event) => event.type === 'RESPONSE_TIMER_EXPIRED')
    /*
      Scope note, because the earlier version of this test over-claimed. It does
      NOT pin CBN-2's "exactly one effective expiry per countdown": that rule
      lives in the planner's three-way match (src/state/reducer.ts) and in the
      expiry hook (src/host/useResponseTimerExpiry.ts), and an independent
      reviewer deleted BOTH and watched all four detectors here stay green.
      Nothing re-dispatches to this pure store, so a re-expiry cannot arise in
      it. What this legitimately pins is narrower and still worth having: the
      irreversible expiry stays in history as an observed clock fact once the
      reversible start above it is neutralized, and the derived timer returns to
      idle rather than to a second expiry.
    */
    expect(expiries).toHaveLength(1)
    expect(expiries[0]!.reversible).toBe(false)
    expect(phase(store).timer.status).toBe('idle')
  })

  it('records a summary whose expiry count outlives the start it came from', () => {
    /*
      The residual this adjudication creates and must not leave unpinned. The
      two-press path above is what the verdict calls "the teacher gets where
      they intended" — and after it, the saved session summary reports one
      expiration and ZERO starts, because the start is reversible and dropped
      from effective history while the expiry is irreversible and stays.

      That conforms to the Summary V1 contract, which defines `observed` as
      counted directly from effective authoritative events — so it is a contract
      that permits an incoherent reading, not a contract violation. It is still a
      durable host record a teacher can open, so it is pinned here with its real
      numbers instead of being described in prose, and recorded as an owner
      decision about what `observed` should mean when an irreversible fact
      outlives its reversible cause.
    */
    const store = boardStoreAtExpiredAfterDisarm()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })
    store.dispatch({ type: 'UNDO', issuedAt: AT + 61_000 })
    // A summary exists only for a completed session.
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 70_000 })

    const result = deriveSessionSummaryV1(store.getHistory())
    expect(result.status).toBe('available')
    if (result.status !== 'available') throw new Error('expected an available summary')

    // Session-wide: one expiry counted, zero starts.
    expect(result.summary.timerActivity.observed.starts).toBe(0)
    expect(result.summary.timerActivity.observed.expirations).toBe(1)

    // And the same incoherence on the board round's own row.
    const boards = result.summary.categoryBoards
    expect(boards.kind).toBe('rounds')
    if (boards.kind !== 'rounds') throw new Error('expected a category-board section')
    const board = boards.rounds.find((round) => round.roundId === ROUND)
    expect(board).toBeDefined()
    expect(board!.observed.timerStarts).toBe(0)
    expect(board!.observed.timerExpirations).toBe(1)
  })
})
