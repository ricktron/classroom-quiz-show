import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { importGameFromUnknown } from '../import/importGame'
import { createSessionStore } from '../state/store'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { SessionSummaryPanel } from './SessionSummaryPanel'

const AT = 1_000

function endedStore() {
  const imported = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
  if (imported.status !== 'success') throw new Error('import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'panel-session' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'ADJUST_TEAM_SCORE',
    issuedAt: AT,
    teamId: 'red',
    delta: -40,
    mode: 'manual-correction',
    source: { kind: 'manual' },
  })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 9 })
  return store
}

describe('SessionSummaryPanel', () => {
  it('renders nothing while the game is active', () => {
    const store = createSessionStore()
    const imported = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
    if (imported.status !== 'success') throw new Error('import failed')
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
    const game = store.getState().session!.game!
    const { container } = render(
      <SessionSummaryPanel game={game} history={store.getHistory()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows standings, signed negatives, tie-capable labels, and current-session warning', () => {
    const store = endedStore()
    const game = store.getState().session!.game!
    render(<SessionSummaryPanel game={game} history={store.getHistory()} />)

    expect(screen.getByTestId('session-summary-panel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Session summary' })).toBeInTheDocument()
    expect(screen.getByTestId('ssp-current-session-warning')).toHaveTextContent(/not saved/i)
    expect(screen.getByTestId('ssp-terminal-path')).toHaveTextContent(/host-ended/i)
    expect(screen.getByTestId('ssp-standings')).toBeInTheDocument()
    expect(screen.getAllByText('−40').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Final standings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Scoring summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Category boards' })).toBeInTheDocument()
  })
})
