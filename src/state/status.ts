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
