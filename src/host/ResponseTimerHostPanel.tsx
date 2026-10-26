import { useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { categoryBoardStateFor, responsePhaseFor } from '../state/reducer'
import { readCategoryBoardDefinition } from '../game/categoryBoard/definition'
import {
  HOST_INTERRUPTION,
  RESPONSE_INTERRUPTION_LABEL,
  isCorrectClosedOpportunity,
  isInitialResponsePhase,
  remainingMsAt,
  type ResponsePhaseState,
} from '../game/timing/responsePhase'
import { HOST_DURATION_PRESET_SECONDS } from '../game/timing/limits'
import { systemClock, type Clock } from '../time/clock'
import { describeRemaining, formatRemaining } from '../time/duration'
import { useRunningClockNow } from './useRunningClockNow'
import './ResponseTimerHostPanel.css'

/**
 * Host controls for the response phase (Slice 7).
 *
 * A third bounded panel beside the board panel and the scoring panel, and it
 * keeps the same discipline: this one arms and times, it reveals nothing and it
 * scores nothing. A timer running out awards no points and deducts none — the
 * teacher still makes that call in the scoring panel, deliberately.
 *
 * ## What a teacher must be able to see at a glance
 *
 * Mid-lesson, four questions have to be answerable without thinking: is the clue
 * ARMED, is the clock RUNNING, how much is LEFT, and did the window END (and
 * how). All four are on screen in words. The remaining time shown here is derived
 * the same way the projector derives it — from the durable deadline plus a clock
 * read at the rendering edge, re-read at the projector's cadence while the window
 * runs — so the two cannot disagree about the number.
 *
 * ## Bounded controls
 *
 * Every control that the reducer would reject is DISABLED rather than offered and
 * silently refused, and the reason is stated in the panel's status line. The store
 * is still the authority: each button dispatches a command carrying the round id
 * it was rendered for, so a stale panel is inert rather than dangerous.
 *
 * ## Not here
 *
 * No buzz-in, no team input, no keyboard buzzer, no device anything: arming
 * records that an interrupting input WOULD be accepted, and this slice
 * deliberately ships no such input. The only thing that can interrupt a window
 * today is the teacher.
 */

export interface ResponseTimerHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /** Injectable clock — the dispatch edge, and the only place `now` is read. */
  readonly clock?: Clock
}

/** Host-facing description of each timer status. Host-only copy. */
const STATUS_COPY = {
  idle: 'No timer running',
  running: 'Running',
  paused: 'Paused',
  expired: 'Time up',
  interrupted: 'Stopped early',
} as const

/** Why the controls are unavailable, stated rather than left to be guessed. */
const STAGE_HINT = {
  board: 'Open a tile and show its prompt to arm the clue or start a timer.',
  selected: 'Show the prompt on the display first — a response window needs a live question.',
  answer: 'The answer is public, so the response window is over.',
} as const

