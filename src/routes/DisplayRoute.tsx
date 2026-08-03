import { usePublicState } from '../display/usePublicState'
import { CategoryBoardDisplay } from '../display/CategoryBoardDisplay'
import { FinalWagerDisplay } from '../display/FinalWagerDisplay'
import { TeamScoreboard } from '../display/TeamScoreboard'
import { ResponseTimerDisplay } from '../display/ResponseTimerDisplay'
import { BuzzQueueDisplay } from '../display/BuzzQueueDisplay'
import { PUBLIC_FINAL_KIND, type PublicGameView } from '../state/publicState'
import './DisplayRoute.css'

/**
 * Public projector display.
 *
 * This screen is student-facing and read-only. It subscribes to sanitized
 * `PublicState` broadcast by the host (same browser, BroadcastChannel) and
 * renders ONLY that — no controls, no navigation into the host, and no private
 * data: no answers, no teacher notes, no upcoming prompts, no round-type
 * identifiers, no score history or undo metadata, no host-selected scoring
 * target, and no unsupported-type diagnostics. Team names and current totals ARE
 * public (a class must be able to see the score) and arrive as an allow-listed
 * DTO — never as the team definitions themselves.
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
  const { state: publicState, hostClockOffsetMs } = usePublicState()
  // When a round is on screen the round IS the content, so the waiting-state
  // chrome shrinks out of its way rather than competing with it for the
  // projector. Nothing is hidden — only resized.
  const hasRound = publicState.round !== null

  return (
    <div
      className={`display${hasRound ? ' display--round' : ''}`}
      role="main"
      aria-labelledby="display-headline"
    >
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
      {/*
        The round panel renders only when the host has published one. It is
        wrapped in a polite live region so a reveal is announced without
        interrupting, and it draws exclusively from the sanitized DTO — the
        display never reconstructs a board from anything else.
      */}
      {publicState.round && (
        <div className="display__round" aria-live="polite" data-testid="display-round">
          {/*
            One renderer per PRESENTATION kind, chosen from the DTO's own
            discriminator. The display never asks what round TYPE this is — that
            identifier is not on the wire at all.
          */}
          {publicState.round.kind === PUBLIC_FINAL_KIND ? (
            <FinalWagerDisplay
              round={publicState.round}
              teams={publicState.teams}
              hostClockOffsetMs={hostClockOffsetMs}
            />
          ) : (
            <CategoryBoardDisplay round={publicState.round} />
          )}
        </div>
      )}
      {/*
        The response timer renders only while a window actually exists — a clue
        that was never armed and never timed projects nothing, so the board is not
        permanently sharing the screen with an empty clock. It sits between the
        clue and the scoreboard because that is where a class looks while
        answering. The countdown is derived locally from the published deadline;
        the host publishes no per-second revision (Slice 7).

        `aria-live="polite"` announces the STATUS changes (armed, paused, time up)
        without interrupting; the countdown digits themselves are inside a
        `role="timer"` element and are deliberately not announced every second.
      */}
      {publicState.response && (
        <div className="display__response" aria-live="polite" data-testid="display-response">
          <ResponseTimerDisplay
            response={publicState.response}
            hostClockOffsetMs={hostClockOffsetMs}
          />
          {/*
            Who has the floor (Slice 8), directly under the clock, because a class
            reads "who is answering" and "how long is left" as one thing. It
            renders nothing until a team actually buzzes, so an armed clue with no
            buzz shows the clock alone. It carries the active team and a WAITING
            COUNT — never the ordered queue, never a key, never a device.
          */}
          <BuzzQueueDisplay buzz={publicState.response.buzz} teams={publicState.teams} />
        </div>
      )}
      {/*
        The scoreboard is present at EVERY stage — board, prompt and answer — and
        stays on screen when the game ends so final results can be read. It sits
        last so it renders as a strip along the bottom of the projector, out of the
        board's way, and it is a polite live region so an award is announced
        without interrupting whatever is being read out.

        It renders only when the game configures teams; a game with no teams has
        no scoreboard at all, which is exactly the Slice 5 behaviour unchanged.
      */}
      {publicState.teams && (
        <div className="display__scores" aria-live="polite" data-testid="display-scores">
          <TeamScoreboard teams={publicState.teams} />
        </div>
      )}
    </div>
  )
}
