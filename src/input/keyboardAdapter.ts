import { resolveKeyboardBinding, type KeyboardMapping } from './keyboardMapping'
import type { LocalInputSignal } from './localInput'

/**
 * The keyboard ADAPTER (Slice 8) — raw browser input → logical action.
 *
 * This module is the outermost layer of the local-input boundary and the last
 * place that knows a keyboard exists. Everything it emits is a
 * {@link LocalInputSignal}: a team, a logical action and arrival evidence. No key
 * code, no browser event and no mapping table travels any further.
 *
 * ## Pure, and therefore testable
 *
 * `translateKeyboardInput` is a pure function of facts + mapping + gate. It does
 * not touch the DOM, does not read a clock, and does not dispatch. The React hook
 * (`src/host/useKeyboardBuzzInput.ts`) is the ONLY code that touches a real
 * `KeyboardEvent`: it reads the handful of fields below off the event, reads the
 * clock once at the dispatch edge (ADR-007 §1), and calls this.
 *
 * That split is what makes "typing in a text box must not buzz" and "holding a
 * key must not buzz twice" ordinary unit tests instead of browser tests.
 *
 * ## Every reason a press is ignored is TYPED
 *
 * A press that does nothing must be explainable — a teacher whose buzzers seem
 * dead needs to be told why. The reasons are a bounded union, and the host panel
 * renders the most recent one.
 */

/**
 * The only facts the adapter takes from a browser `KeyboardEvent`.
 *
 * Deliberately a plain data shape rather than the event itself: the domain never
 * receives a `KeyboardEvent`, and a test never has to fabricate one.
 */
export interface KeyboardEventFacts {
  /** `KeyboardEvent.code` — the physical key position. See `keyboardKeys.ts`. */
  readonly code: string
  /** `KeyboardEvent.repeat` — true for OS auto-repeat while a key is held. */
  readonly repeat: boolean
  /** `KeyboardEvent.isComposing` — true mid-IME composition. */
  readonly isComposing: boolean
  /** Any of Ctrl / Alt / Meta held. A chord is never a buzz. */
  readonly withModifier: boolean
  /** Whether the event target is a text field, editable region or dialog. */
  readonly inTextEntry: boolean
}

/** Why a press produced no action. Bounded and typed. */
export const KEYBOARD_IGNORE_REASONS = [
  'input-disabled',
  'capture-mode',
  'key-repeat',
  'key-held',
  'composing',
  'modifier-chord',
  'text-entry',
  'unmapped-key',
] as const

export type KeyboardIgnoreReason = (typeof KEYBOARD_IGNORE_REASONS)[number]

/** Host-facing explanation of an ignore reason. Host-only copy — never projected. */
export const KEYBOARD_IGNORE_MESSAGE: Readonly<Record<KeyboardIgnoreReason, string>> = {
  'input-disabled': 'Keyboard buzzing is switched off.',
  'capture-mode': 'That press was ignored because a buzz key is being reassigned.',
  'key-repeat': 'Holding a key down does not buzz again.',
  'key-held': 'That key is still held down — release it before buzzing again.',
  composing: 'That press was part of text composition, so it did not buzz.',
  'modifier-chord': 'Buzz keys are pressed on their own, without Ctrl, Alt or ⌘.',
  'text-entry': 'Buzz keys are ignored while you are typing.',
  'unmapped-key': 'That key is not assigned to a team.',
}

export type KeyboardTranslation =
  | { readonly status: 'action'; readonly signal: LocalInputSignal }
  | { readonly status: 'ignored'; readonly reason: KeyboardIgnoreReason }

/** State the adapter needs beyond the event itself. */
export interface KeyboardAdapterGate {
  /** Whether the host has keyboard input switched on at all. */
  readonly enabled: boolean
  /** True while the mapping editor is capturing a key — game buzzing is suspended. */
  readonly capturing: boolean
  /** Codes currently held down, so one physical press yields one signal. */
  readonly heldCodes: ReadonlySet<string>
}

/**
 * Translate one key press into a logical action, or explain why not.
 *
 * The order of the checks is deliberate: the cheapest and most absolute gates run
 * first, and the mapping lookup runs last, so an ignored press never even
 * consults the mapping. Every gate here is about the INPUT EDGE — whether this
 * press is a genuine, intentional, first-time buzz press. Whether the game will
 * *accept* it (armed? legal phase? duplicate team?) is not decided here at all;
 * that is the planner's job, and keeping the two apart is what stops input
 * policy and game policy from drifting into each other.
 */
export function translateKeyboardInput(
  facts: KeyboardEventFacts,
  mapping: KeyboardMapping,
  gate: KeyboardAdapterGate,
  observedAt: number,
): KeyboardTranslation {
  if (!gate.enabled) return { status: 'ignored', reason: 'input-disabled' }
  // Capture mode suspends game buzzing entirely, so pressing a key to ASSIGN it
  // can never also fire it. Checked before everything else for that reason.
  if (gate.capturing) return { status: 'ignored', reason: 'capture-mode' }
  // Typing wins over buzzing, always: a host filling in a form field must not
  // have their keystrokes stolen, and accessibility depends on it.
  if (facts.inTextEntry) return { status: 'ignored', reason: 'text-entry' }
  if (facts.isComposing) return { status: 'ignored', reason: 'composing' }
  if (facts.repeat) return { status: 'ignored', reason: 'key-repeat' }
  // A second guard beside `repeat`: `keydown` fires repeatedly while a key is
  // held, and not every browser sets `repeat` on every platform. Held-code
  // tracking makes "one physical press, one buzz" hold either way.
  if (gate.heldCodes.has(facts.code)) return { status: 'ignored', reason: 'key-held' }
  if (facts.withModifier) return { status: 'ignored', reason: 'modifier-chord' }

  const binding = resolveKeyboardBinding(mapping, facts.code)
  if (binding === null) return { status: 'ignored', reason: 'unmapped-key' }

  return {
    status: 'action',
    signal: {
      source: 'keyboard',
      action: binding.action,
      teamId: binding.teamId,
      observedAt,
    },
  }
}

/**
 * Does this DOM element mean "the user is typing"?
 *
 * Exported so the hook and its tests share one definition. It covers inputs,
 * textareas, selects, `contenteditable` regions and anything inside an open
 * `<dialog>`, plus elements that have opted out with `data-no-buzz-keys`.
 *
 * It takes the minimal structural shape rather than `Element` so it can be
 * unit-tested without a DOM.
 */
export interface KeyEventTargetFacts {
  readonly tagName: string
  readonly isContentEditable: boolean
  readonly inDialog: boolean
  readonly optedOut: boolean
}

const TEXT_ENTRY_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'])

/**
 * `BUTTON` is deliberately NOT in that set, and the reason is a classroom one.
 *
 * A teacher operates this app by clicking, and a clicked button keeps focus. If a
 * focused button counted as "typing", then buzzing would be dead for the rest of
 * the lesson from the moment the teacher clicked anything — silently, with no
 * indication of why. That is a far worse failure than the one it would prevent.
 *
 * Nothing is lost by excluding it: Space, Enter and NumpadEnter are the keys that
 * activate a focused button, and all three are RESERVED
 * (`keyboardKeys.ts`), so no buzz key can ever collide with button activation in
 * the first place. Tab and Escape are reserved for the same reason.
 */
export function isTextEntryTarget(target: KeyEventTargetFacts): boolean {
  if (target.optedOut) return true
  if (target.inDialog) return true
  if (target.isContentEditable) return true
  return TEXT_ENTRY_TAGS.has(target.tagName.toUpperCase())
}
