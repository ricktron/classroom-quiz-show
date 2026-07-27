import type { GamepadSnapshot } from './gamepadSource'
import {
  resolveGamepadBinding,
  type GamepadControlRef,
  type GamepadMapping,
} from './gamepadMapping'
import type { LocalInputSignal } from './localInput'

/**
 * The generic Gamepad ADAPTER (Slice 9) — polled button state → logical action.
 *
 * The outermost layer of the local-input boundary on the Gamepad side, and the
 * last place that knows a controller exists. Everything it emits is a
 * {@link LocalInputSignal}: a team, a logical action and arrival evidence. No
 * controller index, no button index, no snapshot and no mapping travels further.
 *
 * ## Pure, and therefore testable
 *
 * Both functions here are pure. They do not touch `navigator`, do not schedule
 * anything, do not read a clock and do not dispatch. The React hook
 * (`src/host/useGamepadBuzzInput.ts`) owns the polling loop, reads the
 * dispatch-edge clock once per edge, and calls these.
 *
 * That split is what makes "a button held while the controller is plugged in must
 * not buzz" an ordinary unit test with a fake source, rather than something that
 * needs a human and a physical controller.
 *
 * ## The whole problem: a keyboard has events, a controller does not
 *
 * `keydown` fires once when a key goes down. The Gamepad API has no press event
 * at all — it has POLLED STATE, and a held button reads `pressed: true` on every
 * frame forever. So the adapter has to manufacture the edge itself, and it must
 * do so in a way that cannot invent one.
 *
 * **Rising edge, and a first sighting is a baseline only:**
 *
 * | previous | current | result |
 * | --- | --- | --- |
 * | not pressed | pressed | **one** input |
 * | pressed | pressed | nothing — a held button never repeats |
 * | pressed | not pressed | nothing, and that control is rearmed |
 * | not pressed | not pressed | nothing |
 * | *no previous observation* | anything | **nothing** — baseline only |
 *
 * The last row is the load-bearing one. A controller whose button is ALREADY held
 * when it first becomes visible must not buzz, and the first sighting of a
 * controller is exactly the moment a connect, a reconnect, an enable, a mapping
 * change, a tab becoming visible again or a window regaining focus produces. All
 * of those re-prime the baseline (the hook drops it), so all of them are the same
 * case, handled once, here. A release followed by a fresh press is required.
 *
 * ## Deterministic ordering within one poll
 *
 * One poll can see several fresh edges at once — genuinely simultaneous presses,
 * or two presses inside one frame. The order they are processed in is fixed and
 * documented rather than left to object-iteration accident:
 *
 * 1. ascending controller index, then
 * 2. ascending button index.
 *
 * This is a TIE-BREAK RULE, not a fairness claim. Nothing here can distinguish
 * which of two presses within a frame happened first, and this slice does not
 * pretend otherwise (ADR-009 §5). The authoritative accepted order remains the
 * event log's monotonic `seq`, exactly as ADR-008 §"Tie handling" fixed it; the
 * `observedAt` stamp is evidence and is never the tiebreaker.
 */

/**
 * The previous observation, per controller.
 *
 * Keyed by browser controller index; the value is that controller's pressed
 * states as of the last poll. A controller with no entry has NOT been observed
 * yet and can only produce a baseline.
 */
export interface GamepadBaseline {
  readonly pressedByController: ReadonlyMap<number, readonly boolean[]>
}

/** The empty baseline: nothing observed yet. Every control needs a fresh press. */
export const EMPTY_GAMEPAD_BASELINE: GamepadBaseline = Object.freeze({
  pressedByController: new Map<number, readonly boolean[]>(),
})

export interface GamepadEdgeScan {
  /** The baseline to carry into the next poll. */
  readonly baseline: GamepadBaseline
  /** Fresh rising edges, in the documented deterministic order. */
  readonly edges: readonly GamepadControlRef[]
}

