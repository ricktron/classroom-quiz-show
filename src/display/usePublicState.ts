import { useEffect, useState } from 'react'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'
import { createPublicStateReceiver } from '../sync/receiver'

/**
 * Display-side hook: subscribe to sanitized `PublicState` from the host.
 *
 * It imports ONLY the public state type and the receiver — never the private
 * state, the store, the reducer, or the sanitizer. The display starts from the
 * safe `INITIAL_PUBLIC_STATE` and only ever moves forward to a strictly-newer
 * valid snapshot, so at worst it shows the neutral waiting state (fail closed).
 * On unmount it tears the subscription down.
 *
 * It also carries the receiver's estimate of the host/display clock difference
 * (Slice 7), because a published deadline is an instant on the HOST's clock and
 * the countdown is drawn against this display's. The estimate is clamped by the
 * receiver, starts at zero, and is only ever an estimate — see ADR-007 §10.
 */
export interface PublicStateView {
  readonly state: PublicState
  /** Clamped host−display clock offset in ms. Positive: the host reads ahead. */
  readonly hostClockOffsetMs: number
}

export function usePublicState(): PublicStateView {
  const [state, setState] = useState<PublicState>(INITIAL_PUBLIC_STATE)
  const [hostClockOffsetMs, setHostClockOffsetMs] = useState(0)

  useEffect(() => {
    const receiver = createPublicStateReceiver({
      onState: setState,
      onClockOffset: setHostClockOffsetMs,
      initialRevision: INITIAL_PUBLIC_STATE.revision,
    })
    return () => receiver.close()
  }, [])

  return { state, hostClockOffsetMs }
}
