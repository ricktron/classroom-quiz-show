import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSampleGameWithUnsupportedRound } from '../game/sampleGame'
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
    expect(screen.getByTestId('ssp-current-session-warning')).toHaveTextContent(
      /local save status is not yet available/i,
    )
    expect(screen.getByTestId('ssp-terminal-path')).toHaveTextContent(/host-ended/i)
    expect(screen.getByTestId('ssp-standings')).toBeInTheDocument()
    expect(screen.getAllByText('−40').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Final standings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Scoring summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Category boards' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unavailable rounds' })).toBeInTheDocument()
    expect(screen.getByTestId('ssp-unavailable-rounds-none')).toHaveTextContent(
      /every authored round/i,
    )
  })

  it('renders truthful saved and failed save states with retry', () => {
    const store = endedStore()
    const game = store.getState().session!.game!
    const retry = vi.fn()
    const { rerender } = render(
      <SessionSummaryPanel
        game={game}
        history={store.getHistory()}
        saveStatus="saved"
      />,
    )
    expect(screen.getByTestId('ssp-current-session-warning')).toHaveTextContent(/saved locally/i)

    rerender(
      <SessionSummaryPanel
        game={game}
        history={store.getHistory()}
        saveStatus="failed"
        onRetrySave={retry}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /retry saving summary/i }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('presents unsupported authored rounds in words without fabricated metrics', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'unsupported-panel' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createSampleGameWithUnsupportedRound(),
    })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    const game = store.getState().session!.game!
    render(<SessionSummaryPanel game={game} history={store.getHistory()} />)

    expect(screen.getByTestId('ssp-unavailable-rounds')).toBeInTheDocument()
    expect(screen.getByTestId('ssp-unavailable-round-mystery-round')).toHaveTextContent(
      /Mystery Round[\s\S]*unsupported-sample[\s\S]*No gameplay metrics/i,
    )
    expect(screen.getByTestId('ssp-unavailable-round-supported-1')).toHaveTextContent(
      /Supported Round[\s\S]*placeholder/i,
    )
    expect(screen.queryByText(/Tile selections/i)).not.toBeInTheDocument()
  })
})
