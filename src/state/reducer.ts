import type { SessionCommand, CommandType } from './commands'
import type { RoundSupport, SessionEvent } from './events'
import {
  INITIAL_CATEGORY_BOARD_ROUND_STATE,
  INITIAL_PRIVATE_STATE,
  type CategoryBoardProgress,
  type CategoryBoardRoundState,
  type PrivateGameState,
  type PrivateSessionState,
  type PrivateState,
} from './privateState'
import { isPublicStatusCode } from './status'
import { isGameDefinition, roundIndexById } from '../game/gameDefinition'
import type { RoundType } from '../game/ids'
import {
  CATEGORY_BOARD_ROUND_TYPE,
  findTileById,
  readCategoryBoardDefinition,
  type CategoryBoardDefinition,
} from '../game/categoryBoard/definition'
import type { RoundDefinition } from '../game/roundDefinition'
import { findTeamById } from '../game/teams/definition'
import {
  INITIAL_TEAM_SCORE,
  checkScoreAdjustment,
  isScoreAdjustmentMode,
  isScoreSource,
  isTeamScore,
  modeRequiresValueSource,
  type ScoreSource,
} from '../game/teams/scoring'
import {
  INITIAL_RESPONSE_PHASE_STATE,
  isInitialResponsePhase,
  isResponseInterruptionSource,
  type ResponsePhaseState,
  type ResponseTimerState,
} from '../game/timing/responsePhase'
import { EXPIRY_TOLERANCE_MS } from '../game/timing/limits'
import { isResponseSeconds, responseDurationMs } from '../game/timing/timerConfig'
import { isInstant } from '../time/clock'

/**
 * The command/event core.
 *
 * Four distinct failure categories live here (see ADR-002 for the full table):
 *
 *  1. Command rejection — a well-formed command the reducer refuses (e.g. UNDO
 *     with nothing to undo, or a status change before the session exists).
 *     `planCommand` returns `{ status: 'rejected' }` and NO event is produced,
 *     so state is unchanged.
 *  2. Event application failure — a stored event the reducer cannot apply (an
 *     unknown type or malformed payload). `reduce` fails SAFE: it returns the
 *     state unchanged rather than throwing, so replay of a corrupt log degrades
 *     to the last consistent state instead of crashing.
 *
 * (Transport decode failure and public projection failure live in the sync layer
 * and the sanitizer respectively.)
 */

export type RejectionReason =
  | 'session-not-initialized'
  | 'unknown-status-code'
  | 'invalid-note'
  | 'nothing-to-undo'
  | 'malformed-command'
  | 'invalid-game-definition'
  | 'game-not-initialized'
  | 'unknown-round'
  | 'no-next-round'
  // Category-board gameplay rejections (Slice 5).
  | 'game-already-ended'
  | 'no-current-round'
  | 'round-mismatch'
  | 'not-a-category-board-round'
  | 'invalid-category-board-config'
  | 'unknown-tile'
  | 'tile-already-used'
  | 'invalid-board-stage'
  // Team / scoring rejections (Slice 6).
  | 'no-teams-configured'
  | 'unknown-team'
  | 'tile-mismatch'
  | 'invalid-score-delta'
  | 'invalid-score-source'
  | 'score-amount-mismatch'
  | 'score-out-of-range'
  // Response-phase / timer rejections (Slice 7).
  | 'invalid-response-phase'
  | 'invalid-timer-duration'
  | 'stale-timer-expiration'
  | 'premature-timer-expiration'

/**
 * Dependencies the planner needs that live OUTSIDE the event history — currently
 * just "is this round type registered?". Kept as an injected predicate so the
 * reducer stays pure and testable, and so the real registry lives in the store.
 * The result is frozen onto the emitted event, so `reduce`/`replay` never need
 * it and replay stays deterministic. Defaults to "nothing is known" — the store
 * always supplies the real predicate; non-game commands ignore it entirely.
 */
export interface PlanDeps {
  readonly isKnownRoundType: (type: RoundType) => boolean
}

const DEFAULT_PLAN_DEPS: PlanDeps = { isKnownRoundType: () => false }

export type CommandOutcome =
  | { readonly status: 'accepted'; readonly events: readonly SessionEvent[] }
  | { readonly status: 'rejected'; readonly reason: RejectionReason }

const MAX_NOTE_LENGTH = 2000

/**
 * Apply a single already-accepted event to state. PURE and total: it never
 * throws and never reads a clock or a random source. Unknown/malformed events
 * return state unchanged (event application failure → fail safe). It does NOT
 * touch `revision`; `replay` owns that so the invariant `revision === history
 * length` always holds.
 */
