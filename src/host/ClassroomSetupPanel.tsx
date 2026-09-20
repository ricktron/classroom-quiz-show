import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TeamDefinition } from '../game/teams/definition'
import { TeamScoreboard } from '../display/TeamScoreboard'
import {
  applyTeamNameInputs,
  claimedSessionTeamNames,
  createTeamNameSelectionState,
  sessionTeamNamesAreUnique,
  type TeamNameSelectionState,
} from '../session/teamNameSelection'
import { canPersistMutations, type PersistLeadership } from './writeAuthority'
import {
  canStartPlay,
  classSetupBuzzerTaskCopy,
  compactReadinessItems,
  currentTaskTitle,
  dominantSetupTask,
  playBlockerExplanation,
  type SetupTaskId,
} from '../session/classroomReadiness'
import type { SonyBuzzTeacherSummary } from '../input/sonyBuzzTeacherReadiness'
import {
  intentFromSonyNameAction,
  shouldAcceptSonyNamePress,
} from '../input/sonyNameSelection'
import type { LocalInputAction } from '../input/logicalAction'
import { isDesktopRuntime } from '../runtime/cqsRuntime'
import { TeamNameSelectionBoard } from './TeamNameSelectionBoard'
import { useOptionalTheme } from '../theme/ThemeProvider'
import './ClassroomSetupPanel.css'

export interface ClassroomSetupObservation {
  readonly teamId: string
  readonly action: LocalInputAction
  readonly at: number
}

export interface ClassroomSetupPanelProps {
  readonly teams: readonly TeamDefinition[]
  readonly teamNameBank: readonly string[]
  readonly initialSessionNames?: Readonly<Record<string, string>>
  readonly leadership: PersistLeadership
  readonly observation: ClassroomSetupObservation | null
  /** Simultaneous Sony edges from one poll — all must apply (S04B). */
  readonly observationBatch?: readonly ClassroomSetupObservation[] | null
  readonly sonyReady: boolean
  /** Same Sony teacher-summary as the detailed Buzzers section. */
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
  readonly displayOpen: boolean
  readonly onOpenDisplay: () => void
  readonly audioUnderstood: boolean
  readonly audioMuted: boolean
  readonly onAudioTest: () => void
  readonly onPanicMute: () => void
  readonly playReady: boolean
  readonly onPlay: () => void
  readonly onSelectedIdentitiesChange: (names: Readonly<Record<string, string>>) => void
  readonly reducedMotion?: boolean
  readonly grayscale?: boolean
}

function seedSelection(
  bank: readonly string[],
  teamIds: readonly string[],
  initialNames: Readonly<Record<string, string>>,
): TeamNameSelectionState {
  const start = createTeamNameSelectionState({ bank, teamIds })
  const manuals = teamIds.flatMap((teamId) => {
    const name = initialNames[teamId]
    return typeof name === 'string' && name.length > 0
      ? [{ kind: 'manual' as const, teamId, name }]
      : []
  })
  return manuals.length === 0 ? start : applyTeamNameInputs(start, manuals).state
}

function teamOrdinalLabel(team: TeamDefinition, index: number): string {
  return team.name.trim().length > 0 ? team.name : `Team ${index + 1}`
}

