import { useEffect, useRef, useState } from 'react'
import type { PublicBuzzState, PublicTeamsState } from '../state/publicState'
import './BuzzQueueDisplay.css'

/**
 * The projector view of the buzz queue (Slice 8 + S05 buzz/active-claim
 * choreography).
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
 * ## Immediate acknowledgement
 *
 * The active team name renders with the authoritative public state — never after
 * an entrance delay. When the public active-team key changes during the same
 * response opportunity, a short claim-change acknowledgement makes the floor
 * change unmistakable. Motion is enhancement around already-visible text; it
 * never invents a promotion cause (incorrect / pass / first buzz) that public
 * state does not expose.
 *
 * Public team accent tokens may tint the active border as a supplemental cue.
 * Text labels remain the carrier; high contrast / grayscale must still read.
 */

export interface BuzzQueueDisplayProps {
  readonly buzz: PublicBuzzState
  /** The public scoreboard, used only to resolve the active team's NAME. */
  readonly teams: PublicTeamsState | null
}

const KNOWN_ACCENTS = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
] as const

/** How long the claim-change marker stays on for reduced-motion / CSS hooks. */
const CLAIM_CHANGE_HOLD_MS = 420

/** Resolve a positional key to its public name, or `null`. */
function nameForKey(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  return teams.teams.find((team) => team.key === key)?.name ?? null
}

/** Resolve a positional key to its public accent token, or `null`. */
function accentForKey(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  const accent = teams.teams.find((team) => team.key === key)?.accent
  if (!accent || !(KNOWN_ACCENTS as readonly string[]).includes(accent)) return null
  return accent
}

function accentClass(accent: string | null): string {
  return accent ? ` accent--${accent}` : ''
}

export function BuzzQueueDisplay({ buzz, teams }: BuzzQueueDisplayProps) {
  const previousActiveKeyRef = useRef<string | null>(null)
  const [claimChanged, setClaimChanged] = useState(false)

  useEffect(() => {
    if (buzz.status !== 'active') {
      previousActiveKeyRef.current = null
      setClaimChanged(false)
      return
    }

    const previous = previousActiveKeyRef.current
    const floorChanged = previous === null || previous !== buzz.activeTeamKey
    previousActiveKeyRef.current = buzz.activeTeamKey

    if (!floorChanged) {
      setClaimChanged(false)
      return
    }

    // First claim (mount into active) and later promotions share the same
    // acknowledgement. Name text is already rendered; this only marks change.
    setClaimChanged(true)
    const clearId = window.setTimeout(() => setClaimChanged(false), CLAIM_CHANGE_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [buzz])

  if (buzz.status === 'none') return null

  if (buzz.status === 'exhausted') {
    return (
      <section
        className="bqd bqd--exhausted"
        data-testid="bqd"
        data-status="exhausted"
        aria-label="Buzz status"
      >
        <p className="bqd__label">Response closed</p>
        <p className="bqd__active" data-testid="bqd-active">
          No one left to answer
        </p>
      </section>
    )
  }

  const name = nameForKey(teams, buzz.activeTeamKey)
  const accent = accentForKey(teams, buzz.activeTeamKey)
  const waiting = buzz.waitingCount
  const claimClass = claimChanged ? ' bqd--claim-changed' : ''

  return (
    <section
      className={`bqd bqd--active${claimClass}${accentClass(accent)}`}
      data-testid="bqd"
      data-status="active"
      data-active-key={buzz.activeTeamKey}
      data-claim-changed={claimChanged ? 'true' : 'false'}
      data-accent={accent ?? undefined}
      aria-label="Buzz status"
    >
      <p className="bqd__label">Answering</p>
      {/*
        Name renders immediately with public state. Claim-change motion, when
        present, only emphasizes already-visible truth.
      */}
      <p className="bqd__active" data-testid="bqd-active" aria-live="polite">
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
