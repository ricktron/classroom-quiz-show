/**
 * Host-private Welcome-back orientation after Home Resume arrival.
 *
 * Ephemeral UI only — never Session/schema/localStorage/PublicState/URL.
 * Copy reads live Session + Slice A posture facts (Map D).
 */

export const HOST_RESUME_WELCOME_PREFIX = 'Welcome back' as const

export interface HostResumeWelcomeFacts {
  /** Session game title when a Game is loaded; null → generic fallback. */
  readonly gameTitle: string | null
  /** Hydrated Slice A play posture (`playReady`). */
  readonly playReady: boolean
  /** Host identity round line when play + round selected; else null. */
  readonly roundLabel: string | null
  /** Whether every team has a Session name (setup residual). */
  readonly namesComplete: boolean
}

/**
 * Compose one Host-private Welcome-back line from live facts.
 * Title and round are included when applicable so orientation matches chrome.
 */
export function hostResumeWelcomeCopy(facts: HostResumeWelcomeFacts): string {
  if (!facts.gameTitle) {
    return HOST_RESUME_WELCOME_PREFIX
  }
  if (facts.playReady) {
    if (facts.roundLabel) {
      return `${HOST_RESUME_WELCOME_PREFIX} — ${facts.gameTitle} · ${facts.roundLabel} · scores kept`
    }
    return `${HOST_RESUME_WELCOME_PREFIX} — ${facts.gameTitle} · scores kept`
  }
  if (!facts.namesComplete) {
    return `${HOST_RESUME_WELCOME_PREFIX} — ${facts.gameTitle} · finish team names`
  }
  return `${HOST_RESUME_WELCOME_PREFIX} — ${facts.gameTitle} · class setup`
}