export function ResponseTimerHostPanel({
  dispatch,
  game,
  clock = systemClock,
}: ResponseTimerHostPanelProps) {
  const roundIndex = game.currentRoundIndex
  const round = roundIndex === null ? null : (game.definition.rounds[roundIndex] ?? null)
  const board = round === null ? null : readCategoryBoardDefinition(round)
  const authoredSeconds = game.definition.timer.responseSeconds
  const [durationSeconds, setDurationSeconds] = useState<number>(authoredSeconds)

  if (round === null || board === null || game.gameLifecycle !== 'active') return null

  const stage = categoryBoardStateFor(game, round.id).progress.stage
  const phase = responsePhaseFor(game, round.id)
  const open = stage === 'prompt'
  const timer = phase.timer
  // Correct owns the opportunity: private leftover running may remain for undo,
  // but Host must not present Arm/Start/Pause/Resume/Stop as actionable, and
  // must not label the panel Running/Paused/Time up. Reset stays the reopen path
  // — including idle-timer correct, where `!isInitialResponsePhase` is true
  // solely because outcome is set.
  const correctClosed = isCorrectClosedOpportunity(phase)
  const liveControlsOpen = open && !correctClosed
  const now = () => clock.now()

  const send = (command: SessionCommand) => dispatch(command)

  return (
    <section className="rth" aria-labelledby="rth-title">
      <div className="foundation__tag foundation__tag--slice7">
        Timers &amp; arming — host controls, private
      </div>
      <h3 id="rth-title">Response window</h3>

      <PhaseSummary phase={phase} open={open} correctClosed={correctClosed} clock={clock} />

      {!open && (
        <p className="host__note" data-testid="rth-unavailable">
          {STAGE_HINT[stage]}
        </p>
      )}

      {/*
        CANON-H-11: inactive Arm / Timer walls must not compete with the current
        beat (Show prompt, board pick). Keep status + hint; show live controls
        only when the response window can accept them. Reset stays available after
        Correct so the teacher can reopen without hunting a hidden control.
      */}
      {liveControlsOpen ? (
        <>
          <div className="rth__actions" role="group" aria-label="Arming controls">
            <button
              type="button"
              className="btn"
              data-testid="rth-arm"
              disabled={phase.armed}
              onClick={() =>
                send({ type: 'ARM_RESPONSE_PHASE', issuedAt: now(), roundId: round.id })
              }
            >
              Arm clue
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="rth-disarm"
              disabled={!phase.armed}
              onClick={() =>
                send({ type: 'DISARM_RESPONSE_PHASE', issuedAt: now(), roundId: round.id })
              }
            >
              Disarm clue
            </button>
          </div>

          <div className="rth__duration">
            <label htmlFor="rth-duration">Timer length</label>
            <select
              id="rth-duration"
              data-testid="rth-duration"
              value={durationSeconds}
              disabled={timer.status !== 'idle'}
              onChange={(event) => setDurationSeconds(Number(event.target.value))}
            >
              {durationOptions(authoredSeconds).map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} seconds{seconds === authoredSeconds ? ' (this game’s default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rth__actions" role="group" aria-label="Timer controls">
            <button
              type="button"
              className="btn"
              data-testid="rth-start"
              disabled={timer.status !== 'idle'}
              onClick={() =>
                send({
                  type: 'START_RESPONSE_TIMER',
                  issuedAt: now(),
                  roundId: round.id,
                  durationSeconds,
                })
              }
            >
              Start timer
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="rth-pause"
              disabled={timer.status !== 'running'}
              onClick={() =>
                send({ type: 'PAUSE_RESPONSE_TIMER', issuedAt: now(), roundId: round.id })
              }
            >
              Pause
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="rth-resume"
              disabled={timer.status !== 'paused'}
              onClick={() =>
                send({ type: 'RESUME_RESPONSE_TIMER', issuedAt: now(), roundId: round.id })
              }
            >
              Resume
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="rth-interrupt"
              disabled={timer.status !== 'running' && timer.status !== 'paused'}
              onClick={() =>
                send({
                  type: 'INTERRUPT_RESPONSE_TIMER',
                  issuedAt: now(),
                  roundId: round.id,
                  // The typed seam. Today the host is the only possible source; a
                  // future adapter supplies another member without touching this call
                  // site's shape.
                  source: HOST_INTERRUPTION,
                })
              }
            >
              Stop timer
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="rth-reset"
              disabled={isInitialResponsePhase(phase)}
              onClick={() =>
                send({ type: 'RESET_RESPONSE_PHASE', issuedAt: now(), roundId: round.id })
              }
            >
              Reset window
            </button>
          </div>

          <p className="host__note rth__hint">
            Arming is manual and stays manual: nothing arms a clue for you, and nothing
            buzzes in yet. A timer running out records that the window ended — it awards
            and deducts nothing.
          </p>
        </>
      ) : (
        <div className="rth__deferred" data-testid="rth-deferred">
          {open && !isInitialResponsePhase(phase) && (
            <div className="rth__actions" role="group" aria-label="Response window recovery">
              <button
                type="button"
                className="btn btn--secondary"
                data-testid="rth-reset"
                onClick={() =>
                  send({ type: 'RESET_RESPONSE_PHASE', issuedAt: now(), roundId: round.id })
                }
              >
                Reset window
              </button>
            </div>
          )}
          <p className="host__note rth__hint">
            {open
              ? 'Arming and timer controls return when this response opportunity is live again.'
              : 'Arming and timer controls appear after the prompt is on the display.'}
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * The four facts, in words.
 *
 * The remaining time is computed from the durable deadline against a clock read
 * at RENDER time, exactly as the projector does it (FRC-2). While the window
 * runs, `useRunningClockNow` re-reads that clock at the projector's cadence, so
 * the teacher's number visibly progresses instead of standing still until some
 * other change happens to re-render the panel.
 *
 * There is still exactly one timer authority. This appends no event, stores no
 * sampled time and mutates no store state per tick; reaching 0:00 changes
 * nothing here, and expiry remains the expiry hook's command. Any status other
 * than `running` is a fixed value, so nothing is scheduled.
 */
function PhaseSummary({
  phase,
  open,
  correctClosed,
  clock,
}: {
  readonly phase: ResponsePhaseState
  readonly open: boolean
  readonly correctClosed: boolean
  readonly clock: Clock
}) {
  const timer = phase.timer
  // After Correct the panel shows no remaining time at all, so it must not tick.
  const clockNow = useRunningClockNow(clock, timer.status === 'running' && !correctClosed)
  const remainingMs = remainingMsAt(timer, clockNow)
  // After Correct, leftover private running/paused/expired facts are not a live
  // Host response window — do not present Running / Paused / Time up as status.
  if (correctClosed) {
    return (
      <dl className="rth__summary" data-testid="rth-summary">
        <dt>Clue</dt>
        <dd data-testid="rth-open">{open ? 'Open — prompt is public' : 'Not open'}</dd>
        <dt>Arming</dt>
        <dd data-testid="rth-armed">Not armed</dd>
        <dt>Timer</dt>
        <dd data-testid="rth-status">Closed — not a live response timer</dd>
        <dt>Remaining</dt>
        <dd data-testid="rth-remaining" aria-label="Remaining: none">
          —
        </dd>
      </dl>
    )
  }

  const detail =
    timer.status === 'interrupted'
      ? ` — ${RESPONSE_INTERRUPTION_LABEL[timer.source.kind]}, ${formatRemaining(remainingMs)} left`
      : timer.status === 'paused'
        ? ` — ${formatRemaining(remainingMs)} left`
        : timer.status === 'running'
          ? ` — about ${formatRemaining(remainingMs)} left`
          : ''

  return (
    <dl className="rth__summary" data-testid="rth-summary">
      <dt>Clue</dt>
      <dd data-testid="rth-open">{open ? 'Open — prompt is public' : 'Not open'}</dd>
      <dt>Arming</dt>
      {/* Stated in words, never by colour alone. */}
      <dd data-testid="rth-armed">{phase.armed ? 'Armed' : 'Not armed'}</dd>
      <dt>Timer</dt>
      <dd data-testid="rth-status">
        {STATUS_COPY[timer.status]}
        {detail}
      </dd>
      <dt>Remaining</dt>
      <dd data-testid="rth-remaining" aria-label={`Remaining: ${describeRemaining(remainingMs)}`}>
        {timer.status === 'idle' ? '—' : formatRemaining(remainingMs)}
      </dd>
    </dl>
  )
}

/** The authored default plus the presets, de-duplicated, in ascending order. */
function durationOptions(authoredSeconds: number): readonly number[] {
  const unique = new Set<number>([authoredSeconds, ...HOST_DURATION_PRESET_SECONDS])
  return [...unique].sort((a, b) => a - b)
}
