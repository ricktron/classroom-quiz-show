/**
 * Slice 22 — one presentation-audio observation owner.
 *
 * Attaches to a SessionStore, baselines at the current history tail (zero
 * historical cues), then processes only newly appended authoritative events.
 * Watermark advances whether playback succeeds, fails, is muted, or is inactive.
 */

import type { SessionEvent } from '../state/events'
import type { SessionStore } from '../state/store'
import { replay } from '../state/reducer'
import { derivePresentationCue } from './derivePresentationCue'
import type { PresentationCueId } from './presentationCueId'

export type PresentationCueHandler = (cueId: PresentationCueId, event: SessionEvent) => void

export interface PresentationCueObserver {
  /** Detach the store subscription. Safe to call more than once. */
  detach(): void
  /** Current watermark index into store history (events below are consumed). */
  readonly watermark: number
}

export interface ObservePresentationCuesOptions {
  readonly store: SessionStore
  /**
   * Invoked for each newly derived cue in deterministic order. The observer
   * advances its watermark regardless of handler outcome.
   */
  readonly onCue: PresentationCueHandler
  /**
   * Optional pure replay — defaults to the authoritative reducer replay.
   */
  readonly replayHistory?: (history: readonly SessionEvent[]) => ReturnType<typeof replay>
}

/**
 * Attach one observer to `store`. Baselines to the current history length and
 * emits zero cues for recovered / historical events.
 */
export function observePresentationCues(
  options: ObservePresentationCuesOptions,
): PresentationCueObserver {
  const { store, onCue } = options
  const replayHistory = options.replayHistory ?? replay

  let watermark = store.getHistory().length
  let detached = false
  const seenEventIds = new Set<string>()
  for (const event of store.getHistory()) {
    seenEventIds.add(event.id)
  }

  const unsubscribe = store.subscribe(() => {
    if (detached) return
    const history = store.getHistory()

    if (history.length < watermark) {
      watermark = history.length
      seenEventIds.clear()
      for (const event of history) seenEventIds.add(event.id)
      return
    }

    if (history.length === watermark) return

    const appended = history.slice(watermark)
    let prefix: readonly SessionEvent[] = history.slice(0, watermark)
    let emittedGameComplete = false

    for (const event of appended) {
      // Always consume the event into the watermark, even on handler failure.
      const alreadySeen = seenEventIds.has(event.id)
      seenEventIds.add(event.id)

      if (event.type === 'EVENT_UNDONE') {
        // Undo itself is silent; resync cursor and invent no compensating cues.
        prefix = [...prefix, event]
        continue
      }

      if (alreadySeen) {
        prefix = [...prefix, event]
        continue
      }

      const before = replayHistory(prefix)
      const cue = derivePresentationCue(before, event)
      prefix = [...prefix, event]

      if (cue === null) continue
      if (cue === 'game-complete') {
        if (emittedGameComplete) continue
        emittedGameComplete = true
      }

      try {
        onCue(cue, event)
      } catch {
        // Presentation failure must never affect gameplay observation.
      }
    }

    watermark = history.length
  })

  return {
    detach() {
      if (detached) return
      detached = true
      unsubscribe()
    },
    get watermark() {
      return watermark
    },
  }
}
