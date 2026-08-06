import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NexusCore } from './NexusCore'

describe('NexusCore', () => {
  it('renders only public-safe brand, round, and stage facts', () => {
    render(
      <NexusCore
        nexus={{
          brand: 'Classroom Quiz Show',
          roundLabel: 'Round 2 of 4',
          stageLabel: 'Board open',
          detail: 'Playing',
        }}
      />,
    )
    expect(screen.getByTestId('nexus-core')).toBeInTheDocument()
    expect(screen.getByTestId('nexus-brand')).toHaveTextContent('Classroom Quiz Show')
    expect(screen.getByTestId('nexus-round')).toHaveTextContent('Round 2 of 4')
    expect(screen.getByTestId('nexus-stage')).toHaveTextContent('Board open')
    const text = screen.getByTestId('nexus-core').textContent ?? ''
    expect(text).not.toMatch(/category-board|final-wager|teacher|host notes/i)
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
})