export function reduce(state: PrivateState, event: SessionEvent): PrivateState {
  switch (event.type) {
    case 'SESSION_INITIALIZED': {
      const session: PrivateSessionState = {
        sessionId: event.sessionId,
        lifecycle: 'ready',
        counter: 0,
        publicStatusCode: 'session-ready',
        hostNotes: '',
        game: null,
      }
      return withApplied(state, event.type, { ...state, session })
    }

    case 'PUBLIC_STATUS_SET': {
      if (!state.session) return state
      const session = { ...state.session, publicStatusCode: event.code }
      return withApplied(state, event.type, { ...state, session })
    }

    case 'SEQUENCE_ADVANCED': {
      if (!state.session) return state
      const session = { ...state.session, counter: state.session.counter + 1 }
      return withApplied(state, event.type, { ...state, session })
    }

    case 'WAITING_MARKED': {
      if (!state.session) return state
      const session: PrivateSessionState = {
        ...state.session,
        lifecycle: 'waiting',
        publicStatusCode: 'waiting-for-host',
      }
      return withApplied(state, event.type, { ...state, session })
    }

    case 'HOST_NOTE_SET': {
      if (!state.session) return state
      const session = { ...state.session, hostNotes: event.note }
      return withApplied(state, event.type, { ...state, session })
    }

    case 'GAME_INITIALIZED': {
      if (!state.session) return state
      const game: PrivateGameState = {
        definition: event.definition,
        gameLifecycle: 'active',
        currentRoundIndex: null,
        currentRoundSupport: null,
        // A new game starts every board fresh AND every team on zero. Loading a
        // game is an irreversible baseline, so neither prior board progress nor a
        // prior score can survive it — starting a new game is how a teacher
        // resets for the next class.
        teamScores: {},
        categoryBoards: {},
        // A new game starts with no armed clue and no running timer, for the same
        // reason it starts every board fresh: loading a game is a hard baseline.
        responsePhases: {},
      }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    case 'CURRENT_ROUND_SELECTED':
    case 'ROUND_ADVANCED': {
      if (!state.session || !state.session.game) return state
      const game: PrivateGameState = {
        ...state.session.game,
        currentRoundIndex: event.roundIndex,
        currentRoundSupport: event.support,
        // A response window does NOT survive a round change (ADR-007 §8). Board
        // progress deliberately resumes when a teacher comes back to a round; a
        // countdown must not, because its deadline is an absolute instant and
        // resuming a five-minute-old deadline would put a nonsense clock in front
        // of a class. Clearing the whole map keeps the rule one sentence long.
        responsePhases: {},
      }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    case 'GAME_SESSION_ENDED': {
      if (!state.session || !state.session.game) return state
      const game: PrivateGameState = {
        ...state.session.game,
        gameLifecycle: 'ended',
        // Nothing can be responded to once the game is over.
        responsePhases: {},
      }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    case 'CATEGORY_BOARD_TILE_SELECTED':
      return withBoardState(
        state,
        event.type,
        event.roundId,
        (board) => ({
          ...board,
          progress: { stage: 'selected', selectedTileId: event.tileId },
        }),
        // A new clue starts disarmed with no timer. Carrying an armed phase or a
        // running countdown into the next question is exactly the surprise a
        // classroom cannot afford.
        { clearResponsePhase: true },
      )

    case 'CATEGORY_BOARD_PROMPT_REVEALED':
      return withBoardState(state, event.type, event.roundId, (board) =>
        // Fail safe: a prompt reveal with nothing selected is not applicable.
        board.progress.selectedTileId === null
          ? null
          : { ...board, progress: { stage: 'prompt', selectedTileId: board.progress.selectedTileId } },
      )

    case 'CATEGORY_BOARD_ANSWER_REVEALED':
      return withBoardState(
        state,
        event.type,
        event.roundId,
        (board) => {
        if (board.progress.selectedTileId === null) return null
        const progress: CategoryBoardProgress = {
          stage: 'answer',
          selectedTileId: board.progress.selectedTileId,
        }
        // Revealing the answer is what CONSUMES the tile. Because used tiles are
        // derived only by replaying these events, undoing this event removes the
        // tile from `usedTileIds` automatically on the next replay.
        const usedTileIds = board.usedTileIds.includes(event.tileId)
          ? board.usedTileIds
          : [...board.usedTileIds, event.tileId]
        return { progress, usedTileIds }
        },
        // Revealing the answer ENDS the response opportunity, so the phase is
        // cleared rather than left running with a deadline nobody is racing. This
        // is a transition, not an interruption: no interruption event is
        // fabricated for something the teacher did to the clue itself.
        { clearResponsePhase: true },
      )

    case 'CATEGORY_BOARD_RETURNED':
      return withBoardState(
        state,
        event.type,
        event.roundId,
        (board) => ({
          ...board,
          progress: { stage: 'board', selectedTileId: null },
        }),
        { clearResponsePhase: true },
      )

    case 'TEAM_SCORE_ADJUSTED': {
      if (!state.session || !state.session.game) return state
      const game = state.session.game
      if (game.gameLifecycle !== 'active') return state
      // Fail safe on a log that references a team this game does not have.
      if (findTeamById(game.definition.teams, event.teamId) === null) return state
      const next = teamScoreFor(game, event.teamId) + event.delta
      // Fail safe rather than clamp: a stored delta that would leave the bounds
      // means the log disagrees with the rules that produced it, and silently
      // clamping would invent a score nobody awarded.
      if (!isTeamScore(next)) return state
      const nextGame: PrivateGameState = {
        ...game,
        teamScores: { ...game.teamScores, [event.teamId]: next },
      }
      return withApplied(state, event.type, {
        ...state,
        session: { ...state.session, game: nextGame },
      })
    }

    case 'RESPONSE_PHASE_ARMED':
      return withResponsePhase(state, event.type, event.roundId, (phase) =>
        // Fail safe on a log that arms an already-armed clue: not applicable.
        phase.armed ? null : { ...phase, armed: true },
      )

    case 'RESPONSE_PHASE_DISARMED':
      return withResponsePhase(state, event.type, event.roundId, (phase) =>
        phase.armed ? { ...phase, armed: false } : null,
      )

    case 'RESPONSE_TIMER_STARTED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        if (phase.timer.status !== 'idle') return null
        const timer: ResponseTimerState = {
          status: 'running',
          timerId: event.timerId,
          durationMs: event.durationMs,
          startedAt: event.startedAt,
          deadline: event.deadline,
        }
        return { ...phase, timer }
      })

    case 'RESPONSE_TIMER_PAUSED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        const current = phase.timer
        // Identity is re-checked on APPLICATION as well as on planning, so a
        // stored log that pauses a timer other than the live one degrades to "not
        // applicable" instead of rewriting the wrong countdown.
        if (current.status !== 'running' || current.timerId !== event.timerId) return null
        const timer: ResponseTimerState = {
          status: 'paused',
          timerId: current.timerId,
          durationMs: current.durationMs,
          remainingMs: event.remainingMs,
        }
        return { ...phase, timer }
      })

    case 'RESPONSE_TIMER_RESUMED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        const current = phase.timer
        if (current.status !== 'paused' || current.timerId !== event.timerId) return null
        const timer: ResponseTimerState = {
          status: 'running',
          timerId: current.timerId,
          durationMs: current.durationMs,
          startedAt: event.resumedAt,
          deadline: event.deadline,
        }
        return { ...phase, timer }
      })

    case 'RESPONSE_TIMER_INTERRUPTED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        const current = phase.timer
        if (current.status !== 'running' && current.status !== 'paused') return null
        if (current.timerId !== event.timerId) return null
        if (!isResponseInterruptionSource(event.source)) return null
        const timer: ResponseTimerState = {
          status: 'interrupted',
          timerId: current.timerId,
          durationMs: current.durationMs,
          remainingMs: event.remainingMs,
          source: event.source,
        }
        // An interruption stops the CLOCK. It deliberately does not disarm the
        // clue and does not end it: a later slice promotes the next respondent
        // into a fresh window from exactly here.
        return { ...phase, timer }
      })

    case 'RESPONSE_TIMER_EXPIRED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        const current = phase.timer
        // The three-way match — running, same timer, same deadline — is what makes
        // "exactly one effective expiry per countdown" structural rather than a
        // convention: once this applies, the status is no longer `running`, so a
        // second expiry of the same timer can never apply.
        if (current.status !== 'running') return null
        if (current.timerId !== event.timerId || current.deadline !== event.deadline) return null
        const timer: ResponseTimerState = {
          status: 'expired',
          timerId: current.timerId,
          durationMs: current.durationMs,
          deadline: current.deadline,
        }
        // Expiry closes the window, so it also disarms: nothing may interrupt a
        // window that has already ended. It moves no points.
        return { armed: false, timer }
      })

    case 'RESPONSE_PHASE_RESET':
      return withResponsePhase(state, event.type, event.roundId, (phase) =>
        isInitialResponsePhase(phase) ? null : INITIAL_RESPONSE_PHASE_STATE,
      )

    // Undo markers change nothing directly; `replay` neutralizes their targets.
    case 'EVENT_UNDONE':
      return state

    default:
      // Unknown event type: fail safe, state unchanged.
      return state
  }
}

