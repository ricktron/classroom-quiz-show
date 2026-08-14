import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from './paths'
import { HomeRoute } from './HomeRoute'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.root]}>
      <Routes>
        <Route path={ROUTES.root} element={<HomeRoute />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('teacher Home', () => {
  it('shows teacher-first library actions and hides the old role picker', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^home$/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import game/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent games/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /my games/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open classroom controls/i })).toHaveAttribute(
      'href',
      '/host',
    )
    expect(screen.queryByRole('heading', { name: /choose a screen/i })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/slice 13/i)
    expect(document.body.textContent).not.toMatch(/indexeddb/i)
  })

  it('keeps host-private language off any projector-forbidden answer labels', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^home$/i })).toBeInTheDocument()
    })
    const text = document.body.textContent ?? ''
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(text.toLowerCase()).not.toContain(label.toLowerCase())
    }
  })
})
