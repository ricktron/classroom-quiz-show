import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TeamScoringPanel } from './TeamScoringPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile, teamsList, twoTeams } from '../test/teamFixtures'
import { LARGE_ADJUSTMENT_CONFIRM_THRESHOLD } from '../game/teams/scoring'

/**
 * Host teams & scoring controls — component behaviour (Slice 6).
 *
 * The claims proved here:
 *  - the scoreboard, the selected target, the proposed amount and the resulting
 *    total are all visible before anything is submitted;
 *  - every control is disabled until it can legitimately be used;
 *  - a bad manual amount produces an accessible error, associated with its input;
 *  - a negative or large manual amount requires explicit confirmation;
 *  - an already-submitted preset is disabled, and undo re-enables it;
 *  - scoring never touches the tile's used state;
 *  - no timer, buzzer, wager, persistence or media control appears.
 */

const AT = 1_000
const ROUND = 'board-round'

function storeWithTeams(teams: unknown = twoTeams()): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(teams))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** Render the panel against a live store, re-rendering after each dispatch. */
function renderPanel(store: SessionStore = storeWithTeams()) {
  const dispatch = (command: SessionCommand) => {
    const result = store.dispatch(command)
    view.rerender(
      <TeamScoringPanel
        dispatch={dispatch}
        game={store.getState().session!.game!}
        history={store.getHistory()}
      />,
    )
    return result
  }
  const view = render(
    <TeamScoringPanel
      dispatch={dispatch}
      game={store.getState().session!.game!}
      history={store.getHistory()}
    />,
  )
  /** Drive the board outside the panel, then re-render it. */
  const drive = (...commands: SessionCommand[]) => {
    for (const command of commands) store.dispatch(command)
    view.rerender(
      <TeamScoringPanel
        dispatch={dispatch}
        game={store.getState().session!.game!}
        history={store.getHistory()}
      />,
    )
  }
  return { store, view, drive }
}

const select = (tileId: string): SessionCommand => ({
  type: 'SELECT_CATEGORY_BOARD_TILE',
  issuedAt: AT,
  roundId: ROUND,
  tileId,
})
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

/** Open `alpha-100` (worth 100) all the way to the answer stage. */
function openTile(drive: (...commands: SessionCommand[]) => void, tileId = 'alpha-100') {
  drive(select(tileId), revealPrompt, revealAnswer)
}

describe('the team list', () => {
  it('renders every team with its current score, in authored order', () => {
    renderPanel()
    const board = screen.getByTestId('tsp-scoreboard')
    const items = within(board).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Red Team')
    expect(items[1]).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('tsp-score-red')).toHaveTextContent('0')
  })

  it('says so plainly when the game configures no teams', () => {
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    if (result.status !== 'success') throw new Error('fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    renderPanel(store)
    expect(screen.getByTestId('tsp-no-teams')).toHaveTextContent(/no teams/i)
    expect(screen.queryByTestId('tsp-scoreboard')).toBeNull()
  })

  it('updates the displayed score after an award', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(screen.getByTestId('tsp-score-red')).toHaveTextContent('100')
    expect(screen.getByTestId('tsp-score-blue')).toHaveTextContent('0')
  })
})

describe('choosing a scoring target', () => {
  it('offers one radio per team, each with an accessible name', () => {
    renderPanel()
    expect(screen.getByRole('radio', { name: /red team/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /blue team/i })).toBeInTheDocument()
  })

  it('starts with NO team selected, so nothing can be awarded by accident', () => {
    renderPanel()
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
    expect(screen.getByTestId('tsp-no-target')).toBeInTheDocument()
  })

  it('is keyboard operable, and selection is reflected in the panel', () => {
    renderPanel()
    const red = screen.getByTestId('tsp-target-red')
    red.focus()
    expect(red).toHaveFocus()
    fireEvent.click(red)
    expect(red).toBeChecked()
    expect(screen.getByTestId('tsp-selected-team')).toHaveTextContent(/red team/i)
  })

  it('can be changed before submitting', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-target-blue'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    const game = store.getState().session!.game!
    expect(game.teamScores).toEqual({ blue: 100 })
  })
})

