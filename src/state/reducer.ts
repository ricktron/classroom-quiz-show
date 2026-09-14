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
import { MAX_TEAM_NAME_LENGTH } from '../game/teams/limits'
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
  TEAM_BUZZ_INTERRUPTION,
  isInitialResponsePhase,
  isResponseInterruptionSource,
  type ResponsePhaseState,
  type ResponseTimerState,
} from '../game/timing/responsePhase'
import {
  activeRespondent,
  appendBuzz,
  hasTeamBuzzed,
  isActiveResponseResolution,
  promoteNext,
  type ActiveResponseResolution,
} from '../game/timing/buzzQueue'
import { EXPIRY_TOLERANCE_MS } from '../game/timing/limits'
import { isResponseSeconds, responseDurationMs } from '../game/timing/timerConfig'
import { isInstant } from '../time/clock'
import {
  FINAL_WAGER_ROUND_TYPE,
  readFinalWagerDefinition,
  type FinalWagerDefinition,
} from '../game/finalWager/definition'
import {
  buildFinalEligibilitySnapshot,
  cloneFinalEligibilitySnapshot,
  findEligibleTeam,
  highestPrecedingClueValue,
  isFinalEligibilityMode,
  isFinalEligibilitySnapshot,
} from '../game/finalWager/eligibility'
import {
  INITIAL_FINAL_WAGER_ROUND_STATE,
  cloneFinalResponseState,
  committedResponse,
  committedWager,
  currentRevealTeamId,
  everyResponseCommitted,
  everyWagerCommitted,
  everyTeamSettled,
  finalLeaders,
  finalSettlementDelta,
  isFinalOutcome,
  isFinalResponseCaptureMode,
  isFinalResponseState,
  isInitialFinalWagerState,
  isLegalFinalWager,
  outcomeMatchesResponse,
  settlementFor,
  type FinalSettlement,
  type FinalWagerPhase,
  type FinalWagerRoundState,
} from '../game/finalWager/finalState'
import type { ResponseTimerState as FinalWindowState } from '../game/timing/responsePhase'
import type { TeamDefinition } from '../game/teams/definition'

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
  | 'session-team-name-taken'
  | 'invalid-session-team-name'
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
  // Buzz-queue rejections (Slice 8).
  | 'response-phase-not-armed'
  | 'team-already-buzzed'
  | 'no-active-respondent'
  // Final Wager rejections (Slice 14).
  | 'not-a-final-wager-round'
  | 'invalid-final-wager-config'
  | 'invalid-final-phase'
  | 'team-not-eligible'
  | 'invalid-final-wager'
  | 'invalid-final-response'
  | 'final-wagers-incomplete'
  | 'final-responses-incomplete'
  | 'team-already-revealed'
  | 'team-not-revealed'
  | 'team-already-settled'
  | 'final-outcome-mismatch'
  | 'no-tied-lead'
  | 'not-a-tied-leader'
  | 'stale-final-window'
  | 'premature-final-window-expiration'

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
        sessionTeamNames: {},
        categoryBoards: {},
        // A new game starts with no armed clue and no running timer, for the same
        // reason it starts every board fresh: loading a game is a hard baseline.
        responsePhases: {},
        // …and with no Final in progress, for exactly the same reason.
        finalWagers: {},
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
        // A Final that was in progress becomes `ended`. Its wagers, responses and
        // settlements are KEPT — they are the record of how the game finished, and
        // a class reads the final scoreboard after the game is over — but no
        // further Final transition is legal, which the phase now states outright.
        finalWagers: endedFinalWagers(state.session.game.finalWagers),
      }
      return withApplied(state, event.type, { ...state, session: { ...state.session, game } })
    }

    case 'FINAL_WAGER_STARTED':
      return withFinalWager(state, event.type, event.roundId, (final, game) => {
        // Beginning a Final that has already begun would silently re-freeze the
        // snapshot against post-Final scores — the one thing CQS-OD-005 forbids.
        if (final.phase !== 'setup' || final.snapshot !== null) return null
        if (!isFinalEligibilitySnapshot(event.snapshot)) return null
        const snapshot = cloneFinalEligibilitySnapshot(event.snapshot)
        // A Classic Final with nobody eligible has no wagers to take and no
        // responses to record. It resolves on the pre-final scores rather than
        // fabricating an empty wager round nobody played.
        const phase: FinalWagerPhase =
          snapshot.teams.length === 0
            ? resolvedFinalPhase(game.definition.teams, (id) => teamScoreFor(game, id))
            : 'wager-entry'
        return { ...final, phase, snapshot }
      })

    case 'FINAL_WAGER_WINDOW_STARTED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'wager-entry') return null
        const wagerWindow = applyWindowStart(final.wagerWindow, event)
        return wagerWindow === null ? null : { ...final, wagerWindow }
      })

    case 'FINAL_WAGER_WINDOW_PAUSED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        const wagerWindow = applyWindowPause(final.wagerWindow, event)
        return wagerWindow === null ? null : { ...final, wagerWindow }
      })

    case 'FINAL_WAGER_WINDOW_RESUMED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        const wagerWindow = applyWindowResume(final.wagerWindow, event)
        return wagerWindow === null ? null : { ...final, wagerWindow }
      })

    case 'FINAL_WAGER_WINDOW_EXPIRED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        // Expiry records ONLY that the window ended. It locks no wager, invents no
        // zero for a silent team, and advances no phase.
        const wagerWindow = applyWindowExpiry(final.wagerWindow, event)
        return wagerWindow === null ? null : { ...final, wagerWindow }
      })

    case 'FINAL_TEAM_WAGER_RECORDED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'wager-entry' || final.snapshot === null) return null
        // Re-checked on APPLICATION as well as on planning, so a stored log that
        // commits an over-cap or ineligible wager degrades to "not applicable"
        // rather than putting an unplayable number into a settlement.
        if (!isLegalFinalWager(final.snapshot, event.teamId, event.wager)) return null
        return { ...final, wagers: { ...final.wagers, [event.teamId]: event.wager } }
      })

    case 'FINAL_WAGERS_LOCKED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'wager-entry') return null
        if (!everyWagerCommitted(final)) return null
        return { ...final, phase: 'wagers-locked' }
      })

    case 'FINAL_RESPONSE_WINDOW_STARTED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'wagers-locked') return null
        if (!isFinalResponseCaptureMode(event.captureMode)) return null
        const responseWindow = applyWindowStart(final.responseWindow, event)
        if (responseWindow === null) return null
        // This transition is what makes the Final prompt public — there is no
        // separate "reveal the prompt" action to forget.
        return {
          ...final,
          phase: 'response-entry',
          captureMode: event.captureMode,
          responseWindow,
        }
      })

    case 'FINAL_RESPONSE_WINDOW_PAUSED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        const responseWindow = applyWindowPause(final.responseWindow, event)
        return responseWindow === null ? null : { ...final, responseWindow }
      })

    case 'FINAL_RESPONSE_WINDOW_RESUMED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        const responseWindow = applyWindowResume(final.responseWindow, event)
        return responseWindow === null ? null : { ...final, responseWindow }
      })

    case 'FINAL_RESPONSE_WINDOW_EXPIRED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        // As with the wager window: it records the expiry and marks nobody absent.
        const responseWindow = applyWindowExpiry(final.responseWindow, event)
        return responseWindow === null ? null : { ...final, responseWindow }
      })

    case 'FINAL_TEAM_RESPONSE_RECORDED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'response-entry' || final.snapshot === null) return null
        if (findEligibleTeam(final.snapshot, event.teamId) === null) return null
        if (!isFinalResponseState(event.response)) return null
        return {
          ...final,
          responses: {
            ...final.responses,
            [event.teamId]: cloneFinalResponseState(event.response),
          },
        }
      })

    case 'FINAL_RESPONSES_LOCKED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'response-entry') return null
        if (!everyResponseCommitted(final)) return null
        return { ...final, phase: 'responses-locked' }
      })

    case 'FINAL_ANSWER_REVEALED':
      return withFinalWager(state, event.type, event.roundId, (final) =>
        final.phase === 'responses-locked' ? { ...final, phase: 'answer-revealed' } : null,
      )

    case 'FINAL_TEAM_REVEALED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (final.phase !== 'answer-revealed' && final.phase !== 'team-reveal') return null
        if (final.snapshot === null) return null
        if (findEligibleTeam(final.snapshot, event.teamId) === null) return null
        if (final.revealedTeamIds.includes(event.teamId)) return null
        // One team is on screen at a time: the previous reveal must have been
        // settled before another team can be shown.
        if (currentRevealTeamId(final) !== null) return null
        return {
          ...final,
          phase: 'team-reveal',
          revealedTeamIds: [...final.revealedTeamIds, event.teamId],
        }
      })

    case 'FINAL_TEAM_SETTLED':
      return applyFinalSettlement(state, event)

    case 'FINAL_TIE_RESOLUTION_SELECTED':
      return withFinalWager(state, event.type, event.roundId, (final) => {
        if (event.resolution === 'sudden-death') {
          if (final.phase !== 'resolution') return null
          return { ...final, phase: 'sudden-death', tieResolution: 'sudden-death' }
        }
        if (event.resolution !== 'accepted-tie') return null
        if (final.phase !== 'resolution' && final.phase !== 'sudden-death') return null
        // The paired `GAME_SESSION_ENDED` in the same command outcome moves the
        // phase to `ended`; this event records only the CHOICE that was made.
        return { ...final, phase: 'ready-to-complete', tieResolution: 'accepted-tie' }
      })

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

    case 'SESSION_TEAM_NAME_SET': {
      if (!state.session || !state.session.game) return state
      const game = state.session.game
      if (findTeamById(game.definition.teams, event.teamId) === null) return state
      const nextNames = { ...game.sessionTeamNames }
      if (event.name === null) {
        delete nextNames[event.teamId]
      } else {
        nextNames[event.teamId] = event.name
      }
      const nextGame: PrivateGameState = {
        ...game,
        sessionTeamNames: nextNames,
      }
      return withApplied(state, event.type, {
        ...state,
        session: { ...state.session, game: nextGame },
      })
    }

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
        // window that has already ended, and (since Slice 8) no further buzz is
        // accepted either — disarming IS the intake gate. It moves no points.
        // The queue is KEPT: who buzzed before the clock ran out is still a fact,
        // and the host may still resolve the active team's turn.
        return { armed: false, timer, queue: phase.queue }
      })

    case 'RESPONSE_PHASE_RESET':
      return withResponsePhase(state, event.type, event.roundId, (phase) =>
        isInitialResponsePhase(phase) ? null : INITIAL_RESPONSE_PHASE_STATE,
      )

    case 'TEAM_BUZZED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        // Arming is re-checked on APPLICATION as well as on planning, so a stored
        // log that buzzes a disarmed clue degrades to "not applicable" rather
        // than fabricating a respondent nobody let in.
        if (!phase.armed) return null
        const queue = appendBuzz(phase.queue, event.teamId)
        // `null` means the team is already in the queue: the duplicate rule is
        // structural in `appendBuzz`, so it holds on replay of any log at all.
        if (queue === null) return null
        return { ...phase, queue }
      })

    case 'ACTIVE_RESPONSE_RESOLVED':
      return withResponsePhase(state, event.type, event.roundId, (phase) => {
        // The event names the team whose turn ended, so a log that disagrees with
        // the queue it is describing is not applied — that is a corrupt history,
        // and advancing the pointer anyway would promote the wrong team.
        if (activeRespondent(phase.queue) !== event.teamId) return null
        if (!isActiveResponseResolution(event.resolution)) return null
        const queue = promoteNext(phase.queue)
        if (queue === null) return null
        // Promotion moves the pointer and NOTHING else: arming is untouched (so a
        // still-armed clue keeps taking buzzes), the timer is untouched, and no
        // score moves.
        return { ...phase, queue }
      })

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
export function sessionTeamNameFor(game: PrivateGameState, teamId: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(game.sessionTeamNames, teamId)) return null
  const name = game.sessionTeamNames[teamId]
  return typeof name === 'string' && name.length > 0 ? name : null
}

