/**
 * Adaptive score region: Column (1–4), Strip (5–6), Deck (7–8).
 *
 * Preserves authored public team order. Never ranks by score.
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
