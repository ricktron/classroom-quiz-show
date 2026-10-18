import { describe, expect, it } from 'vitest'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { findUndoTarget, responsePhaseFor } from './reducer'
import { undoLabelFor } from '../host/liveUndo'

/**
 * FRC-4 — after start timer → disarm → expiry, what does ONE "Undo disarm clue"
 * actually do?
 *
 * The previous campaign reported "one Undo produces no visible effect" and left
 * it unverified. Adjudicated here as EXPECTED, and pinned so the contract cannot
 * drift: the Undo has a truthful reversible target, reverses a genuine teacher
 * action, and advances the teacher-visible Undo label — but the clue stays
 * closed, because RESPONSE_TIMER_EXPIRED is an irreversible clock fact (CBN-2)
 * that independently disarms (reducer `RESPONSE_TIMER_EXPIRED`). Latest-only
 * Undo (ADR-002) is unchanged: the teacher's second press reaches the timer
 * start and really does reopen the clue.
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

    // The press IS acknowledged on the Host: the one control the teacher used
    // now names the next thing it would reverse. This is the visible effect the
    // previous report said was absent.
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

  it('never re-expires the window after the timer start is undone (CBN-2 holds)', () => {
    const store = boardStoreAtExpiredAfterDisarm()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 60_000 })
    store.dispatch({ type: 'UNDO', issuedAt: AT + 61_000 })
    const expiredAgain = store
      .getHistory()
      .filter((event) => event.type === 'RESPONSE_TIMER_EXPIRED')
    // The original expiry stays in history as an observed fact; no new one.
    expect(expiredAgain).toHaveLength(1)
    expect(phase(store).timer.status).toBe('idle')
  })
})
