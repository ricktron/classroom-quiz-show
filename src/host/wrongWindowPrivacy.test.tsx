import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CategoryBoardHostPanel } from './CategoryBoardHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, tile } from '../test/categoryBoardFixtures'
import { toPublicState } from '../state/sanitize'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * CANON-H-12 — wrong-window Host answer blast-radius (T4).
 *
 * Privacy authority remains the allow-list sanitizer: answer / alternates /
 * notes must never enter PublicState before authorized reveal (and alternates /
 * notes never). Host layout hardens blast radius when the wrong window is
 * shared — grading key closed by default. This is NOT CSS-only Display privacy.
 */

const AT = 1_000
const ROUND = 'board-round'

const SENTINELS = {
  prompt: 'T4SENTINEL_PROMPT_STRUCT_9f3a',
  answer: 'T4SENTINEL_ANSWER_STRUCT_7c2e',
  alternate: 'T4SENTINEL_ALT_STRUCT_4b81',
  notes: 'T4SENTINEL_NOTES_STRUCT_1d06',
} as const

function sentinelStore(): SessionStore {
  const result = importGameFromUnknown(
    boardGameFile({
      categories: [
        category('sentinel', {
          title: 'Sentinel Cat',
          tiles: [
            tile('sentinel-100', {
              prompt: SENTINELS.prompt,
              answer: SENTINELS.answer,
              alternates: [SENTINELS.alternate],
              notes: SENTINELS.notes,
            }),
          ],
        }),
      ],
    }),
  )
  if (result.status !== 'success') throw new Error('sentinel fixture failed import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 't4-h12' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function renderHost(store: SessionStore = sentinelStore()) {
  const dispatch = (command: SessionCommand) => {
    const result = store.dispatch(command)
    view.rerender(
      <CategoryBoardHostPanel dispatch={dispatch} game={store.getState().session!.game!} />,
    )
    return result
  }
  const view = render(
    <CategoryBoardHostPanel dispatch={dispatch} game={store.getState().session!.game!} />,
  )
  return { store, view }
}

describe('CANON-H-12 Host grading-key blast radius', () => {
  it('keeps answer/alternates/notes behind a closed Host grading key by default', () => {
    renderHost()
    fireEvent.click(screen.getByTestId('cbh-tile-sentinel-100'))

    const key = screen.getByTestId('cbh-grading-key')
    expect(key).not.toHaveAttribute('open')
    expect(screen.getByTestId('cbh-grading-key-summary')).toHaveTextContent(/keep off the projector/i)
    expect(screen.getByTestId('cbh-prompt')).toHaveTextContent(SENTINELS.prompt)
    // Present for Host adjudication after open — not a Display leak claim.
    expect(screen.getByTestId('cbh-answer')).toHaveTextContent(SENTINELS.answer)
    expect(screen.getByTestId('cbh-alternates')).toHaveTextContent(SENTINELS.alternate)
    expect(screen.getByTestId('cbh-notes')).toHaveTextContent(SENTINELS.notes)
  })

  it('does not treat Display CSS as the privacy boundary (leak-label baseline retained)', () => {
    expect(FORBIDDEN_DISPLAY_LABELS).toContain('Host only')
    expect(FORBIDDEN_DISPLAY_LABELS).toContain('Correct answer')
    expect(FORBIDDEN_DISPLAY_LABELS).toContain('Acceptable alternates')
  })
})

describe('CANON-H-12 data-path authority (sanitizer, not Host CSS)', () => {
  it('never publishes answer/alternates/notes sentinels at selected or prompt stages', () => {
    const store = sentinelStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: 'sentinel-100',
    })

    const selected = JSON.stringify(toPublicState(store.getState()))
    expect(selected).not.toContain(SENTINELS.prompt)
    expect(selected).not.toContain(SENTINELS.answer)
    expect(selected).not.toContain(SENTINELS.alternate)
    expect(selected).not.toContain(SENTINELS.notes)

    store.dispatch({
      type: 'REVEAL_CATEGORY_BOARD_PROMPT',
      issuedAt: AT,
      roundId: ROUND,
    })
    const prompted = JSON.stringify(toPublicState(store.getState()))
    expect(prompted).toContain(SENTINELS.prompt)
    expect(prompted).not.toContain(SENTINELS.answer)
    expect(prompted).not.toContain(SENTINELS.alternate)
    expect(prompted).not.toContain(SENTINELS.notes)
  })
})