export function publicTeamDisplayName(
  game: PrivateGameState,
  teamId: string,
  authoredName: string,
): string {
  return sessionTeamNameFor(game, teamId) ?? authoredName
}

export function sessionTeamNamesAreChosen(game: PrivateGameState): boolean {
  return game.definition.teams.every((team) => sessionTeamNameFor(game, team.id) !== null)
}

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

/**
 * Read a round's Final state, defaulting to
 * {@link INITIAL_FINAL_WAGER_ROUND_STATE}.
 *
 * A pure read with a constant default — NOT a cache, and it never writes anything
 * back, so replay produces the same result every time and "no entry" and "not
 * begun" are the same fact. `hasOwnProperty` rather than a bare index so an
 * inherited `Object.prototype` member can never be mistaken for a Final.
 */
export function finalWagerStateFor(
  game: PrivateGameState,
  roundId: string,
): FinalWagerRoundState {
  if (!Object.prototype.hasOwnProperty.call(game.finalWagers, roundId)) {
    return INITIAL_FINAL_WAGER_ROUND_STATE
  }
  return game.finalWagers[roundId]
}

/**
 * The phase a fully-settled Final lands in: `resolution` when the lead is tied
 * and the host must choose (CQS-OD-011), `ready-to-complete` when one team leads
 * outright.
 *
 * Derived from the replayed scores in `reduce`, so the two situations are
 * distinguishable without the host UI having to work it out — and so undoing a
 * settlement moves the phase back automatically on the next replay.
 */
