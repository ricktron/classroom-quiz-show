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
  unresolvedOptionalFacts,
  type CompactReadinessItem,
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
import { teamSetSignature } from '../input/sonyBuzzSupportedProfile'
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
  /** Navigate to authoring for the active Game (0-team / team-count repair). */
  readonly onEditGame?: () => void
  /**
   * Supported Namtai Wbuzz Gamepad detected (lifted from GamepadInputHostPanel).
   * Unknown/false → keyboard-honest Names copy; never invent colour-press claims.
   */
  readonly wbuzzPresent?: boolean
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

function readinessTestId(id: SetupTaskId): string {
  if (id === 'buzzers') return 'readiness-sony'
  if (id === 'sound') return 'readiness-audio'
  return `readiness-${id}`
}

function rowTestId(id: SetupTaskId): string {
  return `setup-row-${id}`
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
  wbuzzPresent = false,
  displayOpen,
  onOpenDisplay,
  audioUnderstood,
  audioMuted,
  onAudioTest,
  playReady,
  onPlay,
  onEditGame,
  onSelectedIdentitiesChange,
  reducedMotion = false,
  grayscale = false,
}: ClassroomSetupPanelProps) {
  const theme = useOptionalTheme()
  const highContrast = theme?.themeId === 'high-contrast'
  const teamIds = useMemo(() => teams.map((team) => team.id), [teams])
  /** Content identity for roster changes — array reference alone is not enough. */
  const teamSignature = useMemo(() => teamSetSignature(teams), [teams])
  const bankKey = teamNameBank.join('\u0000')
  const initialNamesRef = useRef(initialSessionNames)
  initialNamesRef.current = initialSessionNames
  const [selection, setSelection] = useState<TeamNameSelectionState>(() =>
    seedSelection(teamNameBank, teamIds, initialSessionNames),
  )
  const [buzzerSkipped, setBuzzerSkipped] = useState(false)
  /**
   * Teacher expand pin. `undefined` = follow pure default (required dominant or
   * none when Ready). Does not feed readiness status.
   */
  const [expandOverride, setExpandOverride] = useState<SetupTaskId | null | undefined>(undefined)
  const lastPress = useRef<{ teamId: string; intentKey: string; at: number } | null>(null)
  const lastSingleObservationAt = useRef<number>(0)
  const lastBatchKey = useRef<string>('')
  const prevClassReady = useRef<boolean | null>(null)
  const prevPureDominant = useRef<SetupTaskId | 'play' | null>(null)

  useEffect(() => {
    setSelection(seedSelection(teamNameBank, teamIds, initialNamesRef.current))
    // bankKey / teamSignature are content identity; array identity must not reset
    // an in-progress class. Session names re-apply only on this bank/roster reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when bank contents or team ids change
  }, [bankKey, teamSignature])

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
  }
  const playEnabled = canStartPlay(guidance)
  const playBlocker = playBlockerExplanation(guidance)
  const pureDominant = dominantSetupTask(guidance)
  const classReady = playEnabled && !playReady
  const summary = compactReadinessItems(guidance)
  const optionalFacts = unresolvedOptionalFacts(guidance)
  const namesComplete = namesAssigned && unique
  const claimedList = teams
    .map((team) => claimed[team.id])
    .filter((name): name is string => typeof name === 'string')

  // Genuine transitions: required work completes → drop pin on that required row
  // so Ready stage appears; optional teacher pins survive Ready.
  useEffect(() => {
    const wasReady = prevClassReady.current
    const wasDominant = prevPureDominant.current
    prevClassReady.current = playEnabled
    prevPureDominant.current = pureDominant

    if (wasReady === null) return

    if (!wasReady && playEnabled) {
      setExpandOverride((current) => {
        if (current === undefined) return undefined
        if (current === 'teams' || current === 'names') return undefined
        return current
      })
      return
    }

    if (
      wasDominant &&
      wasDominant !== pureDominant &&
      (wasDominant === 'teams' || wasDominant === 'names') &&
      pureDominant === 'play'
    ) {
      setExpandOverride((current) =>
        current === wasDominant || current === undefined ? undefined : current,
      )
    }
  }, [playEnabled, pureDominant])

  const defaultExpanded: SetupTaskId | null =
    playReady || playEnabled ? null : pureDominant === 'play' ? null : pureDominant
  const expandedTask: SetupTaskId | null =
    expandOverride === undefined ? defaultExpanded : expandOverride

  const emphasizedTask: SetupTaskId | null =
    playReady || playEnabled ? null : pureDominant === 'play' ? null : pureDominant

  const toggleRow = (id: SetupTaskId) => {
    setExpandOverride((current) => {
      const effective = current === undefined ? defaultExpanded : current
      if (effective === id) return null
      return id
    })
  }

  const expandRow = (id: SetupTaskId) => {
    setExpandOverride(id)
  }

  const previewTeams = {
    status: 'available' as const,
    teams: teams.map((team, index) => ({
      key: `t${index}`,
      name: claimed[team.id] ?? team.name,
      accent: team.accent,
      score: 0,
    })),
  }

  const stageTitle = playReady
    ? 'In play'
    : playEnabled
      ? expandedTask
        ? currentTaskTitle(expandedTask)
        : 'Ready'
      : currentTaskTitle(pureDominant === 'play' ? 'names' : pureDominant)

  const renderCollapsedSecondary = (item: CompactReadinessItem) => {
    if (expandedTask === item.id) return null
    if (item.id === 'names' && namesComplete) {
      return (
        <button
          type="button"
          className="btn btn--secondary classroom-setup__row-action"
          data-testid="setup-revisit-names"
          onClick={(event) => {
            event.stopPropagation()
            expandRow('names')
          }}
        >
          Change names
        </button>
      )
    }
    if (item.id === 'buzzers' && !sonyReady && !buzzerSkipped) {
      return (
        <button
          type="button"
          className="btn btn--secondary classroom-setup__row-action"
          data-testid="setup-skip-buzzers"
          onClick={(event) => {
            event.stopPropagation()
            setBuzzerSkipped(true)
          }}
        >
          Skip
        </button>
      )
    }
    if (item.id === 'display' && !displayOpen) {
      return (
        <button
          type="button"
          className="btn btn--secondary classroom-setup__row-action"
          data-testid="setup-open-display"
          onClick={(event) => {
            event.stopPropagation()
            onOpenDisplay()
          }}
        >
          Open display
        </button>
      )
    }
    if (item.id === 'sound' && !audioUnderstood && !audioMuted) {
      return (
        <button
          type="button"
          className="btn btn--secondary classroom-setup__row-action"
          data-testid="setup-audio-test"
          onClick={(event) => {
            event.stopPropagation()
            onAudioTest()
          }}
        >
          Test sound
        </button>
      )
    }
    return null
  }

  const renderStageBody = () => {
    if (playReady) {
      return namesComplete ? (
        <p className="classroom-setup__quiet" data-testid="setup-names-summary">
          Names ready: {claimedList.join(', ')}
        </p>
      ) : null
    }

    if (!expandedTask && playEnabled) {
      return (
        <div className="classroom-setup__ready-stage" data-testid="setup-ready-stage">
          <p className="host__note" data-testid="setup-ready-copy">
            Required setup is complete. Start Game when the class is ready.
          </p>
          {namesComplete && (
            <p className="classroom-setup__quiet" data-testid="setup-names-summary">
              Names ready: {claimedList.join(', ')}
            </p>
          )}
          {optionalFacts.length > 0 && (
            <p className="host__note classroom-setup__optional-facts" data-testid="setup-optional-facts">
              Still optional: {optionalFacts.join(' · ')}
            </p>
          )}
          <div data-testid="setup-display-preview" className="classroom-setup__preview-inline">
            <TeamScoreboard teams={previewTeams} layout={teams.length <= 4 ? 'column' : 'strip'} />
          </div>
        </div>
      )
    }

    if (expandedTask === 'teams') {
      const teamsOk = teams.length >= 1 && teams.length <= 8
      return (
        <div className="classroom-setup__task" data-testid="setup-teams-task">
          <p className="host__note">
            {teamsOk
              ? `${teams.length} team${teams.length === 1 ? '' : 's'} in this game. Change the count in the game editor if needed.`
              : 'This game still needs 1–8 teams before class names. Add teams in the game editor.'}
          </p>
          {onEditGame && (
            <button
              type="button"
              // Teams blocked → Edit may be the primary repair CTA.
              // Teams valid (incl. Ready + Teams revisited) → Edit stays secondary
              // so Start Game remains the sole dominant control when Ready.
              className={teamsOk ? 'btn btn--secondary' : 'btn'}
              data-testid="setup-edit-game"
              onClick={onEditGame}
            >
              Edit this game
            </button>
          )}
        </div>
      )
    }

    if (expandedTask === 'names') {
      // Teams not ready → Names blocked: no empty / nonsensical name board.
      if (teams.length < 1 || teams.length > 8) {
        return (
          <div className="classroom-setup__task" data-testid="setup-names-task">
            <p className="host__note" data-testid="setup-names-blocked-copy">
              Finish teams before choosing names.
            </p>
          </div>
        )
      }
      return (
        <div className="classroom-setup__task" data-testid="setup-names-task">
          <p className="host__note" data-testid="setup-sony-copy">
            {wbuzzPresent
              ? 'Each team presses Blue, Orange, Green, or Yellow — top to bottom on the controller — to choose a name. Red shows four more names for that team only. You can also type a name. Keyboard always works.'
              : 'Type a name for each team, or pick from the name choices. Keyboard always works.'}
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
      )
    }

    if (expandedTask === 'buzzers') {
      return (
        <div className="classroom-setup__task" data-testid="setup-buzzers-task">
          {playEnabled && (
            <p className="classroom-setup__optional-tag" data-testid="setup-optional-tag">
              Optional
            </p>
          )}
          <p className="host__note" data-testid="setup-buzzers-copy">
            {classSetupBuzzerTaskCopy({ sonyReady, sonyTeacherSummary })}
          </p>
          <p className="host__note">
            Connect controllers in the Buzzers section below. This row does not remount that panel.
          </p>
          {!sonyReady && !buzzerSkipped && (
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="setup-skip-buzzers"
              onClick={() => setBuzzerSkipped(true)}
            >
              Skip buzzers
            </button>
          )}
        </div>
      )
    }

    if (expandedTask === 'display') {
      return (
        <div className="classroom-setup__task" data-testid="setup-display-task">
          {playEnabled && (
            <p className="classroom-setup__optional-tag" data-testid="setup-optional-tag">
              Optional
            </p>
          )}
          <p className="host__note">
            {isDesktopRuntime()
              ? 'Open the audience display when you are ready. If this computer has one other screen, Classroom Quiz Show moves the audience display there. If that window is off every connected screen (for example after a projector disconnect), choose Focus audience display again and the desktop app brings it back onto a connected screen—usually the one with the Host. If it is still on the wrong screen, move it yourself. The class can still start without it.'
              : 'Open the audience display on the projector when you are ready. Put that window on the projector yourself. The class can still start without it.'}
          </p>
          <p className="host__note" data-testid="setup-display-fact">
            {displayOpen ? 'Window open.' : 'Window not open.'}
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="setup-open-display"
            onClick={onOpenDisplay}
          >
            {displayOpen ? 'Focus audience display' : 'Open audience display'}
          </button>
          <div data-testid="setup-display-preview" className="classroom-setup__preview-inline">
            <TeamScoreboard teams={previewTeams} layout={teams.length <= 4 ? 'column' : 'strip'} />
          </div>
        </div>
      )
    }

    if (expandedTask === 'sound') {
      return (
        <div className="classroom-setup__task" data-testid="setup-sound-task">
          {playEnabled && (
            <p className="classroom-setup__optional-tag" data-testid="setup-optional-tag">
              Optional
            </p>
          )}
          <p className="host__note">
            Test sound so you know what the class will hear. Mute stays available in Host controls if
            things get loud.
          </p>
          <p className="host__note" data-testid="setup-sound-fact">
            {audioMuted ? 'Sound muted.' : audioUnderstood ? 'Sound tested.' : 'Sound not tested.'}
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="setup-audio-test"
            onClick={onAudioTest}
          >
            {audioUnderstood || audioMuted ? 'Test sound again' : 'Test sound'}
          </button>
        </div>
      )
    }

    return null
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
      </header>

      <div className="classroom-setup__workspace">
        <div
          className="classroom-setup__rail"
          data-testid="classroom-readiness"
          role="list"
          aria-label="Class setup readiness"
        >
          {summary.map((item) => {
            const expanded = expandedTask === item.id
            const emphasized = emphasizedTask === item.id
            return (
              <div
                key={item.id}
                role="listitem"
                className={[
                  'classroom-setup__row',
                  expanded ? 'classroom-setup__row--expanded' : '',
                  emphasized ? 'classroom-setup__row--emphasized' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-testid={rowTestId(item.id)}
                data-status={item.status}
                data-expanded={expanded ? 'true' : 'false'}
                data-emphasized={emphasized ? 'true' : 'false'}
              >
                <div className="classroom-setup__row-line">
                  <button
                    type="button"
                    className="classroom-setup__row-summary"
                    data-testid={readinessTestId(item.id)}
                    data-status={item.status}
                    aria-expanded={expanded}
                    aria-controls={`setup-stage-${item.id}`}
                    onClick={() => toggleRow(item.id)}
                  >
                    <span className="classroom-setup__row-mark" aria-hidden="true">
                      {item.mark}
                    </span>
                    <span className="classroom-setup__row-label">{item.label}</span>
                    <span className="classroom-setup__row-status">{item.statusWord}</span>
                    <span className="classroom-setup__row-detail">{item.detail}</span>
                  </button>
                  {renderCollapsedSecondary(item)}
                </div>
              </div>
            )
          })}
        </div>

        {!playReady && (
          <section
            className="classroom-setup__stage"
            aria-labelledby="setup-stage-title"
            data-testid="setup-current-task"
            data-task={expandedTask ?? (playEnabled ? 'play' : pureDominant)}
            id={expandedTask ? `setup-stage-${expandedTask}` : 'setup-stage-ready'}
          >
            <h4 id="setup-stage-title">{stageTitle}</h4>
            {renderStageBody()}
          </section>
        )}
      </div>

      {playReady && namesComplete && (
        <p className="classroom-setup__quiet" data-testid="setup-names-summary">
          Names ready: {claimedList.join(', ')}
        </p>
      )}

      <div
        className={`classroom-setup__outcome${classReady ? ' classroom-setup__outcome--ready' : ''}`}
        data-testid="setup-outcome-strip"
      >
        {classReady && (
          <p className="classroom-setup__ready-heading" data-testid="setup-ready-heading" role="status">
            ✓ Ready
          </p>
        )}
        <div className="classroom-setup__outcome-actions">
          <button
            type="button"
            className={`btn classroom-setup__play${classReady ? ' classroom-setup__play--dominant' : ''}`}
            data-testid="setup-play"
            disabled={playReady ? false : !playEnabled}
            aria-describedby={!playReady && playBlocker ? 'setup-play-blocker' : undefined}
            onClick={onPlay}
          >
            {playReady ? 'Back to setup' : 'Start Game'}
          </button>
          {classReady && !displayOpen && (
            <button
              type="button"
              className="btn btn--secondary classroom-setup__secondary-display"
              data-testid="setup-open-display-secondary"
              onClick={onOpenDisplay}
            >
              Open display
            </button>
          )}
        </div>
        {!playReady && playBlocker ? (
          <p
            id="setup-play-blocker"
            className="classroom-setup__blocker"
            data-testid="setup-play-blocker"
            role="status"
          >
            {playBlocker}
          </p>
        ) : (
          !playReady &&
          !classReady && (
            <p className="host__note classroom-setup__outcome-note">
              Buzzers are optional. Keyboard controls still work.
            </p>
          )
        )}
        {classReady && optionalFacts.length > 0 && (
          <p className="host__note classroom-setup__outcome-note" data-testid="setup-ready-status" role="status">
            {optionalFacts.join(' · ')}
          </p>
        )}
      </div>
    </section>
  )
}
