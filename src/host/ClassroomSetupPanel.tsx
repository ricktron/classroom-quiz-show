import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TeamDefinition } from '../game/teams/definition'
import { TeamScoreboard } from '../display/TeamScoreboard'
import type { PersistLeadership } from './writeAuthority'
import {
  applyTeamNameInputs,
  claimedSessionTeamNames,
  createTeamNameSelectionState,
  sessionTeamNamesAreUnique,
  type TeamNameSelectionState,
} from '../session/teamNameSelection'
import {
  namesByTeamOrder,
  writeSessionTeamIdentities,
} from '../session/sessionTeamIdentities'
import { canStartPlay, classroomReadinessItems } from '../session/classroomReadiness'
import {
  intentFromSonyNameAction,
  shouldAcceptSonyNamePress,
} from '../input/sonyNameSelection'
import type { LocalInputAction } from '../input/logicalAction'
import { TeamNameSelectionBoard } from './TeamNameSelectionBoard'
import { useOptionalTheme } from '../theme/ThemeProvider'
import './ClassroomSetupPanel.css'

export interface ClassroomSetupObservation {
  readonly teamId: string
  readonly action: LocalInputAction
  readonly at: number
}

export interface ClassroomSetupPanelProps {
  readonly sessionId: string
  readonly gameId: string
  readonly teams: readonly TeamDefinition[]
  readonly teamNameBank: readonly string[]
  readonly leadership: PersistLeadership
  readonly observation: ClassroomSetupObservation | null
  readonly sonyReady: boolean
  readonly displayOpen: boolean
  readonly onOpenDisplay: () => void
  readonly audioUnderstood: boolean
  readonly audioMuted: boolean
  readonly onAudioTest: () => void
  readonly onPanicMute: () => void
  readonly playReady: boolean
  readonly onPlay: () => void
  readonly onSessionNamesChange: (namesByOrder: readonly string[]) => void
  readonly reducedMotion?: boolean
  readonly grayscale?: boolean
}

function defaultNames(teams: readonly TeamDefinition[]): Record<string, string> {
  const names: Record<string, string> = {}
  for (const team of teams) names[team.id] = team.name
  return names
}

