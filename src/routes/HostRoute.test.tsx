import { act, cleanup, render, screen } from '@testing-library/react'
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

describe('HostRoute theme selector', () => {
  it('renders a native Theme fieldset below the private-host banner', () => {
    renderHost()
    expect(screen.getByText(/do not project this screen/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(
      screen.getByText(/Applies to this host and displays opened from it/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Default' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'High contrast' })).not.toBeChecked()
  })

  it('applies high contrast immediately when selected', () => {
    renderHost()
    act(() => {
      screen.getByRole('radio', { name: 'High contrast' }).click()
    })
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
    expect(screen.getByRole('radio', { name: 'High contrast' })).toBeChecked()
  })

  it('opens the named display with the validated theme query', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderHost()
    act(() => {
      screen.getByRole('radio', { name: 'High contrast' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: /open display in new window/i }).click()
    })
    expect(open).toHaveBeenCalled()
    const url = String(open.mock.calls[0]?.[0] ?? '')
    expect(url).toContain('#/display?theme=high-contrast')
    expect(open.mock.calls[0]?.[1]).toBe('quiz-show-display')
  })
})