/**
 * Read a round's board state, defaulting to a fresh, untouched board.
 *
 * This is a pure read with a constant default — it is NOT a cache and never
 * writes anything back, so replay produces the same result every time.
 */
export function categoryBoardStateFor(
  game: PrivateGameState,
  roundId: string,
): CategoryBoardRoundState {
  return game.categoryBoards[roundId] ?? INITIAL_CATEGORY_BOARD_ROUND_STATE
}

/**
 * Read a team's current score, defaulting to {@link INITIAL_TEAM_SCORE}.
 *
 * A pure read with a constant default — NOT a cache, and it never writes anything
 * back, so replay produces the same result every time. "No entry in the map" and
 * "zero" are therefore the same fact and can never disagree.
 *
 * `hasOwnProperty` rather than a bare index so an inherited `Object.prototype`
 * member can never be mistaken for a score. (Team ids cannot be `__proto__` —
 * the grammar requires a leading alphanumeric — but a read helper should not
 * depend on a rule enforced three layers away.)
 *
 * It deliberately does NOT sanitize a stored value. A score only enters the map
 * through `reduce`, which already refuses anything outside the bounds, so an
 * unusable value means the state is corrupt — and quietly substituting a zero
 * would hide that from the two places designed to notice: the planner (which
 * rejects with `score-out-of-range`) and the sanitizer (which projects the
 * neutral "unavailable" scoreboard). Repairing here would be exactly the silent
 * repair the rest of the engine refuses to do.
 */
