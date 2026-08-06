import {
  PUBLIC_FINAL_KIND,
  type PublicFinalReveal,
  type PublicResponseTimer,
  type PublicRoundState,
  type PublicTeamsState,
} from '../state/publicState'
import { MediaContentDisplay } from './MediaContentDisplay'
import { useResponseCountdown } from './useResponseCountdown'
import { describeRemaining, formatRemaining } from '../time/duration'
import type { Clock } from '../time/clock'
import './FinalWagerDisplay.css'

/**
 * The projector view of a `final-wager` round (Slice 14).
 *
 * This component renders sanitized `PublicState` and nothing else. It has no
 * access to the private definition, cannot request more data, and does not
 * reconstruct a Final from anything — it draws exactly the DTO it was handed.
 * Because that DTO is stage-discriminated, there is no hidden wager, response or
 * answer in the DOM waiting to be inspected:
 *
 *  - `setup` / `wager-entry` / `wagers-locked` — status and a countdown only. The
 *    question is not sent yet, and no team's wager is sent at any point before
 *    that team's reveal.
 *  - `response-entry` / `responses-locked` — the question, and the countdown while
 *    one is running. No answer, no response, no wager.
 *  - `answer-revealed` — the question and the canonical answer.
 *  - `team-reveal` — one team's response and wager, plus its outcome once the host
 *    has adjudicated. No other team's data is in the payload at all.
 *  - `resolution` / `sudden-death` / `complete` — the result state. The tied or
 *    winning totals are read from the scoreboard, which is public anyway.
 *
 * Team names come from the scoreboard the display already has, looked up by the
 * positional key in the DTO — so an authored team id never travels here either.
 *
 * It fails closed: a payload it cannot make sense of renders the neutral "not
 * available" panel rather than a partial or guessed Final.
 */

export interface FinalWagerDisplayProps {
  readonly round: PublicRoundState
  /** The public scoreboard, used only to resolve a positional key to a name. */
  readonly teams: PublicTeamsState | null
  readonly hostClockOffsetMs?: number
  /** Injectable clock — tests drive the countdown instead of waiting for it. */
  readonly clock?: Clock
}

/** Below this many milliseconds the countdown is emphasised. */
const URGENT_THRESHOLD_MS = 10_000

/** Public status copy for a Final window. Deliberately neutral about why. */
const WINDOW_LABEL = {
  idle: 'Ready',
  running: 'Time remaining',
  paused: 'Paused',
  expired: 'Time up',
  interrupted: 'Stopped',
} as const

export interface FinalCountdownProps {
  readonly timer: PublicResponseTimer
  readonly hostClockOffsetMs?: number
  readonly clock?: Clock
  /** Optional class prefix; defaults to Final leaf styling (`fwd__timer`). */
  readonly className?: string
  /** Optional test id root; defaults to `fwd-timer`. */
  readonly testId?: string
}

/**
 * The Final countdown, derived locally from the published deadline exactly as the
 * board's timer is — no tick stream, no authority. Reaching 0:00 expires nothing;
 * it shows 0:00 until the host publishes that the window ended.
 *
 * Exported so the Final Signal Rail can own the primary countdown without
 * reimplementing duration, urgency, or clock-offset logic (Slice 18 R1).
 */
export function FinalCountdown({
  timer,
  hostClockOffsetMs = 0,
  clock,
  className = 'fwd__timer',
  testId = 'fwd-timer',
}: FinalCountdownProps) {
  const remainingMs = useResponseCountdown(timer, hostClockOffsetMs, clock)
  if (timer.status === 'idle') return null
  const urgent = timer.status === 'running' && remainingMs <= URGENT_THRESHOLD_MS
  return (
    <div
      className={`${className} ${className}--${timer.status}${urgent ? ` ${className}--urgent` : ''}`}
      data-testid={testId}
      data-status={timer.status}
    >
      <p className={`${className}-status`} data-testid={`${testId}-status`}>
        {WINDOW_LABEL[timer.status]}
      </p>
      <p
        className={`${className}-clock`}
        data-testid={`${testId}-clock`}
        role="timer"
        aria-label={`${WINDOW_LABEL[timer.status]}: ${describeRemaining(remainingMs)}`}
      >
        {formatRemaining(remainingMs)}
      </p>
    </div>
  )
}

/** The neutral screen used whenever the round cannot be rendered safely. */
function Unavailable() {
  return (
    <div className="fwd fwd--unavailable" data-testid="fwd-unavailable">
      <p className="fwd__unavailable-text">This round is not available yet</p>
    </div>
  )
}

/** Resolve a positional team key to its public name, or a neutral placeholder. */
function teamNameFor(teams: PublicTeamsState | null, key: string): string {
  if (teams === null || teams.status !== 'available') return 'Team'
  return teams.teams.find((team) => team.key === key)?.name ?? 'Team'
}

/**
 * One revealed team. Everything is stated in WORDS — the response state, the
 * wager, the outcome and the points — so nothing depends on colour and nothing is
 * lost on a washed-out projector.
 */
