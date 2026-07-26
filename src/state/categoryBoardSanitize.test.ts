import { describe, expect, it } from 'vitest'
import { safeToPublicState, toPublicState } from './sanitize'
import { replay } from './reducer'
import type { SessionCommand } from './commands'
import type { PrivateState } from './privateState'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicRoundState,
  isPublicState,
  type PublicState,
} from './publicState'
import { createSessionStore, type SessionStore } from './store'
import { decodeEnvelope, encodeEnvelope } from '../sync/protocol'
import { importGameFromUnknown } from '../import/importGame'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'

/**
 * The category-board private → public boundary (Slice 5).
 *
 * These tests are the projector-privacy proof for the first playable round.
 * They are STRUCTURAL, not string smoke-tests: they serialize the whole
 * `PublicState` and assert that private content is absent, that only the
 * current stage's data is present, and that impossible private state fails
 * closed to a neutral projection.
 */

const AT = 1_000
const ROUND = 'board-round'

/**
 * Private strings that must NEVER cross the boundary. They come from the rich
 * fixture, which puts distinctive markers in every private field.
 */
const PRIVATE_MARKERS = [
  'ALPHA-TEACHER-NOTE-100',
  'ALPHA-TEACHER-NOTE-300',
  'BETA-TEACHER-NOTE-100',
  'A100 alternate',
  'B100 alternate one',
  'B100 alternate two',
]

function boardStore(): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET-SESSION' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function drive(store: SessionStore, ...commands: SessionCommand[]): PublicState {
  commands.forEach((command) => store.dispatch(command))
  return store.getPublicState()
}

const select = (tileId: string): SessionCommand => ({
  type: 'SELECT_CATEGORY_BOARD_TILE',
  issuedAt: AT,
  roundId: ROUND,
  tileId,
})
const revealPrompt: SessionCommand = { type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND }
const revealAnswer: SessionCommand = { type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND }
const returnToBoard: SessionCommand = { type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT, roundId: ROUND }

/** Every private marker is absent from the serialized public state. */
function expectNoPrivateMarkers(publicState: PublicState) {
  const serialized = JSON.stringify(publicState)
  for (const marker of PRIVATE_MARKERS) {
    expect(serialized, `must not project "${marker}"`).not.toContain(marker)
  }
}

describe('board stage projects values only', () => {
  const publicState = boardStore().getPublicState()

  it('publishes the public category titles and effective tile values', () => {
    expect(publicState.round).toEqual({
      kind: 'board',
      stage: 'board',
      categories: [
        {
          key: 'c0',
          title: 'Alpha Category',
          tiles: [
            { key: 'c0t0', value: 100, used: false },
            { key: 'c0t1', value: 200, used: false },
            // 300 × 2 — the multiplier affects the DISPLAYED value.
            { key: 'c0t2', value: 600, used: false },
          ],
        },
        {
          key: 'c1',
          title: 'Beta Category',
          tiles: [
            { key: 'c1t0', value: 100, used: false },
            { key: 'c1t1', value: 500, used: false },
          ],
        },
      ],
    })
  })

  it('contains no prompt, answer, alternate or note anywhere', () => {
    const serialized = JSON.stringify(publicState)
    expect(serialized).not.toContain('prompt')
    expect(serialized).not.toContain('answer')
    expect(serialized).not.toContain('Prompt')
    expect(serialized).not.toContain('Answer')
    expectNoPrivateMarkers(publicState)
  })

  it('contains no authored category or tile id', () => {
    const serialized = JSON.stringify(publicState)
    for (const id of ['alpha-100', 'alpha-200', 'alpha-300', 'beta-100', 'beta-500', '"alpha"', '"beta"']) {
      expect(serialized).not.toContain(id)
    }
  })

  it('reflects used tiles once an answer has been revealed', () => {
    const store = boardStore()
    const after = drive(store, select('alpha-200'), revealPrompt, revealAnswer, returnToBoard)
    expect(after.round).toMatchObject({ stage: 'board' })
    if (after.round?.stage !== 'board') throw new Error('expected board stage')
    expect(after.round.categories[0].tiles.map((t) => t.used)).toEqual([false, true, false])
  })
})

