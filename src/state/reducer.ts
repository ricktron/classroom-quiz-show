import type { SessionCommand, CommandType } from './commands'
import type { RoundSupport, SessionEvent } from './events'
import {
  INITIAL_PRIVATE_STATE,
  type PrivateGameState,
  type PrivateSessionState,
  type PrivateState,
} from './privateState'
import { isPublicStatusCode } from './status'
import { isGameDefinition, roundIndexById } from '../game/gameDefinition'
import type { RoundType } from '../game/ids'

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
      }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    case 'GAME_SESSION_ENDED': {
      if (!state.session || !state.session.game) return state
      const game: PrivateGameState = { ...state.session.game, gameLifecycle: 'ended' }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    // Undo markers change nothing directly; `replay` neutralizes their targets.
    case 'EVENT_UNDONE':
      return state

    default:
      // Unknown event type: fail safe, state unchanged.
      return state
  }
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

    default:
      return { status: 'rejected', reason: 'malformed-command' }
  }
}

export type { CommandType }