describe('tile presets', () => {
  it('do not exist while no tile is open', () => {
    renderPanel()
    expect(screen.queryByTestId('tsp-award-full')).toBeNull()
    expect(screen.queryByTestId('tsp-deduct-full')).toBeNull()
    expect(screen.getByTestId('tsp-context')).toHaveTextContent(/no tile is open/i)
  })

  it('state the tile value once a tile is open', () => {
    const { drive } = renderPanel()
    openTile(drive, 'alpha-300') // 300 × 2 = 600
    expect(screen.getByTestId('tsp-context')).toHaveTextContent('600')
    expect(screen.getByTestId('tsp-award-full')).toHaveTextContent('+600')
    expect(screen.getByTestId('tsp-deduct-full')).toHaveTextContent('-600')
  })

  it('are disabled until a target is chosen', () => {
    const { drive } = renderPanel()
    openTile(drive)
    expect(screen.getByTestId('tsp-award-full')).toBeDisabled()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    expect(screen.getByTestId('tsp-award-full')).toBeEnabled()
  })

  it('award the exact effective value', () => {
    const { store, drive } = renderPanel()
    openTile(drive, 'alpha-300')
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: 600 })
  })

  it('deduct the exact negated effective value', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-blue'))
    fireEvent.click(screen.getByTestId('tsp-deduct-full'))
    expect(store.getState().session!.game!.teamScores).toEqual({ blue: -100 })
  })

  it('show the resulting total BEFORE submission', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    expect(screen.getByTestId('tsp-award-full-result')).toHaveTextContent('100')
    expect(screen.getByTestId('tsp-deduct-full-result')).toHaveTextContent('-100')
  })

  it('name the team, the amount and the resulting total for assistive technology', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    expect(screen.getByTestId('tsp-award-full')).toHaveAttribute(
      'aria-label',
      'full credit, +100 points, to Red Team, giving 100',
    )
  })

  it('are disabled once that exact adjustment has been submitted', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    // The same award for the same team and tile cannot be double-clicked in.
    expect(screen.getByTestId('tsp-award-full')).toBeDisabled()
    // A different team, and a different mode, are both still available.
    fireEvent.click(screen.getByTestId('tsp-target-blue'))
    expect(screen.getByTestId('tsp-award-full')).toBeEnabled()
  })

  it('become available again when the award is undone', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(screen.getByTestId('tsp-award-full')).toBeDisabled()
    fireEvent.click(screen.getByTestId('tsp-undo-score'))
    expect(screen.getByTestId('tsp-award-full')).toBeEnabled()
  })

  it('let SEVERAL teams be scored deliberately for one tile', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    fireEvent.click(screen.getByTestId('tsp-target-blue'))
    fireEvent.click(screen.getByTestId('tsp-deduct-full'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: 100, blue: -100 })
  })

  it('disappear when the host returns to the board, leaving a stale control unreachable', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    drive(returnToBoard)
    expect(screen.queryByTestId('tsp-award-full')).toBeNull()
    expect(screen.getByTestId('tsp-context')).toHaveTextContent(/no tile is open/i)
  })

  it('do not exist at the SELECTED stage — the class has not seen the prompt', () => {
    const { drive } = renderPanel()
    drive(select('alpha-100'))
    expect(screen.queryByTestId('tsp-award-full')).toBeNull()
  })

  it('exist at the PROMPT stage, before the answer is revealed', () => {
    const { drive } = renderPanel()
    drive(select('alpha-100'), revealPrompt)
    expect(screen.getByTestId('tsp-award-full')).toBeInTheDocument()
  })
})

