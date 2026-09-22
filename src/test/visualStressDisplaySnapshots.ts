/**
 * Sanitizer-backed Display snapshots derived from the canonical visual stress
 * Game fixture. Playwright and unit tests share this path so authored stress
 * content cannot silently diverge from rendered Display state.
 */

import { importGameFromUnknown } from '../import/importGame'
import type { SessionCommand } from '../state/commands'
import type { PublicState } from '../state/publicState'
import { createSessionStore, type SessionStore } from '../state/store'
import {
  VISUAL_STRESS_IMAGE_TILE_ID,
  VISUAL_STRESS_LONG_TILE_ID,
  VISUAL_STRESS_ROUND_ID,
  visualStressGameFile,
} from './visualStressFixtures'

const AT = 1_700_000_000_000
const ROUND = VISUAL_STRESS_ROUND_ID

/** Stress score profile: negative, zero-ish, typical, and large positive. */
const STRESS_SCORE_DELTAS: ReadonlyArray<readonly [string, number]> = [
  ['stress-t1', -999999],
  ['stress-t2', 100],
  ['stress-t3', 200],
  ['stress-t4', 0],
  ['stress-t5', 400],
  ['stress-t6', 500],
  ['stress-t7', 600],
  ['stress-t8', 100007],
]

function select(tileId: string): SessionCommand {
  return {
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: ROUND,
    tileId,
  }
}

const revealPrompt: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_PROMPT',
  issuedAt: AT,
  roundId: ROUND,
}

const revealAnswer: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_ANSWER',
  issuedAt: AT,
  roundId: ROUND,
}

const returnToBoard: SessionCommand = {
  type: 'RETURN_TO_CATEGORY_BOARD',
  issuedAt: AT,
  roundId: ROUND,
}

const armResponse: SessionCommand = {
  type: 'ARM_RESPONSE_PHASE',
  issuedAt: AT,
  roundId: ROUND,
}

const startTimer: SessionCommand = {
  type: 'START_RESPONSE_TIMER',
  issuedAt: AT,
  roundId: ROUND,
  durationSeconds: 20,
}

function buzz(teamId: string, issuedAt = AT): SessionCommand {
  return {
    type: 'RECORD_TEAM_BUZZ',
    issuedAt,
    roundId: ROUND,
    tileId: VISUAL_STRESS_LONG_TILE_ID,
    teamId,
  }
}

function resolveActive(
  resolution: 'incorrect' | 'passed' | 'correct',
  issuedAt: number,
): SessionCommand {
  return {
    type: 'RESOLVE_ACTIVE_RESPONSE',
    issuedAt,
    roundId: ROUND,
    tileId: VISUAL_STRESS_LONG_TILE_ID,
    resolution: { kind: resolution },
  }
}

function createStressStore(): SessionStore {
  const result = importGameFromUnknown(visualStressGameFile())
  if (result.status !== 'success') {
    throw new Error(`visual stress fixture failed to import: ${result.status}`)
  }
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's05-f1-stress' })
  store.dispatch({
    type: 'INITIALIZE_GAME',
    issuedAt: AT,
    definition: result.definition,
  })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  for (const [teamId, delta] of STRESS_SCORE_DELTAS) {
    if (delta === 0) continue
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId,
      delta,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
  }
  return store
}

function snapshotAt(store: SessionStore, revision: number, ...commands: SessionCommand[]): PublicState {
  for (const command of commands) {
    store.dispatch(command)
  }
  const state = store.getPublicState()
  return {
    ...state,
    revision,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
  }
}

/** Board stage with one used tile + eight stress teams. */
export function visualStressBoardSnapshot(revision = 101): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    revealAnswer,
    returnToBoard,
  )
}

/** Open long text prompt (schema-max) with timer chrome + eight teams. */
export function visualStressLongPromptSnapshot(revision = 110): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
  )
}

/** Answer-revealed long prompt + long answer with eight teams. */
export function visualStressAnswerRevealSnapshot(revision = 120): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    revealAnswer,
  )
}

/** Image clue prompt with eight teams (useful-size media asset). */
export function visualStressImagePromptSnapshot(revision = 111): PublicState {
  const store = createStressStore()
  return snapshotAt(store, revision, select(VISUAL_STRESS_IMAGE_TILE_ID), revealPrompt)
}

/** High-contrast answer reveal (same content as answer snapshot). */
export function visualStressHighContrastAnswerSnapshot(revision = 121): PublicState {
  return visualStressAnswerRevealSnapshot(revision)
}

/** Armed response opportunity with no active claim yet. */
export function visualStressArmedWaitingBuzzSnapshot(revision = 130): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
  )
}

/** First active claim on schema-max clue with zero waiting. */
export function visualStressFirstActiveClaimSnapshot(revision = 131): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
    buzz('stress-t1', AT + 1),
  )
}

/**
 * Active claim with maximum useful waiting count (7 waiting behind 1 active
 * among 8 stress teams).
 */
export function visualStressActiveClaimMaxWaitingSnapshot(revision = 132): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
    buzz('stress-t1', AT + 1),
    buzz('stress-t2', AT + 2),
    buzz('stress-t3', AT + 3),
    buzz('stress-t4', AT + 4),
    buzz('stress-t5', AT + 5),
    buzz('stress-t6', AT + 6),
    buzz('stress-t7', AT + 7),
    buzz('stress-t8', AT + 8),
  )
}

/** Shared Path A / buzz choreography: arm, timer, two buzzes, then resolve. */
function visualStressTwoBuzzResolveSnapshot(
  kind: 'incorrect' | 'correct',
  revision: number,
): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
    buzz('stress-t1', AT + 1),
    buzz('stress-t2', AT + 2),
    resolveActive(kind, AT + 3),
  )
}

/** Shared: arm, timer, single buzz, then resolve (exhausted after pass). */
function visualStressSingleBuzzResolveSnapshot(
  kind: 'passed' | 'incorrect' | 'correct',
  revision: number,
): PublicState {
  const store = createStressStore()
  return snapshotAt(
    store,
    revision,
    select(VISUAL_STRESS_LONG_TILE_ID),
    revealPrompt,
    armResponse,
    startTimer,
    buzz('stress-t1', AT + 1),
    resolveActive(kind, AT + 2),
  )
}

/** After promotion: second team holds the floor; previous waiting cleared. */
export function visualStressPromotedActiveClaimSnapshot(revision = 133): PublicState {
  return visualStressTwoBuzzResolveSnapshot('incorrect', revision)
}

/** Exhausted response opportunity after the last queued team is resolved. */
export function visualStressExhaustedBuzzSnapshot(revision = 134): PublicState {
  return visualStressSingleBuzzResolveSnapshot('passed', revision)
}

/**
 * S05 Path A — correct adjudication: empty buzz + resolved boardOutcome.
 * Must not project buzz exhausted ("No one left to answer").
 */
export function visualStressBoardCorrectOutcomeSnapshot(revision = 140): PublicState {
  return visualStressTwoBuzzResolveSnapshot('correct', revision)
}

/**
 * S05 Path A — incorrect adjudication with next team still active.
 * boardOutcome (prior team) coexists with buzz active (next team).
 * Same command sequence as {@link visualStressPromotedActiveClaimSnapshot}.
 */
export function visualStressBoardIncorrectWithActiveSnapshot(revision = 141): PublicState {
  return visualStressPromotedActiveClaimSnapshot(revision)
}

/** S05 Path A — passed adjudication after single buzz (exhausted queue + outcome). */
export function visualStressBoardPassedOutcomeSnapshot(revision = 142): PublicState {
  return visualStressExhaustedBuzzSnapshot(revision)
}
