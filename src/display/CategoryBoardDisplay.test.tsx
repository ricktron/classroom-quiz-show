import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CategoryBoardDisplay } from './CategoryBoardDisplay'
import type { PublicRoundState } from '../state/publicState'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * The projector view — component behaviour (Slice 5).
 *
 * Every case here drives the component with a REAL sanitized DTO produced by
 * the store, not a hand-written one, so what is asserted about the DOM is
 * asserted about what the projector actually receives.
 */

const AT = 1_000
const ROUND = 'board-round'

const PRIVATE_MARKERS = [
  'ALPHA-TEACHER-NOTE-100',
  'ALPHA-TEACHER-NOTE-300',
  'BETA-TEACHER-NOTE-100',
  'A100 alternate',
  'B100 alternate one',
  'B100 alternate two',
]

function boardStore(): SessionStore {
  return boardStoreFromConfig(richBoardConfig())
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
const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

/** Session store seeded from an untrusted board config via the real import pipeline. */
function boardStoreFromConfig(config: Record<string, unknown>): SessionStore {
  const result = importGameFromUnknown(boardGameFile(config))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function answerClue(store: SessionStore, tileId: string): void {
  store.dispatch(select(tileId))
  store.dispatch(revealPrompt)
  store.dispatch(revealAnswer)
}

function duplicateValueBoardStore(includeUniqueTwoHundred = false): SessionStore {
  const tiles = [
    {
      id: 'alpha-100a',
      value: 100,
      prompt: 'First hundred prompt',
      answer: 'First hundred answer',
    },
    {
      id: 'alpha-100b',
      value: 100,
      prompt: 'Second hundred prompt',
      answer: 'Second hundred answer',
    },
  ]
  if (includeUniqueTwoHundred) {
    tiles.push({
      id: 'alpha-200',
      value: 200,
      prompt: 'Two hundred prompt',
      answer: 'Two hundred answer',
    })
  }
  return boardStoreFromConfig({
    categories: [{ id: 'alpha', title: 'Alpha Category', tiles }],
  })
}

/** Render the projector at the state reached by the given commands. */
function renderAt(...commands: SessionCommand[]) {
  const store = boardStore()
  commands.forEach((command) => store.dispatch(command))
  const round = store.getPublicState().round
  if (round === null) throw new Error('expected a public round')
  return render(<CategoryBoardDisplay round={round} />)
}

describe('board stage', () => {
  it('renders every category header and tile value', () => {
    renderAt()
    expect(screen.getByText('Alpha Category')).toBeInTheDocument()
    expect(screen.getByText('Beta Category')).toBeInTheDocument()
    // 300 × 2 is displayed as 600.
    for (const value of ['100', '200', '600', '500']) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0)
    }
  })

  it('renders a ragged board safely (uneven category lengths)', () => {
    const { container } = renderAt()
    const columns = container.querySelectorAll('.cbd__column')
    expect(columns).toHaveLength(2)
    expect(columns[0].querySelectorAll('li')).toHaveLength(3)
    expect(columns[1].querySelectorAll('li')).toHaveLength(2)
  })

  it('marks a used tile with the word "Used" and drops its value', () => {
    renderAt(select('alpha-100'), revealPrompt, revealAnswer, returnToBoard)
    const tile = screen.getByTestId('cbd-tile-c0t0')
    expect(tile).toHaveTextContent('Used')
    expect(tile).not.toHaveTextContent('100')
  })

  it('has NO prompt or answer text anywhere in the DOM', () => {
    const { container } = renderAt()
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/prompt/i)
    expect(text).not.toMatch(/answer/i)
  })

  it('has no interactive controls at all', () => {
    renderAt()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})

describe('selected stage', () => {
  it('shows the category and value only', () => {
    renderAt(select('alpha-300'))
    expect(screen.getByTestId('cbd-category')).toHaveTextContent('Alpha Category')
    expect(screen.getByTestId('cbd-value')).toHaveTextContent('600')
    expect(screen.queryByTestId('cbd-prompt')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cbd-answer')).not.toBeInTheDocument()
  })

  it('shows no other tile content', () => {
    const { container } = renderAt(select('alpha-300'))
    const text = container.textContent ?? ''
    expect(text).not.toContain('Beta')
    expect(text).not.toMatch(/prompt/i)
  })
})

describe('prompt stage', () => {
  it('shows the prompt and NOT the answer', () => {
    renderAt(select('alpha-100'), revealPrompt)
    expect(screen.getByTestId('cbd-prompt')).toHaveTextContent('Alpha one hundred prompt')
    expect(screen.queryByTestId('cbd-answer')).not.toBeInTheDocument()
  })

  it('has the answer text nowhere in the DOM', () => {
    const { container } = renderAt(select('alpha-100'), revealPrompt)
    expect(container.innerHTML).not.toContain('Alpha one hundred answer')
  })

  it('has no unrelated prompts or answers in the DOM', () => {
    const { container } = renderAt(select('alpha-100'), revealPrompt)
    const html = container.innerHTML
    for (const other of ['Alpha two hundred', 'Alpha three hundred', 'Beta one hundred', 'Beta five hundred']) {
      expect(html).not.toContain(other)
    }
  })
})

describe('answer stage', () => {
  it('shows the answer, and retains the prompt (documented design)', () => {
    renderAt(select('beta-100'), revealPrompt, revealAnswer)
    expect(screen.getByTestId('cbd-prompt')).toHaveTextContent('Beta one hundred prompt')
    expect(screen.getByTestId('cbd-answer')).toHaveTextContent('Beta one hundred answer')
  })

  it('labels the answer in words, not by colour alone', () => {
    renderAt(select('beta-100'), revealPrompt, revealAnswer)
    expect(screen.getByTestId('cbd-answer')).toHaveTextContent('Answer')
  })
})

describe('teacher notes and alternates are absent at EVERY stage', () => {
  it.each([
    ['board', [] as SessionCommand[]],
    ['selected', [select('beta-100')]],
    ['prompt', [select('beta-100'), revealPrompt]],
    ['answer', [select('beta-100'), revealPrompt, revealAnswer]],
  ])('%s stage', (_stage, commands) => {
    const { container } = renderAt(...commands)
    const html = container.innerHTML
    for (const marker of PRIVATE_MARKERS) {
      expect(html, `must not render "${marker}"`).not.toContain(marker)
    }
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(html.toLowerCase()).not.toContain(label.toLowerCase())
    }
  })
})

describe('fail-closed rendering', () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ['an unknown round kind', { kind: 'mystery', stage: 'board', categories: [] }],
    ['an empty board', { kind: 'board', stage: 'board', categories: [] }],
    [
      'a prompt stage with no prompt content',
      { kind: 'board', stage: 'prompt', selection: { categoryTitle: 'C', value: 1, prompt: null, answer: null } },
    ],
    [
      'an answer stage with no answer text',
      {
        kind: 'board',
        stage: 'answer',
        selection: {
          categoryTitle: 'C',
          value: 1,
          prompt: { kind: 'text', text: 'P' },
          answer: null,
        },
      },
    ],
  ]

  it.each(cases)('renders the neutral unavailable panel for %s', (_label, round) => {
    render(<CategoryBoardDisplay round={round as PublicRoundState} />)
    expect(screen.getByTestId('cbd-unavailable')).toHaveTextContent('This round is not available yet')
  })

  it('the unavailable panel reveals no reason and no internals', () => {
    const { container } = render(
      <CategoryBoardDisplay round={{ kind: 'mystery', stage: 'board' } as unknown as PublicRoundState} />,
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('mystery')
    expect(text).not.toMatch(/error|invalid|malformed|schema/i)
  })
})

