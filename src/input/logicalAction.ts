/**
 * The LOGICAL local-input action vocabulary (Slice 8).
 *
 * This is the narrow waist of the local-input boundary required by
 * `ROADMAP-AMENDMENT-001` §5.6. Everything below it is device-shaped (a browser
 * `KeyboardEvent`, a key code, one day a gamepad button index); everything above
 * it is game-shaped (a command, an event, replayed state). A logical action is
 * the ONLY thing that crosses, and it deliberately says what the press MEANS,
 * never what was pressed.
 *
 * ## Why a bounded union rather than a string
 *
 * Same reason `ScoreSource` (ADR-006 §10) and `ResponseInterruptionSource`
 * (ADR-007 §5) are unions: the value has to stay explainable months later, an
 * unrecognized member must fail closed rather than be guessed at, and a future
 * action must be an ADDITION here rather than a new parallel input path.
 *
 * ## Primary versus secondary
 *
 * - `primary-buzz` is the one action with a real consumer in Slice 8: a team is
 *   claiming the right to answer the live clue.
 * - `secondary` carries a bounded ORDINAL slot (`1`…`4`). It exists so a later
 *   slice can map extra controller buttons — the coloured buttons on a Sony
 *   Buzz! handset are the motivating example — WITHOUT the contract having to be
 *   re-cut when it happens.
 *
 * **Slice 8 implements no secondary behaviour at all.** A secondary action is
 * representable, mappable and typed, and the command translator rejects it with
 * a typed reason (`unsupported-local-input-action`). That is deliberate: ADR-004's
 * "never a speculative entry" rule and the amendment's "no speculative contract
 * without its first consumer" rule both say a durable gameplay event may not be
 * invented before something authorizes it. Slice 10 supplies the recommended Sony
 * profile; whichever slice first needs a secondary action supplies its consumer.
 *
 * ## What may never appear here
 *
 * No colour name (`red`, `blue`, `orange`, `green`, `yellow`), no device model,
 * no vendor or product identifier, no button index, no handset number, no key
 * code. Slots are ORDINAL, not chromatic, precisely so the engine cannot acquire
 * a Sony vocabulary by accident.
 */

/** Every logical action kind, as a bounded list. */
export const LOCAL_INPUT_ACTION_KINDS = ['primary-buzz', 'secondary'] as const

export type LocalInputActionKind = (typeof LOCAL_INPUT_ACTION_KINDS)[number]

/**
 * Bounded ordinal slots for future secondary actions.
 *
 * Four is not a Sony fact — it is the smallest number that covers the
 * "a handset has a few extra buttons" case without becoming an open-ended list.
 * A slot has NO gameplay meaning in this slice and is not named after a colour.
 */
export const SECONDARY_ACTION_SLOTS = [
  'secondary1',
  'secondary2',
  'secondary3',
  'secondary4',
] as const

export type SecondaryActionSlot = (typeof SECONDARY_ACTION_SLOTS)[number]

/**
 * One logical action. Exhaustively discriminated by `kind`.
 *
 * `primary-buzz` carries no payload on purpose: WHICH team pressed is not a
 * property of the action, it is a property of the mapping that produced it (see
 * `localInput.ts`). Keeping them apart is what lets one action vocabulary serve
 * a keyboard, a gamepad and anything later.
 */
export type LocalInputAction =
  | { readonly kind: 'primary-buzz' }
  | { readonly kind: 'secondary'; readonly slot: SecondaryActionSlot }

/** The one action with a consumer in Slice 8. Frozen so it cannot be mutated. */
export const PRIMARY_BUZZ: LocalInputAction = Object.freeze({ kind: 'primary-buzz' })

const SECONDARY_SLOT_SET: ReadonlySet<string> = new Set(SECONDARY_ACTION_SLOTS)

/** Structural guard for a secondary slot. */
export function isSecondaryActionSlot(value: unknown): value is SecondaryActionSlot {
  return typeof value === 'string' && SECONDARY_SLOT_SET.has(value)
}

/**
 * Structural guard for a logical action. Fails closed on anything unrecognized,
 * so a hand-written or persisted mapping cannot smuggle an unknown action into
 * the translator.
 */
export function isLocalInputAction(value: unknown): value is LocalInputAction {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind === 'primary-buzz') return v.slot === undefined
  if (v.kind === 'secondary') return isSecondaryActionSlot(v.slot)
  return false
}

/** Is this the primary buzz action? The only action Slice 8 can translate. */
export function isPrimaryBuzz(action: LocalInputAction): boolean {
  return action.kind === 'primary-buzz'
}

/**
 * Host-facing label for a logical action. HOST-ONLY copy — it is never projected
 * and never enters an event. Deliberately colour-free.
 */
export const LOCAL_INPUT_ACTION_LABEL: Readonly<Record<LocalInputActionKind, string>> = {
  'primary-buzz': 'Buzz',
  secondary: 'Secondary action',
}

/** Host-facing label for one ordinal secondary slot. Host-only copy. */
export function secondaryActionLabel(slot: SecondaryActionSlot): string {
  return `Secondary action ${slot.slice('secondary'.length)}`
}
