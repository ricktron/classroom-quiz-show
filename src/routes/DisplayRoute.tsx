import { usePublicState } from '../display/usePublicState'
import { AudienceDisplayShell } from '../display/audience/AudienceDisplayShell'
import './DisplayRoute.css'

/**
 * Public projector display.
 *
 * This screen is student-facing and read-only. It subscribes to sanitized
 * `PublicState` broadcast by the host (same browser, BroadcastChannel) and
 * renders ONLY that — no controls, no navigation into the host, and no private
 * data. Slice 18 composes the audience display system from public DTOs via
 * `AudienceDisplayShell` and a pure presentation selector.
 *
 * It fails closed by construction: before any host message (and if every message
 * is invalid) it shows the neutral `INITIAL_PUBLIC_STATE` waiting screen, and it
 * only ever advances to a strictly-newer valid snapshot. See
 * docs/architecture/GAME-ENGINE-BOUNDARIES.md and ADR-002 / ADR-003.
 */

export function DisplayRoute() {
  const { state: publicState, hostClockOffsetMs } = usePublicState()

  return (
    <div className="display-route" data-testid="display-route">
      <AudienceDisplayShell
        publicState={publicState}
        hostClockOffsetMs={hostClockOffsetMs}
      />
    </div>
  )
}
