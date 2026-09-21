/**
 * Minimal truthful board-response outcome text on the projector (S05 Path A
 * foundation).
 *
 * Renders sanitized {@link PublicBoardResponseOutcome} only — Correct /
 * Incorrect / Passed + team name. No theatrical choreography, no score delta,
 * no rebound cause. Remount seeds the current snapshot without fabricating a
 * transition. Coexists with buzz active / waiting / exhausted copy.
 *
 * Final settlement stays on {@link FinalWagerDisplay}; this component is
 * category-board-only (impossible while public `response` is null).
 */

import type {
  PublicBoardResponseOutcome,
  PublicTeamsState,
} from '../state/publicState'
import './BoardOutcomeDisplay.css'

export interface BoardOutcomeDisplayProps {
  readonly boardOutcome: PublicBoardResponseOutcome
  readonly teams: PublicTeamsState | null
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

export function BoardOutcomeDisplay({ boardOutcome, teams }: BoardOutcomeDisplayProps) {
  if (boardOutcome.status === 'none') return null

  const teamName = nameForKey(teams, boardOutcome.teamKey)
  const label = kindLabel(boardOutcome.kind)

  return (
    <p
      className={`bod bod--${boardOutcome.kind}`}
      data-testid="board-outcome"
      data-outcome-kind={boardOutcome.kind}
      data-outcome-team={boardOutcome.teamKey}
      data-seeded="true"
      aria-live="polite"
    >
      <span className="bod__kind">{label}</span>
      <span className="bod__team">{teamName ?? 'A team'}</span>
    </p>
  )
}
