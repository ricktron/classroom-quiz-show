import type { PublicStatusCode } from './status'

/**
 * EVENTS record *accepted facts* — things that actually happened, in order. The
 * append-only list of events IS the source of truth; the authoritative state is
 * derived by replaying them (see `reducer.ts`). Events are never edited in place.
 *
 * (Named `SessionEvent`, not `Event`, to avoid shadowing the DOM `Event` type.)
 *
 * Reversibility is an explicit, per-event property so that reversible and
 * irreversible behavior are distinguishable:
 *  - reversible events can be neutralized by an `EVENT_UNDONE` marker;
 *  - irreversible events (session init/reset, and undo markers themselves) can
 *    never be undone, which keeps a reset a hard baseline and prevents undoing
 *    an undo.
 */

export const EVENT_TYPES = [
  'SESSION_INITIALIZED',
  'PUBLIC_STATUS_SET',
  'SEQUENCE_ADVANCED',
  'WAITING_MARKED',
  'HOST_NOTE_SET',
  'EVENT_UNDONE',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

interface EventBase<T extends EventType> {
  /** Deterministic id: `evt-<seq>` where seq is the append index. */
  readonly id: string
  readonly type: T
  /** Monotonic append index (0-based), also used for audit ordering. */
  readonly seq: number
  /** Copied from the originating command's `issuedAt`; never re-derived. */
  readonly occurredAt: number
  /** Whether an UNDO may target this event. */
  readonly reversible: boolean
}

export interface SessionInitializedEvent extends EventBase<'SESSION_INITIALIZED'> {
  readonly reversible: false
  readonly sessionId: string
}

export interface PublicStatusSetEvent extends EventBase<'PUBLIC_STATUS_SET'> {
  readonly reversible: true
  readonly code: PublicStatusCode
}

export interface SequenceAdvancedEvent extends EventBase<'SEQUENCE_ADVANCED'> {
  readonly reversible: true
}

export interface WaitingMarkedEvent extends EventBase<'WAITING_MARKED'> {
  readonly reversible: true
}

export interface HostNoteSetEvent extends EventBase<'HOST_NOTE_SET'> {
  readonly reversible: true
  readonly note: string
}

/** Records that a prior reversible event was undone. Auditable; irreversible. */
export interface EventUndoneEvent extends EventBase<'EVENT_UNDONE'> {
  readonly reversible: false
  readonly targetEventId: string
}

export type SessionEvent =
  | SessionInitializedEvent
  | PublicStatusSetEvent
  | SequenceAdvancedEvent
  | WaitingMarkedEvent
  | HostNoteSetEvent
  | EventUndoneEvent
