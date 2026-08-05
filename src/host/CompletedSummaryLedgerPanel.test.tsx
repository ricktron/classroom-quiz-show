import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CompletedSummaryListing } from '../persistence'
import {
  profileFixture,
  recordFixture,
  summaryFixture,
} from '../summary/completedSummary/testFixtures'
import { CompletedSummaryLedgerPanel } from './CompletedSummaryLedgerPanel'

function validListing(record = recordFixture()): CompletedSummaryListing {
  return {
    key: record.recordId,
    diagnostic: 'valid',
    decoded: { status: 'valid', record },
  }
}

function props(listings: readonly CompletedSummaryListing[]) {
  return {
    persistence: {
      completedListings: listings,
      ledgerMessage: 'Completed summaries ready.',
      leadership: 'leader' as const,
      refreshCompletedLedger: vi.fn(async () => ({ ok: true as const, message: 'Refreshed.' })),
      deleteCompletedRecord: vi.fn(async () => ({ ok: true as const, message: 'Deleted.' })),
      clearAllCompletedRecords: vi.fn(async () => ({ ok: true as const, message: 'Cleared.' })),
      updateCompletedClassLabel: vi.fn(async () => ({ ok: true as const, message: 'Updated.' })),
    },
  }
}

describe('CompletedSummaryLedgerPanel', () => {
  it('lists valid and corrupt records and hides corrupt metrics', () => {
    const p = props([
      validListing(recordFixture({ classLabel: 'Period 1' })),
      {
        key: 'broken-key',
        diagnostic: 'corrupt',
        decoded: { status: 'corrupt', message: 'bad record' },
      },
    ])
    render(<CompletedSummaryLedgerPanel {...p} />)

    expect(screen.getByRole('table', { name: /host-private completed summary/i })).toBeInTheDocument()
    expect(screen.getAllByText('Game One').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Period 1').length).toBeGreaterThan(0)
    expect(screen.getByText('broken-key')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /view details/i })[1]!)
    expect(screen.getByText(/metrics are hidden/i)).toBeInTheDocument()
  })

  it('requires explicit delete and clear confirmations', async () => {
    const p = props([validListing()])
    render(<CompletedSummaryLedgerPanel {...p} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(p.persistence.deleteCompletedRecord).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(p.persistence.deleteCompletedRecord).toHaveBeenCalledWith('session-1'))

    fireEvent.click(screen.getByRole('button', { name: /clear all summaries/i }))
    expect(p.persistence.clearAllCompletedRecords).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm clear all/i }))
    await waitFor(() => expect(p.persistence.clearAllCompletedRecords).toHaveBeenCalledOnce())
  })

  it('validates class labels and visibly separates incompatible profiles', async () => {
    const second = recordFixture({
      recordId: 'session-2',
      summary: summaryFixture({ sessionId: 'session-2' }),
      competitiveProfile: profileFixture({
        game: {
          gameId: 'game-1',
          canonicalDefinitionSha256: 'b'.repeat(64),
        },
      }),
    })
    const p = props([validListing(), validListing(second)])
    render(<CompletedSummaryLedgerPanel {...p} />)

    expect(screen.getByText(/kept separate from profile group 1/i)).toHaveTextContent(
      /definition fingerprint/i,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /view details/i })[0]!)
    fireEvent.change(screen.getByRole('textbox', { name: /class label/i }), {
      target: { value: ' '.repeat(2) },
    })
    fireEvent.click(screen.getByRole('button', { name: /save class label/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non-empty/i)
    expect(p.persistence.updateCompletedClassLabel).not.toHaveBeenCalled()
  })
})