function resolvedFinalPhase(
  teams: readonly TeamDefinition[],
  scoreFor: (teamId: string) => number,
): FinalWagerPhase {
  return finalLeaders(teams, scoreFor).length > 1 ? 'resolution' : 'ready-to-complete'
}

/** Start a Final window. Refuses anything but an idle one — one countdown at a time. */
function applyWindowStart(
  window: FinalWindowState,
  event: {
    readonly timerId: string
    readonly durationMs: number
    readonly startedAt: number
    readonly deadline: number
  },
): FinalWindowState | null {
  if (window.status !== 'idle') return null
  return {
    status: 'running',
    timerId: event.timerId,
    durationMs: event.durationMs,
    startedAt: event.startedAt,
    deadline: event.deadline,
  }
}

/** Freeze a Final window. Identity is re-checked on application, as ADR-007 does. */
function applyWindowPause(
  window: FinalWindowState,
  event: { readonly timerId: string; readonly remainingMs: number },
): FinalWindowState | null {
  if (window.status !== 'running' || window.timerId !== event.timerId) return null
  return {
    status: 'paused',
    timerId: window.timerId,
    durationMs: window.durationMs,
    remainingMs: event.remainingMs,
  }
}

/** Resume a frozen Final window against a deadline derived at the dispatch edge. */
function applyWindowResume(
  window: FinalWindowState,
  event: { readonly timerId: string; readonly resumedAt: number; readonly deadline: number },
): FinalWindowState | null {
  if (window.status !== 'paused' || window.timerId !== event.timerId) return null
  return {
    status: 'running',
    timerId: window.timerId,
    durationMs: window.durationMs,
    startedAt: event.resumedAt,
    deadline: event.deadline,
  }
}

/**
 * Expire a Final window. The three-way match — running, same timer, same deadline
 * — is what makes "exactly one effective expiry per countdown" structural: once
 * this applies the status is no longer `running`, so a second expiry of the same
 * window can never apply.
 */
function applyWindowExpiry(
  window: FinalWindowState,
  event: { readonly timerId: string; readonly deadline: number },
): FinalWindowState | null {
  if (window.status !== 'running') return null
  if (window.timerId !== event.timerId || window.deadline !== event.deadline) return null
  return {
    status: 'expired',
    timerId: window.timerId,
    durationMs: window.durationMs,
    deadline: window.deadline,
  }
}

/**
 * Apply one Final settlement: the score change and the Final state change in ONE
 * update, so a settled team and its points can never be observed apart.
 *
 * It is written out rather than routed through `withFinalWager` precisely because
 * it touches two fields. Everything is re-checked on application — the team is
 * the one on screen, it has not already been settled, the outcome agrees with the
 * recorded response, the delta matches the committed wager, and the resulting
 * score stays in range — so a corrupt log degrades to "not applicable" instead of
 * inventing points.
 */
