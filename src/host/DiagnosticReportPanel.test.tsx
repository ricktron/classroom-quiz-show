import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { DiagnosticReportPanel } from './DiagnosticReportPanel'
import * as copyModule from './diagnostics/copyDiagnosticText'

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
