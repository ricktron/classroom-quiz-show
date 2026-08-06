import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NexusCore } from './NexusCore'
import type { PublicResponseTimer } from '../../state/publicState'

const NEXUS = {
  brand: 'Classroom Quiz Show' as const,
  roundLabel: 'Round 2 of 4',
  stageLabel: 'Board open',
  detail: 'Playing',
}

describe('NexusCore', () => {
  it('renders only public-safe brand, round, and stage facts', () => {
    render(<NexusCore nexus={NEXUS} />)
    expect(screen.getByTestId('nexus-core')).toBeInTheDocument()
    expect(screen.getByTestId('nexus-brand')).toHaveTextContent('Classroom Quiz Show')
    expect(screen.getByTestId('nexus-round')).toHaveTextContent('Round 2 of 4')
    expect(screen.getByTestId('nexus-stage')).toHaveTextContent('Board open')
    const text = screen.getByTestId('nexus-core').textContent ?? ''
    expect(text).not.toMatch(/category-board|final-wager|teacher|host notes|timerId|issuedAt/i)
    expect(screen.queryByTestId('nexus-timer')).toBeNull()
  })

  it('omits null round and detail lines', () => {
    render(
      <NexusCore
        nexus={{
          brand: 'Classroom Quiz Show',
          roundLabel: null,
          stageLabel: 'Display waiting',
          detail: null,
        }}
      />,
    )
    expect(screen.queryByTestId('nexus-round')).toBeNull()
    expect(screen.queryByTestId('nexus-detail')).toBeNull()
    expect(screen.getByTestId('nexus-stage')).toHaveTextContent('Display waiting')
  })

  it('shows a compact response timer indicator when a public timer exists', () => {
    const timer: PublicResponseTimer = {
      status: 'running',
      durationMs: 15_000,
      deadline: Date.now() + 15_000,
    }
    render(<NexusCore nexus={{ ...NEXUS, stageLabel: 'Response open' }} timer={timer} />)
    expect(screen.getByTestId('nexus-timer')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/time remaining/i)
    expect(screen.getByTestId('nexus-timer-clock')).toBeInTheDocument()
  })

  it('shows Final wager and Final response timers when public', () => {
    const { rerender } = render(
      <NexusCore
        nexus={{ ...NEXUS, stageLabel: 'Final wager' }}
        timer={{ status: 'running', durationMs: 60_000, deadline: Date.now() + 60_000 }}
      />,
    )
    expect(screen.getByTestId('nexus-timer')).toHaveAttribute('data-status', 'running')

    rerender(
      <NexusCore
        nexus={{ ...NEXUS, stageLabel: 'Final response' }}
        timer={{ status: 'running', durationMs: 30_000, deadline: Date.now() + 30_000 }}
      />,
    )
    expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/time remaining/i)
  })

  it('states paused, expired, interrupted, and idle explicitly', () => {
    const cases: Array<PublicResponseTimer> = [
      { status: 'paused', durationMs: 20_000, remainingMs: 8_000 },
      { status: 'expired', durationMs: 20_000 },
      { status: 'interrupted', durationMs: 20_000, remainingMs: 5_000 },
      { status: 'idle' },
    ]
    for (const timer of cases) {
      const { unmount } = render(
        <NexusCore nexus={NEXUS} timer={timer} />,
      )
      expect(screen.getByTestId('nexus-timer')).toHaveAttribute('data-status', timer.status)
      if (timer.status === 'idle') {
        expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/ready/i)
        expect(screen.queryByTestId('nexus-timer-clock')).toBeNull()
      } else if (timer.status === 'paused') {
        expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/paused/i)
      } else if (timer.status === 'expired') {
        expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/time up/i)
      } else {
        expect(screen.getByTestId('nexus-timer-status')).toHaveTextContent(/stopped/i)
      }
      unmount()
    }
  })

  it('renders no Nexus timer without a public timer and exposes no private timing fields', () => {
    render(<NexusCore nexus={NEXUS} timer={null} />)
    expect(screen.queryByTestId('nexus-timer')).toBeNull()
    const text = screen.getByTestId('nexus-core').textContent ?? ''
    expect(text).not.toMatch(/timerId|interruption|hostClock|deadline|issuedAt/i)
  })
})
