import { isPublicState, type PublicState } from '../state/publicState'
import { isInstant } from '../time/clock'

/**
 * Versioned synchronization envelope + fail-closed decoding.
 *
 * This module imports ONLY the public state (never private types), so the
 * display transport cannot pull private shapes in. The wire format is a tagged,
 * versioned envelope; the decoder is strict and total (never throws), returning
 * a discriminated result so callers can fail closed on any deviation:
 *   - not an object                → 'not-an-object'
 *   - wrong/absent protocol tag     → 'wrong-protocol'   (ignores foreign traffic)
 *   - unknown schema version        → 'unsupported-version'
 *   - unknown message type          → 'unknown-type'
 *   - structurally invalid payload  → 'malformed-payload'
 *
 * This is the third failure category (transport decode failure) from ADR-002.
 */

/** Magic tag so we ignore any BroadcastChannel traffic that isn't ours. */
export const SYNC_PROTOCOL = 'classroom-quiz-show/sync' as const
/**
 * Envelope version. Bumped 1 → 2 in Slice 7, when `public-state` gained the
 * required `sentAt` stamp (see {@link PublicStateMessage}). This is deliberately
 * a HARD break rather than an optional field that the receiver guesses at: a
 * version-1 sender would publish a deadline with no way to estimate the sending
 * clock, and silently treating "absent" as "no offset" is exactly the implicit
 * compatibility guessing ADR-004 refuses. A version-1 envelope is rejected with
 * `unsupported-version` and the display keeps its last safe state.
 */
export const SYNC_SCHEMA_VERSION = 2 as const
/** Same-origin channel name shared by host and display in one browser. */
export const SYNC_CHANNEL_NAME = 'classroom-quiz-show:sync' as const

/**
 * Host → display: a full sanitized snapshot at a given revision.
 *
 * `sentAt` is the host's clock reading at the moment the snapshot was posted. It
 * exists so a display can estimate the difference between its clock and the
 * host's before interpreting an absolute deadline — see `receiver.ts` and
 * ADR-007 §10. It is transport metadata, not state: it is stamped at the
 * broadcast edge, never stored, never replayed, and it never reaches the public
 * state a component renders.
 */
export interface PublicStateMessage {
  readonly type: 'public-state'
  readonly revision: number
  /** The host's wall clock when this envelope was posted (ms since the epoch). */
  readonly sentAt: number
  readonly payload: PublicState
}

/** Display → host: "I just opened/refreshed, please republish current state." */
export interface RequestStateMessage {
  readonly type: 'request-state'
}

export type SyncMessage = PublicStateMessage | RequestStateMessage

export interface SyncEnvelope {
  readonly protocol: typeof SYNC_PROTOCOL
  readonly schemaVersion: typeof SYNC_SCHEMA_VERSION
  readonly message: SyncMessage
}

export type DecodeFailureReason =
  | 'not-an-object'
  | 'wrong-protocol'
  | 'unsupported-version'
  | 'unknown-type'
  | 'malformed-payload'

export type DecodeResult =
  | { readonly ok: true; readonly message: SyncMessage }
  | { readonly ok: false; readonly reason: DecodeFailureReason }

/** Wrap a message in a fully-formed, current-version envelope. */
export function encodeEnvelope(message: SyncMessage): SyncEnvelope {
  return {
    protocol: SYNC_PROTOCOL,
    schemaVersion: SYNC_SCHEMA_VERSION,
    message,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Strict, total decoder. Never throws; always returns a `DecodeResult`. */
export function decodeEnvelope(raw: unknown): DecodeResult {
  if (!isRecord(raw)) return { ok: false, reason: 'not-an-object' }
  if (raw.protocol !== SYNC_PROTOCOL) return { ok: false, reason: 'wrong-protocol' }
  if (raw.schemaVersion !== SYNC_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-version' }
  }

  const message = raw.message
  if (!isRecord(message)) return { ok: false, reason: 'malformed-payload' }

  switch (message.type) {
    case 'request-state':
      return { ok: true, message: { type: 'request-state' } }

    case 'public-state': {
      if (typeof message.revision !== 'number' || !Number.isFinite(message.revision)) {
        return { ok: false, reason: 'malformed-payload' }
      }
      // An unusable stamp fails the whole envelope rather than being defaulted:
      // a fabricated `sentAt` would silently become a fabricated clock offset.
      if (!isInstant(message.sentAt)) {
        return { ok: false, reason: 'malformed-payload' }
      }
      if (!isPublicState(message.payload)) {
        return { ok: false, reason: 'malformed-payload' }
      }
      return {
        ok: true,
        message: {
          type: 'public-state',
          revision: message.revision,
          sentAt: message.sentAt,
          payload: message.payload,
        },
      }
    }

    default:
      return { ok: false, reason: 'unknown-type' }
  }
}
