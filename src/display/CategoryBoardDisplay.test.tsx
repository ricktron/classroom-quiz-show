import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
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
      'a prompt stage with no prompt text',
      { kind: 'board', stage: 'prompt', selection: { categoryTitle: 'C', value: 1, prompt: null, answer: null } },
    ],
    [
      'an answer stage with no answer text',
      { kind: 'board', stage: 'answer', selection: { categoryTitle: 'C', value: 1, prompt: 'P', answer: null } },
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
          selection: { categoryTitle: longWord, value: 100, prompt: longWord, answer: longWord },
        }}
      />,
    )
    // The wrap rule lives in CategoryBoardDisplay.css (`overflow-wrap: anywhere`
    // on .cbd__prompt / .cbd__answer-text / .cbd__selection-category). Vitest
    // does not load CSS, so this asserts the elements carry those classes.
    expect(screen.getByTestId('cbd-prompt')).toHaveClass('cbd__prompt')
    expect(screen.getByTestId('cbd-answer').querySelector('.cbd__answer-text')).not.toBeNull()
    expect(screen.getByTestId('cbd-category')).toHaveClass('cbd__selection-category')
  })
})