function applyFinalSettlement(
  state: PrivateState,
  event: {
    readonly type: 'FINAL_TEAM_SETTLED'
    readonly roundId: string
    readonly teamId: string
    readonly wager: number
    readonly outcome: FinalOutcomeValue
    readonly delta: number
  },
): PrivateState {
  if (!state.session || !state.session.game) return state
  const game = state.session.game
  if (game.gameLifecycle !== 'active') return state
  if (findTeamById(game.definition.teams, event.teamId) === null) return state

  const final = finalWagerStateFor(game, event.roundId)
  if (final.phase !== 'team-reveal' || final.snapshot === null) return state
  if (currentRevealTeamId(final) !== event.teamId) return state
  if (settlementFor(final, event.teamId) !== null) return state
  if (!isFinalOutcome(event.outcome)) return state

  const response = committedResponse(final, event.teamId)
  if (response === null || !outcomeMatchesResponse(response, event.outcome)) return state

  const wager = committedWager(final, event.teamId)
  if (wager === null || wager !== event.wager) return state
  if (finalSettlementDelta(event.outcome, wager) !== event.delta) return state

  const next = teamScoreFor(game, event.teamId) + event.delta
  // Fail safe rather than clamp, exactly as `TEAM_SCORE_ADJUSTED` does: a stored
  // delta that would leave the bounds means the log disagrees with the rules that
  // produced it, and clamping would invent a score nobody awarded.
  if (!isTeamScore(next)) return state

  const settlement: FinalSettlement = {
    teamId: event.teamId,
    wager: event.wager,
    outcome: event.outcome,
    delta: event.delta,
  }
  const settlements = { ...final.settlements, [event.teamId]: settlement }
  const teamScores = { ...game.teamScores, [event.teamId]: next }
  const settledFinal: FinalWagerRoundState = { ...final, settlements }
  const phase: FinalWagerPhase = everyTeamSettled(settledFinal)
    ? resolvedFinalPhase(game.definition.teams, (id) =>
        id === event.teamId ? next : teamScoreFor(game, id),
      )
    : 'team-reveal'

  const nextGame: PrivateGameState = {
    ...game,
    teamScores,
    finalWagers: { ...game.finalWagers, [event.roundId]: { ...settledFinal, phase } },
  }
  return withApplied(state, event.type, {
    ...state,
    session: { ...state.session, game: nextGame },
  })
}

/** Narrow alias so the settlement helper does not import the outcome type twice. */
type FinalOutcomeValue = FinalSettlement['outcome']

/** Move every Final that has begun to the terminal `ended` phase. */
function endedFinalWagers(
  finals: PrivateGameState['finalWagers'],
): PrivateGameState['finalWagers'] {
  const next: Record<string, FinalWagerRoundState> = {}
  for (const [roundId, final] of Object.entries(finals)) {
    next[roundId] = isInitialFinalWagerState(final) ? final : { ...final, phase: 'ended' }
  }
  return next
}

/** Drop one round's Final entry, so the map only records Finals that have begun. */
function withoutFinalWager(
  finals: PrivateGameState['finalWagers'],
  roundId: string,
): PrivateGameState['finalWagers'] {
  if (!Object.prototype.hasOwnProperty.call(finals, roundId)) return finals
  const next: Record<string, FinalWagerRoundState> = {}
  for (const [key, value] of Object.entries(finals)) {
    if (key !== roundId) next[key] = value
  }
  return next
}

/**
 * Apply a pure update to one round's Final state.
 *
 * Same fail-safe contract as `withBoardState` and `withResponsePhase`: an updater
 * returning `null` means the stored event does not apply to the current Final,
 * and the whole event is skipped with state unchanged rather than throwing.
 * Writing back the INITIAL state removes the entry instead of storing it, so the
 * map stays a record of Finals that have actually begun.
 */
