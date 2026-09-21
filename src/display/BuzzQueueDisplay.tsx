import { useEffect, useRef, useState } from 'react'
import type { PublicBuzzState, PublicTeamsState } from '../state/publicState'
import { isTeamAccent, teamAccentClass, type TeamAccent } from '../game/teams/accents'
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
 * an entrance delay. Acknowledgement is owned by **semantic active-team identity
 * transitions** (`activeKey`), not by every buzz-object update. Waiting-count-only
 * updates refresh the count immediately and must neither start nor cancel an
 * in-flight acknowledgement. The first observation seeds prior semantic state
 * (catch-up / remount) without manufacturing a claim transition; observed
 * `none → active` and `active A → active B` acknowledge.
 *
 * Motion is enhancement around already-visible text; it never invents a
 * promotion cause (incorrect / pass / first buzz) that public state does not
 * expose.
 *
 * Public team accent tokens may tint the active border as a supplemental cue.
 * Text labels remain the carrier; high contrast / grayscale must still read.
 */

export interface BuzzQueueDisplayProps {
  readonly buzz: PublicBuzzState
  /** The public scoreboard, used only to resolve the active team's NAME. */
  readonly teams: PublicTeamsState | null
}

/**
 * Hold the claim-change marker slightly longer than `--dur-emphasized` (320ms)
 * so the class remains for the full CSS pulse. Kept as a numeric constant on
 * purpose — no runtime CSS-variable read just to avoid a ~100ms delta.
 */
const CLAIM_CHANGE_HOLD_MS = 420

/** Semantic floor identity: active team key, or `null` when none/exhausted. */
function semanticActiveKey(buzz: PublicBuzzState): string | null {
  return buzz.status === 'active' ? buzz.activeTeamKey : null
}

/** Resolve a positional key to its public name, or `null`. */
function nameForKey(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  return teams.teams.find((team) => team.key === key)?.name ?? null
}

/** Resolve a positional key to its canonical public accent token, or `null`. */
function accentForKey(teams: PublicTeamsState | null, key: string): TeamAccent | null {
  if (!teams || teams.status !== 'available') return null
  const accent = teams.teams.find((team) => team.key === key)?.accent
  return isTeamAccent(accent) ? accent : null
}

function accentClass(accent: TeamAccent | null): string {
  return accent ? ` ${teamAccentClass(accent)}` : ''
}

export function BuzzQueueDisplay({ buzz, teams }: BuzzQueueDisplayProps) {
  // `undefined` = unseeded. First observation seeds without acknowledging.
  const previousActiveKeyRef = useRef<string | null | undefined>(undefined)
  const [claimChanged, setClaimChanged] = useState(false)
  /** Bumps when a new identity transition should restart the hold timer. */
  const [claimEpoch, setClaimEpoch] = useState(0)

  const activeKey = semanticActiveKey(buzz)

  useEffect(() => {
    const previous = previousActiveKeyRef.current

    // Catch-up / remount: seed prior semantic state; do not fabricate a claim.
    if (previous === undefined) {
      previousActiveKeyRef.current = activeKey
      return
    }

    // Waiting-count-only (or identical identity): keep acknowledgement as-is.
    if (previous === activeKey) {
      return
    }

    previousActiveKeyRef.current = activeKey

    // none → active, or active A → active B: acknowledge already-visible name.
    if (activeKey !== null) {
      setClaimChanged(true)
      setClaimEpoch((epoch) => epoch + 1)
      return
    }

    // active → none/exhausted: clear marker; no manufactured claim.
    setClaimChanged(false)
  }, [activeKey])

  // Hold timer owns duration separately from identity observation so waiting-count
  // updates never cancel, and rapid promotions restart from the new epoch.
  useEffect(() => {
    if (!claimChanged) return
    const clearId = window.setTimeout(() => setClaimChanged(false), CLAIM_CHANGE_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [claimChanged, claimEpoch])

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
