import type { SessionEvent } from '../state/events'
import { effectiveEvents } from '../state/reducer'
import {
  deriveHostPlayPosture,
  effectiveHistoryAfterLatestInit,
  latestEffectiveGameInitialized,
} from '../session/hostPlayPosture'

export interface RecoveryBannerContext {
  readonly gameTitle: string | null
  readonly stageLabel: string | null
  readonly ageLabel: string | null
}

/**
 * Derive teacher-facing recovery banner details from the unfinished session
 * payload. Presentation only — no new durable fields.
 *
 * Stage uses the same effective-history / latest-init cut as Host play posture
 * (Slice A) so banner copy agrees with Resume landing.
 */
export function describeRecoveryBanner(
  events: readonly SessionEvent[],
  savedAt: number,
  nowMs: number = Date.now(),
): RecoveryBannerContext {
  const gameInit = latestEffectiveGameInitialized(events)
  const gameTitle =
    gameInit && gameInit.type === 'GAME_INITIALIZED'
      ? gameInit.definition.title.trim() || null
      : null

  const stageLabel = deriveStageLabel(events)
  const ageLabel = formatRelativeAge(savedAt, nowMs)

  return { gameTitle, stageLabel, ageLabel }
}

function deriveStageLabel(events: readonly SessionEvent[]): string | null {
  const fx = effectiveEvents(events)
  if (fx.length === 0) return null

  const tail = effectiveHistoryAfterLatestInit(events)
  if (tail.some((event) => event.type === 'GAME_SESSION_ENDED')) {
    return 'ended'
  }

  const hasGame = latestEffectiveGameInitialized(events) !== null
  if (!hasGame) {
    return fx.some((event) => event.type === 'SESSION_INITIALIZED')
      ? 'before game loaded'
      : null
  }

  const inPlay = deriveHostPlayPosture({ history: events, canStartPlay: false })
  return inPlay ? 'in play' : 'class setup'
}

function formatRelativeAge(savedAt: number, nowMs: number): string | null {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return null
  const deltaMs = Math.max(0, nowMs - savedAt)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatRecoveryHeading(
  baseHeading: string,
  context: RecoveryBannerContext,
): string {
  const parts: string[] = []
  if (context.gameTitle) parts.push(context.gameTitle)
  if (context.stageLabel) parts.push(context.stageLabel)
  if (context.ageLabel) parts.push(context.ageLabel)
  if (parts.length === 0) return baseHeading
  return `${baseHeading} — ${parts.join(' · ')}`
}
