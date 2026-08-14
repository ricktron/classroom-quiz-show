import { describe, expect, it } from 'vitest'
import {
  beginSave,
  completeSave,
  initialSaveTrustState,
  markSaveClean,
  markSaveDirty,
  saveStatusLabel,
} from './saveTrust'

describe('authoring save trust', () => {
  it('starts unsaved and never claims Saved', () => {
    const state = initialSaveTrustState()
    expect(state.phase).toBe('unsaved')
    expect(saveStatusLabel(state)).toBe('Unsaved')
  })

  it('shows Saving while a write is in flight', () => {
    const saving = beginSave(initialSaveTrustState())
    expect(saving.phase).toBe('saving')
    expect(saveStatusLabel(saving)).toBe('Saving…')
    expect(saving.generation).toBe(1)
  })

  it('marks Saved only after the matching generation succeeds and no newer edits exist', () => {
    const saving = beginSave(markSaveClean(initialSaveTrustState()))
    const saved = completeSave(saving, saving.generation, { ok: true })
    expect(saved.phase).toBe('saved')
    expect(saveStatusLabel(saved)).toBe('Saved')
  })

  it('does not claim Saved when a later edit arrived before completion', () => {
    const saving = beginSave(initialSaveTrustState())
    const dirtyWhileSaving = markSaveDirty(saving)
    const completed = completeSave(dirtyWhileSaving, saving.generation, { ok: true })
    expect(completed.phase).toBe('unsaved')
    expect(saveStatusLabel(completed)).toBe('Unsaved')
  })

  it('ignores stale completion from an older generation', () => {
    const first = beginSave(initialSaveTrustState())
    const second = beginSave(first)
    const staleFailure = completeSave(second, first.generation, {
      ok: false,
      message: 'stale failure',
    })
    expect(staleFailure.phase).toBe('saving')
    expect(staleFailure.message).toBe('Saving…')
    const saved = completeSave(staleFailure, second.generation, { ok: true })
    expect(saved.phase).toBe('saved')
    expect(saveStatusLabel(saved)).toBe('Saved')
  })

  it('surfaces save failure and keeps work dirty', () => {
    const saving = beginSave(initialSaveTrustState())
    const failed = completeSave(saving, saving.generation, {
      ok: false,
      message: 'Local storage is unavailable.',
    })
    expect(failed.phase).toBe('failed')
    expect(failed.dirty).toBe(true)
    expect(saveStatusLabel(failed)).toBe('Save problem')
    expect(failed.message).toBe('Local storage is unavailable.')
  })
})
