/**
 * Teacher-facing Final wager save acknowledgement.
 *
 * In-memory commitment (event → replay) is NOT the same as durable
 * acknowledgement. This helper is the only place that turns those two facts
 * into host copy, so "Saved" cannot appear before the active-session write.
 */

export interface ActiveSessionDurabilityView {
  /** Length of history last confirmed written to active-session storage. */
  readonly durableEventCount: number
  /** Length currently being written, or null when no write is in flight. */
  readonly pendingEventCount: number | null
  /** True when the latest attempted active-session write failed. */
  readonly failed: boolean
  /** False when local persistence cannot store recovery at all. */
  readonly storageAvailable: boolean
}

export const FULLY_DURABLE_SESSION: ActiveSessionDurabilityView = Object.freeze({
  durableEventCount: Number.POSITIVE_INFINITY,
  pendingEventCount: null,
  failed: false,
  storageAvailable: true,
})

export function isActiveSessionHistoryDurable(
  historyLength: number,
  durability: ActiveSessionDurabilityView,
): boolean {
  if (!durability.storageAvailable) return false
  if (durability.failed) return false
  if (durability.pendingEventCount !== null) return false
  return historyLength <= durability.durableEventCount
}

/**
 * Label for the per-team committed-wager status.
 * `committed` is the in-memory wager (gameplay authority); durability is separate.
 */
export function finalWagerCommitAcknowledgement(
  committed: number | null,
  historyLength: number,
  durability: ActiveSessionDurabilityView,
): string {
  if (committed === null) return 'Not saved yet'
  if (!durability.storageAvailable) {
    return 'On screen only — will not survive refresh'
  }
  if (durability.failed && historyLength > durability.durableEventCount) {
    return 'Could not save — try again'
  }
  if (!isActiveSessionHistoryDurable(historyLength, durability)) {
    return 'Saving…'
  }
  return `Saved: ${committed}`
}