describe('selected stage projects the category and value only', () => {
  it('publishes no prompt and no answer', () => {
    const publicState = drive(boardStore(), select('alpha-100'))
    expect(publicState.round).toEqual({
      kind: 'board',
      stage: 'selected',
      selection: { categoryTitle: 'Alpha Category', value: 100, prompt: null, answer: null },
    })
    expectNoPrivateMarkers(publicState)
  })

  it('does not publish the rest of the board', () => {
    const publicState = drive(boardStore(), select('alpha-100'))
    expect(JSON.stringify(publicState)).not.toContain('categories')
    expect(JSON.stringify(publicState)).not.toContain('Beta Category')
  })
})

describe('prompt stage projects the prompt only', () => {
  const publicState = drive(boardStore(), select('alpha-100'), revealPrompt)

  it('publishes exactly the selected prompt', () => {
    expect(publicState.round).toEqual({
      kind: 'board',
      stage: 'prompt',
      selection: {
        categoryTitle: 'Alpha Category',
        value: 100,
        prompt: 'Alpha one hundred prompt',
        answer: null,
      },
    })
  })

  it('publishes no answer, alternate or note', () => {
    expect(JSON.stringify(publicState)).not.toContain('Alpha one hundred answer')
    expectNoPrivateMarkers(publicState)
  })

  it('publishes no other tile content', () => {
    const serialized = JSON.stringify(publicState)
    for (const other of ['Alpha two hundred', 'Alpha three hundred', 'Beta one hundred', 'Beta five hundred']) {
      expect(serialized).not.toContain(other)
    }
  })
})

describe('answer stage projects the answer, and still nothing private', () => {
  const publicState = drive(boardStore(), select('beta-100'), revealPrompt, revealAnswer)

  it('publishes the prompt and the canonical answer', () => {
    expect(publicState.round).toEqual({
      kind: 'board',
      stage: 'answer',
      selection: {
        categoryTitle: 'Beta Category',
        value: 100,
        prompt: 'Beta one hundred prompt',
        answer: 'Beta one hundred answer',
      },
    })
  })

  it('publishes NO alternates and NO teacher notes', () => {
    expectNoPrivateMarkers(publicState)
  })

  it('publishes no unrelated tile content', () => {
    const serialized = JSON.stringify(publicState)
    expect(serialized).not.toContain('Alpha')
    expect(serialized).not.toContain('Beta five hundred')
  })
})

describe('nothing else from the private world crosses the boundary', () => {
  it('never projects the session id, host notes, definition or event history', () => {
    const store = boardStore()
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'HOST-MEMO-XYZ' })
    const publicState = drive(store, select('alpha-100'), revealPrompt, revealAnswer)
    const serialized = JSON.stringify(publicState)
    for (const secret of ['SECRET-SESSION', 'HOST-MEMO-XYZ', 'board-round', 'Board Game', 'category-board"']) {
      expect(serialized).not.toContain(secret)
    }
    expect(serialized).not.toContain('EVENT')
    expect(serialized).not.toContain('classroom-quiz-show/game')
  })

  it('keeps the top-level allow-list exactly', () => {
    const publicState = drive(boardStore(), select('alpha-100'))
    expect(Object.keys(publicState).sort()).toEqual(
      ['detail', 'game', 'headline', 'phase', 'revision', 'round', 'schemaVersion'].sort(),
    )
  })

  it('a new private tile field is NOT exposed by default (allow-list holds)', () => {
    const store = boardStore()
    const state = store.getState()
    const game = state.session?.game
    if (!game) throw new Error('no game')
    // Simulate a future private field arriving on the frozen definition's config.
    const hostile = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game,
          definition: {
            ...game.definition,
            rounds: game.definition.rounds.map((round) => ({
              ...round,
              hiddenBonusLocation: 'FUTURE-PRIVATE-FIELD',
            })),
          },
        },
      },
    } as unknown as PrivateState
    expect(JSON.stringify(toPublicState(hostile))).not.toContain('FUTURE-PRIVATE-FIELD')
  })
})

