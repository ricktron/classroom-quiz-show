import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { DiagnosticReportPanel } from './DiagnosticReportPanel'
import * as copyModule from './diagnostics/copyDiagnosticText'

/*
  Per-test isolation for the two globals this file installs.

  The `vi.spyOn(copyModule, 'copyDiagnosticText')` below is covered centrally:
  `vitest.config.ts` sets `restoreMocks: true`, which restores every spy before
  each test. It previously leaked, because Vitest gives a fresh jsdom per FILE
  and nothing here restored it — so whenever the clipboard-failure case ran
  first, the success case read the leaked 'failed' resolution,
  `navigator.clipboard.writeText` was never reached, and the assertion failed
  with "expected 'spy' to be called 1 times, but got 0 times". Reproducible at
  `--sequence.shuffle --sequence.seed=2` and `=7`; the committed source order
  passed, which is why CI never saw it.

  `navigator.clipboard` is a different problem and no config option covers it:
  `unstubGlobals` reverts `vi.stubGlobal`, not `Object.defineProperty`. The
  success case replaces the whole property with a `vi.fn()`-backed stub, and
  `restoreMocks` does not touch a plain `vi.fn()`, so without this the stub
  stayed installed — with its call count — for the rest of the file. The
  original descriptor is captured at import time, before any test can redefine
  it, and put back after each test.
*/
const ORIGINAL_CLIPBOARD = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  if (ORIGINAL_CLIPBOARD) {
    Object.defineProperty(navigator, 'clipboard', ORIGINAL_CLIPBOARD)
  } else {
    delete (navigator as unknown as { clipboard?: unknown }).clipboard
  }
})

function renderPanel(
  overrides: Partial<ComponentProps<typeof DiagnosticReportPanel>> = {},
) {
  return render(
    <DiagnosticReportPanel
      persistence={{
        bootPhase: 'ready',
        durabilityStatus: 'idle',
        leadership: 'leader',
      }}
      audio={{ activation: 'ready', muted: false }}
      displayWindow="closed"
      inputSignals={null}
      {...overrides}
    />,
  )
}

describe('DiagnosticReportPanel', () => {
  it('is collapsed by default and expands to show the report before copy', () => {
    renderPanel()
    const details = screen.getByTestId('diagnostic-report') as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(screen.queryByTestId('diagnostic-report-text')).not.toBeVisible()

    fireEvent.click(screen.getByText(/troubleshooting evidence/i))
    expect(details.open).toBe(true)
    const text = screen.getByTestId('diagnostic-report-text')
    expect(text).toBeVisible()
    expect((text as HTMLTextAreaElement).value).toContain(
      'Classroom Quiz Show — Diagnostic Report',
    )
    expect(screen.getByTestId('diagnostic-report-privacy')).toBeVisible()
  })

  it('copies exactly the visible sanitized report and acknowledges success honestly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    renderPanel()
    const details = screen.getByTestId('diagnostic-report') as HTMLDetailsElement
    details.open = true
    fireEvent.click(details.querySelector('summary')!)

    const visible = screen.getByTestId('diagnostic-report-text').textContent ?? ''
    fireEvent.click(screen.getByTestId('diagnostic-report-copy'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith(visible)
      expect(screen.getByTestId('diagnostic-report-status')).toHaveTextContent(
        /copied to clipboard\. nothing was sent/i,
      )
    })
  })

  it('does not claim success when clipboard fails and keeps manual copy available', async () => {
    vi.spyOn(copyModule, 'copyDiagnosticText').mockResolvedValue('failed')

    renderPanel()
    const details = screen.getByTestId('diagnostic-report') as HTMLDetailsElement
    details.open = true

    fireEvent.click(screen.getByTestId('diagnostic-report-copy'))

    await waitFor(() => {
      expect(screen.getByTestId('diagnostic-report-status')).toHaveTextContent(
        /clipboard copy failed/i,
      )
      expect(screen.getByTestId('diagnostic-report-status')).not.toHaveTextContent(/copied to clipboard/i)
    })
    expect(screen.getByTestId('diagnostic-report-text')).toBeVisible()
  })

  it('exposes accessible names and status', () => {
    renderPanel()
    const details = screen.getByTestId('diagnostic-report') as HTMLDetailsElement
    details.open = true
    expect(screen.getByLabelText(/diagnostic report \(sanitized\)/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy diagnostic report/i })).toBeInTheDocument()
  })
})
