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

const LEAD_SCORES = { red: 400, blue: 200 } as const
const TIED_SCORES = { red: 200, blue: 200 } as const
const LEAD_WAGERS = { red: 100, blue: 50 } as const
const TIED_WAGERS = { red: 0, blue: 0 } as const
const EXACT_RESPONSES = { red: 'exact', blue: 'exact' } as const

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

function storeWithScores(scores: Readonly<Record<string, number>>): SessionStore {
  return finalStore({ scores })
}

function beginClassic(store: SessionStore): void {
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    mode: 'classic',
  })
}

function recordAndLockWagers(
  store: SessionStore,
  wagers: Readonly<Record<string, number>>,
): void {
  for (const [teamId, wager] of Object.entries(wagers)) {
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId,
      wager,
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: FINAL_ROUND_ID })
}

function openResponseWindow(store: SessionStore): void {
  store.dispatch({
    type: 'START_FINAL_RESPONSE_WINDOW',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
    captureMode: 'exact-text',
  })
}

function recordAndLockResponses(
  store: SessionStore,
  responses: Readonly<Record<string, 'exact' | 'not-captured' | 'no-response'>>,
): void {
  for (const [teamId, kind] of Object.entries(responses)) {
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: FINAL_ROUND_ID,
      teamId,
      response: kind === 'exact' ? { kind: 'exact', text: `${teamId} answer` } : { kind },
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: FINAL_ROUND_ID })
}

function playLeadToReveal(
  store: SessionStore,
  responses: Readonly<Record<string, 'exact' | 'not-captured' | 'no-response'>> = EXACT_RESPONSES,
): void {
  playToReveal(store, { wagers: LEAD_WAGERS, responses })
}

function playTiedToReveal(store: SessionStore): void {
  playToReveal(store, { wagers: TIED_WAGERS, responses: EXACT_RESPONSES })
}

function revealAndSettleFirst(
  store: SessionStore,
  outcome: 'correct' | 'incorrect' | 'no-response',
): void {
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
    outcome,
  })
}

function leadThroughSettlement(
  outcomes: Readonly<Record<string, 'correct' | 'incorrect' | 'no-response'>>,
): SessionStore {
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store)
  settleAll(store, outcomes)
  return store
}

function tiedThroughSettlement(): SessionStore {
  const store = storeWithScores(TIED_SCORES)
  playTiedToReveal(store)
  settleAll(store, { red: 'incorrect', blue: 'incorrect' })
  return store
}

/** Final setup after SELECT_ROUND (before BEGIN_FINAL_WAGER). */
export function visualHistoryFinalSetupSnapshot(revision = 300): PublicState {
  return asReady(storeWithScores(LEAD_SCORES), revision)
}

/** Classic Final wager-entry with two eligible teams. */
export function visualHistoryFinalWagerEntrySnapshot(revision = 301): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  beginClassic(store)
  return asReady(store, revision)
}

/** Wagers locked — no prompt yet. */
export function visualHistoryFinalWagersLockedSnapshot(revision = 302): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  beginClassic(store)
  recordAndLockWagers(store, LEAD_WAGERS)
  return asReady(store, revision)
}

/** Response window open — prompt public, answer still private. */
export function visualHistoryFinalResponseEntrySnapshot(revision = 303): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  beginClassic(store)
  recordAndLockWagers(store, LEAD_WAGERS)
  openResponseWindow(store)
  return asReady(store, revision)
}

/** Responses locked — prompt public, still no answer. */
export function visualHistoryFinalResponsesLockedSnapshot(revision = 304): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  beginClassic(store)
  recordAndLockWagers(store, LEAD_WAGERS)
  openResponseWindow(store)
  recordAndLockResponses(store, EXACT_RESPONSES)
  return asReady(store, revision)
}

/** Answer revealed — canonical answer public; team reveals not yet started. */
export function visualHistoryFinalAnswerRevealedSnapshot(revision = 305): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store)
  return asReady(store, revision)
}

/** First team revealed, pending settlement. */
export function visualHistoryFinalTeamRevealPendingSnapshot(revision = 306): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store)
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
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store)
  revealAndSettleFirst(store, 'correct')
  return asReady(store, revision)
}

/** First team settled incorrect. */
export function visualHistoryFinalSettlementIncorrectSnapshot(revision = 308): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store)
  revealAndSettleFirst(store, 'incorrect')
  return asReady(store, revision)
}

/** First team settled no-response. */
export function visualHistoryFinalSettlementNoResponseSnapshot(revision = 309): PublicState {
  const store = storeWithScores(LEAD_SCORES)
  playLeadToReveal(store, { red: 'no-response', blue: 'exact' })
  revealAndSettleFirst(store, 'no-response')
  return asReady(store, revision)
}

/** Unique-leader resolution after both teams settled (not yet complete). */
export function visualHistoryFinalResolutionUniqueLeaderSnapshot(revision = 310): PublicState {
  return asReady(leadThroughSettlement({ red: 'correct', blue: 'incorrect' }), revision)
}

/** Tied resolution — host must choose sudden death or accept tie. */
export function visualHistoryFinalResolutionTiedSnapshot(revision = 311): PublicState {
  return asReady(tiedThroughSettlement(), revision)
}

/** Sudden death after tied resolution. */
export function visualHistoryFinalSuddenDeathSnapshot(revision = 312): PublicState {
  const store = tiedThroughSettlement()
  store.dispatch({
    type: 'ENTER_FINAL_SUDDEN_DEATH',
    issuedAt: AT,
    roundId: FINAL_ROUND_ID,
  })
  return asReady(store, revision)
}

/** Completed unique winner after END_GAME_SESSION. */
export function visualHistoryFinalCompleteWinnerSnapshot(revision = 313): PublicState {
  const store = leadThroughSettlement({ red: 'correct', blue: 'incorrect' })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
  return asReady(store, revision)
}

/** Completed tied finish. */
export function visualHistoryFinalCompleteTiedSnapshot(revision = 314): PublicState {
  const store = tiedThroughSettlement()
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
  return {
    ...visualHistoryFinalCompleteWinnerSnapshot(revision),
    teams: { status: 'unavailable' },
  }
}
