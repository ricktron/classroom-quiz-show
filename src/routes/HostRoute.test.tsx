import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostRoute } from './HostRoute'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ROUTES } from './paths'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
})

function renderHost() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.host]}>
      <ThemeProvider>
        <Routes>
          <Route path={ROUTES.host} element={<HostRoute />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

function openMore() {
  const more = screen.getByTestId('host-more')
  if (!more.hasAttribute('open')) {
    fireEvent.click(more.querySelector('summary')!)
  }
}

describe('HostRoute theme selector', () => {
  it('keeps Theme under More, below the private-host banner', () => {
    renderHost()
    expect(screen.getByText(/do not project this screen/i)).toBeInTheDocument()
    openMore()
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(
      screen.getByText(/Applies to this host and displays opened from it/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Default' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High contrast' })).not.toBeChecked()
  })

  it('presents focused Host chrome without ordinary kitchen-sink headings', () => {
    renderHost()
    expect(screen.getByRole('heading', { name: /host control/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /ready to run class/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^classroom controls$/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('host-chrome-mute')).toBeInTheDocument()
    expect(screen.getByTestId('host-chrome-display')).toBeInTheDocument()
    expect(screen.queryByText(/arrive in a later slice/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/foundation \/ testing controls — not gameplay/i),
    ).not.toBeInTheDocument()
    openMore()
    expect(screen.getByRole('heading', { name: /load a game/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start new game session/i })).toBeInTheDocument()
  })

  it('applies high contrast immediately when selected under More', () => {
    renderHost()
    openMore()
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'High contrast' }))
    })
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
    expect(screen.getByRole('radio', { name: 'High contrast' })).toBeChecked()
  })

  it('opens the named display from Host chrome with the validated theme query', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderHost()
    openMore()
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'High contrast' }))
    })
    act(() => {
      fireEvent.click(screen.getByTestId('host-chrome-display'))
    })
    expect(open).toHaveBeenCalled()
    const url = String(open.mock.calls[0]?.[0] ?? '')
    expect(url).toContain('#/display?theme=high-contrast')
    expect(open.mock.calls[0]?.[1]).toBe('quiz-show-display')
  })
})
