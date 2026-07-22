import { usePublicState } from '../display/usePublicState'
import './DisplayRoute.css'

/**
 * Public projector display.
 *
 * This screen is student-facing and read-only. It subscribes to sanitized
 * `PublicState` broadcast by the host (same browser, BroadcastChannel) and
 * renders ONLY that — no controls, no navigation into the host, and no private
 * data: no answers, no teacher notes, no upcoming prompts, no scores.
 *
 * It fails closed by construction: before any host message (and if every message
 * is invalid) it shows the neutral `INITIAL_PUBLIC_STATE` waiting screen, and it
 * only ever advances to a strictly-newer valid snapshot. The static "Game
 * display ready" headline is part of the shell; the status line below it is the
 * only thing driven by host state. See docs/architecture/GAME-ENGINE-BOUNDARIES.md
 * and ADR-002.
 */
export function DisplayRoute() {
  const publicState = usePublicState()

  return (
    <div className="display" role="main" aria-labelledby="display-headline">
      <p className="display__brand">Classroom Quiz Show</p>
      <h1 id="display-headline" className="display__headline">
        Game display ready
      </h1>
      <p className="display__subtext" aria-live="polite">
        <span className="display__status-dot" aria-hidden="true" />
        {publicState.headline} — {publicState.detail}
      </p>
    </div>
  )
}
