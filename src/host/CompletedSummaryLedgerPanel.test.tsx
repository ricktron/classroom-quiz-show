import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function props(
  listings: readonly CompletedSummaryListing[],
  overrides: Partial<{
    deleteCompletedRecord: ReturnType<typeof vi.fn>
    clearAllCompletedRecords: ReturnType<typeof vi.fn>
    leadership: 'leader' | 'follower' | 'unknown'
  }> = {},
) {
  return {
    persistence: {
      completedListings: listings,
      ledgerMessage: 'Completed summaries ready.',
      leadership: overrides.leadership ?? ('leader' as const),
      refreshCompletedLedger: vi.fn(async () => ({ ok: true as const, message: 'Refreshed.' })),
      deleteCompletedRecord:
        overrides.deleteCompletedRecord ??
        vi.fn(async () => ({ ok: true as const, message: 'Deleted.' })),
      clearAllCompletedRecords:
        overrides.clearAllCompletedRecords ??
        vi.fn(async () => ({ ok: true as const, message: 'Cleared.' })),
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
    expect(screen.getByTestId('ledger-quarantine')).toHaveTextContent('broken-key')

    fireEvent.click(within(screen.getByTestId('ledger-quarantine')).getByRole('button', { name: /view details/i }))
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

  it('retains confirmation and selection when delete-one or clear-all fails', async () => {
    const deleteCompletedRecord = vi.fn(async () => ({
      ok: false as const,
      message: 'Delete failed in storage.',
    }))
    const clearAllCompletedRecords = vi.fn(async () => ({
      ok: false as const,
      message: 'Clear failed in storage.',
    }))
    const p = props([validListing()], { deleteCompletedRecord, clearAllCompletedRecords })
    render(<CompletedSummaryLedgerPanel {...p} />)

    fireEvent.click(screen.getByRole('button', { name: /view details/i }))
    expect(screen.getByRole('heading', { name: /selected record/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(deleteCompletedRecord).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /selected record/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /clear all summaries/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm clear all/i }))
    await waitFor(() => expect(clearAllCompletedRecords).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: /confirm clear all/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /selected record/i })).toBeInTheDocument()
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

    expect(screen.getByTestId('ledger-profile-group-2')).toHaveTextContent(
      /vs profile group 1:.*definition fingerprint/i,
    )
    fireEvent.click(screen.getAllByRole('button', { name: /view details/i })[0]!)
    fireEvent.change(screen.getByRole('textbox', { name: /class label/i }), {
      target: { value: ' '.repeat(2) },
    })
    fireEvent.click(screen.getByRole('button', { name: /save class label/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non-empty/i)
    expect(p.persistence.updateCompletedClassLabel).not.toHaveBeenCalled()
  })

  it('applies game and class filters to report groups and restores them when cleared', () => {
    const period1 = recordFixture({
      recordId: 'session-1',
      classLabel: 'Period 1',
      summary: summaryFixture({ sessionId: 'session-1', gameId: 'game-1', gameTitle: 'Game One' }),
    })
    const period2 = recordFixture({
      recordId: 'session-2',
      classLabel: 'Period 2',
      savedAt: 40,
      summary: summaryFixture({
        sessionId: 'session-2',
        gameId: 'game-1',
        gameTitle: 'Game One',
        recordedCompletionAt: 25,
      }),
    })
    const otherGame = recordFixture({
      recordId: 'session-3',
      classLabel: 'Period 1',
      savedAt: 50,
      summary: summaryFixture({
        sessionId: 'session-3',
        gameId: 'game-2',
        gameTitle: 'Game Two',
        recordedCompletionAt: 35,
      }),
      competitiveProfile: profileFixture({
        game: {
          gameId: 'game-2',
          canonicalDefinitionSha256: 'c'.repeat(64),
        },
      }),
    })
    render(<CompletedSummaryLedgerPanel {...props([
      validListing(period1),
      validListing(period2),
      validListing(otherGame),
    ])} />)

    const reportText = () =>
      screen.getAllByTestId(/ledger-game-rollup|ledger-team-rollup|ledger-class-rollups/)
        .map((node) => node.textContent ?? '')
        .join('\n')

    expect(reportText()).toMatch(/Game One/)
    expect(reportText()).toMatch(/Game Two/)

    fireEvent.change(screen.getByLabelText(/filter by game/i), { target: { value: 'game-1' } })
    expect(reportText()).toMatch(/Game One/)
    expect(reportText()).not.toMatch(/Game Two/)
    expect(reportText()).toMatch(/Red/)
    expect(reportText()).toMatch(/Period 1/)
    expect(reportText()).toMatch(/Period 2/)
    expect(screen.queryByTestId('ledger-profile-group-2')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/filter by class label/i), {
      target: { value: 'Period 1' },
    })
    expect(reportText()).toMatch(/Game One/)
    expect(reportText()).not.toMatch(/Game Two/)
    expect(reportText()).toMatch(/Period 1: 1 compatible sessions/)
    expect(reportText()).not.toMatch(/Period 2/)
    expect(screen.getByTestId('ledger-profile-group-1')).toHaveTextContent(
      'Profile group 1: 1 session',
    )
    expect(screen.queryByTestId('ledger-profile-group-2')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/filter by game/i), { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText(/filter by class label/i), { target: { value: 'all' } })
    expect(reportText()).toMatch(/Game One/)
    expect(reportText()).toMatch(/Game Two/)
    expect(screen.getByTestId('ledger-profile-group-2')).toBeInTheDocument()
  })

  it('keeps incompatible profiles separated after filtering and shows quarantine while filters are active', () => {
    const first = recordFixture({
      recordId: 'session-1',
      classLabel: 'Period 1',
    })
    const second = recordFixture({
      recordId: 'session-2',
      classLabel: 'Period 1',
      summary: summaryFixture({ sessionId: 'session-2' }),
      competitiveProfile: profileFixture({
        game: {
          gameId: 'game-1',
          canonicalDefinitionSha256: 'b'.repeat(64),
        },
      }),
    })
    render(
      <CompletedSummaryLedgerPanel
        {...props([
          validListing(first),
          validListing(second),
          {
            key: 'broken-key',
            diagnostic: 'corrupt',
            decoded: { status: 'corrupt', message: 'bad record' },
          },
        ])}
      />,
    )

    fireEvent.change(screen.getByLabelText(/filter by class label/i), {
      target: { value: 'Period 1' },
    })
    expect(screen.getByTestId('ledger-profile-group-1')).toBeInTheDocument()
    expect(screen.getByTestId('ledger-profile-group-2')).toBeInTheDocument()
    expect(screen.getByTestId('ledger-quarantine')).toHaveTextContent('broken-key')
    expect(screen.getByTestId('ledger-quarantine')).toHaveTextContent(/do not hide this quarantine/i)
  })

  it('shows bounded Summary V1 detail for unsupported-profile records without enabling labels', () => {
    const summary = summaryFixture()
    const p = props([
      {
        key: 'session-1',
        diagnostic: 'unsupported-profile-version',
        decoded: {
          status: 'unsupported-profile-version',
          version: 2,
          summary,
        },
      },
    ])
    render(<CompletedSummaryLedgerPanel {...p} />)

    fireEvent.click(within(screen.getByTestId('ledger-quarantine')).getByRole('button', { name: /view details/i }))
    expect(screen.getByTestId('unsupported-profile-warning')).toHaveTextContent(
      /comparison and aggregation are disabled/i,
    )
    expect(screen.getByTestId('ssp-game-title')).toHaveTextContent('Game One')
    expect(screen.queryByRole('textbox', { name: /class label/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('ledger-profile-group-1')).not.toBeInTheDocument()
  })

  it('renders human-readable local timestamps with time elements', () => {
    render(<CompletedSummaryLedgerPanel {...props([validListing()])} />)
    const times = screen.getAllByRole('time')
    expect(times.length).toBeGreaterThanOrEqual(2)
    expect(times[0]).toHaveAttribute('dateTime', new Date(30).toISOString())
    expect(times[0]?.textContent).not.toBe('30')
  })

  it('explains multi-profile separations relative to each prior group', () => {
    const a = recordFixture({ recordId: 'session-1' })
    const b = recordFixture({
      recordId: 'session-2',
      summary: summaryFixture({ sessionId: 'session-2' }),
      competitiveProfile: profileFixture({
        game: { gameId: 'game-1', canonicalDefinitionSha256: 'b'.repeat(64) },
      }),
    })
    const c = recordFixture({
      recordId: 'session-3',
      summary: summaryFixture({ sessionId: 'session-3', gameId: 'game-2', gameTitle: 'Game Two' }),
      competitiveProfile: profileFixture({
        game: { gameId: 'game-2', canonicalDefinitionSha256: 'c'.repeat(64) },
      }),
    })
    render(<CompletedSummaryLedgerPanel {...props([
      validListing(a),
      validListing(b),
      validListing(c),
    ])} />)

    expect(screen.getByTestId('ledger-profile-group-3')).toHaveTextContent(/vs profile group 1/i)
    expect(screen.getByTestId('ledger-profile-group-3')).toHaveTextContent(/vs profile group 2/i)
  })
})
