import type { PublicPhase } from './publicState'

/**
 * Public status vocabulary (host-side).
 *
 * The host never publishes free-form text to the projector. Instead it sets a
 * bounded `PublicStatusCode`, and the sanitizer maps that code to fixed,
 * reviewed public copy. This means a host control cannot accidentally leak a
 * private string onto the display through the status channel — only one of these
 * known codes can ever be selected, and only this table decides what they say.
 *
 * This module is host-side (imported by the private state and the sanitizer). It
 * is intentionally NOT imported by the display, which only ever sees the already
 * resolved `headline`/`detail` in `PublicState`.
 */
export const PUBLIC_STATUS_CODES = [
  'waiting-for-host',
  'session-ready',
  'no-active-game',
] as const

export type PublicStatusCode = (typeof PUBLIC_STATUS_CODES)[number]

interface PublicStatusCopy {
  readonly headline: string
  readonly detail: string
}

/**
 * Fixed, projector-safe copy for each status code. None of these strings contain
 * host/answer/score terminology; they are the entire universe of text the status
 * channel can put on the display.
 */
export const PUBLIC_STATUS_COPY: Readonly<Record<PublicStatusCode, PublicStatusCopy>> = {
  'waiting-for-host': {
    headline: 'Waiting for the host',
    detail: 'No active round.',
  },
  'session-ready': {
    headline: 'Session ready',
    detail: 'Waiting for the first round.',
  },
  'no-active-game': {
    headline: 'No active game',
    detail: 'The host has not started a round.',
  },
}

/** Map a private status code to its coarse public phase. */
export const PUBLIC_STATUS_PHASE: Readonly<Record<PublicStatusCode, PublicPhase>> = {
  'waiting-for-host': 'waiting',
  'session-ready': 'ready',
  'no-active-game': 'waiting',
}

export function isPublicStatusCode(value: unknown): value is PublicStatusCode {
  return (
    typeof value === 'string' &&
    (PUBLIC_STATUS_CODES as readonly string[]).includes(value)
  )
}

/**
 * Coarse game lifecycle as the public status channel needs it (Q6-RP-1 / G2).
 *
 * `session-ready` used to project "Waiting for the first round." for the whole
 * game, because nothing on the ordinary path ever changed the status code. The
 * truthful detail is a pure function of authoritative game state, so the
 * sanitizer derives it instead of trusting a code that only diagnostics can set.
 */
export type PublicStatusLifecycle = 'before-first-round' | 'in-round' | 'ended'

/** Fixed, projector-safe detail for each lifecycle under `session-ready`. */
export const SESSION_READY_LIFECYCLE_DETAIL: Readonly<Record<PublicStatusLifecycle, string>> = {
  'before-first-round': PUBLIC_STATUS_COPY['session-ready'].detail,
  'in-round': 'Playing',
  ended: 'Game complete',
}

/**
 * Resolve public status copy for a code plus the authoritative lifecycle.
 *
 * Only the ordinary `session-ready` code is lifecycle-derived. The other codes
 * are explicit host overrides (Advanced diagnostics) and keep their fixed copy.
 */
export function resolvePublicStatusCopy(
  code: PublicStatusCode,
  lifecycle: PublicStatusLifecycle,
): PublicStatusCopy {
  const copy = PUBLIC_STATUS_COPY[code]
  if (code !== 'session-ready') return copy
  return { headline: copy.headline, detail: SESSION_READY_LIFECYCLE_DETAIL[lifecycle] }
}
