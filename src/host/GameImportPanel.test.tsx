import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { gameFileText, roundFile } from '../test/gameFileFixtures'
import { GameImportPanel } from './GameImportPanel'

/**
 * Host import harness — component behaviour.
 *
 * The panel is a thin adapter: these tests check that it routes everything
 * through the pipeline, loads ONLY on success, reports issues host-only, and
 * never lets a stale success stand in for a fresh failure.
 */

function renderPanel(options: { hasSession?: boolean } = {}) {
  const store = createSessionStore()
  if (options.hasSession !== false) {
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  }
  render(
    <GameImportPanel
      dispatch={(command) => store.dispatch(command)}
      registry={store.getRegistry()}
      hasSession={options.hasSession !== false}
      activeGame={store.getState().session?.game ?? null}
    />,
  )
  return { store }
}

/**
 * Set the textarea's value the way a paste does (one change event with the full
 * text) and click Import. Keystroke-level typing would fire a change per
 * character for no added coverage.
 */
function pasteAndImport(text: string): void {
  fireEvent.change(screen.getByTestId('import-json'), { target: { value: text } })
  fireEvent.click(screen.getByTestId('import-run'))
}

function clickButton(name: RegExp): void {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('GameImportPanel', () => {
  it('imports valid canonical JSON and loads it through INITIALIZE_GAME', () => {
    const { store } = renderPanel()
    pasteAndImport(gameFileText({ rounds: [roundFile('a'), roundFile('b')] }))

    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent(/import succeeded — game loaded/i)
    expect(screen.getByTestId('import-round-count')).toHaveTextContent('2')

    const history = store.getHistory()
    expect(history.filter((e) => e.type === 'GAME_INITIALIZED')).toHaveLength(1)
    expect(store.getState().session?.game?.definition.id).toBe('sample-game')
  })

  it('shows an actionable issue for malformed JSON and loads nothing', () => {
    const { store } = renderPanel()
    const before = store.getHistory().length
    pasteAndImport('{ "format": ')

    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent(/import failed — no game was loaded/i)
    expect(result).toHaveTextContent('json-parse')
    expect(result).toHaveTextContent('invalid-json')
    expect(store.getHistory()).toHaveLength(before)
    expect(store.getState().session?.game).toBeNull()
  })

  it('shows the exact path for a structurally invalid document', () => {
    renderPanel()
    pasteAndImport(gameFileText({ rounds: [{ ...roundFile('r1'), title: 42 }] }))

    const issues = within(screen.getByTestId('import-issues')).getAllByRole('listitem')
    expect(issues.some((li) => li.textContent?.includes('rounds[0].title'))).toBe(true)
  })

  it('rejects an unregistered round type safely and host-only', () => {
    const { store } = renderPanel()
    pasteAndImport(
      gameFileText({ rounds: [{ id: 'r1', type: 'category-board', title: 'R', config: {} }] }),
    )

    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent('unknown-round-type')
    expect(result).toHaveTextContent('rounds[0].type')
    expect(store.getState().session?.game).toBeNull()
  })

  it('does not present a stale success after a later failure', () => {
    renderPanel()
    pasteAndImport(gameFileText())
    expect(screen.getByTestId('import-result')).toHaveTextContent(/import succeeded/i)
    expect(screen.getByTestId('import-attempt-count')).toHaveTextContent('attempt #1')

    pasteAndImport('not json at all')
    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent(/import failed/i)
    expect(result).not.toHaveTextContent(/import succeeded/i)
    expect(screen.getByTestId('import-attempt-count')).toHaveTextContent('attempt #2')
  })

  it('marks a repeated identical failure as a fresh attempt', () => {
    renderPanel()
    pasteAndImport('{ bad')
    expect(screen.getByTestId('import-attempt-count')).toHaveTextContent('attempt #1')
    pasteAndImport('{ bad')
    expect(screen.getByTestId('import-attempt-count')).toHaveTextContent('attempt #2')
    expect(screen.getByTestId('import-result')).toHaveTextContent(/import failed/i)
  })

  it('validates without a session but refuses to load, saying why', () => {
    const { store } = renderPanel({ hasSession: false })
    pasteAndImport(gameFileText())

    const result = screen.getByTestId('import-result')
    expect(result).toHaveTextContent(/validated but NOT loaded/i)
    expect(result).toHaveTextContent(/initialize a session first/i)
    expect(store.getHistory()).toHaveLength(0)
  })

  it('runs the built-in sample through the same pipeline', () => {
    const { store } = renderPanel()
    clickButton(/load valid sample file/i)
    fireEvent.click(screen.getByTestId('import-run'))

    expect(screen.getByTestId('import-result')).toHaveTextContent(/import succeeded/i)
    expect(store.getState().session?.game?.definition.id).toBe('imported-sample-game')
  })

  it('rejects the built-in unregistered-type sample like any other input', () => {
    const { store } = renderPanel()
    clickButton(/unregistered round type/i)
    fireEvent.click(screen.getByTestId('import-run'))

    expect(screen.getByTestId('import-result')).toHaveTextContent('unknown-round-type')
    expect(store.getState().session?.game).toBeNull()
  })

  it('reports an empty textarea rather than doing nothing', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('import-run'))
    expect(screen.getByTestId('import-result')).toHaveTextContent('empty-input')
  })
})