export function teamScoreFor(game: PrivateGameState, teamId: string): number {
  if (!Object.prototype.hasOwnProperty.call(game.teamScores, teamId)) {
    return INITIAL_TEAM_SCORE
  }
  return game.teamScores[teamId]
}

/**
 * Read a round's response phase, defaulting to {@link INITIAL_RESPONSE_PHASE_STATE}.
 *
 * A pure read with a constant default — NOT a cache, and it never writes anything
 * back, so replay produces the same result every time and "no entry" and "idle,
 * disarmed" are the same fact. `hasOwnProperty` rather than a bare index so an
 * inherited `Object.prototype` member can never be mistaken for a phase.
 */
export function responsePhaseFor(
  game: PrivateGameState,
  roundId: string,
): ResponsePhaseState {
  if (!Object.prototype.hasOwnProperty.call(game.responsePhases, roundId)) {
    return INITIAL_RESPONSE_PHASE_STATE
  }
  return game.responsePhases[roundId]
}

/** Drop one round's phase entry, so the map only ever records non-initial phases. */
function withoutResponsePhase(
  phases: PrivateGameState['responsePhases'],
  roundId: string,
): PrivateGameState['responsePhases'] {
  if (!Object.prototype.hasOwnProperty.call(phases, roundId)) return phases
  const next: Record<string, ResponsePhaseState> = {}
  for (const [key, value] of Object.entries(phases)) {
    if (key !== roundId) next[key] = value
  }
  return next
}

/**
 * Apply a pure update to one round's board state.
 *
 * The updater returns `null` when the event does not apply to the current board
 * state (an impossible transition in a stored log). In that case the whole
 * event is skipped and state is returned UNCHANGED — the same fail-safe
 * event-application behavior the rest of the reducer uses, so a corrupt log
 * degrades to the last consistent state instead of throwing.
 *
 * `clearResponsePhase` expresses the Slice 7 transition rule: the three board
 * events that change WHICH clue is live (a new selection, the answer reveal, the
 * return to the grid) also end any response window on that round. It is applied
 * in the same state update, so a board transition and its phase consequence can
 * never be observed apart.
 */
function withBoardState(
  state: PrivateState,
  type: PrivateState['diagnostics']['lastAppliedEventType'],
  roundId: string,
  update: (board: CategoryBoardRoundState) => CategoryBoardRoundState | null,
  options: { readonly clearResponsePhase?: boolean } = {},
): PrivateState {
  if (!state.session || !state.session.game) return state
  const game = state.session.game
  if (game.gameLifecycle !== 'active') return state
  const next = update(categoryBoardStateFor(game, roundId))
  if (next === null) return state
  const nextGame: PrivateGameState = {
    ...game,
    categoryBoards: { ...game.categoryBoards, [roundId]: next },
    responsePhases: options.clearResponsePhase
      ? withoutResponsePhase(game.responsePhases, roundId)
      : game.responsePhases,
  }
  return withApplied(state, type, {
    ...state,
    session: { ...state.session, game: nextGame },
  })
}

/**
 * Apply a pure update to one round's response phase.
 *
 * Same fail-safe contract as `withBoardState`: an updater returning `null` means
 * the stored event does not apply to the current phase, and the whole event is
 * skipped with state unchanged rather than throwing. Writing back the INITIAL
 * phase removes the entry instead of storing it, so the map stays a record of
 * clues that actually have a phase.
 */
function withResponsePhase(
  state: PrivateState,
  type: PrivateState['diagnostics']['lastAppliedEventType'],
  roundId: string,
  update: (phase: ResponsePhaseState) => ResponsePhaseState | null,
): PrivateState {
  if (!state.session || !state.session.game) return state
  const game = state.session.game
  if (game.gameLifecycle !== 'active') return state
  const next = update(responsePhaseFor(game, roundId))
  if (next === null) return state
  const responsePhases = isInitialResponsePhase(next)
    ? withoutResponsePhase(game.responsePhases, roundId)
    : { ...game.responsePhases, [roundId]: next }
  const nextGame: PrivateGameState = { ...game, responsePhases }
  return withApplied(state, type, {
    ...state,
    session: { ...state.session, game: nextGame },
  })
}

/** Update the nested diagnostics for a successfully applied, state-affecting event. */
function withApplied(
  prev: PrivateState,
  type: PrivateState['diagnostics']['lastAppliedEventType'],
  next: PrivateState,
): PrivateState {
  return {
    ...next,
    diagnostics: {
      lastAppliedEventType: type,
      appliedEventCount: prev.diagnostics.appliedEventCount + 1,
    },
  }
}

