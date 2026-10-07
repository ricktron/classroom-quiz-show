import { afterEach, describe, expect, it } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { WbuzzSignalChainPanel } from './WbuzzSignalChainPanel'
import {
  recordWbuzzSignalEvent,
  wipeWbuzzSignalTraceForTests,
} from '../input/wbuzzSignalChainTrace'

describe('WbuzzSignalChainPanel', () => {
  afterEach(() => {
    wipeWbuzzSignalTraceForTests()
  })

  it('shows events and reset clears to a marker without classroom content fields', () => {
    act(() => {
      recordWbuzzSignalEvent('connect_invoked', 'info', {
        priorHealth: 'permission-required',
      })
    })
    render(<WbuzzSignalChainPanel />)
    fireEvent.click(screen.getByText(/Wbuzz signal-chain trace/i))
    expect(screen.getByTestId('wbuzz-signal-trace-list').textContent).toMatch(/connect_invoked/)
    expect(screen.getByTestId('wbuzz-signal-trace-privacy').textContent).not.toMatch(
      /student|question|answer/i,
    )
    act(() => {
      fireEvent.click(screen.getByTestId('wbuzz-signal-trace-reset'))
    })
    expect(screen.getByTestId('wbuzz-signal-trace-list').textContent).toMatch(/trace_cleared/)
    expect(screen.getByTestId('wbuzz-signal-trace-list').textContent).not.toMatch(
      /connect_invoked/,
    )
  })
})
