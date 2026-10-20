import { useState } from 'react'

/**
 * Run `clear` once whenever the class session changes, during render.
 *
 * "Reset this class session" starts a new class over the same append-only log.
 * It does not remount the Host and does not bump the store epoch, so a panel's
 * React state is the PREVIOUS class's unless something clears it (CBN-NEW-1).
 *
 * Most Host panels are simply keyed on the class session at their mount site,
 * which is the plainer answer. This hook is for the two input panels that cannot
 * be: they also own the teacher's DURABLE device setup — keyboard bindings,
 * controller mapping, receiver and handset evidence — which must survive a class
 * reset, because the handsets did not unpair when a new class walked in. They
 * clear only their per-class slices instead.
 *
 * Adjusting state during render is React's documented answer for this, and the
 * right one here: both panels render their per-class slice into an `aria-live`
 * region, so clearing in an effect would let a screen reader announce the
 * previous class's buzz before the clear landed. A render-phase update re-renders
 * immediately, before committing, so nothing stale is painted or announced.
 *
 * That distinction is not just reasoning — `useClassSessionReset.test.tsx` pins
 * it by recording every COMMIT and asserting the previous class's value is never
 * among those after the change. An effect-based version of this hook fails it.
 *
 * `clear` must only call state setters. It is invoked during render, so it may
 * not dispatch, write storage, or call a parent callback.
 *
 * Omitting `classSessionId` (isolated panel tests, where there is only ever one
 * class) never fires: the guard is seeded from the prop at mount.
 */
export function useClassSessionReset(
  classSessionId: string | null | undefined,
  clear: () => void,
): void {
  const [seenSessionId, setSeenSessionId] = useState(classSessionId)
  if (seenSessionId !== classSessionId) {
    // What matters is that the guard is set at all, so the immediate re-render
    // this schedules is a no-op. The ORDER of these two does not matter: both
    // queue in the same pass and both apply before that re-render. (A reviewer
    // ran the swapped form to check — it behaves identically. The earlier
    // comment here claimed the order was load-bearing, which was wrong.)
    setSeenSessionId(classSessionId)
    clear()
  }
}