describe('long content wraps rather than overflowing', () => {
  it('applies an anywhere-wrap rule to the prompt and answer', () => {
    const longWord = 'A'.repeat(300)
    render(
      <CategoryBoardDisplay
        round={{
          kind: 'board',
          stage: 'answer',
          selection: {
            categoryTitle: longWord,
            value: 100,
            prompt: { kind: 'text', text: longWord },
            answer: longWord,
          },
        }}
      />,
    )
    // Text wrap lives on `.mcd__text`; answer wrap on `.cbd__answer-text`.
    // Vitest does not load CSS, so this asserts the elements carry those classes.
    expect(screen.getByTestId('cbd-prompt')).toHaveClass('cbd__prompt')
    expect(screen.getByTestId('mcd-text')).toHaveClass('mcd__text')
    expect(screen.getByTestId('cbd-answer').querySelector('.cbd__answer-text')).not.toBeNull()
    expect(screen.getByTestId('cbd-category')).toHaveClass('cbd__selection-category')
  })
})

describe('S05-F1 spatial memory and used-state cues', () => {
  it('keeps used tiles in authored column order without dropping slots', () => {
    const { container } = renderAt(select('alpha-100'), revealPrompt, revealAnswer, returnToBoard)
    const columns = container.querySelectorAll('.cbd__column')
    expect(columns).toHaveLength(2)
    const firstColumnTiles = columns[0]!.querySelectorAll('.cbd__tile')
    expect(firstColumnTiles).toHaveLength(3)
    expect(firstColumnTiles[0]).toHaveClass('cbd__tile--used')
    expect(firstColumnTiles[0]).toHaveTextContent('Used')
    expect(firstColumnTiles[1]).not.toHaveClass('cbd__tile--used')
    expect(firstColumnTiles[1]).toHaveTextContent('200')
  })

  it('renders open-clue selection chrome alongside the prompt container', () => {
    renderAt(select('alpha-100'), revealPrompt)
    expect(screen.getByTestId('cbd-open')).toHaveClass('cbd--open')
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-answer-revealed', 'false')
    expect(screen.getByTestId('cbd-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('cbd-category')).toBeInTheDocument()
    expect(screen.getByTestId('cbd-value')).toBeInTheDocument()
  })

  it('marks answer-reveal open stage for compact coexistence styling', () => {
    renderAt(select('alpha-100'), revealPrompt, revealAnswer)
    expect(screen.getByTestId('cbd-open')).toHaveClass('cbd--answer')
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-answer-revealed', 'true')
    expect(screen.getByTestId('cbd-answer')).toHaveTextContent('Answer')
  })
})

describe('S05 board/round-flow presentation choreography', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function boardRound(...commands: SessionCommand[]) {
    const store = boardStore()
    commands.forEach((command) => store.dispatch(command))
    const round = store.getPublicState().round
    if (round === null || round.kind !== 'board') throw new Error('expected board round')
    return { store, round }
  }

  it('remount into board seeds without fabricating board-enter acknowledgement', () => {
    const { round } = boardRound()
    render(<CategoryBoardDisplay round={round} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-seeded', 'true')
    expect(board).toHaveAttribute('data-flow-ack', 'false')
    expect(board).toHaveAttribute('data-flow-moment', 'none')
  })

  it('observed board→selected acknowledges without delaying selection text', () => {
    const store = boardStore()
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    expect(screen.getByTestId('cbd-board')).toHaveAttribute('data-flow-ack', 'false')

    store.dispatch(select('alpha-100'))
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const open = screen.getByTestId('cbd-open')
    expect(open).toHaveAttribute('data-flow-ack', 'true')
    expect(open).toHaveAttribute('data-flow-moment', 'selection')
    expect(screen.getByTestId('cbd-category')).toHaveTextContent('Alpha Category')
    expect(screen.getByTestId('cbd-value')).toHaveTextContent('100')
    expect(screen.getByTestId('cbd-selection-header')).toHaveAttribute('data-selection-ack', 'true')
  })

  it('remount into selected seeds without fabricating selection acknowledgement', () => {
    const { round } = boardRound(select('alpha-100'))
    render(<CategoryBoardDisplay round={round} />)
    const open = screen.getByTestId('cbd-open')
    expect(open).toHaveAttribute('data-seeded', 'true')
    expect(open).toHaveAttribute('data-flow-ack', 'false')
    expect(screen.getByTestId('cbd-selection-header')).toHaveAttribute('data-selection-ack', 'false')
  })

  it('observed selected→prompt acknowledges question reveal', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')

    store.dispatch(revealPrompt)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const open = screen.getByTestId('cbd-open')
    expect(open).toHaveAttribute('data-flow-moment', 'prompt-reveal')
    expect(screen.getByTestId('cbd-prompt')).toHaveAttribute('data-prompt-ack', 'true')
    expect(screen.getByTestId('cbd-prompt')).toHaveTextContent('Alpha one hundred prompt')
  })

  it('observed clue→board acknowledges return and orients the used tile', () => {
    const store = boardStore()
    answerClue(store, 'alpha-100')
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )

    store.dispatch(returnToBoard)
    const publicRound = store.getPublicState().round!
    rerender(<CategoryBoardDisplay round={publicRound} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-moment', 'board-enter')
    expect(board).toHaveAttribute('data-flow-ack', 'true')
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute('data-return-orient', 'true')
  })

  it('undo prompt→selected does not acknowledge as forward selection', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')

    store.dispatch(undo)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const open = screen.getByTestId('cbd-open')
    expect(open).toHaveAttribute('data-flow-ack', 'false')
    expect(open).toHaveAttribute('data-flow-moment', 'none')
    expect(screen.getByTestId('cbd-selection-header')).toHaveAttribute('data-selection-ack', 'false')
    expect(screen.getByTestId('cbd-category')).toHaveTextContent('Alpha Category')
    expect(screen.getByTestId('cbd-value')).toHaveTextContent('100')
  })

  it('undo answer→prompt does not acknowledge as forward prompt reveal', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')

    store.dispatch(undo)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const open = screen.getByTestId('cbd-open')
    expect(open).toHaveAttribute('data-flow-ack', 'false')
    expect(open).toHaveAttribute('data-flow-moment', 'none')
    expect(screen.getByTestId('cbd-prompt')).toHaveAttribute('data-prompt-ack', 'false')
    expect(screen.getByTestId('cbd-prompt')).toHaveTextContent('Alpha one hundred prompt')
  })

  it('undo selected→board does not acknowledge board-enter', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')

    store.dispatch(undo)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-ack', 'false')
    expect(board).toHaveAttribute('data-flow-moment', 'none')
    expect(board).not.toHaveAttribute('data-orient-tile')
  })

  it('undo selected→board cannot orient an older used duplicate-value tile', () => {
    const store = duplicateValueBoardStore()

    answerClue(store, 'alpha-100a')
    store.dispatch(returnToBoard)
    store.dispatch(select('alpha-100b'))

    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )

    store.dispatch(undo)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)

    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-ack', 'false')
    expect(board).toHaveAttribute('data-flow-moment', 'none')
    expect(board).not.toHaveAttribute('data-orient-tile')
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute(
      'data-return-orient',
      'false',
    )
    expect(screen.getByTestId('cbd-tile-c0t1')).toHaveAttribute(
      'data-return-orient',
      'false',
    )
  })

  it('prompt→board return still acknowledges board-enter without inventing orientation', () => {
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )

    store.dispatch(returnToBoard)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-moment', 'board-enter')
    expect(board).toHaveAttribute('data-flow-ack', 'true')
    // Prompt return leaves the tile unused — orientation requires a unique used match.
    expect(board).not.toHaveAttribute('data-orient-tile')
  })

  it('unique used title+value match orients; duplicate values suppress orientation', () => {
    const store = duplicateValueBoardStore(true)

    // Unique match: only one used tile at title+value → orient.
    answerClue(store, 'alpha-200')
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    store.dispatch(returnToBoard)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    expect(screen.getByTestId('cbd-tile-c0t2')).toHaveAttribute('data-return-orient', 'true')

    act(() => {
      vi.advanceTimersByTime(420)
    })

    // Ambiguous: two used tiles share title+value 100 → suppress (never first-match).
    answerClue(store, 'alpha-100a')
    store.dispatch(returnToBoard)
    answerClue(store, 'alpha-100b')
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    store.dispatch(returnToBoard)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-moment', 'board-enter')
    expect(board).not.toHaveAttribute('data-orient-tile')
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute('data-return-orient', 'false')
    expect(screen.getByTestId('cbd-tile-c0t1')).toHaveAttribute('data-return-orient', 'false')
  })

  it('duplicate category titles with same value suppress return orientation', () => {
    const store = boardStoreFromConfig({
      categories: [
        {
          id: 'left',
          title: 'Shared Title',
          tiles: [
            {
              id: 'left-100',
              value: 100,
              prompt: 'Left hundred prompt',
              answer: 'Left hundred answer',
            },
          ],
        },
        {
          id: 'right',
          title: 'Shared Title',
          tiles: [
            {
              id: 'right-100',
              value: 100,
              prompt: 'Right hundred prompt',
              answer: 'Right hundred answer',
            },
          ],
        },
      ],
    })

    answerClue(store, 'left-100')
    store.dispatch(returnToBoard)
    answerClue(store, 'right-100')
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    store.dispatch(returnToBoard)
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    const board = screen.getByTestId('cbd-board')
    expect(board).toHaveAttribute('data-flow-moment', 'board-enter')
    expect(board).not.toHaveAttribute('data-orient-tile')
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute('data-return-orient', 'false')
    expect(screen.getByTestId('cbd-tile-c1t0')).toHaveAttribute('data-return-orient', 'false')
  })

  it('suppresses active return orientation immediately when buzz/outcome owns motion', () => {
    const store = boardStore()
    answerClue(store, 'alpha-100')

    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} ownsFlowMotion />,
    )

    store.dispatch(returnToBoard)
    const returnedRound = store.getPublicState().round!
    rerender(<CategoryBoardDisplay round={returnedRound} ownsFlowMotion />)
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute(
      'data-return-orient',
      'true',
    )

    // AudienceDisplayShell drives this false whenever buzz or boardOutcome owns
    // presentation. The same board snapshot must suppress orientation at once.
    rerender(
      <CategoryBoardDisplay round={returnedRound} ownsFlowMotion={false} />,
    )
    const board = screen.getByTestId('cbd-board')
    expect(board).not.toHaveAttribute('data-orient-tile')
    expect(screen.getByTestId('cbd-tile-c0t0')).toHaveAttribute(
      'data-return-orient',
      'false',
    )
  })

  it('same semantic board state does not restart acknowledgement after hold', () => {
    const store = boardStore()
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} />,
    )
    store.dispatch(select('alpha-100'))
    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'true')

    act(() => {
      vi.advanceTimersByTime(420)
    })
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')

    rerender(<CategoryBoardDisplay round={store.getPublicState().round!} />)
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')
  })

  it('yields flow acknowledgement when ownsFlowMotion is false', () => {
    const store = boardStore()
    const { rerender } = render(
      <CategoryBoardDisplay round={store.getPublicState().round!} ownsFlowMotion />,
    )
    store.dispatch(select('alpha-100'))
    rerender(
      <CategoryBoardDisplay round={store.getPublicState().round!} ownsFlowMotion={false} />,
    )
    expect(screen.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'false')
  })
})
