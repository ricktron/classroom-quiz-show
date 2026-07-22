import './DisplayRoute.css'

/**
 * Public projector display.
 *
 * This screen is student-facing and read-only. It renders ONLY safe, public
 * placeholder text — no controls, no navigation into the host, and (critically)
 * no private data: no answers, no teacher notes, no upcoming prompts, no scores.
 *
 * The display will eventually render a sanitized PublicState only. Even now,
 * with no state at all, nothing private may appear here. See
 * docs/architecture/GAME-ENGINE-BOUNDARIES.md.
 */
export function DisplayRoute() {
  return (
    <div className="display" role="main" aria-labelledby="display-headline">
      <p className="display__brand">Classroom Quiz Show</p>
      <h1 id="display-headline" className="display__headline">
        Game display ready
      </h1>
      <p className="display__subtext">
        <span className="display__status-dot" aria-hidden="true" />
        Waiting for the host — no active round.
      </p>
    </div>
  )
}
