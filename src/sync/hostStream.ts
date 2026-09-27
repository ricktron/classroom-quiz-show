/**
 * Opaque Host broadcast-stream identity (transport metadata).
 *
 * Distinct from game Session `sessionId`. One value is stable for a single Host
 * renderer broadcasting lifetime and changes when the Host process/tab remounts.
 */

export type CreateHostStreamId = () => string

let createHostStreamIdOverride: CreateHostStreamId | null = null

export function createHostStreamId(): string {
  if (createHostStreamIdOverride) return createHostStreamIdOverride()
  return crypto.randomUUID()
}

/** Test-only: inject deterministic stream ids. Pass `null` to restore production behavior. */
export function setCreateHostStreamIdForTests(override: CreateHostStreamId | null): void {
  createHostStreamIdOverride = override
}

const MAX_HOST_STREAM_ID_LENGTH = 128

export function isHostStreamId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_HOST_STREAM_ID_LENGTH
  )
}

export interface HostStreamRevisionCursor {
  readonly streamId: string | null
  readonly revision: number
  /** Host `sentAt` on the last accepted envelope (0 when unknown). */
  readonly sentAt: number
}

export interface HostStreamSnapshotMeta {
  readonly streamId: string
  readonly revision: number
  readonly sentAt: number
}

/**
 * Whether a decoded public-state envelope should advance the Display cursor.
 * Same stream: strictly increasing revision. Different stream: accept when the
 * envelope is not older than the last accepted `sentAt`, so a new Host lifetime
 * can continue a persisted high revision while late former-Host traffic is dropped.
 */
export function shouldAcceptHostStreamSnapshot(
  last: HostStreamRevisionCursor,
  incoming: HostStreamSnapshotMeta,
  rejectedStreamIds: ReadonlySet<string> = new Set(),
): boolean {
  if (!isHostStreamId(incoming.streamId) || !Number.isFinite(incoming.revision)) {
    return false
  }
  if (!Number.isFinite(incoming.sentAt)) return false
  if (rejectedStreamIds.has(incoming.streamId)) return false
  if (last.streamId === null) return true
  if (incoming.streamId === last.streamId) return incoming.revision > last.revision
  return incoming.sentAt >= last.sentAt
}
