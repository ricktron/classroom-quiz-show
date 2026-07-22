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
 */
export function usePublicState(): PublicState {
  const [state, setState] = useState<PublicState>(INITIAL_PUBLIC_STATE)

  useEffect(() => {
    const receiver = createPublicStateReceiver({
      onState: setState,
      initialRevision: INITIAL_PUBLIC_STATE.revision,
    })
    return () => receiver.close()
  }, [])

  return state
}