describe('partial credit', () => {
  it('applies an explicit whole amount', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '50' } })
    fireEvent.click(screen.getByTestId('tsp-apply-partial'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: 50 })
  })

  it('applies a NEGATIVE partial amount', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '-25' } })
    fireEvent.click(screen.getByTestId('tsp-apply-partial'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: -25 })
  })

  it('previews the resulting total as the amount is typed', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '30' } })
    expect(screen.getByTestId('tsp-partial-preview')).toHaveTextContent('0 → 30')
  })

  it('suggests the owner-approved default increment', () => {
    const { drive } = renderPanel()
    openTile(drive)
    expect(screen.getByTestId('tsp-partial-input')).toHaveAttribute('placeholder', '50')
  })

  it('rejects an amount larger than the tile value with an accessible error', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '150' } })
    fireEvent.click(screen.getByTestId('tsp-apply-partial'))
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot exceed/i)
    expect(store.getState().session!.game!.teamScores).toEqual({})
  })

  it('rejects a fractional amount', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '12.5' } })
    fireEvent.click(screen.getByTestId('tsp-apply-partial'))
    expect(screen.getByRole('alert')).toHaveTextContent(/whole number/i)
    expect(store.getState().session!.game!.teamScores).toEqual({})
  })

  it('clears the field after a successful application', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-partial-input'), { target: { value: '50' } })
    fireEvent.click(screen.getByTestId('tsp-apply-partial'))
    expect(screen.getByTestId('tsp-partial-input')).toHaveValue(null)
  })
})

describe('manual correction', () => {
  it('is available with no tile open at all', () => {
    renderPanel()
    expect(screen.getByTestId('tsp-manual-input')).toBeInTheDocument()
    expect(screen.getByTestId('tsp-apply-manual')).toBeInTheDocument()
  })

  it('is disabled until a target is chosen', () => {
    renderPanel()
    expect(screen.getByTestId('tsp-apply-manual')).toBeDisabled()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    expect(screen.getByTestId('tsp-apply-manual')).toBeEnabled()
  })

  it('applies a small positive amount without confirmation', () => {
    const { store } = renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: '25' } })
    expect(screen.queryByTestId('tsp-confirm')).toBeNull()
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: 25 })
  })

  it('requires explicit confirmation for a NEGATIVE amount', () => {
    const { store } = renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: '-50' } })
    expect(screen.getByTestId('tsp-confirm-label')).toHaveTextContent(/negative/i)

    fireEvent.click(screen.getByTestId('tsp-apply-manual'))
    expect(screen.getByRole('alert')).toHaveTextContent(/tick the confirmation box/i)
    expect(store.getState().session!.game!.teamScores).toEqual({})

    fireEvent.click(screen.getByTestId('tsp-confirm'))
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))
    expect(store.getState().session!.game!.teamScores).toEqual({ red: -50 })
  })

  it('requires explicit confirmation for a LARGE amount', () => {
    const { store } = renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), {
      target: { value: String(LARGE_ADJUSTMENT_CONFIRM_THRESHOLD + 1) },
    })
    expect(screen.getByTestId('tsp-confirm-label')).toHaveTextContent(/large/i)
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))
    expect(store.getState().session!.game!.teamScores).toEqual({})
  })

  it('marks the input invalid and associates the error with it', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: 'lots' } })
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))

    const input = screen.getByTestId('tsp-manual-input')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'tsp-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'tsp-error')
  })

  it('rejects zero, since a zero-point change is not a fact worth recording', () => {
    const { store } = renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(store.getState().session!.game!.teamScores).toEqual({})
  })

  it('previews the resulting total, including a negative one', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: '-60' } })
    expect(screen.getByTestId('tsp-manual-preview')).toHaveTextContent('0 → -60')
  })

  it('corrects an earlier award without rewriting it', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    fireEvent.change(screen.getByTestId('tsp-manual-input'), { target: { value: '-100' } })
    fireEvent.click(screen.getByTestId('tsp-confirm'))
    fireEvent.click(screen.getByTestId('tsp-apply-manual'))

    expect(store.getState().session!.game!.teamScores).toEqual({ red: 0 })
    const scoreEvents = store.getHistory().filter((event) => event.type === 'TEAM_SCORE_ADJUSTED')
    expect(scoreEvents).toHaveLength(2)
  })
})