/**
 * Compare one poll against the previous observation and produce rising edges.
 *
 * PURE. `previous` of `null` means "re-prime": the snapshot becomes the baseline
 * and NOTHING is emitted, which is how every connect/enable/mapping/visibility
 * transition is made structurally unable to fabricate a press.
 *
 * Three cases inside a poll, all fail-closed:
 *
 * - **a controller not in `previous`** — newly visible. Baseline only, no edges.
 *   This covers a first connect, a reconnect at the same index, and a reconnect
 *   at a different index identically, without the adapter needing to tell them
 *   apart.
 * - **a controller whose button count changed** — the snapshot is not comparable
 *   with the previous one, so it is re-baselined rather than compared
 *   position-by-position against a different-shaped list. A controller that
 *   silently changes shape is a defect, not a press.
 * - **a controller in `previous` but not in the snapshot** — disconnected or
 *   gone between polls. Its observation is DROPPED from the new baseline and no
 *   edge is produced, so a disconnect emits nothing and a later reconnect starts
 *   from a fresh baseline.
 */
export function scanGamepadEdges(
  previous: GamepadBaseline | null,
  snapshot: GamepadSnapshot,
): GamepadEdgeScan {
  const nextPressed = new Map<number, readonly boolean[]>()
  const edges: GamepadControlRef[] = []

  // The snapshot is already ordered by ascending controller index, and buttons
  // are read in ascending index order below, so `edges` comes out in exactly the
  // documented order without a sort.
  for (const controller of snapshot.controllers) {
    const current = controller.pressed
    nextPressed.set(controller.controllerIndex, current)

    if (previous === null) continue
    const before = previous.pressedByController.get(controller.controllerIndex)
    if (before === undefined) continue
    if (before.length !== current.length) continue

    for (let buttonIndex = 0; buttonIndex < current.length; buttonIndex += 1) {
      if (current[buttonIndex] === true && before[buttonIndex] !== true) {
        edges.push({ controllerIndex: controller.controllerIndex, buttonIndex })
      }
    }
  }

  return { baseline: { pressedByController: nextPressed }, edges }
}

/** Why a fresh edge produced no action. Bounded and typed. */
export const GAMEPAD_IGNORE_REASONS = [
  'input-disabled',
  'capture-mode',
  'unmapped-button',
] as const

export type GamepadIgnoreReason = (typeof GAMEPAD_IGNORE_REASONS)[number]

/** Host-facing explanation of an ignore reason. Host-only copy — never projected. */
export const GAMEPAD_IGNORE_MESSAGE: Readonly<Record<GamepadIgnoreReason, string>> = {
  'input-disabled': 'Controller buzzing is switched off.',
  'capture-mode': 'That press was ignored because a button is being assigned.',
  'unmapped-button': 'That button is not assigned to a team.',
}

export type GamepadTranslation =
  | { readonly status: 'action'; readonly signal: LocalInputSignal }
  | { readonly status: 'ignored'; readonly reason: GamepadIgnoreReason }

/** State the adapter needs beyond the edge itself. */
export interface GamepadAdapterGate {
  /** Whether the host has controller input switched on at all. */
  readonly enabled: boolean
  /** True while the mapping editor is capturing a button — buzzing is suspended. */
  readonly capturing: boolean
}

/**
 * Translate one fresh rising edge into a logical action, or explain why not.
 *
 * The check order matches the keyboard adapter's, for the same reason: the
 * absolute gates run first and the mapping lookup runs last, so an ignored edge
 * never consults the mapping. Every gate here is about the INPUT EDGE. Whether
 * the game will *accept* the resulting command (armed? legal phase? duplicate
 * team?) is the planner's decision and is not duplicated here — one authority per
 * question.
 *
 * A control bound to an absent controller or an absent button is not a special
 * case: it simply never produces an edge, so it never reaches this function.
 */
export function translateGamepadEdge(
  control: GamepadControlRef,
  mapping: GamepadMapping,
  gate: GamepadAdapterGate,
  observedAt: number,
): GamepadTranslation {
  if (!gate.enabled) return { status: 'ignored', reason: 'input-disabled' }
  // Capture mode suspends game buzzing entirely, so pressing a button to ASSIGN
  // it can never also fire it. Checked before the mapping for that reason.
  if (gate.capturing) return { status: 'ignored', reason: 'capture-mode' }

  const binding = resolveGamepadBinding(mapping, control)
  if (binding === null) return { status: 'ignored', reason: 'unmapped-button' }

  return {
    status: 'action',
    signal: {
      source: 'gamepad',
      action: binding.action,
      teamId: binding.teamId,
      observedAt,
    },
  }
}
