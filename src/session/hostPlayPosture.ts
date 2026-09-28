/**
 * Host play-posture derivation for MENUS Slice A.
 *
 * Preferred bounded hypothesis (Court §10 / plan Slice A): restore `playReady`
 * at hydration from effective event history + `canStartPlay`, without a new
 * Session event, schema field, or PublicState bit. Live Start / Back-to-setup
 * remain a React-local toggle.
 *
 * Residuals (accepted): Start with no gameplay → setup after reload (one click);
 * Back-then-reload → play when gameplay exists (names incomplete still play / L0).
 */

import type { EventType, SessionEvent } from '../state/events'
import { effectiveEvents } from '../state/reducer'
import type { PrivateGameState } from '../state/privateState'
import { sessionTeamNameFor } from '../state/reducer'
import { canStartPlay } from './classroomReadiness'
import { sessionTeamNamesAreUnique } from './teamNameSelection'

/** Event types that count as gameplay after the last game/session init cut. */
const HOST_PLAY_POSTURE_GAMEPLAY_TYPES: ReadonlySet<EventType> = new Set([
  'CURRENT_ROUND_SELECTED',
  'ROUND_ADVANCED',
  'CATEGORY_BOARD_TILE_SELECTED',
  'CATEGORY_BOARD_PROMPT_REVEALED',
  'CATEGORY_BOARD_ANSWER_REVEALED',
  'CATEGORY_BOARD_RETURNED',
  'TEAM_SCORE_ADJUSTED',
  'RESPONSE_PHASE_ARMED',
  'RESPONSE_PHASE_DISARMED',
  'RESPONSE_TIMER_STARTED',
  'RESPONSE_TIMER_PAUSED',
  'RESPONSE_TIMER_RESUMED',
  'RESPONSE_TIMER_INTERRUPTED',
  'RESPONSE_TIMER_EXPIRED',
  'RESPONSE_PHASE_RESET',
  'TEAM_BUZZED',
  'ACTIVE_RESPONSE_RESOLVED',
  'FINAL_WAGER_STARTED',
  'FINAL_WAGER_WINDOW_STARTED',
  'FINAL_WAGER_WINDOW_PAUSED',
  'FINAL_WAGER_WINDOW_RESUMED',
  'FINAL_WAGER_WINDOW_EXPIRED',
  'FINAL_TEAM_WAGER_RECORDED',
  'FINAL_WAGERS_LOCKED',
  'FINAL_RESPONSE_WINDOW_STARTED',
  'FINAL_RESPONSE_WINDOW_PAUSED',
  'FINAL_RESPONSE_WINDOW_RESUMED',
  'FINAL_RESPONSE_WINDOW_EXPIRED',
  'FINAL_TEAM_RESPONSE_RECORDED',
  'FINAL_RESPONSES_LOCKED',
  'FINAL_ANSWER_REVEALED',
  'FINAL_TEAM_REVEALED',
  'FINAL_TEAM_SETTLED',
  'FINAL_TIE_RESOLUTION_SELECTED',
  'GAME_SESSION_ENDED',
])

export function isHostPlayPostureGameplayEvent(type: EventType): boolean {
  return HOST_PLAY_POSTURE_GAMEPLAY_TYPES.has(type)
}

/**
 * Names + team-count gate used at hydration. Mirrors Class Setup `canStartPlay`
 * from Session-owned names on the loaded game (not React-local selection state).
 */
export function canStartPlayFromGame(game: PrivateGameState | null): boolean {
  if (game === null) return false
  const teams = game.definition.teams
  const names = teams.map((team) => sessionTeamNameFor(game, team.id))
  const namesAssigned = names.every((name) => typeof name === 'string')
  const namesUnique =
    namesAssigned && sessionTeamNamesAreUnique(names.filter((n): n is string => n !== null))
  return canStartPlay({
    teamCount: teams.length,
    namesAssigned,
    namesUnique,
    sonyReady: false,
    keyboardFallbackAvailable: true,
    displayOpen: false,
    audioUnderstood: false,
    audioMuted: false,
  })
}

/**
 * Pure hydration derivation. Empty history → caller keeps URL-seeded default
 * (bare `#/host` stays play; `?play=` stays setup).
 *
 * Gameplay after the init cut restores play even when names are incomplete
 * (L0 / mid-Final Resume). `canStartPlay` remains available to callers for
 * readiness UI; it does not gate hydration play restoration.
 */
export function deriveHostPlayPosture(input: {
  readonly history: readonly SessionEvent[]
  readonly canStartPlay: boolean
}): boolean {
  if (input.history.length === 0) return false
  const fx = effectiveEvents(input.history)
  let cutIdx = -1
  for (let i = fx.length - 1; i >= 0; i -= 1) {
    if (fx[i]?.type === 'GAME_INITIALIZED') {
      cutIdx = i
      break
    }
  }
  if (cutIdx < 0) {
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      if (fx[i]?.type === 'SESSION_INITIALIZED') {
        cutIdx = i
        break
      }
    }
  }
  const tail = cutIdx < 0 ? fx : fx.slice(cutIdx + 1)
  return tail.some((event) => isHostPlayPostureGameplayEvent(event.type))
}
