/**
 * Historian-grade Final / completion Display snapshots for the S05 visual
 * atlas. Built through the real Final command path + sanitizer — not hand-built
 * public DTOs — so captures match classroom-reachable projector state.
 */

import type { PublicState } from '../state/publicState'
import type { SessionStore } from '../state/store'
import {
  AT,
  FINAL_ROUND_ID,
  finalStore,
  playToReveal,
  settleAll,
} from './finalWagerFixtures'

function asReady(store: SessionStore, revision: number): PublicState {
  const state = store.getPublicState()
  return {
    ...state,
    revision,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
  }
}

/** Final setup after SELECT_ROUND (before BEGIN_FINAL_WAGER). */
export function visualHistoryFinalSetupSnapshot(revision = 300): PublicState {
  return asReady(finalStore({ scores: { red: 400, blue: 200 } }), revision)
}

/** Classic Final wager-entry with two eligible teams. */
export function visualHistoryFinalWagerEntrySnapshot(revision = 301): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    mode: 'classic',
  })
  return asReady(store, revision)
}

/** Wagers locked — no prompt yet. */
export function visualHistoryFinalWagersLockedSnapshot(revision = 302): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    mode: 'classic',
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    wager: 100,
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'blue',
    wager: 50,
  })
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: FINAL_ROUND_ID })
  return asReady(store, revision)
}

/** Response window open — prompt public, answer still private. */
export function visualHistoryFinalResponseEntrySnapshot(revision = 303): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    mode: 'classic',
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    wager: 100,
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'blue',
    wager: 50,
  })
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: FINAL_ROUND_ID })
  store.dispatch({
    type: 'START_FINAL_RESPONSE_WINDOW',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    captureMode: 'exact-text',
  })
  return asReady(store, revision)
}

/** Responses locked — prompt public, still no answer. */
export function visualHistoryFinalResponsesLockedSnapshot(revision = 304): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    mode: 'classic',
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    wager: 100,
  })
  store.dispatch({
    type: 'RECORD_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'blue',
    wager: 50,
  })
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: FINAL_ROUND_ID })
  store.dispatch({
    type: 'START_FINAL_RESPONSE_WINDOW',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    captureMode: 'exact-text',
  })
  store.dispatch({
    type: 'RECORD_FINAL_RESPONSE',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    response: { kind: 'exact', text: 'red answer' },
  })
  store.dispatch({
    type: 'RECORD_FINAL_RESPONSE',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'blue',
    response: { kind: 'exact', text: 'blue answer' },
  })
  store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: FINAL_ROUND_ID })
  return asReady(store, revision)
}

/** Answer revealed — canonical answer public; team reveals not yet started. */
export function visualHistoryFinalAnswerRevealedSnapshot(revision = 305): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  return asReady(store, revision)
}

/** First team revealed, pending settlement. */
export function visualHistoryFinalTeamRevealPendingSnapshot(revision = 306): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  store.dispatch({
    type: 'REVEAL_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
  })
  return asReady(store, revision)
}

/** First team settled correct. */
export function visualHistoryFinalSettlementCorrectSnapshot(revision = 307): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  store.dispatch({
    type: 'REVEAL_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
  })
  store.dispatch({
    type: 'SETTLE_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    outcome: 'correct',
  })
  return asReady(store, revision)
}

/** First team settled incorrect. */
export function visualHistoryFinalSettlementIncorrectSnapshot(revision = 308): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  store.dispatch({
    type: 'REVEAL_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
  })
  store.dispatch({
    type: 'SETTLE_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    outcome: 'incorrect',
  })
  return asReady(store, revision)
}

/** First team settled no-response. */
export function visualHistoryFinalSettlementNoResponseSnapshot(revision = 309): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'no-response', blue: 'exact' },
  })
  store.dispatch({
    type: 'REVEAL_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
  })
  store.dispatch({
    type: 'SETTLE_FINAL_TEAM',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    teamId: 'red',
    outcome: 'no-response',
  })
  return asReady(store, revision)
}

/** Unique-leader resolution after both teams settled (not yet complete). */
export function visualHistoryFinalResolutionUniqueLeaderSnapshot(revision = 310): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  settleAll(store, { red: 'correct', blue: 'incorrect' })
  return asReady(store, revision)
}

/** Tied resolution — host must choose sudden death or accept tie. */
export function visualHistoryFinalResolutionTiedSnapshot(revision = 311): PublicState {
  const store = finalStore({ scores: { red: 200, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 0, blue: 0 },
    responses: { red: 'exact', blue: 'exact' },
  })
  settleAll(store, { red: 'incorrect', blue: 'incorrect' })
  return asReady(store, revision)
}

/** Sudden death after tied resolution. */
export function visualHistoryFinalSuddenDeathSnapshot(revision = 312): PublicState {
  const store = finalStore({ scores: { red: 200, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 0, blue: 0 },
    responses: { red: 'exact', blue: 'exact' },
  })
  settleAll(store, { red: 'incorrect', blue: 'incorrect' })
  store.dispatch({
    type: 'ENTER_FINAL_SUDDEN_DEATH',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
  })
  return asReady(store, revision)
}

/** Completed unique winner after END_GAME_SESSION. */
export function visualHistoryFinalCompleteWinnerSnapshot(revision = 313): PublicState {
  const store = finalStore({ scores: { red: 400, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 100, blue: 50 },
    responses: { red: 'exact', blue: 'exact' },
  })
  settleAll(store, { red: 'correct', blue: 'incorrect' })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
  return asReady(store, revision)
}

/** Completed tied finish. */
export function visualHistoryFinalCompleteTiedSnapshot(revision = 314): PublicState {
  const store = finalStore({ scores: { red: 200, blue: 200 } })
  playToReveal(store, {
    wagers: { red: 0, blue: 0 },
    responses: { red: 'exact', blue: 'exact' },
  })
  settleAll(store, { red: 'incorrect', blue: 'incorrect' })
  store.dispatch({
    type: 'ACCEPT_FINAL_TIED_FINISH',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
  })
  return asReady(store, revision)
}

/**
 * Generic safe completion: unique-leader outcome but teams unavailable so the
 * Display must not invent a winner name.
 */
export function visualHistoryFinalCompleteGenericSafeSnapshot(revision = 315): PublicState {
  const complete = visualHistoryFinalCompleteWinnerSnapshot(revision)
  return {
    ...complete,
    teams: { status: 'unavailable' },
  }
}
