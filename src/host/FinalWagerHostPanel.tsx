import { useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { finalWagerStateFor, teamScoreFor } from '../state/reducer'
import { readFinalWagerDefinition } from '../game/finalWager/definition'
import {
  DEFAULT_FINAL_ELIGIBILITY_MODE,
  FINAL_ELIGIBILITY_MODES,
  FINAL_ELIGIBILITY_MODE_LABEL,
  type FinalEligibilityMode,
} from '../game/finalWager/eligibility'
import {
  FINAL_CAPTURE_MODE_LABEL,
  FINAL_OUTCOME_LABEL,
  FINAL_RESPONSE_CAPTURE_MODES,
  committedResponse,
  committedWager,
  currentRevealTeamId,
  everyResponseCommitted,
  everyWagerCommitted,
  finalLeaders,
  finalSettlementDelta,
  nextDefaultRevealTeamId,
  settlementFor,
  unrevealedTeamIds,
  type FinalOutcome,
  type FinalResponseCaptureMode,
  type FinalWagerRoundState,
} from '../game/finalWager/finalState'
import { MAX_FINAL_RESPONSE_LENGTH } from '../game/finalWager/limits'
import { HOST_DURATION_PRESET_SECONDS } from '../game/timing/limits'
import { remainingMsAt, type ResponseTimerState } from '../game/timing/responsePhase'
import { findTeamById } from '../game/teams/definition'
import { formatSignedDelta } from '../game/teams/scoring'
import { systemClock, type Clock } from '../time/clock'
import { formatRemaining } from '../time/duration'
import './FinalWagerHostPanel.css'

/**
 * Host controls for the Final Wager round (Slice 14).
 *
 * A bounded panel beside the board, timer, input and scoring panels, and it keeps
 * the same discipline they do: it owns the Final round and nothing else. It does
 * not touch the board, it does not arm buzzers, and it does not adjust an
 * ordinary score — the one place it moves points is a Final settlement, which is
 * its own reversible event.
 *
 * ## Everything here is private
 *
 * Wagers, response text, the answer, the alternates, the host note, the caps and
 * the eligibility snapshot are all host-only. The projector receives a separate
 * allow-listed DTO that carries none of it until the host explicitly reveals the
 * corresponding thing — so this panel must never be projected, which is what the
 * host banner above it already says.
 *
 * ## Nothing happens by itself
 *
 * Every transition is a button. A window running out does not lock wagers, does
 * not mark a silent team absent, does not reveal, does not adjudicate and does
 * not end the game. Every control the reducer would reject is DISABLED with the
 * reason stated, and the store is still the authority: each button dispatches a
 * command carrying the round id it was rendered for, so a stale panel is inert.
 *
 * ## Drafts versus committed values
 *
 * The wager and response inputs hold local DRAFT text. A draft is UI state and is
 * lost on reload; a committed value is an event and survives refresh. The panel
 * states which is which per team rather than leaving a teacher to guess whether a
 * number in a box has actually been saved.
 */

export interface FinalWagerHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /** Injectable clock — the dispatch edge, and the only place `now` is read. */
  readonly clock?: Clock
}

/** Host-facing description of each Final phase. Host-only copy. */
const PHASE_COPY: Readonly<Record<string, string>> = {
  setup: 'Not started — choose who plays, then begin Final.',
  'wager-entry': 'Taking wagers. Every eligible team needs an explicit wager.',
  'wagers-locked': 'Wagers locked. Choose how to record responses, then show the question.',
  'response-entry': 'Question is public. Record what each team answered.',
  'responses-locked': 'Responses locked. Reveal the answer when the room is ready.',
  'answer-revealed': 'Answer is public. Reveal one team at a time.',
  'team-reveal': 'Revealing teams. Judge the team on screen, then move on.',
  resolution: 'All wagers settled — the lead is TIED. Choose how to finish.',
  'sudden-death': 'Sudden death. Correct only a tied leader, then complete the game.',
  'ready-to-complete': 'All wagers settled. End the game session when you are ready.',
  ended: 'Final is complete.',
}

/** Host-facing description of each window status. Host-only copy. */
const WINDOW_COPY: Readonly<Record<ResponseTimerState['status'], string>> = {
  idle: 'not started',
  running: 'running',
  paused: 'paused',
  expired: 'time up',
  interrupted: 'stopped',
}

