/**
 * Audience display spatial composition (Slice 18).
 *
 * Owns projector layout only: product identity, Nexus Core, primary scene,
 * adaptive scores, and Signal Rail. Does not own game state or sync.
 */

import { CategoryBoardDisplay } from '../CategoryBoardDisplay'
import { FinalWagerDisplay } from '../FinalWagerDisplay'
import {
  PUBLIC_FINAL_KIND,
  type PublicGameView,
  type PublicState,
} from '../../state/publicState'
import { NexusCore } from './NexusCore'
import { ScoreLayout } from './ScoreLayout'
import { SignalRail } from './SignalRail'
import { selectAudiencePresentation } from './selectAudiencePresentation'
import './AudienceDisplayShell.css'

/** Neutral public-safe game line preserved for existing projector contracts. */
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

export interface AudienceDisplayShellProps {
  readonly publicState: PublicState
  readonly hostClockOffsetMs?: number
}

function DecorativeLattice() {
  return (
    <div
      className="audience__lattice"
      data-testid="audience-lattice"
      aria-hidden="true"
    >
      <div className="audience__lattice-grid" />
    </div>
  )
}

function resolveFinalRevealedName(
  publicState: PublicState,
  activeTeamName: string | null,
  teamsInAuthoredOrder: ReturnType<typeof selectAudiencePresentation>['teamsInAuthoredOrder'],
): string | null {
  const round = publicState.round
  if (!round || round.kind !== PUBLIC_FINAL_KIND) return null
  if (round.stage === 'team-reveal') return activeTeamName
  if (round.stage === 'resolution' && round.reveal !== null) {
    return teamsInAuthoredOrder?.find((t) => t.key === round.reveal!.teamKey)?.name ?? null
  }
  return null
}

export function AudienceDisplayShell({
  publicState,
  hostClockOffsetMs = 0,
}: AudienceDisplayShellProps) {
  const presentation = selectAudiencePresentation(publicState)
  const {
    scene,
    nexus,
    scoreLayout,
    signalRail,
    emphasis,
    showDecorativeLattice,
    activeTeamName,
    teamsInAuthoredOrder,
    boardDepletion,
    finalResult,
  } = presentation

  const finalRevealedName = resolveFinalRevealedName(
    publicState,
    activeTeamName,
    teamsInAuthoredOrder,
  )
  const leaderKey = finalResult?.leaderTeamKey ?? null

  return (
    <div
      className={[
        'audience',
        `audience--scene-${scene}`,
        `audience--scores-${scoreLayout}`,
        `audience--rail-${signalRail}`,
        emphasis !== 'none' ? `audience--emphasis-${emphasis}` : '',
        showDecorativeLattice ? 'audience--quiet' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="main"
      aria-labelledby="display-headline"
      data-testid="audience-shell"
      data-scene={scene}
      data-score-layout={scoreLayout}
      data-rail={signalRail}
      data-emphasis={emphasis}
    >
      <header className="audience__header">
        <p className="audience__brand">Classroom Quiz Show</p>
        {/*
          Persistent accessible page title preserved for existing sync / route
          tests. Visually subdued so Nexus Core and the board lead hierarchy.
        */}
        <h1 id="display-headline" className="audience__headline">
          Game display ready
        </h1>
        <p className="audience__host-line" aria-live="polite">
          <span className="audience__status-dot" aria-hidden="true" />
          {publicState.headline}
          {publicState.detail ? ` — ${publicState.detail}` : ''}
        </p>
        {publicState.game && (
          <p className="audience__game-line" aria-live="polite" data-testid="display-game">
            {describeGame(publicState.game)}
          </p>
        )}
        <NexusCore nexus={nexus} />
      </header>

      <div className="audience__body">
        {scoreLayout === 'column' && publicState.teams && (
          <aside
            className="audience__scores audience__scores--column"
            data-testid="display-scores"
          >
            <ScoreLayout teams={publicState.teams} mode={scoreLayout} />
          </aside>
        )}

        <div className="audience__primary" data-testid="audience-primary">
          {showDecorativeLattice && <DecorativeLattice />}

          {publicState.round ? (
            <div className="audience__round" aria-live="polite" data-testid="display-round">
              {publicState.round.kind === PUBLIC_FINAL_KIND ? (
                <div
                  className="audience__final"
                  data-leader-key={leaderKey ?? undefined}
                  data-testid="audience-final"
                >
                  <FinalWagerDisplay
                    round={publicState.round}
                    teams={publicState.teams}
                    hostClockOffsetMs={hostClockOffsetMs}
                  />
                  {finalResult?.outcome === 'unique-leader' && (
                    <p
                      className="audience__result audience__result--unique"
                      data-testid="audience-result-unique"
                    >
                      {finalResult.leaderTeamName
                        ? `${finalResult.leaderTeamName} leads`
                        : 'Unique leader'}
                    </p>
                  )}
                  {finalResult?.outcome === 'tied' && (
                    <p
                      className="audience__result audience__result--tied"
                      data-testid="audience-result-tied"
                    >
                      Tied
                    </p>
                  )}
                </div>
              ) : (
                <CategoryBoardDisplay
                  round={publicState.round}
                  clearedCategoryKeys={boardDepletion?.clearedCategoryKeys ?? []}
                  depletion={boardDepletion}
                />
              )}
            </div>
          ) : (
            <div className="audience__status-panel" data-testid="audience-status">
              <p data-testid="audience-waiting-copy">{nexus.stageLabel}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="audience__footer">
        {/*
          `display-response` is present only while a public response DTO exists —
          matching the pre-Slice-18 projector contract used by timer/buzz e2e.
          Compact/Final rails without a response DTO render without that test id.
        */}
        {publicState.response !== null ? (
          <div className="audience__rail" data-testid="display-response">
            <SignalRail
              mode={signalRail === 'hidden' ? 'compact' : signalRail}
              response={publicState.response}
              teams={publicState.teams}
              round={publicState.round}
              hostClockOffsetMs={hostClockOffsetMs}
              finalStageLabel={nexus.stageLabel}
              revealedTeamName={finalRevealedName}
            />
          </div>
        ) : (
          signalRail !== 'hidden' && (
            <div className="audience__rail">
              <SignalRail
                mode={signalRail}
                response={null}
                teams={publicState.teams}
                round={publicState.round}
                hostClockOffsetMs={hostClockOffsetMs}
                finalStageLabel={nexus.stageLabel}
                revealedTeamName={finalRevealedName}
              />
            </div>
          )
        )}

        {(scoreLayout === 'strip' || scoreLayout === 'deck') && publicState.teams && (
          <div
            className={`audience__scores audience__scores--${scoreLayout}`}
            data-testid="display-scores"
          >
            <ScoreLayout teams={publicState.teams} mode={scoreLayout} />
          </div>
        )}
      </footer>
    </div>
  )
}