export function ClassroomSetupPanel({
  teams,
  teamNameBank,
  initialSessionNames = {},
  leadership,
  observation,
  observationBatch = null,
  sonyReady,
  sonyTeacherSummary = null,
  displayOpen,
  onOpenDisplay,
  audioUnderstood,
  audioMuted,
  onAudioTest,
  onPanicMute,
  playReady,
  onPlay,
  onSelectedIdentitiesChange,
  reducedMotion = false,
  grayscale = false,
}: ClassroomSetupPanelProps) {
  const theme = useOptionalTheme()
  const highContrast = theme?.themeId === 'high-contrast'
  const teamIds = useMemo(() => teams.map((team) => team.id), [teams])
  const bankKey = teamNameBank.join('\u0000')
  const initialNamesRef = useRef(initialSessionNames)
  initialNamesRef.current = initialSessionNames
  const [selection, setSelection] = useState<TeamNameSelectionState>(() =>
    seedSelection(teamNameBank, teamIds, initialSessionNames),
  )
  const [buzzerSkipped, setBuzzerSkipped] = useState(false)
  const [focusOverride, setFocusOverride] = useState<SetupTaskId | null>(null)
  const lastPress = useRef<{ teamId: string; intentKey: string; at: number } | null>(null)
  const lastSingleObservationAt = useRef<number>(0)
  const lastBatchKey = useRef<string>('')

  useEffect(() => {
    setSelection(seedSelection(teamNameBank, teamIds, initialNamesRef.current))
    // bankKey is the content identity; array identity must not reset an in-progress class.
    // Session names are re-applied only on this bank/team reset so a live claim
    // does not reshuffle the other teams' visible lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when bank contents or team ids change
  }, [bankKey, teamIds])

  const persistAndPublish = useCallback(
    (state: TeamNameSelectionState) => {
      if (!canPersistMutations(leadership)) return
      onSelectedIdentitiesChange(claimedSessionTeamNames(state))
    },
    [leadership, onSelectedIdentitiesChange],
  )

  const applySonyObservations = useCallback(
    (observations: readonly ClassroomSetupObservation[]) => {
      if (observations.length === 0) return
      setSelection((current) => {
        let state = current
        for (const observation of observations) {
          const intent = intentFromSonyNameAction(observation.action)
          if (!intent) continue
          const intentKey = intent.kind === 'cycle' ? 'cycle' : `claim-${intent.choiceIndex}`
          if (
            !shouldAcceptSonyNamePress({
              teamId: observation.teamId,
              intentKey,
              now: observation.at,
              last: lastPress.current,
            })
          ) {
            continue
          }
          lastPress.current = { teamId: observation.teamId, intentKey, at: observation.at }
          const next = applyTeamNameInputs(state, [
            intent.kind === 'cycle'
              ? { kind: 'cycle', teamId: observation.teamId }
              : { kind: 'claim', teamId: observation.teamId, choiceIndex: intent.choiceIndex },
          ])
          state = next.state
        }
        persistAndPublish(state)
        return state
      })
    },
    [persistAndPublish],
  )

  useEffect(() => {
    // Single-observation path (unit tests / sequential presses).
    if (!observation) return
    if (observation.at === lastSingleObservationAt.current) return
    lastSingleObservationAt.current = observation.at
    applySonyObservations([observation])
  }, [observation, applySonyObservations])

  useEffect(() => {
    // Batch path: every edge from one Gamepad poll (simultaneous teams).
    if (!observationBatch || observationBatch.length === 0) return
    const key = observationBatch.map((o) => `${o.teamId}:${o.at}:${o.action.kind}`).join('|')
    if (key === lastBatchKey.current) return
    lastBatchKey.current = key
    applySonyObservations(observationBatch)
  }, [observationBatch, applySonyObservations])

  const apply = (state: TeamNameSelectionState) => {
    setSelection(state)
    persistAndPublish(state)
  }

  const claimed = claimedSessionTeamNames(selection)
  const namesAssigned = teams.every((team) => typeof claimed[team.id] === 'string')
  const unique = sessionTeamNamesAreUnique(Object.values(claimed))
  const unnamedTeamLabels = teams.flatMap((team, index) =>
    typeof claimed[team.id] === 'string' ? [] : [teamOrdinalLabel(team, index)],
  )
  const guidance = {
    teamCount: teams.length,
    namesAssigned,
    namesUnique: unique,
    sonyReady,
    sonyTeacherSummary,
    keyboardFallbackAvailable: true,
    displayOpen,
    audioUnderstood,
    audioMuted,
    unnamedTeamLabels,
    buzzerSkipped: buzzerSkipped || sonyReady,
    repairActive: false,
    focusOverride: playReady ? null : focusOverride,
  }
  const playEnabled = canStartPlay(guidance)
  const playBlocker = playBlockerExplanation(guidance)
  const currentTask = playReady ? 'play' : dominantSetupTask(guidance)
  const summary = compactReadinessItems(guidance)
  const showNames = !playReady && (currentTask === 'names' || focusOverride === 'names')
  const showDisplay = !playReady && (currentTask === 'display' || focusOverride === 'display')
  const showSound = !playReady && (currentTask === 'sound' || focusOverride === 'sound')
  const showBuzzers = !playReady && (currentTask === 'buzzers' || focusOverride === 'buzzers')
  const namesComplete = namesAssigned && unique
  const claimedList = teams
    .map((team) => claimed[team.id])
    .filter((name): name is string => typeof name === 'string')

  const previewTeams = {
    status: 'available' as const,
    teams: teams.map((team, index) => ({
      key: `t${index}`,
      name: claimed[team.id] ?? team.name,
      accent: team.accent,
      score: 0,
    })),
  }

  const focusTask = (id: SetupTaskId) => {
    setFocusOverride((current) => (current === id ? null : id))
  }

  return (
    <section className="classroom-setup" aria-labelledby="classroom-setup-title" data-testid="classroom-setup">
      <header className="classroom-setup__header">
        <div>
          <h3 id="classroom-setup-title">Class setup</h3>
          <p className="host__note classroom-setup__lede">
            Get this class ready to play. Buzzers are optional.
          </p>
        </div>
        <div className="classroom-setup__emergency">
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="setup-panic-mute"
            onClick={onPanicMute}
          >
            {audioMuted ? 'Sound is muted' : 'Mute all sounds'}
          </button>
        </div>
      </header>

      <nav
        className="classroom-setup__readiness"
        data-testid="classroom-readiness"
        aria-label="Class setup progress"
      >
        {summary.map((item) => (
          <button
            key={item.id}
            type="button"
            className="classroom-setup__chip"
            data-testid={`readiness-${item.id === 'buzzers' ? 'sony' : item.id === 'sound' ? 'audio' : item.id}`}
            data-status={item.status}
            aria-current={currentTask === item.id ? 'step' : undefined}
            onClick={() => focusTask(item.id)}
          >
            <span className="classroom-setup__chip-mark" aria-hidden="true">
              {item.mark}
            </span>
            <span className="classroom-setup__chip-label">{item.label}</span>
            <span className="classroom-setup__chip-status">{item.statusWord}</span>
          </button>
        ))}
      </nav>

      {!playReady && (
        <section
          className="classroom-setup__current"
          aria-labelledby="setup-current-title"
          data-testid="setup-current-task"
          data-task={currentTask}
        >
          <h4 id="setup-current-title">{currentTaskTitle(currentTask)}</h4>

          {currentTask === 'teams' && (
            <p className="host__note">This game still needs 1–8 teams before class names.</p>
          )}

          {showNames && (
            <div className="classroom-setup__task" data-testid="setup-names-task">
              <p className="host__note" data-testid="setup-sony-copy">
                Each team presses Blue, Orange, Green, or Yellow — top to bottom on the controller —
                to choose a name. Red shows four more names for that team only. You can also type a
                name. Keyboard always works.
              </p>
              <TeamNameSelectionBoard
                views={teamIds.map((id) => selection.views[id]!).filter(Boolean)}
                teamLabels={Object.fromEntries(
                  teams.map((team, index) => [team.id, teamOrdinalLabel(team, index)]),
                )}
                onClaim={(teamId, choiceIndex) =>
                  apply(applyTeamNameInputs(selection, [{ kind: 'claim', teamId, choiceIndex }]).state)
                }
                onCycle={(teamId) =>
                  apply(applyTeamNameInputs(selection, [{ kind: 'cycle', teamId }]).state)
                }
                onManual={(teamId, name) =>
                  apply(applyTeamNameInputs(selection, [{ kind: 'manual', teamId, name }]).state)
                }
                onReset={(teamId) =>
                  apply(applyTeamNameInputs(selection, [{ kind: 'reset', teamId }]).state)
                }
                reducedMotion={reducedMotion}
                highContrast={highContrast}
                grayscale={grayscale}
              />
            </div>
          )}

          {!showNames && namesComplete && (
            <p className="classroom-setup__quiet" data-testid="setup-names-summary">
              Names ready: {claimedList.join(', ')}
              <button
                type="button"
                className="btn btn--secondary classroom-setup__revisit"
                data-testid="setup-revisit-names"
                onClick={() => focusTask('names')}
              >
                Change names
              </button>
            </p>
          )}

          {showBuzzers && (
            <div className="classroom-setup__task" data-testid="setup-buzzers-task">
              <p className="host__note" data-testid="setup-buzzers-copy">
                {classSetupBuzzerTaskCopy({ sonyReady, sonyTeacherSummary })}
              </p>
              {!sonyReady && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  data-testid="setup-skip-buzzers"
                  onClick={() => {
                    setBuzzerSkipped(true)
                    setFocusOverride(null)
                  }}
                >
                  Skip buzzers
                </button>
              )}
            </div>
          )}

          {showDisplay && (
            <div className="classroom-setup__task" data-testid="setup-display-task">
              <p className="host__note">
                {isDesktopRuntime()
                  ? 'Open the audience display when you are ready. If this computer has one other screen, Classroom Quiz Show moves the audience display there. If it is still on the wrong screen, move it yourself. The class can still finish setup without it.'
                  : 'Open the audience display on the projector when you are ready. Put that window on the projector yourself. The class can still finish setup without it.'}
              </p>
              <button type="button" className="btn" data-testid="setup-open-display" onClick={onOpenDisplay}>
                {displayOpen ? 'Focus audience display' : 'Open audience display'}
              </button>
            </div>
          )}

          {!showDisplay && displayOpen && currentTask !== 'names' && (
            <p className="classroom-setup__quiet">
              Display is open.
              <button
                type="button"
                className="btn btn--secondary classroom-setup__revisit"
                data-testid="setup-open-display"
                onClick={onOpenDisplay}
              >
                Focus audience display
              </button>
            </p>
          )}

          {showSound && (
            <div className="classroom-setup__task" data-testid="setup-sound-task">
              <p className="host__note">
                Test sound so you know what the class will hear. Mute stays available above if
                things get loud.
              </p>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid="setup-audio-test"
                onClick={onAudioTest}
              >
                Test sound
              </button>
            </div>
          )}

          {!showSound && currentTask !== 'names' && (audioUnderstood || audioMuted) && (
            <p className="classroom-setup__quiet">
              {audioMuted ? 'Sound is muted.' : 'Sound is ready.'}
              <button
                type="button"
                className="btn btn--secondary classroom-setup__revisit"
                data-testid="setup-audio-test"
                onClick={onAudioTest}
              >
                Test sound again
              </button>
            </p>
          )}

          {currentTask === 'play' && (
            <p className="host__note" data-testid="setup-ready-copy">
              Required setup is complete. Play when the class is ready.
            </p>
          )}
        </section>
      )}

      {playReady && namesComplete && (
        <p className="classroom-setup__quiet" data-testid="setup-names-summary">
          Names ready: {claimedList.join(', ')}
        </p>
      )}

      <div className="classroom-setup__outcome">
        <button
          type="button"
          className={`btn classroom-setup__play${playEnabled && !playReady ? ' classroom-setup__play--dominant' : ''}`}
          data-testid="setup-play"
          disabled={!playEnabled}
          aria-describedby={playBlocker ? 'setup-play-blocker' : undefined}
          onClick={onPlay}
        >
          {playReady ? 'Back to setup' : 'Play'}
        </button>
        {playBlocker ? (
          <p id="setup-play-blocker" className="classroom-setup__blocker" data-testid="setup-play-blocker" role="status">
            {playBlocker}
          </p>
        ) : (
          !playReady && (
            <p className="host__note classroom-setup__outcome-note">
              Buzzers are optional. Keyboard controls still work.
            </p>
          )
        )}
      </div>

      {!playReady && (showDisplay || currentTask === 'play') && (
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
      )}

    </section>
  )
}
