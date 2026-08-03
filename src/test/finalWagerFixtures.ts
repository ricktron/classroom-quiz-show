import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { createSessionStore, type SessionStore } from '../state/store'
import { finalWagerStateFor } from '../state/reducer'
import type { FinalWagerRoundState } from '../game/finalWager/finalState'

/**
 * Shared Final Wager fixtures for the Slice 14 tests.
 *
 * Like the Slice 4/5/6 fixtures these build UNTRUSTED plain objects on purpose:
 * the point of every test that uses them is to send authored-looking data
 * through the real schema, the real pipeline, or the real trusted constructor.
 * They are deliberately NOT `FinalWagerDefinition`s.
 */

/** The dispatch stamp every fixture command carries. Fixed so replay is exact. */
export const AT = 1_000

export const FINAL_ROUND_ID = 'final-round'
export const BOARD_ROUND_ID = 'board-round'

/** A minimal valid Final config, with overrides applied on top. */
export function finalConfig(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    prompt: 'Which process drives plate motion?',
    answer: 'Mantle convection',
    ...overrides,
  }
}

/** Two named teams — the everyday two-team classroom case. */
export function twoFinalTeams(): Record<string, unknown>[] {
  return [
    { id: 'red', name: 'Red Team', accent: 'crimson' },
    { id: 'blue', name: 'Blue Team', accent: 'azure' },
  ]
}

/**
 * A one-tile board round used to give Final a PRECEDING ordinary clue value —
 * which is what a zero-or-negative team's wager cap is derived from (CQS-OD-006).
 * `value` is the tile's effective value, so a test can set the cap directly.
 */
export function precedingBoard(value = 400): Record<string, unknown> {
  return {
    categories: [
      {
        id: 'cat',
        title: 'Preceding Category',
        tiles: [
          {
            id: 'tile-1',
            value,
            prompt: 'A preceding board clue.',
            answer: 'A preceding board answer.',
          },
        ],
      },
    ],
  }
}

/** A canonical game file: an optional preceding board, then a terminal Final. */
export function finalGameFile(options: {
  readonly config?: Record<string, unknown>
  readonly teams?: unknown
  readonly board?: Record<string, unknown> | null
  readonly timer?: unknown
  readonly extraRoundsAfter?: readonly Record<string, unknown>[]
  readonly extraFinal?: boolean
} = {}): Record<string, unknown> {
  const rounds: Record<string, unknown>[] = []
  const board = options.board === undefined ? precedingBoard() : options.board
  if (board !== null) {
    rounds.push({
      id: BOARD_ROUND_ID,
      type: 'category-board',
      title: 'Preceding Board',
      config: board,
    })
  }
  if (options.extraFinal === true) {
    rounds.push({
      id: 'final-round-extra',
      type: 'final-wager',
      title: 'An Earlier Final',
      config: finalConfig(),
    })
  }
  rounds.push({
    id: FINAL_ROUND_ID,
    type: 'final-wager',
    title: 'Final Wager',
    config: options.config ?? finalConfig(),
  })
  rounds.push(...(options.extraRoundsAfter ?? []))

  const file: Record<string, unknown> = {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'final-fixture-game',
    title: 'Final Fixture Game',
    rounds,
  }
  const teams = options.teams === undefined ? twoFinalTeams() : options.teams
  if (teams !== null) file.teams = teams
  if (options.timer !== undefined) file.timer = options.timer
  return file
}

/** A trusted definition built through the real import pipeline. */
export function finalDefinition(
  options: Parameters<typeof finalGameFile>[0] = {},
): GameDefinition {
  const result = importGameFromUnknown(finalGameFile(options))
  if (result.status !== 'success') {
    throw new Error(
      `fixture failed to import: ${result.status === 'failure' ? result.issues[0]?.message : ''}`,
    )
  }
  return result.definition
}

/**
 * A store with a session, a board+Final game loaded, the Final round selected,
 * and each team's score seeded through the REAL scoring command.
 *
 * Scores are seeded by dispatching `ADJUST_TEAM_SCORE` rather than by writing to
 * state, so the pre-final totals a Final freezes are produced the same way a
 * lesson produces them. A zero score is seeded by dispatching nothing.
 */
export function finalStore(options: {
  readonly scores?: Readonly<Record<string, number>>
  readonly definitionOptions?: Parameters<typeof finalGameFile>[0]
} = {}): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({
    type: 'INITIALIZE_GAME',
    issuedAt: AT,
    definition: finalDefinition(options.definitionOptions),
  })
  for (const [teamId, delta] of Object.entries(options.scores ?? {})) {
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
  store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: FINAL_ROUND_ID })
  return store
}

/** The Final state of a store's Final round. */
export function finalOf(store: SessionStore, roundId = FINAL_ROUND_ID): FinalWagerRoundState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game loaded')
  return finalWagerStateFor(game, roundId)
}

/** One team's replayed score in a store. */
export function scoreOf(store: SessionStore, teamId: string): number {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game loaded')
  return game.teamScores[teamId] ?? 0
}

/**
 * Drive a Final from `setup` all the way to the reveal stage.
 *
 * Every step goes through the real command boundary — nothing is written into
 * state — so a test that starts "mid-Final" is starting from a state a teacher
 * could actually have produced.
 */
export function playToReveal(
  store: SessionStore,
  options: {
    readonly mode?: 'classic' | 'inclusive'
    readonly wagers?: Readonly<Record<string, number>>
    readonly captureMode?: 'exact-text' | 'host-only'
    readonly responses?: Readonly<Record<string, 'exact' | 'not-captured' | 'no-response'>>
  } = {},
): void {
  const roundId = FINAL_ROUND_ID
  store.dispatch({
    type: 'BEGIN_FINAL_WAGER',
    issuedAt: AT,
    roundId,
    mode: options.mode ?? 'classic',
  })
  const eligible = finalOf(store).snapshot?.teams ?? []
  for (const team of eligible) {
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId,
      teamId: team.teamId,
      wager: options.wagers?.[team.teamId] ?? 0,
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId })
  const captureMode = options.captureMode ?? 'exact-text'
  store.dispatch({
    type: 'START_FINAL_RESPONSE_WINDOW',
    issuedAt: AT,
    roundId,
    captureMode,
  })
  for (const team of eligible) {
    const kind = options.responses?.[team.teamId] ?? 'not-captured'
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId,
      teamId: team.teamId,
      response:
        kind === 'exact'
          ? { kind: 'exact', text: `${team.teamId} answer` }
          : { kind },
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId })
  store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId })
}

/** Reveal and settle every eligible team in the default reveal order. */
export function settleAll(
  store: SessionStore,
  outcomes: Readonly<Record<string, 'correct' | 'incorrect' | 'no-response'>>,
): void {
  const roundId = FINAL_ROUND_ID
  const order = finalOf(store).snapshot?.revealOrder ?? []
  for (const teamId of order) {
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId, teamId })
    store.dispatch({
      type: 'SETTLE_FINAL_TEAM',
      issuedAt: AT,
      roundId,
      teamId,
      outcome: outcomes[teamId] ?? 'incorrect',
    })
  }
}
