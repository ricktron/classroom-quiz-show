import { isPublicState, type PublicState } from '../state/publicState'

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
export const SYNC_SCHEMA_VERSION = 1 as const
/** Same-origin channel name shared by host and display in one browser. */
export const SYNC_CHANNEL_NAME = 'classroom-quiz-show:sync' as const

/** Host → display: a full sanitized snapshot at a given revision. */
export interface PublicStateMessage {
  readonly type: 'public-state'
  readonly revision: number
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
      if (!isPublicState(message.payload)) {
        return { ok: false, reason: 'malformed-payload' }
      }
      return {
        ok: true,
        message: {
          type: 'public-state',
          revision: message.revision,
          payload: message.payload,
        },
      }
    }

    default:
      return { ok: false, reason: 'unknown-type' }
  }
}
