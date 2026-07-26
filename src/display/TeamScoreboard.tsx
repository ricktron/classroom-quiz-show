import type { PublicTeam, PublicTeamsState } from '../state/publicState'
import './TeamScoreboard.css'

/**
 * The projector scoreboard (Slice 6).
 *
 * Like every other display component it renders sanitized `PublicState` and
 * nothing else: it has no access to the private definition, cannot request more
 * data, and does not compute or accumulate a single score. The host sends totals;
 * this draws them. If the host disappears, the last valid totals simply stay on
 * screen.
 *
 * ## Deliberately static
 *
 * There is no count-up animation, no flash, no transition. An animated counter
 * can lag or land on the wrong number, and a class reading the projector needs the
 * score to be *true* far more than it needs it to be lively. Nothing here needs
 * motion to be understood, so there is nothing for `prefers-reduced-motion` to
 * suppress.
 *
 * ## Never colour alone
 *
 * Every team is identified by its NAME as text. The accent is a decorative bar,
 * hidden from assistive technology, and an unrecognized accent token simply gets
 * no class — the scoreboard is fully readable in greyscale and with the accent
 * removed entirely.
 *
 * ## Fails closed
 *
 * A payload it cannot make sense of renders the neutral "Scores unavailable"
 * panel rather than a partial board or a `NaN`.
 */

export interface TeamScoreboardProps {
  readonly teams: PublicTeamsState
}

/**
 * The accent tokens this component knows how to render.
 *
 * Deliberately a LOCAL list, so the display bundle keeps importing only
 * `PublicState` (the same isolation rule `CategoryBoardDisplay` and
 * `usePublicState` follow). A test asserts it matches the application palette
 * exactly, so the two cannot drift apart.
 */
const KNOWN_ACCENTS: readonly string[] = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
]

/** Map a token to its class, or to nothing at all if it is not one we know. */
function accentClass(accent: string): string {
  return KNOWN_ACCENTS.includes(accent) ? ` accent--${accent}` : ''
}

/**
 * Read a score the way a person says it, for assistive technology. "-120" is
 * commonly announced as "minus 120", but not universally, and a score read as
 * "120" when it is actually negative is a real classroom error — so the spoken
 * form is stated explicitly rather than left to the screen reader.
 */
function spokenScore(score: number): string {
  return score < 0 ? `minus ${Math.abs(score)} points` : `${score} points`
}

/** The neutral screen used whenever the scores cannot be rendered safely. */
function Unavailable() {
  return (
    <div className="tsb tsb--unavailable" data-testid="tsb-unavailable">
      <p className="tsb__unavailable-text">Scores unavailable</p>
    </div>
  )
}

export function TeamScoreboard({ teams }: TeamScoreboardProps) {
  if (teams.status !== 'available') return <Unavailable />
  if (teams.teams.length === 0) return <Unavailable />

  return (
    <section className="tsb" data-testid="tsb" aria-labelledby="tsb-title">
      <h2 className="tsb__title" id="tsb-title">
        Scores
      </h2>
      <ol className="tsb__list">
        {teams.teams.map((team) => (
          <TeamCard key={team.key} team={team} />
        ))}
      </ol>
    </section>
  )
}

function TeamCard({ team }: { readonly team: PublicTeam }) {
  return (
    <li
      className={`tsb__team${accentClass(team.accent)}`}
      data-testid={`tsb-team-${team.key}`}
      /* The accessible name states the team and the score together, in words. */
      aria-label={`${team.name}: ${spokenScore(team.score)}`}
    >
      <span className="tsb__accent-bar" aria-hidden="true" />
      <span className="tsb__name">{team.name}</span>
      <span
        className={`tsb__score${team.score < 0 ? ' tsb__score--negative' : ''}`}
        data-testid={`tsb-score-${team.key}`}
      >
        {team.score}
      </span>
    </li>
  )
}