export function ClassroomSetupPanel({
  sessionId,
  gameId,
  teams,
  teamNameBank,
  leadership,
  observation,
  sonyReady,
  displayOpen,
  onOpenDisplay,
  audioUnderstood,
  audioMuted,
  onAudioTest,
  onPanicMute,
  playReady,
  onPlay,
  onSessionNamesChange,
  reducedMotion = false,
  grayscale = false,
}: ClassroomSetupPanelProps) {
  const theme = useOptionalTheme()
  const highContrast = theme?.themeId === 'high-contrast'
  const teamIds = useMemo(() => teams.map((team) => team.id), [teams])
  const bankKey = teamNameBank.join('\u0000')
  const [selection, setSelection] = useState<TeamNameSelectionState>(() =>
    createTeamNameSelectionState({ bank: teamNameBank, teamIds }),
  )
  const lastPress = useRef<{ teamId: string; intentKey: string; at: number } | null>(null)
  const lastObservationAt = useRef<number>(0)

  useEffect(() => {
    setSelection(createTeamNameSelectionState({ bank: teamNameBank, teamIds }))
    // bankKey is the content identity; array identity must not reset an in-progress class.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when bank contents or team ids change
  }, [bankKey, teamIds])

  const persistAndPublish = useCallback(
    (state: TeamNameSelectionState) => {
      const claimed = claimedSessionTeamNames(state)
      const merged = { ...defaultNames(teams), ...claimed }
      writeSessionTeamIdentities({ sessionId, gameId, names: merged }, leadership)
      onSessionNamesChange(namesByTeamOrder(teamIds, merged, teams.map((team) => team.name)))
    },
    [sessionId, gameId, leadership, teams, teamIds, onSessionNamesChange],
  )

  useEffect(() => {
    persistAndPublish(selection)
    // Publish once after mount/defaults so Display can show Game defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time publish of defaults
  }, [])

  useEffect(() => {
    if (!observation || observation.at === lastObservationAt.current) return
    lastObservationAt.current = observation.at
    const intent = intentFromSonyNameAction(observation.action)
    if (!intent) return
    const intentKey = intent.kind === 'cycle' ? 'cycle' : `claim-${intent.choiceIndex}`
    if (
      !shouldAcceptSonyNamePress({
        teamId: observation.teamId,
        intentKey,
        now: observation.at,
        last: lastPress.current,
      })
    ) {
      return
    }
    lastPress.current = { teamId: observation.teamId, intentKey, at: observation.at }
    setSelection((current) => {
      const next = applyTeamNameInputs(current, [
        intent.kind === 'cycle'
          ? { kind: 'cycle', teamId: observation.teamId }
          : { kind: 'claim', teamId: observation.teamId, choiceIndex: intent.choiceIndex },
      ])
      persistAndPublish(next.state)
      return next.state
    })
  }, [observation, persistAndPublish])

  const apply = (state: TeamNameSelectionState) => {
    setSelection(state)
    persistAndPublish(state)
  }

  const claimed = claimedSessionTeamNames(selection)
  const merged = { ...defaultNames(teams), ...claimed }
  const unique = sessionTeamNamesAreUnique(Object.values(merged))
  const readiness = classroomReadinessItems({
    teamCount: teams.length,
    namesAssigned: Object.keys(merged).length === teams.length,
    namesUnique: unique,
    sonyReady,
    keyboardFallbackAvailable: true,
    displayOpen,
    audioUnderstood,
    audioMuted,
  })
  const playEnabled = canStartPlay({
    teamCount: teams.length,
    namesAssigned: Object.keys(merged).length === teams.length,
    namesUnique: unique,
    sonyReady,
    keyboardFallbackAvailable: true,
    displayOpen,
    audioUnderstood,
    audioMuted,
  })

  const previewTeams = {
    status: 'available' as const,
    teams: teams.map((team, index) => ({
      key: `t${index}`,
      name: merged[team.id] ?? team.name,
      accent: team.accent,
      score: 0,
    })),
  }

  return (
    <section className="classroom-setup" aria-labelledby="classroom-setup-title" data-testid="classroom-setup">
      <h3 id="classroom-setup-title">Class setup</h3>
      <p className="host__note">
        Teams pick names together. Buzzers are optional. Keyboard and typing always work.
      </p>

      <ol className="classroom-setup__readiness" data-testid="classroom-readiness">
        {readiness.map((item) => (
          <li key={item.id} data-testid={`readiness-${item.id}`} data-tone={item.tone}>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ol>

      <div className="classroom-setup__actions">
        <button type="button" className="btn" data-testid="setup-open-display" onClick={onOpenDisplay}>
          {displayOpen ? 'Focus audience display' : 'Open audience display'}
        </button>
        <button type="button" className="btn btn--secondary" data-testid="setup-audio-test" onClick={onAudioTest}>
          Test sound
        </button>
        <button type="button" className="btn btn--destructive" data-testid="setup-panic-mute" onClick={onPanicMute}>
          Mute all sounds
        </button>
        <button
          type="button"
          className="btn"
          data-testid="setup-play"
          disabled={!playEnabled}
          onClick={onPlay}
        >
          {playReady ? 'Back to setup' : 'Play'}
        </button>
      </div>

      {!playReady && (
        <>
          <h4>Team names</h4>
          <p className="host__note" data-testid="setup-sony-copy">
            If Sony Buzz controllers are connected, each team presses Yellow, Green, Orange, or
            Blue to choose. Red shows four more names for that team only. Keyboard and typed names
            stay available if a buzzer fails.
          </p>
          <TeamNameSelectionBoard
            views={teamIds.map((id) => selection.views[id]!).filter(Boolean)}
            teamLabels={Object.fromEntries(teams.map((team) => [team.id, team.name]))}
            onClaim={(teamId, choiceIndex) =>
              apply(applyTeamNameInputs(selection, [{ kind: 'claim', teamId, choiceIndex }]).state)
            }
            onCycle={(teamId) => apply(applyTeamNameInputs(selection, [{ kind: 'cycle', teamId }]).state)}
            onManual={(teamId, name) =>
              apply(applyTeamNameInputs(selection, [{ kind: 'manual', teamId, name }]).state)
            }
            onReset={(teamId) => apply(applyTeamNameInputs(selection, [{ kind: 'reset', teamId }]).state)}
            reducedMotion={reducedMotion}
            highContrast={highContrast}
            grayscale={grayscale}
          />
          <section className="classroom-setup__preview" aria-labelledby="display-preview-title">
            <h4 id="display-preview-title">Audience preview</h4>
            <p className="host__note">
              This is what the class scoreboard will show. It is a host preview, not the projector
              window.
            </p>
            <div data-testid="setup-display-preview">
              <TeamScoreboard teams={previewTeams} layout={teams.length <= 4 ? 'column' : 'strip'} />
            </div>
          </section>
        </>
      )}
    </section>
  )
}
