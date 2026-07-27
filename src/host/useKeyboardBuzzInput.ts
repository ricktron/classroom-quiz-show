import { useCallback, useEffect, useRef } from 'react'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { RejectionReason } from '../state/reducer'
import {
  isTextEntryTarget,
  translateKeyboardInput,
  type KeyboardIgnoreReason,
} from '../input/keyboardAdapter'
import {
  translateLocalInput,
  type LocalInputTranslationRejection,
  type ResponseOpportunityTarget,
} from '../input/commandTranslation'
import type { KeyboardMapping } from '../input/keyboardMapping'
import { systemClock, type Clock } from '../time/clock'

/**
 * The keyboard buzz-in ADAPTER binding (Slice 8).
 *
 * This hook is the ONLY code in the application that touches a real
 * `KeyboardEvent`, and it is deliberately as thin as `useResponseTimerExpiry` is
 * for the clock: it listens, reads a handful of fields off the event, reads the
 * dispatch-edge clock once, and hands everything to two pure functions. It makes
 * no decision of its own and holds no game state.
 *
 * ```text
 * keydown  →  KeyboardEventFacts  →  translateKeyboardInput  →  LocalInputSignal
 *          →  translateLocalInput →  RECORD_TEAM_BUZZ        →  planner
 * ```
 *
 * Everything below the first arrow is unit-testable without a DOM, which is why
 * "typing in a text box must not buzz" and "holding a key must not buzz twice"
 * are ordinary unit tests rather than browser tests.
 *
 * ## One physical press, one buzz
 *
 * `keydown` repeats while a key is held. Two independent guards make that
 * harmless: the browser's own `event.repeat` flag, and a set of currently-held
 * codes maintained here and cleared on `keyup` (and on window blur, so a key
 * held while the host alt-tabs away does not stay "held" forever).
 *
 * ## Listener placement and preventDefault
 *
 * The listener is on `window` in the BUBBLE phase, not capture: an input, a
 * button or a dialog that wants a key gets it first, and buzzing never competes
 * with ordinary operation of the page. `preventDefault` is called ONLY for a key
 * that actually produced an accepted buzz — an unmapped or ignored press keeps
 * every default behaviour it had, so nothing about normal browser use changes.
 */

/** What happened to one press, end to end. Host-only diagnostics. */
export type KeyboardBuzzOutcome =
  | { readonly kind: 'accepted'; readonly teamId: string }
  | { readonly kind: 'ignored'; readonly reason: KeyboardIgnoreReason }
  | { readonly kind: 'untranslated'; readonly reason: LocalInputTranslationRejection }
  | { readonly kind: 'refused'; readonly reason: RejectionReason }

export interface UseKeyboardBuzzInputOptions {
  /** Whether the host has keyboard buzzing switched on. */
  readonly enabled: boolean
  /** True while the mapping editor is capturing a key — buzzing is suspended. */
  readonly capturing: boolean
  readonly mapping: KeyboardMapping
  /** The live response opportunity, or `null` when no clue is open. */
  readonly target: ResponseOpportunityTarget | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  /** Injectable clock — the dispatch edge (ADR-007 §1). */
  readonly clock?: Clock
  /** Told about every press, so the host can explain a buzz that did nothing. */
  readonly onOutcome?: (outcome: KeyboardBuzzOutcome) => void
}

export function useKeyboardBuzzInput({
  enabled,
  capturing,
  mapping,
  target,
  dispatch,
  clock = systemClock,
  onOutcome,
}: UseKeyboardBuzzInputOptions): void {
  const heldCodes = useRef<Set<string>>(new Set())

  // Everything the listener reads is held in a ref so the listener itself can be
  // registered once and never re-registered as game state changes. Re-attaching a
  // window listener on every store update would be a real source of dropped
  // presses during exactly the moment a class is buzzing.
  const latest = useRef({ enabled, capturing, mapping, target, dispatch, clock, onOutcome })
  latest.current = { enabled, capturing, mapping, target, dispatch, clock, onOutcome }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const current = latest.current
    const translation = translateKeyboardInput(
      {
        code: event.code,
        repeat: event.repeat,
        isComposing: event.isComposing,
        withModifier: event.ctrlKey || event.altKey || event.metaKey,
        inTextEntry: isTextEntryTarget(describeTarget(event.target)),
      },
      current.mapping,
      {
        enabled: current.enabled,
        capturing: current.capturing,
        heldCodes: heldCodes.current,
      },
      // The ONE clock read on this path, at the dispatch edge. It becomes the
      // command's `issuedAt` and then the event's `occurredAt` — arrival
      // evidence, never the ordering authority.
      current.clock.now(),
    )

    if (translation.status === 'ignored') {
      current.onOutcome?.({ kind: 'ignored', reason: translation.reason })
      return
    }

    // Held-tracking is updated for any press that reached the mapping, so a key
    // held down through a disarm/arm cycle still counts as one press.
    heldCodes.current.add(event.code)

    const command = translateLocalInput(translation.signal, current.target)
    if (command.status === 'rejected') {
      current.onOutcome?.({ kind: 'untranslated', reason: command.reason })
      return
    }

    const result = current.dispatch(command.command)
    if (result.status === 'rejected') {
      current.onOutcome?.({ kind: 'refused', reason: result.reason })
      return
    }
    // Only a press that actually did something suppresses its default. A digit
    // key does nothing by default anyway; a letter bound as a buzz key would
    // otherwise reach a browser quick-find, and that is worth suppressing once
    // the buzz has been accepted — and only then.
    event.preventDefault()
    current.onOutcome?.({ kind: 'accepted', teamId: translation.signal.teamId })
  }, [])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    heldCodes.current.delete(event.code)
  }, [])

  const handleBlur = useCallback(() => {
    // A key held while focus leaves the window never produces a `keyup` here, so
    // it would stay "held" forever and that team could never buzz again.
    heldCodes.current.clear()
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleKeyDown, handleKeyUp, handleBlur])
}

/**
 * Read the four structural facts the adapter needs from an event target.
 *
 * Kept here, beside the only place a DOM event exists, so the pure adapter never
 * sees an `EventTarget`.
 */
function describeTarget(target: EventTarget | null): {
  tagName: string
  isContentEditable: boolean
  inDialog: boolean
  optedOut: boolean
} {
  if (!(target instanceof HTMLElement)) {
    return { tagName: '', isContentEditable: false, inDialog: false, optedOut: false }
  }
  return {
    tagName: target.tagName,
    isContentEditable: target.isContentEditable,
    inDialog: target.closest('dialog') !== null,
    optedOut: target.closest('[data-no-buzz-keys]') !== null,
  }
}
