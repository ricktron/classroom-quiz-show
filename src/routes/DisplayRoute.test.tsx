import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisplayRoute } from './DisplayRoute'

describe('DisplayRoute', () => {
  it('composes the audience shell on the fail-closed initial state', () => {
    render(<DisplayRoute />)
    expect(screen.getByTestId('display-route')).toBeInTheDocument()
    expect(screen.getByTestId('audience-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /game display ready/i })).toBeInTheDocument()
    expect(screen.getByTestId('nexus-core')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
