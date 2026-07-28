import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { findTeamById } from '../game/teams/definition'
import {
  describeGamepadControl,
  EMPTY_GAMEPAD_MAPPING,
  gamepadControlForTeamAction,
  pruneUnknownGamepadTeams,
  validateGamepadMapping,
  withGamepadControlForTeamAction,
  type GamepadControlRef,
  type GamepadMapping,
  type GamepadMappingIssue,
} from '../input/gamepadMapping'
import { controllerLabel, type GamepadSource } from '../input/gamepadSource'
import { GAMEPAD_IGNORE_MESSAGE } from '../input/gamepadAdapter'
import {
  LOCAL_INPUT_ACTION_LABEL,
  PRIMARY_BUZZ,
  SECONDARY_ACTION_SLOTS,
  secondaryActionLabel,
  type LocalInputAction,
  type SecondaryActionSlot,
} from '../input/logicalAction'
import { LOCAL_INPUT_TRANSLATION_MESSAGE } from '../input/commandTranslation'
import { responseOpportunityFor } from './responseOpportunity'
import {
  INITIAL_GAMEPAD_DIAGNOSTICS,
  useGamepadBuzzInput,
  type GamepadBuzzOutcome,
  type GamepadDiagnostics,
  type GamepadPollScheduler,
} from './useGamepadBuzzInput'
import {
  SonyBuzzSetupSection,
  type SonyBuzzTestObservation,
} from './SonyBuzzSetupSection'
import { systemClock, type Clock } from '../time/clock'
import './GamepadInputHostPanel.css'

/**
 * Host controls for GENERIC controller input (Slice 9).
 *
 * The sibling of the keyboard half of the local-input area, kept as a separate
 * bounded panel for the same reason every other panel is bounded: this one
 * configures CONTROLLER input and nothing else. It reveals nothing, times
 * nothing, scores nothing, arms nothing, and it owns no part of the buzz queue —
 * the queue stays in the buzz-in panel where Slice 8 put it.
 *
 * ## What a teacher must be able to do here
 *
 * See whether this browser offers controller input at all, see whether it is
 * switched on, see how many controllers are attached and how many buttons each
 * has, see which button belongs to which team, assign one by pressing it, cancel
 * an assignment, clear one, clear the lot, be told about a conflict BEFORE
 * anything is overwritten, and understand why a press did nothing — while
 * **keyboard buzzing keeps working the entire time**.
 *
 * ## Never here
 *
 * No "supported hardware" claim, no raw array, no raw JSON, no axis, no analog
 * reading, no vibration, and no live per-frame button display. A controller is
 * "Controller 1"; a button is "button 3". Device candidate classification and the
 * guided Sony Buzz! capture recipe live in the bounded child setup section —
 * still host-private, still session-local, still never claimed as physical proof.
 *
 * ## Off by default
 *
 * Controller buzzing starts SWITCHED OFF. Nothing is bound until a teacher binds
 * it, so an enabled adapter would do nothing anyway — and a controller left
 * plugged into a shared classroom laptop should not be able to reach the game
 * until somebody deliberately says so.
 */

export interface GamepadInputHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /** Injectable clock — the dispatch edge, and the only place `now` is read. */
  readonly clock?: Clock
  /** Injectable Gamepad source. Defaults to this browser's Gamepad API. */
  readonly source?: GamepadSource
  /** Injectable poll scheduler. Defaults to one `requestAnimationFrame` loop. */
  readonly scheduler?: GamepadPollScheduler
}

/** What the panel is currently doing about button capture. */
type CaptureState =
  | { readonly mode: 'idle' }
  | { readonly mode: 'capturing'; readonly teamId: string; readonly action: LocalInputAction }
  /** Guided Sony Buzz! setup capture — edges stage in the child, not the active mapping. */
  | { readonly mode: 'sony-setup' }

/** The actions a teacher may bind, in the order they are offered. */
const BINDABLE_ACTIONS: readonly LocalInputAction[] = [
  PRIMARY_BUZZ,
  ...SECONDARY_ACTION_SLOTS.map(
    (slot): LocalInputAction => ({ kind: 'secondary', slot }),
  ),
]

function actionKey(action: LocalInputAction): string {
  return action.kind === 'secondary' ? action.slot : action.kind
}

function actionLabel(action: LocalInputAction): string {
  return action.kind === 'secondary'
    ? secondaryActionLabel(action.slot)
    : LOCAL_INPUT_ACTION_LABEL[action.kind]
}

function actionFromKey(key: string): LocalInputAction {
  if (key === 'primary-buzz') return PRIMARY_BUZZ
  return { kind: 'secondary', slot: key as SecondaryActionSlot }
}

