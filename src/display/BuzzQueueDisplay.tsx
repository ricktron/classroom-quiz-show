import type { PublicBuzzState, PublicTeamsState } from '../state/publicState'
import './BuzzQueueDisplay.css'

/**
 * The projector view of the buzz queue (Slice 8).
 *
 * It renders the sanitized {@link PublicBuzzState} and nothing else: who has the
 * floor, and how many teams are waiting. It has no access to the private queue,
 * no authority over it, and no knowledge of the input that produced it.
 *
 * ## What a class needs, and what it does not
 *
 * A class needs to know **who is answering** — without it they will simply shout,
 * which is the problem a buzzer exists to solve. It does not need the ordered
 * list of everyone who was a fraction slower: that is a reaction-time ranking
 * this project deliberately refuses to publish
 * (`ROADMAP-AMENDMENT-001` §5.7), and it would not stay legible under a live clue
 * anyway. So the ordered queue is host-only and the projector gets a count.
 *
 * ## The name comes from the scoreboard
 *
 * The DTO names the active team by its POSITIONAL key (`t0`, `t1`, …), the same
 * key the public scoreboard already carries, and this component looks the name up
 * there. No authored team id travels, and the name is never duplicated onto a
 * second wire field that could drift from the first. If the scoreboard is
 * unavailable the panel says "A team is answering" — neutral and honest rather
 * than blank.
 *
 * ## Readable, not decorative
 *
 * Every state is stated in WORDS, for the same reason the timer panel states
 * them: a washed-out projector loses colour long before it loses text. There is
 * no animation of any kind here — the active team changing is information, and
 * information does not get a flash.
 */

export interface BuzzQueueDisplayProps {
  readonly buzz: PublicBuzzState
  /** The public scoreboard, used only to resolve the active team's NAME. */
  readonly teams: PublicTeamsState | null
}

/** Resolve a positional key to its public name, or `null`. */
function nameForKey(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  return teams.teams.find((team) => team.key === key)?.name ?? null
}

export function BuzzQueueDisplay({ buzz, teams }: BuzzQueueDisplayProps) {
  if (buzz.status === 'none') return null

  if (buzz.status === 'exhausted') {
    return (
      <section className="bqd bqd--exhausted" data-testid="bqd" data-status="exhausted">
        <p className="bqd__active" data-testid="bqd-active">
          No one left to answer
        </p>
      </section>
    )
  }

  const name = nameForKey(teams, buzz.activeTeamKey)
  const waiting = buzz.waitingCount

  return (
    <section className="bqd bqd--active" data-testid="bqd" data-status="active">
      <p className="bqd__label">Answering</p>
      <p className="bqd__active" data-testid="bqd-active">
        {name ?? 'A team is answering'}
      </p>
      {/*
        A count, never a list. "1 team waiting" tells the class that others are
        queued without publishing who, or in what order.
      */}
      <p className="bqd__waiting" data-testid="bqd-waiting">
        {waiting === 0
          ? 'No teams waiting'
          : `${waiting} team${waiting === 1 ? '' : 's'} waiting`}
      </p>
    </section>
  )
}