describe('fail-closed behavior', () => {
  it('projects a neutral unavailable round when the selection is not on the board', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    const state = store.getState()
    const game = state.session!.game!
    const hostile = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game,
          categoryBoards: {
            [ROUND]: {
              progress: { stage: 'answer', selectedTileId: 'GHOST-TILE' },
              usedTileIds: [],
            },
          },
        },
      },
    } as unknown as PrivateState

    const publicState = toPublicState(hostile)
    expect(publicState.round).toBeNull()
    expect(publicState.game?.roundAvailability).toBe('unavailable')
    expect(JSON.stringify(publicState)).not.toContain('GHOST-TILE')
  })

  it('projects no round DTO for a non-playable round type, but stays available', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({ id: 'g', title: 'G', rounds: [placeholderRound('p1', 'P1')] }),
    })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const publicState = store.getPublicState()
    expect(publicState.round).toBeNull()
    expect(publicState.game?.roundAvailability).toBe('available')
  })

  it('projects no round DTO once the game has ended', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(store.getPublicState().round).toBeNull()
  })

  it('falls back to the safe initial state when projection throws', () => {
    const hostile = {
      schemaVersion: 1,
      revision: 0,
      diagnostics: { lastAppliedEventType: null, appliedEventCount: 0 },
      get session() {
        throw new Error('boom')
      },
    } as unknown as PrivateState
    expect(safeToPublicState(hostile)).toEqual(INITIAL_PUBLIC_STATE)
  })
})

describe('the public round guard rejects impossible payloads', () => {
  it('accepts the real projections at every stage', () => {
    const store = boardStore()
    for (const command of [select('alpha-100'), revealPrompt, revealAnswer, returnToBoard]) {
      expect(isPublicRoundState(store.getPublicState().round)).toBe(true)
      store.dispatch(command)
    }
    expect(isPublicRoundState(null)).toBe(true)
  })

  it('rejects a stage/payload mismatch rather than rendering it partially', () => {
    expect(isPublicRoundState({ kind: 'board', stage: 'board', selection: {} })).toBe(false)
    expect(
      isPublicRoundState({ kind: 'board', stage: 'prompt', categories: [] }),
    ).toBe(false)
    expect(isPublicRoundState({ kind: 'board', stage: 'nonsense' })).toBe(false)
    expect(isPublicRoundState({ kind: 'other-kind', stage: 'board', categories: [] })).toBe(false)
    expect(isPublicRoundState({ kind: 'board', stage: 'board', categories: [{ key: 'c0' }] })).toBe(false)
  })

  it('rejects a whole PublicState carrying a malformed round payload', () => {
    const valid = boardStore().getPublicState()
    expect(isPublicState(valid)).toBe(true)
    expect(isPublicState({ ...valid, round: { kind: 'board', stage: 'prompt' } })).toBe(false)
  })
})

describe('wire version', () => {
  it('is 3 — bumped explicitly because Slice 5 added the round field', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(3)
  })

  it('rejects an older wire shape instead of reinterpreting it', () => {
    const legacy = {
      schemaVersion: 2,
      revision: 9,
      phase: 'ready',
      headline: 'Session ready',
      detail: 'Waiting for the first round.',
      game: null,
    }
    expect(isPublicState(legacy)).toBe(false)
    const decoded = decodeEnvelope({
      protocol: 'classroom-quiz-show/sync',
      schemaVersion: 1,
      message: { type: 'public-state', revision: 9, payload: legacy },
    })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('malformed-payload')
  })

  it('round-trips a current-version board payload through the sync envelope', () => {
    const publicState = drive(boardStore(), select('alpha-100'), revealPrompt)
    const decoded = decodeEnvelope(
      encodeEnvelope({ type: 'public-state', revision: publicState.revision, payload: publicState }),
    )
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.message.type === 'public-state') {
      expect(decoded.message.payload.round).toEqual(publicState.round)
    }
  })
})

describe('projection is a pure function of replayed state', () => {
  it('the same history always projects to the same public state', () => {
    const store = boardStore()
    drive(store, select('alpha-300'), revealPrompt, revealAnswer)
    const history = store.getHistory()
    const a = toPublicState(replay(history))
    const b = toPublicState(replay(history))
    expect(a).toEqual(b)
    expect(a).toEqual(store.getPublicState())
  })
})