/** Collect the ids of every event neutralized by an `EVENT_UNDONE` marker. */
function collectUndoneIds(history: readonly SessionEvent[]): ReadonlySet<string> {
  const undone = new Set<string>()
  for (const event of history) {
    if (event.type === 'EVENT_UNDONE') undone.add(event.targetEventId)
  }
  return undone
}

/**
 * Reconstruct authoritative state from the initial state plus the full history.
 * DETERMINISTIC and idempotent: `replay(h)` always equals `replay(h)`, and it is
 * the definition of "current state" the store relies on.
 *
 * `revision` is set to the history length so it counts every recorded fact
 * (including undone events and undo markers) and is therefore monotonic across a
 * session even though undo can lower the applied-event count.
 */
export function replay(history: readonly SessionEvent[]): PrivateState {
  const undone = collectUndoneIds(history)
  let state = INITIAL_PRIVATE_STATE
  for (const event of history) {
    if (event.type === 'EVENT_UNDONE') continue
    if (undone.has(event.id)) continue
    state = reduce(state, event)
  }
  return { ...state, revision: history.length }
}

/**
 * The events that currently COUNT: history minus undo markers minus every event
 * a marker neutralized. This is exactly the sequence `replay` applies, exposed so
 * a host surface can ask "has this already happened?" from the same source of
 * truth the state came from, instead of keeping its own parallel record.
 */
export function effectiveEvents(history: readonly SessionEvent[]): readonly SessionEvent[] {
  const undone = collectUndoneIds(history)
  return history.filter((event) => event.type !== 'EVENT_UNDONE' && !undone.has(event.id))
}

/**
 * Find the latest reversible event that has not already been undone — the target
 * of the next UNDO. Returns `null` when there is nothing to undo (empty history,
 * or every reversible event already undone), which makes UNDO a safe no-op.
 */
export function findUndoTarget(
  history: readonly SessionEvent[],
): SessionEvent | null {
  const undone = collectUndoneIds(history)
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const event = history[i]
    if (event.reversible && !undone.has(event.id)) return event
  }
  return null
}

/**
 * Decide whether a command is accepted and, if so, what event(s) it produces.
 * PURE: it derives event ids/seq from the history length and copies `issuedAt`
 * from the command, so the same (state, history, command) always yields the same
 * events. It NEVER mutates the inputs.
 */