function withFinalWager(
  state: PrivateState,
  type: PrivateState['diagnostics']['lastAppliedEventType'],
  roundId: string,
  update: (
    final: FinalWagerRoundState,
    game: PrivateGameState,
  ) => FinalWagerRoundState | null,
): PrivateState {
  if (!state.session || !state.session.game) return state
  const game = state.session.game
  if (game.gameLifecycle !== 'active') return state
  const next = update(finalWagerStateFor(game, roundId), game)
  if (next === null) return state
  const finalWagers = isInitialFinalWagerState(next)
    ? withoutFinalWager(game.finalWagers, roundId)
    : { ...game.finalWagers, [roundId]: next }
  const nextGame: PrivateGameState = { ...game, finalWagers }
  return withApplied(state, type, {
    ...state,
    session: { ...state.session, game: nextGame },
  })
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

    case 'SET_SESSION_TEAM_NAME': {
      if (!state.session) return { status: 'rejected', reason: 'session-not-initialized' }
      const game = state.session.game
      if (!game) return { status: 'rejected', reason: 'game-not-initialized' }
      if (game.definition.teams.length === 0) {
        return { status: 'rejected', reason: 'no-teams-configured' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const team = findTeamById(game.definition.teams, command.teamId)
      if (team === null) return { status: 'rejected', reason: 'unknown-team' }
      let nextName: string | null = null
      if (command.name !== null) {
        if (typeof command.name !== 'string') {
          return { status: 'rejected', reason: 'malformed-command' }
        }
        const normalized = command.name.trim().replace(/\s+/g, ' ')
        if (normalized.length === 0 || normalized.length > MAX_TEAM_NAME_LENGTH) {
          return { status: 'rejected', reason: 'invalid-session-team-name' }
        }
        const key = normalized.toLowerCase()
        for (const other of game.definition.teams) {
          if (other.id === team.id) continue
          const existing = sessionTeamNameFor(game, other.id)
          if (existing && existing.toLowerCase() === key) {
            return { status: 'rejected', reason: 'session-team-name-taken' }
          }
        }
        nextName = normalized
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'SESSION_TEAM_NAME_SET',
            seq,
            occurredAt: at,
            reversible: true,
            teamId: team.id,
            name: nextName,
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
      // Sudden death (CQS-OD-011) narrows this command and nothing else: while a
      // Final is in sudden death, correction is the tiebreak mechanism and may
      // move only a tied leader's score. Every other team's total is already the
      // finished result, and adjusting one would silently rewrite it.
      if (suddenDeathFinalOf(game) !== null) {
        const leaders = finalLeaders(game.definition.teams, (id) => teamScoreFor(game, id))
        if (!leaders.includes(team.id)) {
          return { status: 'rejected', reason: 'not-a-tied-leader' }
        }
      }
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

    case 'RECORD_TEAM_BUZZ': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      // Every gate below fails CLOSED and appends nothing, so a press that should
      // not count is inert rather than partially applied.
      if (!namesLiveOpportunity(command.tileId, context.tileId)) {
        return { status: 'rejected', reason: 'tile-mismatch' }
      }
      // Arming is the intake gate (OG-1 + OG-2): while the clue is armed the
      // queue keeps taking new teams, and disarming stops acceptance immediately.
      if (!context.phase.armed) {
        return { status: 'rejected', reason: 'response-phase-not-armed' }
      }
      if (context.game.definition.teams.length === 0) {
        return { status: 'rejected', reason: 'no-teams-configured' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const team = findTeamById(context.game.definition.teams, command.teamId)
      if (team === null) return { status: 'rejected', reason: 'unknown-team' }
      // One entry per team per response opportunity: a team that is already
      // active, already waiting, or has already had its turn cannot buzz again.
      if (hasTeamBuzzed(context.phase.queue, team.id)) {
        return { status: 'rejected', reason: 'team-already-buzzed' }
      }
      if (!isInstant(at)) return { status: 'rejected', reason: 'malformed-command' }

      const buzz: SessionEvent = {
        id,
        type: 'TEAM_BUZZED',
        seq,
        occurredAt: at,
        reversible: true,
        roundId: context.round.id,
        tileId: context.tileId,
        teamId: team.id,
      }

      // The FIRST accepted buzz of a live countdown stops the clock, and it does
      // so through Slice 7's typed interruption seam rather than through anything
      // buzz-shaped: the same event, the same reducer transition, one new source
      // member. A later buzz cannot interrupt again because the timer is no
      // longer running or paused — that is structural, not a suppression rule.
      const timer = context.phase.timer
      if (timer.status !== 'running' && timer.status !== 'paused') {
        return { status: 'accepted', events: [buzz] }
      }
      const remainingMs =
        timer.status === 'running'
          ? boundedRemaining(timer.deadline - at, timer.durationMs)
          : timer.remainingMs
      return {
        status: 'accepted',
        events: [
          buzz,
          {
            // The pair is appended together and reads in causal order: the team
            // buzzed, and therefore the clock stopped. Undo is still latest-only
            // (ADR-002), so it peels the consequence off first and the buzz
            // second — see ADR-008 "Replay and undo".
            id: `evt-${seq + 1}`,
            type: 'RESPONSE_TIMER_INTERRUPTED',
            seq: seq + 1,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            timerId: timer.timerId,
            source: TEAM_BUZZ_INTERRUPTION,
            remainingMs,
          },
        ],
      }
    }

    case 'RESOLVE_ACTIVE_RESPONSE': {
      const context = resolveResponsePhase(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (!namesLiveOpportunity(command.tileId, context.tileId)) {
        return { status: 'rejected', reason: 'tile-mismatch' }
      }
      if (!isActiveResponseResolution(command.resolution)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      // Nothing to promote from: an empty queue and an exhausted one both land
      // here, and both are honest "there is no active respondent" rejections
      // rather than a silent no-op that pads the log.
      const active = activeRespondent(context.phase.queue)
      if (active === null) return { status: 'rejected', reason: 'no-active-respondent' }
      // Rebuilt rather than aliased, so the appended event cannot reference a
      // caller object that is mutated later (the `ScoreSource` rule).
      const resolution: ActiveResponseResolution = { kind: command.resolution.kind }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'ACTIVE_RESPONSE_RESOLVED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            tileId: context.tileId,
            // Taken from the QUEUE, not from the command: the log records which
            // team actually had the turn, so it can never name a team the host
            // merely believed was active.
            teamId: active,
            resolution,
          },
        ],
      }
    }

    case 'BEGIN_FINAL_WAGER': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'setup' || context.final.snapshot !== null) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      // A Final with no teams has nobody to wager, nobody to reveal and no winner.
      // The import boundary already refuses such a game; this is the runtime half
      // of the same rule, for a trusted in-memory definition.
      if (context.game.definition.teams.length === 0) {
        return { status: 'rejected', reason: 'no-teams-configured' }
      }
      if (!isFinalEligibilityMode(command.mode)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const finalIndex = context.game.currentRoundIndex ?? 0
      const snapshot = buildFinalEligibilitySnapshot({
        mode: command.mode,
        teams: context.game.definition.teams,
        scoreFor: (teamId) => teamScoreFor(context.game, teamId),
        precedingClueCap: highestPrecedingClueValue(context.game.definition, finalIndex),
      })
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGER_STARTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            snapshot,
          },
        ],
      }
    }

    case 'START_FINAL_WAGER_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'wager-entry') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      const started = planFinalWindowStart(context.final.wagerWindow, command, context, seq, at)
      if ('reason' in started) return { status: 'rejected', reason: started.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGER_WINDOW_STARTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...started.facts,
          },
        ],
      }
    }

    case 'PAUSE_FINAL_WAGER_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const paused = planFinalWindowPause(context.final.wagerWindow, at)
      if ('reason' in paused) return { status: 'rejected', reason: paused.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGER_WINDOW_PAUSED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...paused.facts,
          },
        ],
      }
    }

    case 'RESUME_FINAL_WAGER_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const resumed = planFinalWindowResume(context.final.wagerWindow, at)
      if ('reason' in resumed) return { status: 'rejected', reason: resumed.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGER_WINDOW_RESUMED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...resumed.facts,
          },
        ],
      }
    }

    case 'EXPIRE_FINAL_WAGER_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const expired = planFinalWindowExpiry(context.final.wagerWindow, command, at)
      if ('reason' in expired) return { status: 'rejected', reason: expired.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGER_WINDOW_EXPIRED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...expired.facts,
          },
        ],
      }
    }

    case 'RECORD_FINAL_WAGER': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const final = context.final
      if (final.phase !== 'wager-entry' || final.snapshot === null) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (findTeamById(context.game.definition.teams, command.teamId) === null) {
        return { status: 'rejected', reason: 'unknown-team' }
      }
      if (findEligibleTeam(final.snapshot, command.teamId) === null) {
        return { status: 'rejected', reason: 'team-not-eligible' }
      }
      // Rejected, never clamped: an over-cap, negative, fractional or non-finite
      // wager appends nothing and mutates nothing.
      if (!isLegalFinalWager(final.snapshot, command.teamId, command.wager)) {
        return { status: 'rejected', reason: 'invalid-final-wager' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_TEAM_WAGER_RECORDED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            teamId: command.teamId,
            wager: command.wager,
          },
        ],
      }
    }

    case 'LOCK_FINAL_WAGERS': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'wager-entry') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      // Every eligible team needs an EXPLICIT wager — including an explicit zero.
      // Locking with a team missing would force the engine to invent a number.
      if (!everyWagerCommitted(context.final)) {
        return { status: 'rejected', reason: 'final-wagers-incomplete' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_WAGERS_LOCKED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'START_FINAL_RESPONSE_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'wagers-locked') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (!isFinalResponseCaptureMode(command.captureMode)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const started = planFinalWindowStart(
        context.final.responseWindow,
        command,
        context,
        seq,
        at,
      )
      if ('reason' in started) return { status: 'rejected', reason: started.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_RESPONSE_WINDOW_STARTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            captureMode: command.captureMode,
            ...started.facts,
          },
        ],
      }
    }

    case 'PAUSE_FINAL_RESPONSE_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const paused = planFinalWindowPause(context.final.responseWindow, at)
      if ('reason' in paused) return { status: 'rejected', reason: paused.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_RESPONSE_WINDOW_PAUSED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...paused.facts,
          },
        ],
      }
    }

    case 'RESUME_FINAL_RESPONSE_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const resumed = planFinalWindowResume(context.final.responseWindow, at)
      if ('reason' in resumed) return { status: 'rejected', reason: resumed.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_RESPONSE_WINDOW_RESUMED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...resumed.facts,
          },
        ],
      }
    }

    case 'EXPIRE_FINAL_RESPONSE_WINDOW': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const expired = planFinalWindowExpiry(context.final.responseWindow, command, at)
      if ('reason' in expired) return { status: 'rejected', reason: expired.reason }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_RESPONSE_WINDOW_EXPIRED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            ...expired.facts,
          },
        ],
      }
    }

    case 'RECORD_FINAL_RESPONSE': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const final = context.final
      if (final.phase !== 'response-entry' || final.snapshot === null) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (findTeamById(context.game.definition.teams, command.teamId) === null) {
        return { status: 'rejected', reason: 'unknown-team' }
      }
      if (findEligibleTeam(final.snapshot, command.teamId) === null) {
        return { status: 'rejected', reason: 'team-not-eligible' }
      }
      // Whitespace-only exact text fails here: a host with nothing to type must
      // say `not-captured` or `no-response`, so the log never conflates the two.
      if (!isFinalResponseState(command.response)) {
        return { status: 'rejected', reason: 'invalid-final-response' }
      }
      // Exact wording can only be captured when the host chose to capture it —
      // otherwise the log would claim a transcription mode nobody selected.
      if (command.response.kind === 'exact' && final.captureMode !== 'exact-text') {
        return { status: 'rejected', reason: 'invalid-final-response' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_TEAM_RESPONSE_RECORDED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            teamId: command.teamId,
            // Rebuilt rather than aliased, so the appended event cannot reference
            // a caller object that is mutated later (the `ScoreSource` rule).
            response: cloneFinalResponseState(command.response),
          },
        ],
      }
    }

    case 'LOCK_FINAL_RESPONSES': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'response-entry') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (!everyResponseCommitted(context.final)) {
        return { status: 'rejected', reason: 'final-responses-incomplete' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_RESPONSES_LOCKED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'REVEAL_FINAL_ANSWER': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'responses-locked') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_ANSWER_REVEALED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
          },
        ],
      }
    }

    case 'REVEAL_FINAL_TEAM': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const final = context.final
      if (
        (final.phase !== 'answer-revealed' && final.phase !== 'team-reveal') ||
        final.snapshot === null
      ) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      // One team at a time: the team currently on screen must be settled first.
      if (currentRevealTeamId(final) !== null) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      if (findEligibleTeam(final.snapshot, command.teamId) === null) {
        return { status: 'rejected', reason: 'team-not-eligible' }
      }
      if (final.revealedTeamIds.includes(command.teamId)) {
        return { status: 'rejected', reason: 'team-already-revealed' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_TEAM_REVEALED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            // The team the host ACTUALLY chose — default order or alternate.
            teamId: command.teamId,
          },
        ],
      }
    }

    case 'SETTLE_FINAL_TEAM': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const final = context.final
      if (final.phase !== 'team-reveal' || final.snapshot === null) {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (typeof command.teamId !== 'string' || command.teamId.length === 0) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      // Settlement follows a reveal, never precedes one.
      if (currentRevealTeamId(final) !== command.teamId) {
        return { status: 'rejected', reason: 'team-not-revealed' }
      }
      if (settlementFor(final, command.teamId) !== null) {
        return { status: 'rejected', reason: 'team-already-settled' }
      }
      if (!isFinalOutcome(command.outcome)) {
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const response = committedResponse(final, command.teamId)
      if (response === null) return { status: 'rejected', reason: 'invalid-final-phase' }
      // The outcome must agree with what was recorded: a team marked as not
      // answering cannot be judged correct, and a team that answered cannot be
      // settled as a no-response.
      if (!outcomeMatchesResponse(response, command.outcome)) {
        return { status: 'rejected', reason: 'final-outcome-mismatch' }
      }
      // Read from frozen state, NEVER from the command — the same rule that stops
      // a "full credit" score event carrying an arbitrary amount (ADR-006).
      const wager = committedWager(final, command.teamId)
      if (wager === null) return { status: 'rejected', reason: 'invalid-final-phase' }
      const delta = finalSettlementDelta(command.outcome, wager)
      const resulting = teamScoreFor(context.game, command.teamId) + delta
      if (!isTeamScore(resulting)) {
        return { status: 'rejected', reason: 'score-out-of-range' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_TEAM_SETTLED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            teamId: command.teamId,
            wager,
            outcome: command.outcome,
            // A zero wager still records a settlement with a zero delta: the
            // adjudication happened, and that is a fact worth keeping.
            delta,
          },
        ],
      }
    }

    case 'ENTER_FINAL_SUDDEN_DEATH': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      if (context.final.phase !== 'resolution') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      // Defensive re-check: sudden death exists only to break a tie.
      if (!hasTiedLead(context.game)) {
        return { status: 'rejected', reason: 'no-tied-lead' }
      }
      return {
        status: 'accepted',
        events: [
          {
            id,
            type: 'FINAL_TIE_RESOLUTION_SELECTED',
            seq,
            occurredAt: at,
            reversible: true,
            roundId: context.round.id,
            resolution: 'sudden-death',
          },
        ],
      }
    }

    case 'ACCEPT_FINAL_TIED_FINISH': {
      const context = resolveFinalWager(state, command.roundId)
      if ('reason' in context) return { status: 'rejected', reason: context.reason }
      const phase = context.final.phase
      if (phase !== 'resolution' && phase !== 'sudden-death') {
        return { status: 'rejected', reason: 'invalid-final-phase' }
      }
      if (!hasTiedLead(context.game)) {
        return { status: 'rejected', reason: 'no-tied-lead' }
      }
      return {
        status: 'accepted',
        events: [
          {
            // Irreversible, because the completion appended beside it is. Making
            // the acceptance undoable while the ended game is not would let the
            // two disagree about whether the game is over.
            id,
            type: 'FINAL_TIE_RESOLUTION_SELECTED',
            seq,
            occurredAt: at,
            reversible: false,
            roundId: context.round.id,
            resolution: 'accepted-tie',
          },
          {
            // Completion goes through the EXISTING ended-game boundary rather than
            // a Final-specific one, so there is still exactly one way a game ends.
            id: `evt-${seq + 1}`,
            type: 'GAME_SESSION_ENDED',
            seq: seq + 1,
            occurredAt: at,
            reversible: false,
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
      /**
       * The tile whose prompt is live — the identity of this response
       * OPPORTUNITY (Slice 8). A buzz naming a different tile is stale and is
       * rejected, which is how a press that lands after the host moved on cannot
       * affect the next clue.
       */
      readonly tileId: string
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
  const progress = context.boardState.progress
  if (progress.stage !== 'prompt') {
    return { reason: 'invalid-board-stage' }
  }
  // `resolveCategoryBoard` already proved both, but the check is repeated rather
  // than asserted so the types stay honest with no non-null escape hatch.
  const game = state.session?.game
  if (!game) return { reason: 'game-not-initialized' }
  return {
    game,
    round: context.round,
    phase: responsePhaseFor(game, context.round.id),
    tileId: progress.selectedTileId,
  }
}

/**
 * Does this command name the response opportunity that is actually live?
 *
 * The (round, tile) pair is the response-opportunity identity (Slice 8). It reuses
 * identifiers that already exist rather than inventing a new one, and it is the
 * same shape of defence the timer uses with `timerId` + `deadline` (ADR-007 §6):
 * a command that names the previous clue appends nothing at all.
 */
function namesLiveOpportunity(tileId: unknown, liveTileId: string): boolean {
  return typeof tileId === 'string' && tileId === liveTileId
}

/** Everything a Final Wager command needs, or the reason it cannot proceed. */
type FinalWagerContext =
  | {
      readonly game: PrivateGameState
      readonly round: RoundDefinition
      readonly definition: FinalWagerDefinition
      readonly final: FinalWagerRoundState
    }
  | { readonly reason: RejectionReason }

/**
 * Resolve the current round as a playable Final Wager round, or explain why not.
 *
 * This is the single gate every Final command passes through, so the rejection
 * rules are stated once — the exact arrangement `resolveCategoryBoard` uses for
 * the board: there must be a session, an ACTIVE game, a current round, that round
 * must be the one the command targeted, it must be a Final, and its config must
 * still validate as a real Final.
 *
 * Per-phase legality is deliberately NOT here. Each command owns exactly one
 * legal phase (or two, where a transition genuinely has two entry points), and
 * putting that in the shared gate would make the phase machine invisible.
 */
function resolveFinalWager(state: PrivateState, roundId: unknown): FinalWagerContext {
  if (!state.session) return { reason: 'session-not-initialized' }
  const game = state.session.game
  if (!game) return { reason: 'game-not-initialized' }
  if (game.gameLifecycle !== 'active') return { reason: 'game-already-ended' }
  if (game.currentRoundIndex === null) return { reason: 'no-current-round' }
  const round = game.definition.rounds[game.currentRoundIndex]
  if (!round) return { reason: 'no-current-round' }
  if (typeof roundId !== 'string' || roundId !== round.id) return { reason: 'round-mismatch' }
  const definition = readFinalWagerDefinition(round)
  if (definition === null) {
    return {
      reason:
        round.type === FINAL_WAGER_ROUND_TYPE
          ? 'invalid-final-wager-config'
          : 'not-a-final-wager-round',
    }
  }
  return { game, round, definition, final: finalWagerStateFor(game, round.id) }
}

/** A planned window transition: the durable facts, or the reason it was refused. */
type FinalWindowPlan<T> = { readonly facts: T } | { readonly reason: RejectionReason }

/**
 * Plan the start of a Final window.
 *
 * The authored default is the fallback; an explicit host choice is validated
 * against exactly the same 5–600 second bounds, so the UI can never widen the
 * window. The identity is derived from the append index, so the reducer generates
 * no ids and consults no random source.
 */
function planFinalWindowStart(
  window: FinalWindowState,
  command: { readonly durationSeconds?: number },
  context: { readonly game: PrivateGameState },
  seq: number,
  at: number,
): FinalWindowPlan<{
  readonly timerId: string
  readonly durationMs: number
  readonly startedAt: number
  readonly deadline: number
}> {
  // One countdown per window at a time. A second start would silently restart a
  // clock the room is already watching.
  if (window.status !== 'idle') return { reason: 'invalid-final-phase' }
  if (!isInstant(at)) return { reason: 'malformed-command' }
  const seconds =
    command.durationSeconds === undefined
      ? context.game.definition.timer.responseSeconds
      : command.durationSeconds
  if (!isResponseSeconds(seconds)) return { reason: 'invalid-timer-duration' }
  const durationMs = responseDurationMs(seconds)
  return {
    facts: {
      timerId: `fwt-${seq}`,
      durationMs,
      startedAt: at,
      deadline: at + durationMs,
    },
  }
}

/** Plan a pause: how much is left is computed ONCE, here, then stored as a fact. */
function planFinalWindowPause(
  window: FinalWindowState,
  at: number,
): FinalWindowPlan<{ readonly timerId: string; readonly remainingMs: number }> {
  if (window.status !== 'running') return { reason: 'invalid-final-phase' }
  if (!isInstant(at)) return { reason: 'malformed-command' }
  return {
    facts: {
      timerId: window.timerId,
      remainingMs: boundedRemaining(window.deadline - at, window.durationMs),
    },
  }
}

/** Plan a resume: a NEW deadline derived from the dispatch clock, never a stored one. */
function planFinalWindowResume(
  window: FinalWindowState,
  at: number,
): FinalWindowPlan<{
  readonly timerId: string
  readonly resumedAt: number
  readonly deadline: number
}> {
  if (window.status !== 'paused') return { reason: 'invalid-final-phase' }
  if (!isInstant(at)) return { reason: 'malformed-command' }
  return {
    facts: { timerId: window.timerId, resumedAt: at, deadline: at + window.remainingMs },
  }
}

/**
 * Plan an expiry. Everything below is what makes a stale timeout callback
 * harmless: a callback left over from a window that was restarted, paused,
 * undone, or abandoned because the host changed round fails one of these checks
 * and appends nothing at all.
 */
function planFinalWindowExpiry(
  window: FinalWindowState,
  command: { readonly timerId: string; readonly deadline: number },
  at: number,
): FinalWindowPlan<{ readonly timerId: string; readonly deadline: number }> {
  if (window.status !== 'running') return { reason: 'stale-final-window' }
  if (typeof command.timerId !== 'string' || command.timerId !== window.timerId) {
    return { reason: 'stale-final-window' }
  }
  if (!isInstant(command.deadline) || command.deadline !== window.deadline) {
    return { reason: 'stale-final-window' }
  }
  if (!isInstant(at)) return { reason: 'malformed-command' }
  // A window that has not ended cannot expire. The tolerance absorbs a callback
  // that fires a hair early; anything meaningfully early is not an expiry.
  if (at < window.deadline - EXPIRY_TOLERANCE_MS) {
    return { reason: 'premature-final-window-expiration' }
  }
  return { facts: { timerId: window.timerId, deadline: window.deadline } }
}

/** Is the current lead shared by more than one team? */
function hasTiedLead(game: PrivateGameState): boolean {
  return finalLeaders(game.definition.teams, (teamId) => teamScoreFor(game, teamId)).length > 1
}

/**
 * The Final round currently in sudden death, or `null`.
 *
 * Used by the scoring planner to enforce CQS-OD-011's narrow rule: while a Final
 * is in sudden death, manual correction is the tiebreak mechanism, and it may
 * target ONLY the tied leaders. Every other team's score is already final, and
 * moving one would silently rewrite a finished result.
 */
function suddenDeathFinalOf(game: PrivateGameState): FinalWagerRoundState | null {
  if (game.currentRoundIndex === null) return null
  const round = game.definition.rounds[game.currentRoundIndex]
  if (!round || readFinalWagerDefinition(round) === null) return null
  const final = finalWagerStateFor(game, round.id)
  return final.phase === 'sudden-death' ? final : null
}

export type { CommandType }
