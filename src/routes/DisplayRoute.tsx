import { usePublicState } from '../display/usePublicState'
import type { PublicGameView } from '../state/publicState'
import './DisplayRoute.css'

/**
 * Public projector display.
 *
 * This screen is student-facing and read-only. It subscribes to sanitized
 * `PublicState` broadcast by the host (same browser, BroadcastChannel) and
 * renders ONLY that — no controls, no navigation into the host, and no private
 * data: no answers, no teacher notes, no upcoming prompts, no scores, no
 * round-type identifiers, and no unsupported-type diagnostics.
 *
 * It fails closed by construction: before any host message (and if every message
 * is invalid) it shows the neutral `INITIAL_PUBLIC_STATE` waiting screen, and it
 * only ever advances to a strictly-newer valid snapshot. An unsupported current
 * round resolves to a neutral "This round is not available yet" — never to a
 * type name or a reason. See docs/architecture/GAME-ENGINE-BOUNDARIES.md and
 * ADR-002 / ADR-003.
 */

/** Neutral, public-safe sentence describing the game round status. */
function describeGame(game: PublicGameView): string {
  if (game.status === 'ended') return 'Game complete'
  switch (game.roundAvailability) {
    case 'available':
      return game.currentRound === null
        ? `Game ready — ${game.roundCount} rounds`
        : `Round ${game.currentRound} of ${game.roundCount}`
    case 'unavailable':
      return 'This round is not available yet'
    case 'none':
    default:
      return game.roundCount === 0
        ? 'Game ready'
        : `Game ready — ${game.roundCount} rounds, waiting for the host`
  }
}

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
      {publicState.game && (
        <p className="display__subtext" aria-live="polite" data-testid="display-game">
          {describeGame(publicState.game)}
        </p>
      )}
    </div>
  )
}
