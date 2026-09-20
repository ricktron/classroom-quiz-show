import { describe, expect, it, vi } from 'vitest'
import {
  attachDisplayWakeCatchUp,
  type DisplayWakeCatchUpDocument,
  type DisplayWakeCatchUpTarget,
} from './displayWakeCatchUp'

function createFakeLifecycle(initial: DocumentVisibilityState = 'visible'): {
  doc: DisplayWakeCatchUpDocument
  win: DisplayWakeCatchUpTarget
  setVisibility: (state: DocumentVisibilityState) => void
  /** Change visibilityState without emitting visibilitychange (ordering quirk). */
  setVisibilitySilent: (state: DocumentVisibilityState) => void
  dispatchFocus: () => void
} {
  let visibilityState: DocumentVisibilityState = initial
  const docListeners = new Map<string, Set<() => void>>()
  const winListeners = new Map<string, Set<() => void>>()

  const add =
    (map: Map<string, Set<() => void>>) =>
    (type: string, listener: () => void): void => {
      const set = map.get(type) ?? new Set()
      set.add(listener)
      map.set(type, set)
    }
  const remove =
    (map: Map<string, Set<() => void>>) =>
    (type: string, listener: () => void): void => {
      map.get(type)?.delete(listener)
    }
  const emit = (map: Map<string, Set<() => void>>, type: string): void => {
    for (const listener of map.get(type) ?? []) listener()
  }

  const doc: DisplayWakeCatchUpDocument = {
    get visibilityState() {
      return visibilityState
    },
    addEventListener: add(docListeners),
    removeEventListener: remove(docListeners),
  }
  const win: DisplayWakeCatchUpTarget = {
    addEventListener: add(winListeners),
    removeEventListener: remove(winListeners),
  }

  return {
    doc,
    win,
    setVisibility(state) {
      visibilityState = state
      emit(docListeners, 'visibilitychange')
    },
    setVisibilitySilent(state) {
      visibilityState = state
    },
    dispatchFocus() {
      emit(winListeners, 'focus')
    },
  }
}

describe('attachDisplayWakeCatchUp', () => {
  it('does not request on hidden alone', () => {
    const requestState = vi.fn()
    const life = createFakeLifecycle('visible')
    const detach = attachDisplayWakeCatchUp({
      requestState,
      doc: life.doc,
      win: life.win,
    })

    life.setVisibility('hidden')
    expect(requestState).not.toHaveBeenCalled()
    detach()
  })

  it('requests once when becoming visible after hidden', () => {
    const requestState = vi.fn()
    const life = createFakeLifecycle('visible')
    const detach = attachDisplayWakeCatchUp({
      requestState,
      doc: life.doc,
      win: life.win,
    })

    life.setVisibility('hidden')
    life.setVisibility('visible')
    expect(requestState).toHaveBeenCalledTimes(1)
    detach()
  })

  it('does not request on focus without a prior hidden period', () => {
    const requestState = vi.fn()
    const life = createFakeLifecycle('visible')
    const detach = attachDisplayWakeCatchUp({
      requestState,
      doc: life.doc,
      win: life.win,
    })

    life.dispatchFocus()
    expect(requestState).not.toHaveBeenCalled()
    detach()
  })

  it('allows focus to catch up when wasHidden is set and document is already visible', () => {
    const requestState = vi.fn()
    const life = createFakeLifecycle('visible')
    const detach = attachDisplayWakeCatchUp({
      requestState,
      doc: life.doc,
      win: life.win,
    })

    life.setVisibility('hidden')
    life.setVisibilitySilent('visible')
    life.dispatchFocus()
    expect(requestState).toHaveBeenCalledTimes(1)
    life.dispatchFocus()
    expect(requestState).toHaveBeenCalledTimes(1)
    detach()
  })

  it('stops calling requestState after detach', () => {
    const requestState = vi.fn()
    const life = createFakeLifecycle('visible')
    const detach = attachDisplayWakeCatchUp({
      requestState,
      doc: life.doc,
      win: life.win,
    })
    detach()

    life.setVisibility('hidden')
    life.setVisibility('visible')
    expect(requestState).not.toHaveBeenCalled()
  })
})