function RevealPanel({
  reveal,
  teams,
}: {
  readonly reveal: PublicFinalReveal
  readonly teams: PublicTeamsState | null
}) {
  const { settlement } = reveal
  return (
    <div className="fwd__reveal" data-testid="fwd-reveal">
      <p className="fwd__reveal-team" data-testid="fwd-reveal-team">
        {teamNameFor(teams, reveal.teamKey)}
      </p>

      <p className="fwd__reveal-response" data-testid="fwd-reveal-response">
        <span className="fwd__label">Response</span>
        <span className="fwd__value">
          {reveal.response.kind === 'exact' && reveal.response.text}
          {reveal.response.kind === 'not-captured' && 'Answered (wording not recorded)'}
          {reveal.response.kind === 'no-response' && 'No response'}
        </span>
      </p>

      <p className="fwd__reveal-wager" data-testid="fwd-reveal-wager">
        <span className="fwd__label">Wager</span>
        <span className="fwd__value">{reveal.wager}</span>
      </p>

      {/*
        Absent until the host adjudicates. There is no element holding a
        correctness value that is merely hidden — the field is `null` on the wire.
      */}
      {settlement !== null && (
        <p
          className={`fwd__reveal-outcome fwd__reveal-outcome--${settlement.outcome}`}
          data-testid="fwd-reveal-outcome"
        >
          <span className="fwd__label">Result</span>
          <span className="fwd__value">
            {settlement.outcome === 'correct' && 'Correct'}
            {settlement.outcome === 'incorrect' && 'Incorrect'}
            {settlement.outcome === 'no-response' && 'No response'}
            {' — '}
            {settlement.delta > 0 ? `+${settlement.delta}` : String(settlement.delta)}
          </span>
        </p>
      )}
    </div>
  )
}

export function FinalWagerDisplay({
  round,
  teams,
  // Clock props retained for API compatibility; primary countdown is on the Final Signal Rail.
  hostClockOffsetMs: _hostClockOffsetMs = 0,
  clock: _clock,
}: FinalWagerDisplayProps) {
  void _hostClockOffsetMs
  void _clock
  if (round.kind !== PUBLIC_FINAL_KIND) return <Unavailable />

  const heading = (
    <p className="fwd__heading" data-testid="fwd-heading">
      Final wager
    </p>
  )

  switch (round.stage) {
    case 'setup':
      return (
        <div className="fwd" data-testid="fwd-setup">
          {heading}
          <p className="fwd__status">Getting ready</p>
        </div>
      )

    case 'wager-entry':
      return (
        <div className="fwd" data-testid="fwd-wager-entry">
          {heading}
          <p className="fwd__status">Place your wagers</p>
          {/*
            Primary Final countdown lives on the Final Signal Rail (Slice 18 R1)
            so the scene and rail do not compete with identical clocks.
          */}
        </div>
      )

    case 'wagers-locked':
      return (
        <div className="fwd" data-testid="fwd-wagers-locked">
          {heading}
          <p className="fwd__status">Wagers are locked</p>
        </div>
      )

    case 'response-entry':
      return (
        <div className="fwd fwd--question" data-testid="fwd-response-entry">
          {heading}
          <div className="fwd__prompt" data-testid="fwd-prompt">
            <MediaContentDisplay content={round.prompt} />
          </div>
          {/* Primary Final countdown: Final Signal Rail (Slice 18 R1). */}
        </div>
      )

    case 'responses-locked':
      return (
        <div className="fwd fwd--question" data-testid="fwd-responses-locked">
          {heading}
          <div className="fwd__prompt" data-testid="fwd-prompt">
            <MediaContentDisplay content={round.prompt} />
          </div>
          <p className="fwd__status">Answers are in</p>
        </div>
      )

    case 'answer-revealed':
      return (
        <div className="fwd fwd--question" data-testid="fwd-answer-revealed">
          {heading}
          <div className="fwd__prompt" data-testid="fwd-prompt">
            <MediaContentDisplay content={round.prompt} />
          </div>
          <p className="fwd__answer" data-testid="fwd-answer">
            <span className="fwd__label">Answer</span>
            <span className="fwd__value">{round.answer}</span>
          </p>
        </div>
      )

    case 'team-reveal':
      return (
        <div className="fwd fwd--question" data-testid="fwd-team-reveal">
          {heading}
          {/*
            The question stays in view beside the reveal for the same documented
            reason the board keeps a prompt above its answer: a class needs to see
            what was asked while a response is being judged.
          */}
          <div className="fwd__prompt" data-testid="fwd-prompt">
            <MediaContentDisplay content={round.prompt} />
          </div>
          <p className="fwd__answer" data-testid="fwd-answer">
            <span className="fwd__label">Answer</span>
            <span className="fwd__value">{round.answer}</span>
          </p>
          <RevealPanel reveal={round.reveal} teams={teams} />
        </div>
      )

    case 'resolution':
      return (
        <div className="fwd" data-testid="fwd-resolution">
          {heading}
          {round.prompt !== null && (
            <div className="fwd__prompt" data-testid="fwd-prompt">
              <MediaContentDisplay content={round.prompt} />
            </div>
          )}
          {round.answer !== null && (
            <p className="fwd__answer" data-testid="fwd-answer">
              <span className="fwd__label">Answer</span>
              <span className="fwd__value">{round.answer}</span>
            </p>
          )}
          {/*
            The last team judged stays in view beside the result, so the moment
            the final wager is settled is not blanked out from under the class.
          */}
          {round.reveal !== null && <RevealPanel reveal={round.reveal} teams={teams} />}
          <p className="fwd__status" data-testid="fwd-outcome">
            {round.outcome === 'tied' ? 'The lead is tied' : 'All wagers settled'}
          </p>
        </div>
      )

    case 'sudden-death':
      return (
        <div className="fwd" data-testid="fwd-sudden-death">
          {heading}
          <p className="fwd__status">Sudden death</p>
          <p className="fwd__substatus">The tied teams play one more question.</p>
        </div>
      )

    case 'complete':
      return (
        <div className="fwd" data-testid="fwd-complete">
          {heading}
          <p className="fwd__status" data-testid="fwd-outcome">
            {round.outcome === 'tied' ? 'Game complete — a tie' : 'Game complete'}
          </p>
        </div>
      )

    default:
      return <Unavailable />
  }
}
