import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '../state/events'
import { createSessionStore } from '../state/store'
import { useSessionStore } from './useSessionStore'

const AT = 1_000

function recoveredHistory(): readonly SessionEvent[] {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'recovered' })
  store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT })
  return store.getHistory()
}

describe('useSessionStore', () => {
  it('recreates the store when storeEpoch changes', () => {
    const history = recoveredHistory()
    function Harness({
      initialHistory,
      storeEpoch,
    }: {
      readonly initialHistory?: readonly SessionEvent[]
      readonly storeEpoch: number
    }) {
      const session = useSessionStore({ initialHistory, storeEpoch })
      return (
        <output>
          <span data-testid="session">{session.state.session?.sessionId ?? 'none'}</span>
          <span data-testid="history">{session.history.length}</span>
        </output>
      )
    }

    const view = render(<Harness storeEpoch={0} />)
    expect(screen.getByTestId('session')).toHaveTextContent('none')
    expect(screen.getByTestId('history')).toHaveTextContent('0')

    act(() => {
      view.rerender(<Harness initialHistory={history} storeEpoch={1} />)
    })
    expect(screen.getByTestId('session')).toHaveTextContent('recovered')
    expect(screen.getByTestId('history')).toHaveTextContent('2')
  })
})