export function planCommand(
  state: PrivateState,
  history: readonly SessionEvent[],
  command: SessionCommand,
  deps: PlanDeps = DEFAULT_PLAN_DEPS,
): CommandOutcome {
  const seq = history.length
  const id = `evt-${seq}`
  const at = command.issuedAt

  switch (command.type) {
    case 'INIT_SESSION': {
      if (typeof command.sessionId !== 'string' || command.sessionId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'SESSION_INITIALIZED',
            seq,
            occurredAt: at,
            reversible: false,
            sessionId: command.sessionId,
          },
        ],
      }
    }

    case 'SET_PUBLIC_STATUS': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      if (!isPublicStatusCode(command.code)) {
        return { status: 'rejected', reason: 'unknown-status-code' }
      }
      return {
        status: 'accepted',
        events: [
          { id, type: 'PUBLIC_STATUS_SET', seq, occurredAt: at, reversible: true, code: command.code },
        ],
      }
    }

    case 'ADVANCE_SEQUENCE': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      return {
        status: 'accepted',
        events: [{ id, type: 'SEQUENCE_ADVANCED', seq, occurredAt: at, reversible: true }],
      }
    }

    case 'MARK_WAITING': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      return {
        status: 'accepted',
        events: [{ id, type: 'WAITING_MARKED', seq, occurredAt: at, reversible: true }],
      }
    }

    case 'SET_HOST_NOTE': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      if (typeof command.note !== 'string' || command.note.length > MAX_NOTE_LENGTH) {
        return { status: 'rejected', reason: 'invalid-note' }
      }
      return {
        status: 'accepted',
        events: [
          { id, type: 'HOST_NOTE_SET', seq, occurredAt: at, reversible: true, note: command.note },
        ],
      }
    }

    case 'UNDO': {
      const target = findUndoTarget(history)
      if (!target) return { status: 'rejected', reason: 'nothing-to-undo' }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'EVENT_UNDONE',
            seq,
            occurredAt: at,
            reversible: false,
            targetEventId: target.id,
          },
        ],
      }
    }

    case 'INITIALIZE_GAME': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      // Fail closed on a malformed definition rather than trusting provenance.
      if (!isGameDefinition(command.definition)) {
        return { status: 'rejected', reason: 'invalid-game-definition' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'GAME_INITIALIZED',
            seq,
            occurredAt: at,
            reversible: false,
            definition: command.definition,
          },
        ],
      }
    }

    case 'SELECT_ROUND': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      const game = state.session.game
      if (!game) return { status: 'rejected', reason: 'game-not-initialized' }
      if (typeof command.roundId !== 'string' || command.roundId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const index = roundIndexById(game.definition, command.roundId)
      if (index < 0) return { status: 'rejected', reason: 'unknown-round' }
      const round = game.definition.rounds[index]
      const support: RoundSupport = deps.isKnownRoundType(round.type)
        ? 'supported'
        : 'unsupported'
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'CURRENT_ROUND_SELECTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundIndex: index,
            roundId: round.id,
            support,
          },
        ],
      }
    }

    case 'ADVANCE_TO_NEXT_ROUND': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      const game = state.session.game
      if (!game) return { status: 'rejected', reason: 'game-not-initialized' }
      const nextIndex = (game.currentRoundIndex ?? -1) + 1
      if (nextIndex >= game.definition.rounds.length) {
        // At (or past) the final round, or an empty game: safe rejection.
        return { status: 'rejected', reason: 'no-next-round' }
      }
      const round = game.definition.rounds[nextIndex]
      const support: RoundSupport = deps.isKnownRoundType(round.type)
        ? 'supported'
        : 'unsupported'
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'ROUND_ADVANCED',
            seq,
            occurredAt: at,
            reversible: true,
            roundIndex: nextIndex,
            roundId: round.id,
            support,
          },
        ],
      }
    }

    case 'END_GAME_SESSION': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      if (!state.session.game) return { status: 'rejected', reason: 'game-not-initialized' }
      return {
        status: 'accepted',
        events: [{ id, type: 'GAME_SESSION_ENDED', seq, occurredAt: at, reversible: false }],
      }
    }

    case 'SELECT_CATEGORY_BOARD_TILE': {
      const context = resolveCategoryBoard(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (typeof command.tileId !== 'string' || command.tileId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (findTileById(context.board, command.tileId) === null) {
        return { status: 'rejected', reason: 'unknown-tile' }
      }
      if (context.boardState.usedTileIds.includes(command.tileId)) {
        return { status: 'rejected', reason: 'tile-already-used' }
      }
      // A tile may only be picked from the board grid. Replacing an in-flight
      // selection is not allowed: return to the board first, so a stray click
      // during a live prompt cannot silently swap the question under the class.
      if (context.boardState.progress.stage !== 'board') {
        return { status: 'rejected', reason: 'invalid-board-stage' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'CATEGORY_BOARD_TILE_SELECTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            tileId: command.tileId,
          },
        ],
      }
    }

    case 'REVEAL_CATEGORY_BOARD_PROMPT': {
      const context = resolveCategoryBoard(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // Only from `selected`: no prompt without a selection, and no re-reveal.
      if (context.boardState.progress.stage !== 'selected') {
        return { status: 'rejected', reason: 'invalid-board-stage' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'CATEGORY_BOARD_PROMPT_REVEALED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'REVEAL_CATEGORY_BOARD_ANSWER': {
      const context = resolveCategoryBoard(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // Only from `prompt`: the answer can never precede the question.
      const progress = context.boardState.progress
      if (progress.stage !== 'prompt') {
        return { status: 'rejected', reason: 'invalid-board-stage' }
      }
      // Defensive: the selected tile must still exist on the current board.
      if (findTileById(context.board, progress.selectedTileId) === null) {
        return { status: 'rejected', reason: 'unknown-tile' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'CATEGORY_BOARD_ANSWER_REVEALED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            tileId: progress.selectedTileId,
          },
        ],
      }
    }

    case 'RETURN_TO_CATEGORY_BOARD': {
      const context = resolveCategoryBoard(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // Returning is valid from any stage that has a selection; returning to the
      // board from the board is a no-op transition and is rejected so it cannot
      // pad the event log with meaningless entries.
      if (context.boardState.progress.stage === 'board') {
        return { status: 'rejected', reason: 'invalid-board-stage' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'CATEGORY_BOARD_RETURNED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'ADJUST_TEAM_SCORE': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      const game = state.session.game
      if (!game) return { status: 'rejected', reason: 'game-not-initialized' }
      if (game.gameLifecycle !== 'active') {
        return { status: 'rejected', reason: 'game-already-ended' }
      }
      if (game.definition.teams.length === 0) {
        return { status: 'rejected', reason: 'no-teams-configured' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const team = findTeamById(game.definition.teams, command.teamId)
      if (team === null) return { status: 'rejected', reason: 'unknown-team' }
      if (!isScoreAdjustmentMode(command.mode)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (!isScoreSource(command.source)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      // Mode and source must agree in BOTH directions: a tile mode without a tile
      // has no value to match against, and a manual correction that names a tile
      // would claim provenance it did not use.
      if (modeRequiresValueSource(command.mode) !== (command.source.kind === 'category-board-tile')) {
        return { status: 'rejected', reason: 'invalid-score-source' }
      }

      // Resolve the amount's provenance from the trusted board — never from the
      // command. This is what makes "full credit" mean the tile's real effective
      // value rather than whatever number the UI sent.
      let sourceValue: number | null = null
      let source: ScoreSource = { kind: 'manual' }
      if (command.source.kind === 'category-board-tile') {
        const context = resolveCategoryBoard(state, command.source.roundId)
        if ('reason' in context) return { status: 'rejected', reason: context.reason }
        const tile = findTileById(context.board, command.source.tileId)
        if (tile === null) return { status: 'rejected', reason: 'unknown-tile' }
        const progress = context.boardState.progress
        // Scoring is only possible while the tile is LIVE and the class has seen
        // the question. A stale control from a closed tile is inert.
        if (progress.stage !== 'prompt' && progress.stage !== 'answer') {
          return { status: 'rejected', reason: 'invalid-board-stage' }
        }
        if (progress.selectedTileId !== command.source.tileId) {
          return { status: 'rejected', reason: 'tile-mismatch' }
        }
        sourceValue = tile.effectiveValue
        // Rebuild the source so the appended event cannot alias a caller object
        // that is mutated later.
        source = {
          kind: 'category-board-tile',
          roundId: context.round.id,
          tileId: command.source.tileId,
        }
      }

      const check = checkScoreAdjustment({
        mode: command.mode,
        delta: command.delta,
        currentScore: teamScoreFor(game, team.id),
        sourceValue,
      })
      if (!check.ok) return { status: 'rejected', reason: check.reason }

      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'TEAM_SCORE_ADJUSTED',
            seq,
            occurredAt: at,
            reversible: true,
            teamId: team.id,
            delta: command.delta,
            mode: command.mode,
            source,
          },
        ],
      }
    }

    case 'ARM_RESPONSE_PHASE': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // Arming an armed clue is not a fact worth recording, and recording it would
      // make "undo" ambiguous between two identical states.
      if (context.phase.armed) return { status: 'rejected', reason: 'invalid-response-phase' }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_PHASE_ARMED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'DISARM_RESPONSE_PHASE': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (!context.phase.armed) return { status: 'rejected', reason: 'invalid-response-phase' }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_PHASE_DISARMED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'START_RESPONSE_TIMER': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // One countdown per clue at a time. A second start must follow an explicit
      // reset, so a stray click cannot silently restart the clock mid-question.
      if (context.phase.timer.status !== 'idle') {
        return { status: 'rejected', reason: 'invalid-response-phase' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }
      // The authored default is the fallback; an explicit host choice is validated
      // against exactly the same bounds, so the UI can never widen the window.
      const seconds =
        command.durationSeconds === undefined
          ? context.game.definition.timer.responseSeconds
          : command.durationSeconds
      if (!isResponseSeconds(seconds)) {
        return { status: 'rejected', reason: 'invalid-timer-duration' }
      }
      const durationMs = responseDurationMs(seconds)
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_TIMER_STARTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            // Deterministic identity from the append index — the reducer generates
            // no ids and consults no random source.
            timerId: `tmr-${seq}`,
            durationMs,
            startedAt: at,
            deadline: at + durationMs,
          },
        ],
      }
    }

    case 'PAUSE_RESPONSE_TIMER': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const timer = context.phase.timer
      if (timer.status !== 'running') {
        return { status: 'rejected', reason: 'invalid-response-phase' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_TIMER_PAUSED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            timerId: timer.timerId,
            // How much is left is computed ONCE, here at the dispatch edge, and
            // then stored as a fact. Replay never recomputes it, so a paused timer
            // is frozen however long the history sits unused.
            remainingMs: boundedRemaining(timer.deadline - at, timer.durationMs),
          },
        ],
      }
    }

    case 'RESUME_RESPONSE_TIMER': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const timer = context.phase.timer
      if (timer.status !== 'paused') {
        return { status: 'rejected', reason: 'invalid-response-phase' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_TIMER_RESUMED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            timerId: timer.timerId,
            resumedAt: at,
            // A NEW deadline derived from the dispatch clock. The wall-clock time
            // spent paused is therefore never charged to the class — and never
            // consumed during a replay either.
            deadline: at + timer.remainingMs,
          },
        ],
      }
    }

    case 'INTERRUPT_RESPONSE_TIMER': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const timer = context.phase.timer
      if (timer.status !== 'running' && timer.status !== 'paused') {
        return { status: 'rejected', reason: 'invalid-response-phase' }
      }
      // The typed seam fails closed: an unrecognized source never reaches the log.
      if (!isResponseInterruptionSource(command.source)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }
      const remainingMs =
        timer.status === 'running'
          ? boundedRemaining(timer.deadline - at, timer.durationMs)
          : timer.remainingMs
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_TIMER_INTERRUPTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            timerId: timer.timerId,
            // Rebuilt rather than aliased, so the appended event cannot reference
            // a caller object that is mutated later (same rule as `ScoreSource`).
            source: { kind: command.source.kind },
            remainingMs,
          },
        ],
      }
    }

    case 'EXPIRE_RESPONSE_TIMER': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const timer = context.phase.timer
      // Everything below is what makes a stale timeout callback harmless. A
      // callback left over from a timer that was reset, restarted, paused, undone,
      // or abandoned by a clue or round change fails one of these checks and
      // appends nothing at all.
      if (timer.status !== 'running') {
        return { status: 'rejected', reason: 'stale-timer-expiration' }
      }
      if (typeof command.timerId !== 'string' || command.timerId !== timer.timerId) {
        return { status: 'rejected', reason: 'stale-timer-expiration' }
      }
      if (!isInstant(command.deadline) || command.deadline !== timer.deadline) {
        return { status: 'rejected', reason: 'stale-timer-expiration' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }
      // A window that has not ended cannot expire. The tolerance absorbs a
      // callback that fires a hair early; anything meaningfully early is the host
      // trying to end a live window and belongs to INTERRUPT instead.
      if (at < timer.deadline - EXPIRY_TOLERANCE_MS) {
        return { status: 'rejected', reason: 'premature-timer-expiration' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_TIMER_EXPIRED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            timerId: timer.timerId,
            deadline: timer.deadline,
          },
        ],
      }
    }

    case 'RESET_RESPONSE_PHASE': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (isInitialResponsePhase(context.phase)) {
        return { status: 'rejected', reason: 'invalid-response-phase' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'RESPONSE_PHASE_RESET',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    default:
      return { status: 'rejected', reason: 'malformed-command' }
  }
}

