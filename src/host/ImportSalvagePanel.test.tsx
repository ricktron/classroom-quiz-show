import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportSalvagePanel } from './ImportSalvagePanel'
import type { ImportCorrectionView } from '../import/salvage'
import { createBlankAuthoringDraft } from '../authoring/createBlankDraft'

function view(overrides: Partial<ImportCorrectionView> = {}): ImportCorrectionView {
  return {
    headline: 'Some of this file can be kept.',
    detail: 'Nothing has been saved yet.',
    kept: ['“Why is the sky blue?” was kept with its answer and point value.'],
    needsTeacher: ['“Which gas is most of air?” has no answer. None was invented.'],
    rejected: ['A round was not a question board or Final, so it was not kept.'],
    draft: createBlankAuthoringDraft({ title: 'Sky', gameKey: 'sky' }),
    gameIdFromSource: true,
    derived: {
      game: false,
      boardRound: false,
      finalRound: false,
      categoryOrders: [],
      tileKeys: [],
      teamOrders: [],
    },
    persisted: false,
    ...overrides,
  }
}

describe('ImportSalvagePanel', () => {
  it('focuses the review heading and exposes keyboard-operable actions', () => {
    const onKeep = vi.fn()
    const onDiscard = vi.fn()
    render(
      <ImportSalvagePanel
        kind="correction"
        view={view()}
        onKeep={onKeep}
        onOpen={vi.fn()}
        onDiscard={onDiscard}
      />,
    )
    const heading = screen.getByRole('heading', { name: /some of this file can be kept/i })
    expect(heading).toHaveFocus()
    const keep = screen.getByRole('button', { name: 'Keep usable parts' })
    const discard = screen.getByRole('button', { name: 'Discard this import' })
    expect(keep).toHaveAttribute('type', 'button')
    expect(discard).toHaveAttribute('type', 'button')
    keep.focus()
    expect(keep).toHaveFocus()
    discard.focus()
    expect(discard).toHaveFocus()
  })

  it('renders question text as text, not HTML', () => {
    render(
      <ImportSalvagePanel
        kind="correction"
        view={view({
          detail: 'Kept text: <img src=x onerror=alert(1)>',
          kept: [],
        })}
        onKeep={vi.fn()}
        onOpen={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument()
  })

  it('announces counts for a screen reader without claiming a save', () => {
    render(
      <ImportSalvagePanel
        kind="fail-closed"
        headline="This file could not be read."
        detail="Nothing was saved."
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: /could not be read/i })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Back to import' })).toBeInTheDocument()
    expect(screen.getByTestId('import-salvage')).toHaveTextContent('Nothing was saved.')
  })

  it('disables discard while a keep is saving', () => {
    render(
      <ImportSalvagePanel
        kind="correction"
        view={view()}
        busy
        onKeep={vi.fn()}
        onOpen={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByTestId('import-salvage-keep')).toBeDisabled()
    expect(screen.getByTestId('import-salvage-discard')).toBeDisabled()
    expect(screen.getByTestId('import-salvage-saving')).toHaveTextContent('Saving the usable parts')
  })
})
