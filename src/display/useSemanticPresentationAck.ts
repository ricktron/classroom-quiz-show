/**
 * Remount-safe presentation acknowledgement (buzz / board-outcome gold pattern).
 *
 * Durable snapshot ≠ just-happened event: the first observation of a semantic
 * identity seeds prior state without fabricating a transient acknowledgement.
 * Observed identity transitions may acknowledge when `shouldAcknowledge`
 * returns true. Hold duration matches buzz/outcome (~420ms).
 *
 * Local presentation lifecycle only — never PublicState, never persisted.
 */

import { useEffect, useRef, useState } from 'react'

/**
 * Hold the change marker slightly longer than `--dur-emphasized` (320ms).
 * Numeric constant on purpose — no runtime CSS-variable read.
 */
export const PRESENTATION_ACK_HOLD_MS = 420

export interface SemanticPresentationAckOptions {
  /**
   * Whether an observed identity transition should acknowledge.
   * Default: acknowledge whenever the next identity is non-null.
   */
  readonly shouldAcknowledge?: (
    previous: string | null,
    next: string | null,
  ) => boolean
  /**
   * When false, clear any in-flight acknowledgement (motion yield to
   * buzz / outcome / authoritative response surfaces).
   */
  readonly ownsMotion?: boolean
}

export interface SemanticPresentationAck {
  /** True after the first observation has seeded prior identity. */
  readonly seeded: boolean
  /** True while a transient acknowledgement hold is active and motion is owned. */
  readonly changed: boolean
}

/**
 * Track a local semantic presentation identity with remount-safe seed/ack.
 */
const defaultShouldAcknowledge = (_previous: string | null, next: string | null): boolean =>
  next !== null

export function useSemanticPresentationAck(
  semanticId: string | null,
  options: SemanticPresentationAckOptions = {},
): SemanticPresentationAck {
  const ownsMotion = options.ownsMotion !== false
  const shouldAcknowledgeRef = useRef(options.shouldAcknowledge ?? defaultShouldAcknowledge)
  shouldAcknowledgeRef.current = options.shouldAcknowledge ?? defaultShouldAcknowledge

  // `undefined` = unseeded. First observation seeds without acknowledging.
  const previousIdRef = useRef<string | null | undefined>(undefined)
  const [seeded, setSeeded] = useState(false)
  const [changed, setChanged] = useState(false)
  /** Bumps when a new identity transition should restart the hold timer. */
  const [ackEpoch, setAckEpoch] = useState(0)

  useEffect(() => {
    const previous = previousIdRef.current
    const shouldAcknowledge = shouldAcknowledgeRef.current

    // Catch-up / remount: seed prior semantic state; do not fabricate ack.
    if (previous === undefined) {
      previousIdRef.current = semanticId
      setSeeded(true)
      return
    }

    // Same semantic identity: keep in-flight ack unless motion ownership yields.
    if (previous === semanticId) {
      if (!ownsMotion) {
        setChanged(false)
      }
      return
    }

    previousIdRef.current = semanticId

    if (ownsMotion && shouldAcknowledge(previous, semanticId)) {
      setChanged(true)
      setAckEpoch((epoch) => epoch + 1)
      return
    }

    setChanged(false)
  }, [semanticId, ownsMotion])

  // Hold timer owns duration separately so unrelated prop refreshes never cancel,
  // and rapid identity changes restart from the new epoch.
  useEffect(() => {
    if (!changed) return
    const clearId = window.setTimeout(() => setChanged(false), PRESENTATION_ACK_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [changed, ackEpoch])

  // Visible ack requires both a lifecycle transition and current ownership.
  return { seeded, changed: changed && ownsMotion }
}