/** Clamp a computed remaining duration into `0 … durationMs`, integers only. */
function boundedRemaining(remaining: number, durationMs: number): number {
  if (!Number.isFinite(remaining) || remaining < 0) return 0
  return Math.min(Math.round(remaining), durationMs)
}

/** Everything a category-board command needs, or the reason it cannot proceed. */
type CategoryBoardContext =
  | {
      readonly round: RoundDefinition
      readonly board: CategoryBoardDefinition
      readonly boardState: CategoryBoardRoundState
    }
  | { readonly reason: RejectionReason }

/**
 * Resolve the current round as a playable category board, or explain why not.
 *
 * This is the single gate every category-board command passes through, so the
 * rejection rules are stated once: there must be a session, an ACTIVE game, a
 * current round, that round must be the one the command targeted, it must be a
 * category-board, and its config must still validate as a real board.
 */
function resolveCategoryBoard(state: PrivateState, roundId: unknown): CategoryBoardContext {
  if (!state.session) return { reason: 'session-not-initialized' }
  const game = state.session.game
  if (!game) return { reason: 'game-not-initialized' }
  if (game.gameLifecycle !== 'active') return { reason: 'game-already-ended' }
  if (game.currentRoundIndex === null) return { reason: 'no-current-round' }
  const round = game.definition.rounds[game.currentRoundIndex]
  if (!round) return { reason: 'no-current-round' }
  if (typeof roundId !== 'string' || roundId !== round.id) return { reason: 'round-mismatch' }
  const board = readCategoryBoardDefinition(round)
  if (board === null) {
    return {
      reason:
        round.type === CATEGORY_BOARD_ROUND_TYPE
          ? 'invalid-category-board-config'
          : 'not-a-category-board-round',
    }
  }
  return { round, board, boardState: categoryBoardStateFor(game, round.id) }
}

