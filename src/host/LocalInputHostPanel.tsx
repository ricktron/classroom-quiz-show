import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { categoryBoardStateFor, responsePhaseFor } from '../state/reducer'
import { readCategoryBoardDefinition } from '../game/categoryBoard/definition'
import { findTeamById } from '../game/teams/definition'
import {
  ACTIVE_RESPONSE_RESOLUTION_LABEL,
  activeRespondent,
  buzzQueueStatus,
  waitingRespondents,
} from '../game/timing/buzzQueue'
import {
  defaultKeyboardMapping,
  primaryKeyForTeam,
  validateKeyboardMapping,
  withPrimaryKeyForTeam,
  type KeyboardMapping,
  type KeyboardMappingIssue,
} from '../input/keyboardMapping'
import {
  browserLocalConfigStorage,
  clearKeyboardMapping,
  KEYBOARD_MAPPING_LOAD_MESSAGE,
  loadKeyboardMapping,
  saveKeyboardMapping,
  type LocalConfigStorage,
} from '../input/keyboardMappingStore'
import {
  describeKeyCode,
  isReservedKeyCode,
  isSupportedKeyCode,
} from '../input/keyboardKeys'
import { KEYBOARD_IGNORE_MESSAGE } from '../input/keyboardAdapter'
import { LOCAL_INPUT_TRANSLATION_MESSAGE } from '../input/commandTranslation'
import { useKeyboardBuzzInput, type KeyboardBuzzOutcome } from './useKeyboardBuzzInput'
import { systemClock, type Clock } from '../time/clock'
import './LocalInputHostPanel.css'

/**
 * Host controls for local input and the buzz queue (Slice 8).
 *
 * A fourth bounded panel beside the board, scoring and timer panels, keeping the
 * same discipline they do: this one configures INPUT and runs the QUEUE. It
 * reveals nothing, times nothing, and scores nothing — ordinary score controls
 * stay in the scoring panel and stay available for every team (`OG-6` is
 * deferred, so scoring is not restricted to the active respondent).
 *
 * ## What a teacher must be able to do here
 *
 * See whether keyboard buzzing is on, see each team's buzz key, change one,
 * detect a conflict BEFORE it is applied, reset to the defaults, see who is
 * answering, see who is waiting, mark the active answer incorrect, pass to the
 * next team, and understand why a press did nothing.
 *
 * Arming and disarming are deliberately NOT duplicated here: they live in the
 * response-window panel where the clock is, and there is exactly one arming
 * control in the application (OG-1, ADR-007 §4).
 *
 * ## Never here
 *
 * No Gamepad, WebHID, Bluetooth, USB or vendor surface; no controller-model
 * name; no coloured-button controls; no device detection or diagnostics of any
 * kind. Those are Slices 9 and 10, and none of them exists yet.
 */

export interface LocalInputHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /** Injectable clock — the dispatch edge, and the only place `now` is read. */
  readonly clock?: Clock
  /**
   * Injectable local configuration storage. Defaults to this browser's
   * `localStorage`, or `null` where it is unavailable (which degrades to
   * "defaults, not persisted" — still fully usable).
   */
  readonly storage?: LocalConfigStorage | null
}

/** What the panel is currently doing about key capture. */
type CaptureState =
  | { readonly mode: 'idle' }
  | { readonly mode: 'capturing'; readonly teamId: string }