describe('the audit line and undo', () => {
  it('starts with no score change recorded', () => {
    renderPanel()
    expect(screen.getByTestId('tsp-last-change')).toHaveTextContent(/no score change yet/i)
    expect(screen.getByTestId('tsp-undo-score')).toBeDisabled()
  })

  it('names the team, the amount and the mode of the last change', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(screen.getByTestId('tsp-last-change')).toHaveTextContent(
      'Last score change: Red Team +100 (full credit).',
    )
  })

  it('enables undo only when the next undo target IS a score change', () => {
    const { drive } = renderPanel()
    openTile(drive)
    // The latest reversible event is the answer reveal, not a score.
    expect(screen.getByTestId('tsp-undo-score')).toBeDisabled()

    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(screen.getByTestId('tsp-undo-score')).toBeEnabled()
  })

  it('restores the prior score, and says undo does not un-reveal anything', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    expect(screen.getByTestId('tsp-undo-score')).toHaveAccessibleName(/undo last score change/i)
    fireEvent.click(screen.getByTestId('tsp-undo-score'))

    // The award is not applied on replay, so the map holds no entry at all —
    // "no entry" and "zero" are the same fact.
    expect(store.getState().session!.game!.teamScores).toEqual({})
    expect(screen.getByTestId('tsp-score-red')).toHaveTextContent('0')
  })

  it('points at manual correction when undo cannot reach an older score', () => {
    renderPanel()
    expect(screen.getByTestId('tsp-undo-score')).toBeDisabled()
    expect(screen.getByTestId('tsp-undo-score').closest('.tsp__history')).toHaveTextContent(
      /apply a manual correction/i,
    )
  })
})

describe('scoring does not touch tile state', () => {
  it('leaves the used tile used, and the reveal stage untouched', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))

    const board = store.getState().session!.game!.categoryBoards[ROUND]
    expect(board.usedTileIds).toEqual(['alpha-100'])
    expect(board.progress.stage).toBe('answer')
  })

  it('does not return to the board automatically after scoring', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    // Still on the answer stage: returning to the board stays a teacher action.
    expect(store.getState().session!.game!.categoryBoards[ROUND].progress.stage).toBe('answer')
    expect(screen.getByTestId('tsp-context')).toHaveTextContent(/open tile/i)
  })
})

describe('an ended game', () => {
  it('shows the final scores but disables every control', () => {
    const { store, drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    fireEvent.click(screen.getByTestId('tsp-award-full'))
    drive({ type: 'END_GAME_SESSION', issuedAt: AT })

    expect(screen.getByTestId('tsp-score-red')).toHaveTextContent('100')
    expect(screen.getByTestId('tsp-apply-manual')).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    // The tile presets are gone entirely, because no tile is live any more.
    expect(screen.queryByTestId('tsp-award-full')).toBeNull()
    expect(store.getState().session!.game!.gameLifecycle).toBe('ended')
  })
})

describe('high team counts stay usable', () => {
  it('renders eight teams with a radio and a score each', () => {
    renderPanel(storeWithTeams(teamsList(8)))
    expect(within(screen.getByTestId('tsp-scoreboard')).getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getAllByRole('radio')).toHaveLength(8)
  })
})

describe('no Slice 7+ controls appear', () => {
  it('offers no timer, buzzer, wager, persistence or media control', () => {
    const { drive } = renderPanel()
    openTile(drive)
    fireEvent.click(screen.getByTestId('tsp-target-red'))
    const forbidden = /timer|countdown|buzz|lockout|wager|daily double|save|load game|image|audio|video/i
    for (const control of [
      ...screen.getAllByRole('button'),
      ...screen.getAllByRole('radio'),
      // Number inputs expose the `spinbutton` role, not `textbox`.
      ...screen.getAllByRole('spinbutton'),
    ]) {
      expect(control.textContent ?? '').not.toMatch(forbidden)
      expect(control.getAttribute('aria-label') ?? '').not.toMatch(forbidden)
    }
  })

  it('never reveals prompt or answer content — the board panel owns that', () => {
    const { drive, view } = renderPanel()
    openTile(drive)
    const html = view.container.innerHTML
    expect(html).not.toContain('Alpha one hundred prompt')
    expect(html).not.toContain('Alpha one hundred answer')
    expect(html).not.toContain('ALPHA-TEACHER-NOTE-100')
  })
})