export function GamepadInputHostPanel({
  dispatch,
  game,
  clock = systemClock,
  source,
  scheduler,
}: GamepadInputHostPanelProps) {
  const teams = game.definition.teams

  const [enabled, setEnabled] = useState(false)
  const [capture, setCapture] = useState<CaptureState>({ mode: 'idle' })
  const [captureMessage, setCaptureMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<readonly GamepadMappingIssue[]>([])
  const [lastOutcome, setLastOutcome] = useState<GamepadBuzzOutcome | null>(null)
  const [mapping, setMapping] = useState<GamepadMapping>(EMPTY_GAMEPAD_MAPPING)
  const [diagnostics, setDiagnostics] = useState<GamepadDiagnostics>(
    INITIAL_GAMEPAD_DIAGNOSTICS,
  )
  /** Which action the next capture assigns. Host UI state, per panel. */
  const [pendingActionKey, setPendingActionKey] = useState<string>('primary-buzz')
  const [testMode, setTestMode] = useState(false)
  const [sonyPendingCapture, setSonyPendingCapture] = useState<GamepadControlRef | null>(null)
  const [lastTestObservation, setLastTestObservation] =
    useState<SonyBuzzTestObservation | null>(null)

  // The loaded game can change under the panel. Bindings for teams that no longer
  // exist are pruned rather than left pointing at nothing; a RENAMED team keeps
  // its id and therefore its button.
  const loadedTeamsKey = teams.map((team) => team.id).join('|')
  const appliedTeamsKey = useRef(loadedTeamsKey)
  useEffect(() => {
    if (appliedTeamsKey.current === loadedTeamsKey) return
    appliedTeamsKey.current = loadedTeamsKey
    setMapping((current) => pruneUnknownGamepadTeams(current, teams))
    setIssues([])
    setCapture({ mode: 'idle' })
    setTestMode(false)
    setSonyPendingCapture(null)
    setLastTestObservation(null)
  }, [loadedTeamsKey, teams])

  const target = useMemo(() => responseOpportunityFor(game), [game])
  const capturing = capture.mode === 'capturing' || capture.mode === 'sony-setup'

  // The poll loop holds `onCapture` across renders, so what it needs is read from
  // refs at CALL time rather than closed over at render time. Deliberately not
  // nested state updaters: an updater must be pure, and queueing one setter from
  // inside another is exactly the impurity React warns about.
  const latestCapture = useRef(capture)
  latestCapture.current = capture
  const latestMapping = useRef(mapping)
  latestMapping.current = mapping

  const onCapture = useCallback(
    (control: GamepadControlRef) => {
      const pending = latestCapture.current
      if (pending.mode === 'sony-setup') {
        // End capture immediately so the next guided prompt can start cleanly.
        setCapture({ mode: 'idle' })
        setSonyPendingCapture(control)
        return
      }
      if (pending.mode !== 'capturing') return
      setCapture({ mode: 'idle' })

      const next = withGamepadControlForTeamAction(
        latestMapping.current,
        pending.teamId,
        pending.action,
        control,
      )
      const validation = validateGamepadMapping(next, teams)
      if (!validation.ok) {
        // Nothing is overwritten: the conflict is reported and the existing
        // assignment is left exactly as it was.
        setCaptureMessage(validation.issues[0]?.message ?? 'That button could not be assigned.')
        return
      }
      setIssues([])
      setMapping(validation.mapping)
      setCaptureMessage(
        `${describeGamepadControl(control)} assigned to ${
          findTeamById(teams, pending.teamId)?.name ?? pending.teamId
        } for ${actionLabel(pending.action).toLowerCase()}.`,
      )
    },
    [teams],
  )

  const onOutcome = useCallback((outcome: GamepadBuzzOutcome) => {
    setLastOutcome(outcome)
    if (outcome.kind === 'test-observation') {
      setLastTestObservation({
        teamId: outcome.teamId,
        action: outcome.action,
        control: outcome.control,
      })
    }
  }, [])

  useGamepadBuzzInput({
    enabled,
    capturing,
    testMode,
    mapping,
    target,
    dispatch,
    clock,
    source,
    scheduler,
    onOutcome,
    onDiagnostics: setDiagnostics,
    onCapture,
  })

  const applyMapping = useCallback(
    (next: GamepadMapping): boolean => {
      const validation = validateGamepadMapping(next, teams)
      if (!validation.ok) {
        setIssues(validation.issues)
        return false
      }
      setIssues([])
      setMapping(validation.mapping)
      return true
    },
    [teams],
  )

  const onSonyCapturingChange = useCallback((next: boolean) => {
    if (next) {
      setCapture({ mode: 'sony-setup' })
      setTestMode(false)
      return
    }
    setCapture((current) => (current.mode === 'sony-setup' ? { mode: 'idle' } : current))
  }, [])

  const onSonyTestModeChange = useCallback((next: boolean) => {
    setTestMode(next)
    if (next) setCapture({ mode: 'idle' })
    if (!next) setLastTestObservation(null)
  }, [])

  const onSonyPendingCaptureConsumed = useCallback(() => {
    setSonyPendingCapture(null)
  }, [])

  if (game.gameLifecycle !== 'active') return null
  if (teams.length === 0) return null

  const supported = diagnostics.status !== 'unsupported'
  const readable = diagnostics.status === 'ok'
  const controllers = diagnostics.controllers
  const nameOf = (id: string) => findTeamById(teams, id)?.name ?? id
  const pendingAction = actionFromKey(pendingActionKey)

  return (
    <section className="gih" aria-labelledby="gih-title">
      <div className="foundation__tag foundation__tag--slice9">
        Controller input (Slice 9) — host controls, private
      </div>
      <h3 id="gih-title">Controllers</h3>

      <dl className="gih__summary" data-testid="gih-summary">
        <dt>Controller support</dt>
        {/* Stated in words, never by colour alone. */}
        <dd data-testid="gih-support">{describeSupport(diagnostics.status)}</dd>
        <dt>Controller buzzing</dt>
        <dd data-testid="gih-enabled">{enabled ? 'On' : 'Off'}</dd>
        <dt>Connected</dt>
        <dd data-testid="gih-count">
          {controllers.length === 0
            ? 'None detected'
            : `${controllers.length} ${controllers.length === 1 ? 'controller' : 'controllers'}`}
        </dd>
      </dl>

      {/*
        One polite live region for connection changes. Polite rather than
        assertive, and driven only by the STABLE picture (which controllers exist
        and how many buttons each has) — never by button state, so plugging a
        controller in announces once instead of chattering every frame.
      */}
      <p className="host__note" data-testid="gih-controllers" aria-live="polite">
        {controllers.length === 0
          ? 'No controller detected. Keyboard buzzing remains available.'
          : controllers
              .map(
                (controller) =>
                  `${controllerLabel(controller.controllerIndex)}: ${controller.buttonCount} ${
                    controller.buttonCount === 1 ? 'button' : 'buttons'
                  }`,
              )
              .join(' · ')}
      </p>

      <div className="gih__actions" role="group" aria-label="Controller input">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="gih-toggle"
          aria-pressed={enabled}
          disabled={!supported}
          onClick={() => setEnabled((value) => !value)}
        >
          {enabled ? 'Turn controller buzzing off' : 'Turn controller buzzing on'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="gih-clear-all"
          disabled={mapping.bindings.length === 0}
          onClick={() => {
            setCapture({ mode: 'idle' })
            applyMapping(EMPTY_GAMEPAD_MAPPING)
            setCaptureMessage('All controller buttons cleared for this session.')
          }}
        >
          Clear all controller buttons
        </button>
      </div>

      {!supported && (
        <p className="host__note" data-testid="gih-unsupported">
          This browser does not offer controller input, so the controls above are
          unavailable. Keyboard buzzing remains available and is unaffected.
        </p>
      )}
      {supported && !readable && (
        <p className="host__note" data-testid="gih-unreadable">
          Controller state could not be read in this browser. Nothing was buzzed.
          Keyboard buzzing remains available.
        </p>
      )}

      <h4 className="gih__heading">Assign a button</h4>
      <p className="host__note" data-testid="gih-lifetime-note">
        Controller buttons are settings for this browser tab only. They are not
        part of the game file, not part of the game’s history, and{' '}
        <strong>they are lost when this page reloads</strong>. Only the buzz action
        does anything in this version — the other actions can be assigned and are
        deliberately inert.
      </p>

      <div className="gih__action-picker">
        <label htmlFor="gih-action">Action to assign</label>
        <select
          id="gih-action"
          data-testid="gih-action"
          value={pendingActionKey}
          disabled={capturing || testMode}
          onChange={(event) => setPendingActionKey(event.target.value)}
        >
          {BINDABLE_ACTIONS.map((action) => (
            <option key={actionKey(action)} value={actionKey(action)}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
      </div>

      <ul className="gih__bindings" data-testid="gih-bindings">
        {teams.map((team) => {
          const control = gamepadControlForTeamAction(mapping, team.id, pendingAction)
          const isCapturing =
            capture.mode === 'capturing' && capture.teamId === team.id
          return (
            <li key={team.id} className="gih__binding-row">
              <span className="gih__binding-team">{team.name}</span>
              <span className="gih__binding-control" data-testid={`gih-control-${team.id}`}>
                {isCapturing
                  ? 'Press a button…'
                  : control === null
                    ? 'Not assigned'
                    : describeGamepadControl(control)}
              </span>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid={`gih-capture-${team.id}`}
                disabled={
                  !supported ||
                  testMode ||
                  capture.mode === 'sony-setup' ||
                  (capturing && !isCapturing)
                }
                aria-label={
                  isCapturing
                    ? `Cancel assigning a controller button for ${team.name}`
                    : `Assign a controller button for ${team.name}, ${actionLabel(pendingAction)}`
                }
                onClick={() => {
                  if (isCapturing) {
                    setCapture({ mode: 'idle' })
                    setCaptureMessage('Cancelled. The assignment was left as it was.')
                    return
                  }
                  setCapture({ mode: 'capturing', teamId: team.id, action: pendingAction })
                  setCaptureMessage(
                    `Press the controller button ${team.name} should use. Use the Cancel button to stop.`,
                  )
                }}
              >
                {isCapturing ? 'Cancel' : 'Assign'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid={`gih-clear-${team.id}`}
                aria-label={`Clear the controller button for ${team.name}`}
                disabled={control === null}
                onClick={() => {
                  applyMapping(
                    withGamepadControlForTeamAction(mapping, team.id, pendingAction, null),
                  )
                  setCaptureMessage(`Controller button cleared for ${team.name}.`)
                }}
              >
                Clear
              </button>
            </li>
          )
        })}
      </ul>

      {/* One polite live region for capture state and conflicts. */}
      <p className="host__note" data-testid="gih-capture-status" aria-live="polite">
        {captureMessage ?? ''}
      </p>

      {issues.length > 0 && (
        <ul className="gih__issues" data-testid="gih-issues">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      )}

      <p className="host__note" data-testid="gih-outcome" aria-live="polite">
        {describeOutcome(lastOutcome, nameOf)}
      </p>

      <p className="host__note gih__hint">
        A controller press behaves exactly like a buzz key press: it counts only
        while the clue is armed, the first accepted team answers, and the rest
        queue up. Keyboard buzzing works whether or not a controller is attached.
      </p>

      <SonyBuzzSetupSection
        teams={teams}
        controllers={controllers}
        diagnosticsStatus={diagnostics.status}
        activeMapping={mapping}
        onApplyMapping={applyMapping}
        capturing={capture.mode === 'sony-setup'}
        onCapturingChange={onSonyCapturingChange}
        testMode={testMode}
        onTestModeChange={onSonyTestModeChange}
        lastTestObservation={lastTestObservation}
        pendingCapture={sonyPendingCapture}
        onPendingCaptureConsumed={onSonyPendingCaptureConsumed}
      />
    </section>
  )
}

/** Host-facing sentence for each read status. Host-only copy — never projected. */
function describeSupport(status: GamepadDiagnostics['status']): string {
  switch (status) {
    case 'ok':
      return 'Available in this browser'
    case 'unreadable':
      return 'Available, but this browser refused the last read'
    case 'unsupported':
    default:
      return 'Not available in this browser'
  }
}

/**
 * Explain the most recent press in one sentence. HOST-ONLY copy.
 *
 * A teacher whose controller seems dead needs to be told why, and "nothing
 * happened" is the one answer that helps nobody. Every reason the input edge, the
 * translator or the planner can refuse a press has a sentence here.
 */
function describeOutcome(
  outcome: GamepadBuzzOutcome | null,
  nameOf: (id: string) => string,
): string {
  if (outcome === null) return 'No controller buttons pressed yet.'
  switch (outcome.kind) {
    case 'accepted':
      return `${nameOf(outcome.teamId)} buzzed in from a controller.`
    case 'ignored':
      return GAMEPAD_IGNORE_MESSAGE[outcome.reason]
    case 'untranslated':
      return LOCAL_INPUT_TRANSLATION_MESSAGE[outcome.reason]
    case 'refused':
      return REFUSAL_MESSAGE[outcome.reason] ?? 'That press was not accepted.'
    case 'test-observation':
      return `Test mode observed ${nameOf(outcome.teamId)} — no gameplay change.`
    default:
      return 'That press was not accepted.'
  }
}

/**
 * Host-facing copy for the planner rejections a controller press can produce.
 *
 * Deliberately partial, exactly as the keyboard panel's is: the panel falls back
 * to a neutral sentence rather than carrying a message for every rejection in the
 * engine.
 */
const REFUSAL_MESSAGE: Partial<Record<string, string>> = {
  'response-phase-not-armed': 'The clue is not armed, so that press did nothing.',
  'team-already-buzzed': 'That team has already buzzed for this clue.',
  'invalid-board-stage': 'There is no open prompt to buzz on.',
  'tile-mismatch': 'That press was for a clue that is no longer open.',
  'unknown-team': 'That button is assigned to a team this game does not have.',
  'no-teams-configured': 'This game has no teams, so nobody can buzz.',
  'game-already-ended': 'The game has ended.',
  'round-mismatch': 'That press was for a round that is no longer current.',
}
