/**
 * Visible save-trust state for teacher authoring.
 *
 * Persistence completion is generation-gated: a stale async result must not
 * overwrite a newer save attempt or claim Saved after a later failure.
 */

export const SAVE_PHASES = ['unsaved', 'saving', 'saved', 'failed'] as const
export type SavePhase = (typeof SAVE_PHASES)[number]

export interface SaveTrustState {
  readonly phase: SavePhase
  readonly generation: number
  readonly dirty: boolean
  readonly message: string
}

export function initialSaveTrustState(): SaveTrustState {
  return {
    phase: 'unsaved',
    generation: 0,
    dirty: false,
    message: 'Not saved yet.',
  }
}

export function markSaveDirty(state: SaveTrustState): SaveTrustState {
  return {
    ...state,
    dirty: true,
    phase: state.phase === 'saving' ? 'saving' : 'unsaved',
    message: state.phase === 'saving' ? 'Saving… newer edits are unsaved.' : 'Unsaved changes.',
  }
}

export function beginSave(state: SaveTrustState): SaveTrustState {
  return {
    phase: 'saving',
    generation: state.generation + 1,
    dirty: state.dirty,
    message: 'Saving…',
  }
}

export function completeSave(
  state: SaveTrustState,
  generation: number,
  result: { readonly ok: true } | { readonly ok: false; readonly message: string },
): SaveTrustState {
  if (generation !== state.generation) {
    return state
  }
  if (result.ok) {
    return {
      phase: state.dirty ? 'unsaved' : 'saved',
      generation: state.generation,
      dirty: state.dirty,
      message: state.dirty ? 'Saved, then edited again. Unsaved changes remain.' : 'Saved.',
    }
  }
  return {
    phase: 'failed',
    generation: state.generation,
    dirty: true,
    message: result.message,
  }
}

export function markSaveClean(state: SaveTrustState): SaveTrustState {
  return { ...state, dirty: false }
}

export function markSaveLoaded(): SaveTrustState {
  return {
    phase: 'saved',
    generation: 0,
    dirty: false,
    message: 'Saved on this device.',
  }
}

export function saveStatusLabel(state: SaveTrustState): string {
  if (state.phase === 'saving') return 'Saving…'
  if (state.phase === 'failed') return 'Save problem'
  if (state.phase === 'saved' && !state.dirty) return 'Saved'
  return 'Unsaved'
}
