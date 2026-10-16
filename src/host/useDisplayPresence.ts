import { useEffect, useState } from 'react'
import { createDisplayPresenceTracker } from '../sync/displayPresence'

/**
 * Host-side: whether a Display is live on the public sync path (Court B CB-01).
 *
 * Independent of which document opened the Display, so a Host reload or a
 * Home → Host navigation still tells the teacher the truth about an
 * already-open Display.
 */
export function useDisplayPresence(): boolean {
  const [live, setLive] = useState(false)
  useEffect(() => {
    const tracker = createDisplayPresenceTracker({ onChange: setLive })
    return () => tracker.close()
  }, [])
  return live
}
