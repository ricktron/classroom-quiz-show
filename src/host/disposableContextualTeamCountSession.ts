/**
 * Fail-closed gate for Q1 Fix team-count contextual return.
 *
 * Host may `discardRecovery` for a direct Class Setup reload ONLY when the
 * interrupted Session is provably disposable. Meaningful Sessions (names,
 * scores, round/progress, gameplay, unknown events) must keep recoverability.
 *
 * No new Session event types, schema, PublicState, or persistence keys.
 */

import { MIN_TEAMS, MAX_TEAMS } from '../game/teams/limits'
import type { EventType, SessionEvent } from '../state/events'
import { replay } from '../state/reducer'
import {
  deriveHostPlayPosture,
  effectiveHistoryAfterLatestInit,
  latestEffectiveGameInitialized,
} from '../session/hostPlayPosture'

/** Only init baselines may accompany a disposable Fix-return Session. */
const DISPOSABLE_CONTEXTUAL_RETURN_EVENT_TYPES: ReadonlySet<EventType> = new Set([
  'SESSION_INITIALIZED',
  'GAME_INITIALIZED',
])

export type DisposableContextualTeamCountSessionInput = {
  readonly history: readonly SessionEvent[]
  /** `?play=` Game id the Fix Save is returning into. */
  readonly expectedPlayGameId: string | null
}

/**
 * True only when every disposable condition is proven. Unknown / future event
 * types, names, scores, round selection, gameplay, valid team counts, or Game
 * id mismatch → false (fail closed).
 */
export function isDisposableContextualTeamCountSession(
  input: DisposableContextualTeamCountSessionInput,
): boolean {
  const expectedPlayGameId = input.expectedPlayGameId
  if (expectedPlayGameId === null || expectedPlayGameId === '') return false
  if (input.history.length === 0) return false

  for (const event of input.history) {
    if (!DISPOSABLE_CONTEXTUAL_RETURN_EVENT_TYPES.has(event.type)) return false
  }

  const gameInit = latestEffectiveGameInitialized(input.history)
  if (gameInit === null || gameInit.type !== 'GAME_INITIALIZED') return false
  if (gameInit.definition.id !== expectedPlayGameId) return false

  const teamCount = gameInit.definition.teams.length
  if (teamCount >= MIN_TEAMS && teamCount <= MAX_TEAMS) return false

  const afterInit = effectiveHistoryAfterLatestInit(input.history)
  if (afterInit.length > 0) return false

  if (deriveHostPlayPosture({ history: input.history, canStartPlay: false })) {
    return false
  }

  const game = replay(input.history).session?.game ?? null
  if (game === null) return false
  if (game.definition.id !== expectedPlayGameId) return false
  if (game.gameLifecycle !== 'active') return false
  if (game.currentRoundIndex !== null) return false
  if (Object.keys(game.sessionTeamNames).length > 0) return false
  if (Object.values(game.teamScores).some((score) => score !== 0)) return false
  if (game.definition.teams.length >= MIN_TEAMS && game.definition.teams.length <= MAX_TEAMS) {
    return false
  }

  return true
}
