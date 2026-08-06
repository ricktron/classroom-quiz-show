/**
 * Adaptive score region: Column (1–4), Strip (5–6), Deck (7–8),
 * or the explicit Scores unavailable panel.
 *
 * Preserves authored public team order. Never ranks by score.
 * `teams === null` is handled by the shell (no scoreboard); this component
 * receives a non-null PublicTeamsState.
 */

import { TeamScoreboard } from '../TeamScoreboard'
import type { PublicTeamsState } from '../../state/publicState'
import type { ScoreLayoutMode } from './selectAudiencePresentation'

export interface ScoreLayoutProps {
  readonly teams: PublicTeamsState
  readonly mode: ScoreLayoutMode
}

export function ScoreLayout({ teams, mode }: ScoreLayoutProps) {
  if (mode === 'none') return null

  if (mode === 'unavailable' || teams.status === 'unavailable') {
    return (
      <div
        className="score-layout score-layout--unavailable"
        data-testid="score-layout"
        data-mode="unavailable"
      >
        <TeamScoreboard teams={teams} />
      </div>
    )
  }

  if (mode !== 'column' && mode !== 'strip' && mode !== 'deck') return null

  return (
    <div
      className={`score-layout score-layout--${mode}`}
      data-testid="score-layout"
      data-mode={mode}
    >
      <TeamScoreboard teams={teams} layout={mode} />
    </div>
  )
}
