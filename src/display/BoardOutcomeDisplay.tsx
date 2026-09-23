/**
 * Board-response outcome on the projector (S05 Path A authority + S05
 * presentation choreography).
 *
 * Renders sanitized {@link PublicBoardResponseOutcome} only — Correct /
 * Incorrect / Passed + team name. Lifecycle acknowledgement is local
 * presentation around already-visible truth — never gameplay authority and
 * never delayed authoritative text.
 *
 * ## Durable snapshot ≠ just-happened event
 *
 * Semantic identity is local `teamKey + kind` (not published / not persisted).
 * First observation seeds prior identity (catch-up / remount) without
 * fabricating a transient acknowledgement. Observed identity transitions may
 * acknowledge when this surface owns motion.
 *
 * ## Composition with buzz
 *
 * When an active claim is present beside Incorrect / Passed, BuzzQueueDisplay
 * owns motion and this outcome stays an immediate static secondary. Correct
 * (no active claim) and exhausted Incorrect / Passed may own acknowledgement
 * motion. Scoreboard / Path S-C score integer updates must not restart ack
 * (identity ignores scores).
 *
 * Final settlement stays on {@link FinalWagerDisplay}; this component is
 * category-board-only (impossible while public `response` is null).
 */

import { useEffect, useRef, useState } from 'react'
import type {
  PublicBoardResponseOutcome,
  PublicTeamsState,
} from '../state/publicState'
import './BoardOutcomeDisplay.css'

export interface BoardOutcomeDisplayProps {
  readonly boardOutcome: PublicBoardResponseOutcome
  readonly teams: PublicTeamsState | null
  /**
   * True when public buzz is currently `active`. Local composition prop only —
   * not a PublicState field. When true beside Incorrect/Passed, buzz owns
   * acknowledgement motion and this outcome stays static secondary.
   */
  readonly activeClaimPresent?: boolean
}

/**
 * Hold the outcome-change marker slightly longer than `--dur-emphasized`
 * (320ms), matching buzz claim hold (~420ms). Numeric constant on purpose —
 * no runtime CSS-variable read just to avoid a ~100ms delta.
 */
const OUTCOME_ACK_HOLD_MS = 420

/** Local semantic identity: `teamKey:kind`, or null when none. */
function semanticOutcomeId(boardOutcome: PublicBoardResponseOutcome): string | null {
  if (boardOutcome.status === 'none') return null
  return `${boardOutcome.teamKey}:${boardOutcome.kind}`
}

function nameForKey(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  return teams.teams.find((team) => team.key === key)?.name ?? null
}

function kindLabel(kind: 'correct' | 'incorrect' | 'passed'): string {
  switch (kind) {
    case 'correct':
      return 'Correct'
    case 'incorrect':
      return 'Incorrect'
    case 'passed':
      return 'Passed'
  }
}

/**
 * Whether this surface may run acknowledgement motion for the current
 * composition. Active Incorrect/Passed yields motion to BuzzQueueDisplay.
 */
function mayOwnOutcomeAck(
  activeClaimPresent: boolean,
  kind: 'correct' | 'incorrect' | 'passed' | null,
): boolean {
  if (kind === null) return false
  if (kind === 'correct') return !activeClaimPresent
  // Incorrect / Passed: own motion only when no promoted active claim.
  return !activeClaimPresent
}

export function BoardOutcomeDisplay({
  boardOutcome,
  teams,
  activeClaimPresent = false,
}: BoardOutcomeDisplayProps) {
  // `undefined` = unseeded. First observation seeds without acknowledging.
  const previousIdRef = useRef<string | null | undefined>(undefined)
  const [outcomeChanged, setOutcomeChanged] = useState(false)
  /** Bumps when a new identity transition should restart the hold timer. */
  const [ackEpoch, setAckEpoch] = useState(0)

  const semanticId = semanticOutcomeId(boardOutcome)
  const resolvedKind =
    boardOutcome.status === 'resolved' ? boardOutcome.kind : null
  const ownsAck = mayOwnOutcomeAck(activeClaimPresent, resolvedKind)

  useEffect(() => {
    const previous = previousIdRef.current

    // Catch-up / remount: seed prior semantic state; do not fabricate ack.
    if (previous === undefined) {
      previousIdRef.current = semanticId
      return
    }

    // Same identity (incl. Path S-C score-only team DTO refreshes): keep ack.
    if (previous === semanticId) {
      return
    }

    previousIdRef.current = semanticId

    // none → resolved (or identity change) while this surface owns motion.
    if (semanticId !== null && ownsAck) {
      setOutcomeChanged(true)
      setAckEpoch((epoch) => epoch + 1)
      return
    }

    // → none, or Incorrect/Passed beside active claim (static secondary).
    setOutcomeChanged(false)
  }, [semanticId, ownsAck])

  // Hold timer owns duration separately from identity observation so unrelated
  // prop refreshes (team scores) never cancel, and rapid identity changes restart.
  useEffect(() => {
    if (!outcomeChanged) return
    const clearId = window.setTimeout(() => setOutcomeChanged(false), OUTCOME_ACK_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [outcomeChanged, ackEpoch])

  if (boardOutcome.status === 'none') return null

  const teamName = nameForKey(teams, boardOutcome.teamKey)
  const label = kindLabel(boardOutcome.kind)
  const secondary =
    activeClaimPresent &&
    (boardOutcome.kind === 'incorrect' || boardOutcome.kind === 'passed')
  const changedClass = outcomeChanged ? ' bod--outcome-changed' : ''
  const secondaryClass = secondary ? ' bod--secondary' : ''

  return (
    <p
      className={`bod bod--${boardOutcome.kind}${secondaryClass}${changedClass}`}
      data-testid="board-outcome"
      data-outcome-kind={boardOutcome.kind}
      data-outcome-team={boardOutcome.teamKey}
      data-seeded="true"
      data-outcome-changed={outcomeChanged ? 'true' : 'false'}
      data-motion-owner={secondary ? 'buzz' : 'outcome'}
      data-composition={secondary ? 'static-secondary' : 'primary'}
      aria-live="polite"
    >
      {/*
        Kind + team render immediately with public state. Outcome-change motion,
        when present, only emphasizes already-visible truth.
      */}
      <span className="bod__kind">{label}</span>
      <span className="bod__team">{teamName ?? 'A team'}</span>
    </p>
  )
}