/** Everything a response-phase command needs, or the reason it cannot proceed. */
type ResponsePhaseContext =
  | {
      readonly game: PrivateGameState
      readonly round: RoundDefinition
      readonly phase: ResponsePhaseState
    }
  | { readonly reason: RejectionReason }

/**
 * Resolve the current clue as one that can carry a response phase, or explain
 * why not.
 *
 * This is the single gate every arming/timer command passes through, so the
 * legality rules are stated once. It reuses the board gate (session, ACTIVE game,
 * current round, matching round id, a real board) and adds ONE rule of its own:
 *
 *   **the clue must be at the `prompt` stage.**
 *
 * That is the whole legal window. Before the prompt is public there is nothing to
 * respond to, so arming would be theatre; once the answer is public the
 * opportunity is over, so a countdown would be meaningless. Every illegal
 * transition therefore fails closed at this one place rather than being spread
 * across eight command handlers.
 *
 * A future round type with a timed response resolves its own definition here and
 * reuses everything below unchanged.
 */
function resolveResponsePhase(state: PrivateState, roundId: unknown): ResponsePhaseContext {
  const context = resolveCategoryBoard(state, roundId)
  if ('reason' in context) return { reason: context.reason }
  if (context.boardState.progress.stage !== 'prompt') {
    return { reason: 'invalid-board-stage' }
  }
  // `resolveCategoryBoard` already proved both, but the check is repeated rather
  // than asserted so the types stay honest with no non-null escape hatch.
  const game = state.session?.game
  if (!game) return { reason: 'game-not-initialized' }
  return { game, round: context.round, phase: responsePhaseFor(game, context.round.id) }
}

export type { CommandType }
