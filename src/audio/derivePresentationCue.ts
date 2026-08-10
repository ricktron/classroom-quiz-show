/**
 * Pure presentation-cue derivation from authoritative accepted events.
 *
 * Cues are presentation meaning derived from already-accepted facts. This module
 * never dispatches commands, never mutates state, and never becomes evidence for
 * gameplay. Callers supply the authoritative private state *before* the event
 * was applied (typically via `replay(historyPrefix)`).
 */

import type { SessionEvent } from '../state/events'
import type { PrivateState } from '../state/privateState'
import { responsePhaseFor } from '../state/reducer'
import { activeRespondent } from '../game/timing/buzzQueue'
import type { PresentationCueId } from './presentationCueId'

/**
 * Derive at most one presentation cue for a single newly accepted event.
 *
 * Returns `null` when the event is cue-irrelevant (including undo markers,
 * rejected-path absences, Final no-response, waiting buzzes, deductions, and
 * manual corrections).
 */
export function derivePresentationCue(
  before: PrivateState,
  event: SessionEvent,
): PresentationCueId | null {
  switch (event.type) {
    case 'TEAM_BUZZED':
      return deriveActiveClaimFromBuzz(before, event.roundId, event.teamId)
    case 'ACTIVE_RESPONSE_RESOLVED':
      return deriveFromActiveResponseResolved(before, event)
    case 'TEAM_SCORE_ADJUSTED':
      return deriveFromScoreAdjusted(event)
    case 'FINAL_TEAM_SETTLED':
      return deriveFromFinalSettled(event)
    case 'RESPONSE_TIMER_EXPIRED':
    case 'FINAL_WAGER_WINDOW_EXPIRED':
    case 'FINAL_RESPONSE_WINDOW_EXPIRED':
      return 'timer-expired'
    case 'GAME_SESSION_ENDED':
      return deriveGameComplete(before)
    case 'EVENT_UNDONE':
      return null
    default:
      return null
  }
}

function deriveActiveClaimFromBuzz(
  before: PrivateState,
  roundId: string,
  teamId: string,
): PresentationCueId | null {
  const game = before.session?.game ?? null
  if (game === null) return null
  const phase = responsePhaseFor(game, roundId)
  // First accepted buzz that establishes the active respondent.
  if (activeRespondent(phase.queue) !== null) return null
  // After appendBuzz of an empty/exhausted-without-active queue, this team becomes active.
  // We do not need after-state: an accepted TEAM_BUZZED on an empty active slot is the claim.
  void teamId
  return 'active-claim'
}

function deriveFromActiveResponseResolved(
  before: PrivateState,
  event: Extract<SessionEvent, { type: 'ACTIVE_RESPONSE_RESOLVED' }>,
): PresentationCueId | null {
  if (event.resolution.kind === 'incorrect') {
    // Incorrect plus any queue promotion: incorrect only (no active-claim).
    return 'incorrect'
  }

  if (event.resolution.kind === 'passed') {
    const game = before.session?.game ?? null
    if (game === null) return null
    const phase = responsePhaseFor(game, event.roundId)
    const waitingCount = Math.max(0, phase.queue.order.length - phase.queue.resolvedCount - 1)
    // Pass that promotes a waiting team → active-claim. Pass that exhausts → silent.
    return waitingCount > 0 ? 'active-claim' : null
  }

  return null
}

function deriveFromScoreAdjusted(
  event: Extract<SessionEvent, { type: 'TEAM_SCORE_ADJUSTED' }>,
): PresentationCueId | null {
  if (event.delta <= 0) return null
  if (event.mode === 'full-credit' || event.mode === 'partial-credit') {
    return 'positive-award'
  }
  // deduction / manual-correction stay silent even when positive.
  return null
}

function deriveFromFinalSettled(
  event: Extract<SessionEvent, { type: 'FINAL_TEAM_SETTLED' }>,
): PresentationCueId | null {
  if (event.outcome === 'correct') return 'positive-award'
  if (event.outcome === 'incorrect') return 'incorrect'
  // Final no-response is deliberately silent (not acoustically "incorrect").
  return null
}

function deriveGameComplete(before: PrivateState): PresentationCueId | null {
  const lifecycle = before.session?.game?.gameLifecycle
  // Only a live transition into ended produces sound. Already-ended recovered
  // sessions never append a fresh GAME_SESSION_ENDED that matters here; if one
  // somehow appears while already ended, stay silent.
  if (lifecycle === 'ended') return null
  if (lifecycle !== 'active') return null
  return 'game-complete'
}

/**
 * Derive cues for a contiguous newly appended suffix, preserving event order.
 * Deduplicates by event `id` within the batch (defensive) and collapses multiple
 * `game-complete` emissions in one suffix to a single completion cue.
 */
export function derivePresentationCuesForAppendedEvents(
  historyBeforeAppend: readonly SessionEvent[],
  appended: readonly SessionEvent[],
  replay: (history: readonly SessionEvent[]) => PrivateState,
): readonly PresentationCueId[] {
  const cues: PresentationCueId[] = []
  const seenIds = new Set<string>()
  let prefix = historyBeforeAppend
  let emittedGameComplete = false

  for (const event of appended) {
    if (seenIds.has(event.id)) continue
    seenIds.add(event.id)
    const before = replay(prefix)
    const cue = derivePresentationCue(before, event)
    prefix = [...prefix, event]
    if (cue === null) continue
    if (cue === 'game-complete') {
      if (emittedGameComplete) continue
      emittedGameComplete = true
    }
    cues.push(cue)
  }

  return cues
}
