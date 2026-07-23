import { roundId, roundType, type RoundId, type RoundType } from './ids'

/**
 * Typed round-definition model (Slice 3).
 *
 * A `RoundDefinition` is authored, portable **data**. The base shape here makes
 * NO gameplay assumptions — no categories, point values, teams, timers, wagers,
 * scoring, text-only content, or answer-reveal mechanics. Those belong to the
 * type-specific `config` of a *particular* round type and to that type's engine
 * in a later slice, never to this base.
 *
 * Ordering is owned by `GameDefinition` (array position), never by registry
 * discovery order — see ADR-003.
 */

/**
 * The closed set of JSON-like, NON-EXECUTABLE values. Round `config` is
 * constrained to this shape, so the type system rejects a function (or any
 * non-serializable value) anywhere inside a config. This is the compile-time
 * half of the permanent "content is data, never code" invariant
 * (GAME-ENGINE-BOUNDARIES §5); a runtime scan backs it in the tests.
 */
export type DataValue =
  | string
  | number
  | boolean
  | null
  | readonly DataValue[]
  | { readonly [key: string]: DataValue }

/** Type-specific round configuration — always plain data, never code. */
export type RoundConfig = { readonly [key: string]: DataValue }

/**
 * A single round in a game. `type` is a branded string that may or may not be
 * registered; the registry (not this type) decides whether it is supported.
 * `config` travels with the round and is interpreted only by that type's engine.
 */
export interface RoundDefinition {
  readonly id: RoundId
  readonly type: RoundType
  readonly title: string
  readonly config: RoundConfig
}

/** The one built-in, deliberately NON-GAMEPLAY round type used to prove the model. */
export const PLACEHOLDER_ROUND_TYPE: RoundType = roundType('placeholder')

/**
 * Config for the built-in placeholder round. It is intentionally minimal and
 * carries NO gameplay meaning (no prompts, answers, categories, points, teams,
 * or timers). `note` is a host-only descriptive string used purely to prove that
 * type-specific config travels with a round; it is never projected to the
 * display. The explicit index signature keeps it assignable to `RoundConfig`
 * (and therefore provably data-only).
 */
export interface PlaceholderRoundConfig {
  readonly [key: string]: DataValue
  /** Host-only marker. Diagnostics only — never shown on the projector. */
  readonly note: string
}

/**
 * Structural guard used at trust boundaries (game-definition validation and
 * reducer event application). It checks shape only — it does NOT decide whether
 * the `type` is registered.
 */
export function isRoundDefinition(value: unknown): value is RoundDefinition {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.type === 'string' &&
    v.type.length > 0 &&
    typeof v.title === 'string' &&
    typeof v.config === 'object' &&
    v.config !== null
  )
}

/** Convenience builder for a placeholder round (samples and tests). */
export function placeholderRound(
  id: string,
  title: string,
  note = 'placeholder round — engine plumbing only, not gameplay',
): RoundDefinition {
  return {
    id: roundId(id),
    type: PLACEHOLDER_ROUND_TYPE,
    title,
    config: { note } satisfies PlaceholderRoundConfig,
  }
}
