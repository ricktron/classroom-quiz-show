/**
 * Branded identifier types for the game / round domain (Slice 3).
 *
 * A "brand" is a compile-time-only tag. At runtime these are plain strings, but
 * the type system refuses to mix a `RoundId` with a `GameId` (or with a bare
 * string), so an id of a given kind can only be produced through the small
 * constructors below. This keeps "which kind of id is this" explicit and
 * mistake-resistant with zero runtime cost — the brand property never exists at
 * runtime.
 *
 * `RoundType` is deliberately a plain branded string, NOT a closed union: an
 * authored game may reference ANY round type, including one this build does not
 * recognize. Known vs. unknown is decided at runtime by the round registry
 * (`registry.ts`) — never by narrowing this type. That is what lets an unknown
 * round type be represented and handled fail-closed instead of being impossible
 * to express.
 */

declare const brand: unique symbol

type Branded<T, B extends string> = T & { readonly [brand]: B }

/** Stable identity of an authored game. */
export type GameId = Branded<string, 'GameId'>
/** Stable identity of a round within a game. Unique per `GameDefinition`. */
export type RoundId = Branded<string, 'RoundId'>
/** A round-type identifier. May or may not be registered (see the registry). */
export type RoundType = Branded<string, 'RoundType'>
/** Runtime identity of a game session (distinct from the private session shell). */
export type GameSessionId = Branded<string, 'GameSessionId'>

function requireNonEmpty(value: string, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }
  return value
}

export function gameId(value: string): GameId {
  return requireNonEmpty(value, 'gameId') as GameId
}

export function roundId(value: string): RoundId {
  return requireNonEmpty(value, 'roundId') as RoundId
}

export function roundType(value: string): RoundType {
  return requireNonEmpty(value, 'roundType') as RoundType
}

export function gameSessionId(value: string): GameSessionId {
  return requireNonEmpty(value, 'gameSessionId') as GameSessionId
}