export function LocalInputHostPanel({
  dispatch,
  game,
  clock = systemClock,
  storage,
}: LocalInputHostPanelProps) {
  const teams = game.definition.teams
  const roundIndex = game.currentRoundIndex
  const round = roundIndex === null ? null : (game.definition.rounds[roundIndex] ?? null)
  const board = round === null ? null : readCategoryBoardDefinition(round)

  // Resolved once: `undefined` means "use the browser", `null` means "no storage".
  const configStorage = useMemo(
    () => (storage === undefined ? browserLocalConfigStorage() : storage),
    [storage],
  )

  const [enabled, setEnabled] = useState(true)
  const [capture, setCapture] = useState<CaptureState>({ mode: 'idle' })
  const [captureMessage, setCaptureMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<readonly KeyboardMappingIssue[]>([])
  const [lastOutcome, setLastOutcome] = useState<KeyboardBuzzOutcome | null>(null)

  const initial = useMemo(
    () => loadKeyboardMapping(configStorage, teams),
    [configStorage, teams],
  )
  const [mapping, setMapping] = useState<KeyboardMapping>(initial.mapping)
  const [loadNote, setLoadNote] = useState<string>(
    KEYBOARD_MAPPING_LOAD_MESSAGE[initial.outcome],
  )

  // The loaded game can change under the panel (a new import, a new sample). The
  // mapping is re-read for the new teams rather than being carried across, so a
  // binding can never point at a team from a previous game.
  const loadedTeamsKey = teams.map((team) => team.id).join('|')
  const appliedTeamsKey = useRef(loadedTeamsKey)
  useEffect(() => {
    if (appliedTeamsKey.current === loadedTeamsKey) return
    appliedTeamsKey.current = loadedTeamsKey
    const reloaded = loadKeyboardMapping(configStorage, teams)
    setMapping(reloaded.mapping)
    setLoadNote(KEYBOARD_MAPPING_LOAD_MESSAGE[reloaded.outcome])
    setIssues([])
    setCapture({ mode: 'idle' })
  }, [loadedTeamsKey, configStorage, teams])

  const stage = round === null ? null : categoryBoardStateFor(game, round.id).progress
  const phase = round === null ? null : responsePhaseFor(game, round.id)
  const open = stage !== null && stage.stage === 'prompt'
  const tileId = open && stage !== null ? stage.selectedTileId : null

  const target = round !== null && tileId !== null ? { roundId: round.id, tileId } : null

  useKeyboardBuzzInput({
    enabled,
    capturing: capture.mode === 'capturing',
    mapping,
    target,
    dispatch,
    clock,
    onOutcome: setLastOutcome,
  })

  const applyMapping = useCallback(
    (next: KeyboardMapping): boolean => {
      const validation = validateKeyboardMapping(next, teams)
      if (!validation.ok) {
        setIssues(validation.issues)
        return false
      }
      setIssues([])
      setMapping(validation.mapping)
      setLoadNote(
        saveKeyboardMapping(configStorage, validation.mapping)
          ? 'Buzz keys saved on this device.'
          : 'Buzz keys updated for this session. This device cannot save them.',
      )
      return true
    },
    [configStorage, teams],
  )

  // ── Key capture ────────────────────────────────────────────────────────────
  // A dedicated CAPTURE-phase listener, active only while capturing, so the key
  // being assigned reaches this and nothing else. Game buzzing is suspended for
  // the same interval by the `capturing` gate above, so pressing a key to assign
  // it can never also fire it.
  const capturingTeamId = capture.mode === 'capturing' ? capture.teamId : null
  useEffect(() => {
    if (capturingTeamId === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') {
        setCapture({ mode: 'idle' })
        setCaptureMessage('Cancelled. The buzz key was left as it was.')
        return
      }
      if (!isSupportedKeyCode(event.code)) {
        setCaptureMessage('That key cannot be used. Try a letter, a number or a function key.')
        return
      }
      if (isReservedKeyCode(event.code)) {
        setCaptureMessage(
          'That key is reserved for operating this screen. Try a letter or a number.',
        )
        return
      }
      const next = withPrimaryKeyForTeam(mapping, capturingTeamId, event.code)
      const validation = validateKeyboardMapping(next, teams)
      if (!validation.ok) {
        // Nothing is overwritten: the conflicting key is reported and the
        // existing assignment is left exactly as it was.
        setCaptureMessage(
          validation.issues[0]?.message ?? 'That key could not be assigned.',
        )
        return
      }
      applyMapping(next)
      setCapture({ mode: 'idle' })
      setCaptureMessage(`Buzz key set to ${describeKeyCode(event.code)}.`)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturingTeamId, mapping, teams, applyMapping])

  if (round === null || board === null || game.gameLifecycle !== 'active') return null
  if (teams.length === 0) return null

  const queue = phase?.queue ?? null
  const status = queue === null ? { status: 'empty' as const } : buzzQueueStatus(queue)
  const activeTeamId = queue === null ? null : activeRespondent(queue)
  const waitingIds = queue === null ? [] : waitingRespondents(queue)
  const armed = phase?.armed ?? false
  const nameOf = (id: string) => findTeamById(teams, id)?.name ?? id

  const send = (command: SessionCommand) => dispatch(command)
  const canResolve = open && tileId !== null && activeTeamId !== null

  return (
    <section className="lih" aria-labelledby="lih-title">
      <div className="foundation__tag foundation__tag--slice8">
        Local input &amp; buzz queue (Slice 8) — host controls, private
      </div>
      <h3 id="lih-title">Buzz-in</h3>

      <dl className="lih__summary" data-testid="lih-summary">
        <dt>Keyboard buzzing</dt>
        <dd data-testid="lih-enabled">{enabled ? 'On' : 'Off'}</dd>
        <dt>Clue</dt>
        <dd data-testid="lih-open">{open ? 'Open — prompt is public' : 'Not open'}</dd>
        <dt>Buzzers</dt>
        {/* Stated in words, never by colour alone. */}
        <dd data-testid="lih-armed">{armed ? 'Armed — presses count' : 'Not armed — presses are ignored'}</dd>
      </dl>

      <div className="lih__actions" role="group" aria-label="Local input">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="lih-toggle"
          aria-pressed={enabled}
          onClick={() => setEnabled((value) => !value)}
        >
          {enabled ? 'Turn keyboard buzzing off' : 'Turn keyboard buzzing on'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="lih-reset-keys"
          onClick={() => {
            clearKeyboardMapping(configStorage)
            applyMapping(defaultKeyboardMapping(teams))
            setCaptureMessage('Buzz keys reset to the defaults.')
          }}
        >
          Reset buzz keys to defaults
        </button>
      </div>

      <h4 className="lih__heading">Buzz keys</h4>
      <p className="host__note" data-testid="lih-storage-note">
        {loadNote} Buzz keys are settings for this device only — they are not part
        of the game file and not part of the game’s history.
      </p>

      <ul className="lih__keys" data-testid="lih-keys">
        {teams.map((team) => {
          const code = primaryKeyForTeam(mapping, team.id)
          const isCapturing = capturingTeamId === team.id
          return (
            <li key={team.id} className="lih__key-row">
              <span className="lih__key-team">{team.name}</span>
              <span className="lih__key-code" data-testid={`lih-key-${team.id}`}>
                {isCapturing
                  ? 'Press a key…'
                  : code === null
                    ? 'Not assigned'
                    : describeKeyCode(code)}
              </span>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid={`lih-capture-${team.id}`}
                aria-label={
                  isCapturing
                    ? `Cancel changing the buzz key for ${team.name}`
                    : `Change the buzz key for ${team.name}`
                }
                onClick={() => {
                  if (isCapturing) {
                    setCapture({ mode: 'idle' })
                    setCaptureMessage('Cancelled. The buzz key was left as it was.')
                    return
                  }
                  setCapture({ mode: 'capturing', teamId: team.id })
                  setCaptureMessage(
                    `Press the key ${team.name} should use to buzz. Press Escape to cancel.`,
                  )
                }}
              >
                {isCapturing ? 'Cancel' : 'Change'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid={`lih-clear-${team.id}`}
                aria-label={`Clear the buzz key for ${team.name}`}
                disabled={code === null}
                onClick={() => {
                  applyMapping(withPrimaryKeyForTeam(mapping, team.id, null))
                  setCaptureMessage(`Buzz key cleared for ${team.name}.`)
                }}
              >
                Clear
              </button>
            </li>
          )
        })}
      </ul>

      {/*
        One polite live region for capture state and conflicts. Polite rather than
        assertive: it must announce, not interrupt whatever is being read out.
      */}
      <p className="host__note" data-testid="lih-capture-status" aria-live="polite">
        {captureMessage ?? ''}
      </p>

      {issues.length > 0 && (
        <ul className="lih__issues" data-testid="lih-issues">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      )}

      <h4 className="lih__heading">Response queue</h4>
      {/*
        The queue is a polite live region too: a teacher looking at the board must
        still hear that the active team changed.
      */}
      <div aria-live="polite">
        <dl className="lih__summary">
          <dt>Active team</dt>
          <dd data-testid="lih-active">
            {activeTeamId === null
              ? status.status === 'exhausted'
                ? 'Nobody — every team that buzzed has had a turn'
                : 'Nobody has buzzed yet'
              : nameOf(activeTeamId)}
          </dd>
          <dt>Waiting queue</dt>
          <dd data-testid="lih-waiting">
            {waitingIds.length === 0
              ? 'Empty'
              : waitingIds.map((id, index) => `${index + 1}. ${nameOf(id)}`).join(' · ')}
          </dd>
        </dl>
      </div>

      <div className="lih__actions" role="group" aria-label="Response queue controls">
        <button
          type="button"
          className="btn"
          data-testid="lih-incorrect"
          disabled={!canResolve}
          onClick={() =>
            tileId !== null &&
            send({
              type: 'RESOLVE_ACTIVE_RESPONSE',
              issuedAt: clock.now(),
              roundId: round.id,
              tileId,
              resolution: { kind: 'incorrect' },
            })
          }
        >
          Mark incorrect and advance
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="lih-pass"
          disabled={!canResolve}
          onClick={() =>
            tileId !== null &&
            send({
              type: 'RESOLVE_ACTIVE_RESPONSE',
              issuedAt: clock.now(),
              roundId: round.id,
              tileId,
              resolution: { kind: 'passed' },
            })
          }
        >
          Pass and advance
        </button>
      </div>

      <p className="host__note" data-testid="lih-outcome" aria-live="polite">
        {describeOutcome(lastOutcome, nameOf)}
      </p>

      <p className="host__note lih__hint">
        Marking a response incorrect moves no points and passing moves no points —
        awarding and deducting stay in the scoring panel, for every team. Close the
        queue by resetting the window, returning to the board, or revealing the
        answer.
      </p>
    </section>
  )
}

/**
 * Explain the most recent press in one sentence. HOST-ONLY copy.
 *
 * A teacher whose buzzers seem dead needs to be told why, and "nothing happened"
 * is the one answer that helps nobody. Every reason the input edge or the planner
 * can refuse a press has a sentence here.
 */
function describeOutcome(
  outcome: KeyboardBuzzOutcome | null,
  nameOf: (id: string) => string,
): string {
  if (outcome === null) return 'No buzz keys pressed yet.'
  switch (outcome.kind) {
    case 'accepted':
      return `${nameOf(outcome.teamId)} buzzed in.`
    case 'ignored':
      return KEYBOARD_IGNORE_MESSAGE[outcome.reason]
    case 'untranslated':
      return LOCAL_INPUT_TRANSLATION_MESSAGE[outcome.reason]
    case 'refused':
      return REFUSAL_MESSAGE[outcome.reason] ?? 'That buzz was not accepted.'
    default:
      return 'That buzz was not accepted.'
  }
}

/**
 * Host-facing copy for the planner rejections a buzz can actually produce.
 *
 * Deliberately partial: the panel falls back to a neutral sentence for anything
 * else, rather than carrying a message for every rejection in the engine.
 */
const REFUSAL_MESSAGE: Partial<Record<string, string>> = {
  'response-phase-not-armed': 'The clue is not armed, so that press did nothing.',
  'team-already-buzzed': 'That team has already buzzed for this clue.',
  'invalid-board-stage': 'There is no open prompt to buzz on.',
  'tile-mismatch': 'That press was for a clue that is no longer open.',
  'unknown-team': 'That key is assigned to a team this game does not have.',
  'no-teams-configured': 'This game has no teams, so nobody can buzz.',
  'no-active-respondent': 'There is no team answering, so there is nothing to advance.',
  'round-mismatch': 'That press was for a round that is no longer current.',
  'game-already-ended': 'The game has ended.',
}

/** Re-exported for tests and for the panel's own copy. */
export { ACTIVE_RESPONSE_RESOLUTION_LABEL }