export function FinalWagerHostPanel({
  dispatch,
  game,
  clock = systemClock,
}: FinalWagerHostPanelProps) {
  const roundIndex = game.currentRoundIndex
  const round = roundIndex === null ? null : (game.definition.rounds[roundIndex] ?? null)
  const definition = round === null ? null : readFinalWagerDefinition(round)

  const authoredSeconds = game.definition.timer.responseSeconds
  const [mode, setMode] = useState<FinalEligibilityMode>(DEFAULT_FINAL_ELIGIBILITY_MODE)
  const [captureMode, setCaptureMode] = useState<FinalResponseCaptureMode>('exact-text')
  const [wagerSeconds, setWagerSeconds] = useState<number>(authoredSeconds)
  const [responseSeconds, setResponseSeconds] = useState<number>(authoredSeconds)
  const [wagerDrafts, setWagerDrafts] = useState<Record<string, string>>({})
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})

  // Rendered only for a playable Final round. Every other state (no game, no
  // round, a board round, an unregistered type) renders nothing at all.
  if (round === null || definition === null) return null

  const final = finalWagerStateFor(game, round.id)
  const roundId = round.id
  const now = () => clock.now()
  const send = (command: SessionCommand) => dispatch(command)
  const active = game.gameLifecycle === 'active'
  const phase = final.phase

  return (
    <section className="fwh" aria-labelledby="fwh-title">
      <div className="foundation__tag foundation__tag--slice14">
        Final wager (Slice 14) — host controls, private
      </div>
      <h3 id="fwh-title">Final wager</h3>

      <p className="fwh__phase" data-testid="fwh-phase" aria-live="polite">
        {PHASE_COPY[phase] ?? 'Final is in an unexpected state.'}
      </p>

      {!active && (
        <p className="host__note" data-testid="fwh-ended">
          The game session has ended. Final is read-only.
        </p>
      )}

      {phase === 'setup' && (
        <SetupSection
          mode={mode}
          onModeChange={setMode}
          disabled={!active || game.definition.teams.length === 0}
          teamCount={game.definition.teams.length}
          onBegin={() => send({ type: 'BEGIN_FINAL_WAGER', issuedAt: now(), roundId, mode })}
        />
      )}

      {phase === 'wager-entry' && (
        <>
          <WindowControls
            label="Wager window"
            window={final.wagerWindow}
            seconds={wagerSeconds}
            authoredSeconds={authoredSeconds}
            onSecondsChange={setWagerSeconds}
            clockNow={clock.now()}
            idPrefix="fwh-wager"
            disabled={!active}
            onStart={() =>
              send({
                type: 'START_FINAL_WAGER_WINDOW',
                issuedAt: now(),
                roundId,
                durationSeconds: wagerSeconds,
              })
            }
            onPause={() =>
              send({ type: 'PAUSE_FINAL_WAGER_WINDOW', issuedAt: now(), roundId })
            }
            onResume={() =>
              send({ type: 'RESUME_FINAL_WAGER_WINDOW', issuedAt: now(), roundId })
            }
          />

          <div className="fwh__teams" role="group" aria-label="Team wagers">
            {(final.snapshot?.teams ?? []).map((eligible) => {
              const team = findTeamById(game.definition.teams, eligible.teamId)
              const committed = committedWager(final, eligible.teamId)
              const draft = wagerDrafts[eligible.teamId] ?? ''
              return (
                <div className="fwh__team" key={eligible.teamId}>
                  <p className="fwh__team-name">{team?.name ?? eligible.teamId}</p>
                  <p className="fwh__team-meta">
                    Score before Final: {eligible.preFinalScore} · Maximum wager:{' '}
                    <strong data-testid={`fwh-cap-${eligible.teamId}`}>
                      {eligible.maxWager}
                    </strong>
                  </p>
                  <label
                    className="fwh__field"
                    htmlFor={`fwh-wager-input-${eligible.teamId}`}
                  >
                    <span className="fwh__field-label">Wager (0–{eligible.maxWager})</span>
                    <input
                      id={`fwh-wager-input-${eligible.teamId}`}
                      data-testid={`fwh-wager-input-${eligible.teamId}`}
                      className="fwh__input"
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={0}
                      max={eligible.maxWager}
                      disabled={!active}
                      value={draft}
                      onChange={(event) =>
                        setWagerDrafts((drafts) => ({
                          ...drafts,
                          [eligible.teamId]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="fwh__row">
                    <button
                      type="button"
                      className="btn"
                      data-testid={`fwh-save-wager-${eligible.teamId}`}
                      disabled={!active || draft.trim().length === 0}
                      onClick={() =>
                        send({
                          type: 'RECORD_FINAL_WAGER',
                          issuedAt: now(),
                          roundId,
                          teamId: eligible.teamId,
                          // Parsed, never coerced: a non-integer becomes `NaN`
                          // here and is REJECTED by the planner rather than being
                          // rounded into something the teacher did not type.
                          wager: Number(draft),
                        })
                      }
                    >
                      {committed === null ? 'Save wager' : 'Correct wager'}
                    </button>
                    <span
                      className="fwh__committed"
                      data-testid={`fwh-committed-wager-${eligible.teamId}`}
                    >
                      {committed === null
                        ? 'Not saved yet'
                        : `Saved: ${committed}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="fwh__actions" role="group" aria-label="Wager lock">
            <button
              type="button"
              className="btn"
              data-testid="fwh-lock-wagers"
              disabled={!active || !everyWagerCommitted(final)}
              onClick={() => send({ type: 'LOCK_FINAL_WAGERS', issuedAt: now(), roundId })}
            >
              Lock all wagers
            </button>
            {!everyWagerCommitted(final) && (
              <span className="host__note" data-testid="fwh-wagers-incomplete">
                Every eligible team needs a saved wager — an explicit 0 counts.
              </span>
            )}
          </div>
        </>
      )}

      {phase === 'wagers-locked' && (
        <div className="fwh__actions" role="group" aria-label="Response window">
          <fieldset className="fwh__choice">
            <legend>How will you record responses?</legend>
            {FINAL_RESPONSE_CAPTURE_MODES.map((value) => (
              <label className="fwh__radio" key={value} htmlFor={`fwh-capture-${value}`}>
                <input
                  id={`fwh-capture-${value}`}
                  data-testid={`fwh-capture-${value}`}
                  type="radio"
                  name="fwh-capture"
                  value={value}
                  disabled={!active}
                  checked={captureMode === value}
                  onChange={() => setCaptureMode(value)}
                />
                <span>{FINAL_CAPTURE_MODE_LABEL[value]}</span>
              </label>
            ))}
          </fieldset>
          <DurationPicker
            id="fwh-response-duration"
            label="Response window length"
            seconds={responseSeconds}
            authoredSeconds={authoredSeconds}
            disabled={!active}
            onChange={setResponseSeconds}
          />
          <button
            type="button"
            className="btn"
            data-testid="fwh-start-response"
            disabled={!active}
            onClick={() =>
              send({
                type: 'START_FINAL_RESPONSE_WINDOW',
                issuedAt: now(),
                roundId,
                captureMode,
                durationSeconds: responseSeconds,
              })
            }
          >
            Show the question and start the response window
          </button>
          <p className="host__note">
            Starting the window is what puts the question on the projector.
          </p>
        </div>
      )}

      {phase === 'response-entry' && (
        <>
          <WindowControls
            label="Response window"
            window={final.responseWindow}
            seconds={responseSeconds}
            authoredSeconds={authoredSeconds}
            onSecondsChange={setResponseSeconds}
            clockNow={clock.now()}
            idPrefix="fwh-response"
            disabled={!active}
            /* The window is already running: only pause/resume apply. */
            onStart={null}
            onPause={() =>
              send({ type: 'PAUSE_FINAL_RESPONSE_WINDOW', issuedAt: now(), roundId })
            }
            onResume={() =>
              send({ type: 'RESUME_FINAL_RESPONSE_WINDOW', issuedAt: now(), roundId })
            }
          />

          <div className="fwh__teams" role="group" aria-label="Team responses">
            {(final.snapshot?.teams ?? []).map((eligible) => {
              const team = findTeamById(game.definition.teams, eligible.teamId)
              const committed = committedResponse(final, eligible.teamId)
              const draft = responseDrafts[eligible.teamId] ?? ''
              return (
                <div className="fwh__team" key={eligible.teamId}>
                  <p className="fwh__team-name">{team?.name ?? eligible.teamId}</p>
                  {final.captureMode === 'exact-text' && (
                    <label
                      className="fwh__field"
                      htmlFor={`fwh-response-input-${eligible.teamId}`}
                    >
                      <span className="fwh__field-label">What they wrote</span>
                      <input
                        id={`fwh-response-input-${eligible.teamId}`}
                        data-testid={`fwh-response-input-${eligible.teamId}`}
                        className="fwh__input"
                        type="text"
                        maxLength={MAX_FINAL_RESPONSE_LENGTH}
                        disabled={!active}
                        value={draft}
                        onChange={(event) =>
                          setResponseDrafts((drafts) => ({
                            ...drafts,
                            [eligible.teamId]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                  <div className="fwh__row">
                    {final.captureMode === 'exact-text' && (
                      <button
                        type="button"
                        className="btn"
                        data-testid={`fwh-save-exact-${eligible.teamId}`}
                        disabled={!active || draft.trim().length === 0}
                        onClick={() =>
                          send({
                            type: 'RECORD_FINAL_RESPONSE',
                            issuedAt: now(),
                            roundId,
                            teamId: eligible.teamId,
                            response: { kind: 'exact', text: draft },
                          })
                        }
                      >
                        Save wording
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary"
                      data-testid={`fwh-save-responded-${eligible.teamId}`}
                      disabled={!active}
                      onClick={() =>
                        send({
                          type: 'RECORD_FINAL_RESPONSE',
                          issuedAt: now(),
                          roundId,
                          teamId: eligible.teamId,
                          response: { kind: 'not-captured' },
                        })
                      }
                    >
                      Answered (no wording)
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      data-testid={`fwh-save-none-${eligible.teamId}`}
                      disabled={!active}
                      onClick={() =>
                        send({
                          type: 'RECORD_FINAL_RESPONSE',
                          issuedAt: now(),
                          roundId,
                          teamId: eligible.teamId,
                          response: { kind: 'no-response' },
                        })
                      }
                    >
                      No response
                    </button>
                  </div>
                  <p
                    className="fwh__committed"
                    data-testid={`fwh-committed-response-${eligible.teamId}`}
                  >
                    {committed === null && 'Not recorded yet'}
                    {committed?.kind === 'exact' && `Saved: “${committed.text}”`}
                    {committed?.kind === 'not-captured' && 'Saved: answered, wording not recorded'}
                    {committed?.kind === 'no-response' && 'Saved: no response'}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="fwh__actions" role="group" aria-label="Response lock">
            <button
              type="button"
              className="btn"
              data-testid="fwh-lock-responses"
              disabled={!active || !everyResponseCommitted(final)}
              onClick={() => send({ type: 'LOCK_FINAL_RESPONSES', issuedAt: now(), roundId })}
            >
              Lock all responses
            </button>
            {!everyResponseCommitted(final) && (
              <span className="host__note" data-testid="fwh-responses-incomplete">
                Every eligible team needs an explicit state — “no response” counts.
              </span>
            )}
          </div>
        </>
      )}

      {phase === 'responses-locked' && (
        <div className="fwh__actions" role="group" aria-label="Answer reveal">
          <p className="fwh__private" data-testid="fwh-private-answer">
            <span className="fwh__private-tag">Host only</span> Answer:{' '}
            {definition.answer}
          </p>
          {definition.alternates.length > 0 && (
            <p className="fwh__private" data-testid="fwh-private-alternates">
              <span className="fwh__private-tag">Host only</span> Also accept:{' '}
              {definition.alternates.join(' · ')}
            </p>
          )}
          {definition.notes !== null && (
            <p className="fwh__private" data-testid="fwh-private-notes">
              <span className="fwh__private-tag">Host only</span> Note: {definition.notes}
            </p>
          )}
          <button
            type="button"
            className="btn"
            data-testid="fwh-reveal-answer"
            disabled={!active}
            onClick={() => send({ type: 'REVEAL_FINAL_ANSWER', issuedAt: now(), roundId })}
          >
            Reveal the answer
          </button>
        </div>
      )}

      {(phase === 'answer-revealed' || phase === 'team-reveal') && (
        <RevealSection
          final={final}
          game={game}
          disabled={!active}
          onReveal={(teamId) =>
            send({ type: 'REVEAL_FINAL_TEAM', issuedAt: now(), roundId, teamId })
          }
          onSettle={(teamId, outcome) =>
            send({ type: 'SETTLE_FINAL_TEAM', issuedAt: now(), roundId, teamId, outcome })
          }
        />
      )}

      {(phase === 'resolution' || phase === 'sudden-death') && (
        <TieSection
          game={game}
          phase={phase}
          disabled={!active}
          onSuddenDeath={() =>
            send({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: now(), roundId })
          }
          onAcceptTie={() =>
            send({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: now(), roundId })
          }
          onComplete={() => send({ type: 'END_GAME_SESSION', issuedAt: now() })}
        />
      )}

      {phase === 'ready-to-complete' && (
        <div className="fwh__actions" role="group" aria-label="Completion">
          <p className="fwh__leader" data-testid="fwh-leader">
            Leading: {leaderNames(game)}
          </p>
          <ConfirmButton
            testId="fwh-complete"
            label="End the game session"
            confirmLabel="End the game — this cannot be undone"
            disabled={!active}
            onConfirm={() => send({ type: 'END_GAME_SESSION', issuedAt: now() })}
          />
        </div>
      )}
    </section>
  )
}

/** The public names of every team currently sharing the lead. */
function leaderNames(game: PrivateGameState): string {
  const leaders = finalLeaders(game.definition.teams, (teamId) => teamScoreFor(game, teamId))
  return leaders
    .map((teamId) => findTeamById(game.definition.teams, teamId)?.name ?? teamId)
    .join(', ')
}

function SetupSection({
  mode,
  onModeChange,
  onBegin,
  disabled,
  teamCount,
}: {
  readonly mode: FinalEligibilityMode
  readonly onModeChange: (mode: FinalEligibilityMode) => void
  readonly onBegin: () => void
  readonly disabled: boolean
  readonly teamCount: number
}) {
  return (
    <div className="fwh__actions" role="group" aria-label="Final setup">
      <fieldset className="fwh__choice">
        <legend>Who plays Final?</legend>
        {FINAL_ELIGIBILITY_MODES.map((value) => (
          <label className="fwh__radio" key={value} htmlFor={`fwh-mode-${value}`}>
            <input
              id={`fwh-mode-${value}`}
              data-testid={`fwh-mode-${value}`}
              type="radio"
              name="fwh-mode"
              value={value}
              disabled={disabled}
              checked={mode === value}
              onChange={() => onModeChange(value)}
            />
            <span>{FINAL_ELIGIBILITY_MODE_LABEL[value]}</span>
          </label>
        ))}
      </fieldset>
      {teamCount === 0 && (
        <p className="host__note" data-testid="fwh-no-teams">
          This game configures no teams, so Final cannot be played.
        </p>
      )}
      <button
        type="button"
        className="btn"
        data-testid="fwh-begin"
        disabled={disabled}
        onClick={onBegin}
      >
        Begin Final
      </button>
      <p className="host__note">
        Scores, eligibility and wager limits are frozen at this moment and do not
        change again.
      </p>
    </div>
  )
}

function DurationPicker({
  id,
  label,
  seconds,
  authoredSeconds,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly seconds: number
  readonly authoredSeconds: number
  readonly disabled: boolean
  readonly onChange: (seconds: number) => void
}) {
  const options = [...new Set([authoredSeconds, ...HOST_DURATION_PRESET_SECONDS])].sort(
    (a, b) => a - b,
  )
  return (
    <label className="fwh__field" htmlFor={id}>
      <span className="fwh__field-label">{label}</span>
      <select
        id={id}
        data-testid={id}
        className="fwh__input"
        disabled={disabled}
        value={seconds}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {value} seconds{value === authoredSeconds ? ' (game default)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

function WindowControls({
  label,
  window,
  seconds,
  authoredSeconds,
  onSecondsChange,
  clockNow,
  idPrefix,
  disabled,
  onStart,
  onPause,
  onResume,
}: {
  readonly label: string
  readonly window: ResponseTimerState
  readonly seconds: number
  readonly authoredSeconds: number
  readonly onSecondsChange: (seconds: number) => void
  readonly clockNow: number
  readonly idPrefix: string
  readonly disabled: boolean
  readonly onStart: (() => void) | null
  readonly onPause: () => void
  readonly onResume: () => void
}) {
  return (
    <div className="fwh__window" role="group" aria-label={label}>
      <p className="fwh__window-status" data-testid={`${idPrefix}-status`}>
        {label}: {WINDOW_COPY[window.status]}
        {window.status !== 'idle' && ` — ${formatRemaining(remainingMsAt(window, clockNow))}`}
      </p>
      {onStart !== null && window.status === 'idle' && (
        <DurationPicker
          id={`${idPrefix}-duration`}
          label={`${label} length`}
          seconds={seconds}
          authoredSeconds={authoredSeconds}
          disabled={disabled}
          onChange={onSecondsChange}
        />
      )}
      <div className="fwh__row">
        {onStart !== null && (
          <button
            type="button"
            className="btn"
            data-testid={`${idPrefix}-start`}
            disabled={disabled || window.status !== 'idle'}
            onClick={onStart}
          >
            Start {label.toLowerCase()}
          </button>
        )}
        <button
          type="button"
          className="btn btn--secondary"
          data-testid={`${idPrefix}-pause`}
          disabled={disabled || window.status !== 'running'}
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid={`${idPrefix}-resume`}
          disabled={disabled || window.status !== 'paused'}
          onClick={onResume}
        >
          Resume
        </button>
      </div>
      <p className="host__note">
        Time running out records only that the window ended. It locks nothing and
        marks nobody absent.
      </p>
    </div>
  )
}

function RevealSection({
  final,
  game,
  disabled,
  onReveal,
  onSettle,
}: {
  readonly final: FinalWagerRoundState
  readonly game: PrivateGameState
  readonly disabled: boolean
  readonly onReveal: (teamId: string) => void
  readonly onSettle: (teamId: string, outcome: FinalOutcome) => void
}) {
  const activeTeamId = currentRevealTeamId(final)
  const nextDefault = nextDefaultRevealTeamId(final)
  const nameOf = (teamId: string) =>
    findTeamById(game.definition.teams, teamId)?.name ?? teamId

  if (activeTeamId !== null) {
    const response = committedResponse(final, activeTeamId)
    const wager = committedWager(final, activeTeamId) ?? 0
    // A team recorded as not answering can only be settled `no-response`; a team
    // that answered can never be. The panel offers exactly what the planner will
    // accept rather than showing a button that would be refused.
    const outcomes: readonly FinalOutcome[] =
      response?.kind === 'no-response' ? ['no-response'] : ['correct', 'incorrect']
    return (
      <div className="fwh__actions" role="group" aria-label="Adjudicate the revealed team">
        <p className="fwh__team-name" data-testid="fwh-active-reveal">
          On screen: {nameOf(activeTeamId)}
        </p>
        <p className="fwh__team-meta">
          Wager {wager} ·{' '}
          {response?.kind === 'exact' && `wrote “${response.text}”`}
          {response?.kind === 'not-captured' && 'answered, wording not recorded'}
          {response?.kind === 'no-response' && 'did not answer'}
        </p>
        <div className="fwh__row">
          {outcomes.map((outcome) => (
            <button
              key={outcome}
              type="button"
              className="btn"
              data-testid={`fwh-settle-${outcome}`}
              disabled={disabled}
              onClick={() => onSettle(activeTeamId, outcome)}
            >
              {FINAL_OUTCOME_LABEL[outcome]} ({formatSignedDelta(
                finalSettlementDelta(outcome, wager),
              )})
            </button>
          ))}
        </div>
      </div>
    )
  }

  const remaining = unrevealedTeamIds(final)
  return (
    <div className="fwh__actions" role="group" aria-label="Reveal a team">
      {remaining.length === 0 ? (
        <p className="host__note">Every team has been revealed and settled.</p>
      ) : (
        <>
          <p className="host__note">
            Suggested order is lowest score first. You may reveal any team instead.
          </p>
          <div className="fwh__row">
            {remaining.map((teamId) => (
              <button
                key={teamId}
                type="button"
                className={teamId === nextDefault ? 'btn' : 'btn btn--secondary'}
                data-testid={`fwh-reveal-${teamId}`}
                disabled={disabled}
                onClick={() => onReveal(teamId)}
              >
                Reveal {nameOf(teamId)}
                {teamId === nextDefault ? ' (next)' : ''}
              </button>
            ))}
          </div>
        </>
      )}
      {final.revealedTeamIds.length > 0 && (
        <ul className="fwh__settled" data-testid="fwh-settled">
          {final.revealedTeamIds.map((teamId) => {
            const settlement = settlementFor(final, teamId)
            return (
              <li key={teamId}>
                {nameOf(teamId)} —{' '}
                {settlement === null
                  ? 'revealed, not settled'
                  : `${FINAL_OUTCOME_LABEL[settlement.outcome]} ${formatSignedDelta(settlement.delta)}`}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TieSection({
  game,
  phase,
  disabled,
  onSuddenDeath,
  onAcceptTie,
  onComplete,
}: {
  readonly game: PrivateGameState
  readonly phase: string
  readonly disabled: boolean
  readonly onSuddenDeath: () => void
  readonly onAcceptTie: () => void
  readonly onComplete: () => void
}) {
  const leaders = finalLeaders(game.definition.teams, (teamId) => teamScoreFor(game, teamId))
  const tied = leaders.length > 1
  return (
    <div className="fwh__actions" role="group" aria-label="Tie handling">
      <p className="fwh__leader" data-testid="fwh-leader">
        {tied ? 'Tied for the lead: ' : 'Leading: '}
        {leaderNames(game)}
      </p>

      {phase === 'resolution' && (
        <div className="fwh__row">
          {/*
            Sudden death is the default-highlighted choice, and it is still a
            CHOICE: nothing selects it automatically, and the tie can be accepted
            instead.
          */}
          <button
            type="button"
            className="btn"
            data-testid="fwh-sudden-death"
            disabled={disabled}
            onClick={onSuddenDeath}
          >
            Play sudden death
          </button>
          <ConfirmButton
            testId="fwh-accept-tie"
            label="Accept the tie"
            confirmLabel="Accept the tie and end the game — this cannot be undone"
            disabled={disabled}
            onConfirm={onAcceptTie}
          />
        </div>
      )}

      {phase === 'sudden-death' && (
        <>
          <p className="host__note" data-testid="fwh-sudden-death-note">
            Ask your tiebreak question out loud, then use the scoring panel to
            correct a tied leader&apos;s score. Only a tied leader can be adjusted.
          </p>
          <div className="fwh__row">
            <ConfirmButton
              testId="fwh-complete"
              label="End the game session"
              confirmLabel="End the game — this cannot be undone"
              disabled={disabled || tied}
              onConfirm={onComplete}
            />
            <ConfirmButton
              testId="fwh-accept-tie"
              label="Accept the tie instead"
              confirmLabel="Accept the tie and end the game — this cannot be undone"
              disabled={disabled || !tied}
              onConfirm={onAcceptTie}
            />
          </div>
          {tied && (
            <p className="host__note">
              Still tied — correct a leader&apos;s score before completing, or accept
              the tie.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * A two-step control for an IRREVERSIBLE action.
 *
 * Ending the game and accepting a tied finish cannot be undone, so neither is one
 * click away. The confirmation is a real button with its own accessible name that
 * states the consequence, not a `window.confirm` — so it is keyboard operable,
 * testable, and readable by a screen reader.
 */
function ConfirmButton({
  testId,
  label,
  confirmLabel,
  disabled,
  onConfirm,
}: {
  readonly testId: string
  readonly label: string
  readonly confirmLabel: string
  readonly disabled: boolean
  readonly onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        type="button"
        className="btn btn--secondary"
        data-testid={testId}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    )
  }
  return (
    <span className="fwh__row">
      <button
        type="button"
        className="btn fwh__confirm"
        data-testid={`${testId}-confirm`}
        disabled={disabled}
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        className="btn btn--secondary"
        data-testid={`${testId}-cancel`}
        onClick={() => setArmed(false)}
      >
        Cancel
      </button>
    </span>
  )
}
