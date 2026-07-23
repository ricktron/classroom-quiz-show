import type { RoundId, RoundType } from './ids'
import type { RoundDefinition } from './roundDefinition'

/**
 * Round registry scaffold (Slice 3).
 *
 * The registry associates a KNOWN round-type identifier with the typed behavior
 * and metadata later slices will need. It is a small, application-controlled,
 * deterministic table — NOT a plugin system.
 *
 * Permanent invariants (GAME-ENGINE-BOUNDARIES §3, §5 — enforced by tests):
 *  - It NEVER executes imported code, dynamically imports modules from game
 *    files, accepts function bodies from content, evals strings, or loads remote
 *    plugins. Entries are registered only by application code via `register`.
 *  - It is NOT the source of round ordering (that is `GameDefinition`).
 *  - Lookups are EXPLICIT known/unknown — there is no silent fallback from an
 *    unknown type to a default playable type.
 *  - Duplicate registration fails clearly and safely.
 */

/**
 * Minimal per-round runtime state. Slice 3 models NO gameplay state — this is
 * just enough to prove the registry's `createInitialState` / public-projection
 * seam that real round engines will fill in later.
 */
export interface RoundRuntimeState {
  readonly roundId: RoundId
  readonly type: RoundType
}

/**
 * Display-safe projection of a round's runtime state. Neutral by construction:
 * it exposes availability only — never ids, type identifiers, titles, or config.
 */
export interface PublicRoundView {
  readonly availability: 'available'
}

/**
 * A registered round type: its identity, a host-only diagnostic display name, a
 * definition compatibility check, initial-runtime-state creation, and a public
 * projection. All fields are typed references/behavior defined by application
 * code — none are ever sourced from imported content.
 */
export interface RoundTypeEntry {
  readonly type: RoundType
  /** Human-readable name for HOST diagnostics only. Never projected. */
  readonly displayName: string
  /** Does this definition match this entry's type (and expected config shape)? */
  readonly matches: (definition: RoundDefinition) => boolean
  /** Build the initial runtime state for a round of this type. */
  readonly createInitialState: (definition: RoundDefinition) => RoundRuntimeState
  /** Project runtime state to a display-safe view. */
  readonly toPublicRoundView: (state: RoundRuntimeState) => PublicRoundView
}

/** An explicit, discriminated lookup result — never a thrown miss or a fallback. */
export type RoundTypeLookup =
  | { readonly status: 'known'; readonly entry: RoundTypeEntry }
  | { readonly status: 'unknown'; readonly type: RoundType }

/** Thrown on a duplicate registration (a programming error, surfaced clearly). */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegistryError'
  }
}

export interface RoundRegistry {
  /** Register a round type. Throws `RegistryError` on a duplicate type. */
  register(entry: RoundTypeEntry): void
  /** Explicit known/unknown lookup. Never falls back to a default type. */
  lookup(type: RoundType): RoundTypeLookup
  /** Whether `type` is registered. */
  isKnown(type: RoundType): boolean
  /** The registered types, for host diagnostics. Order is registration order. */
  knownTypes(): readonly RoundType[]
}

/**
 * Create an empty registry. Registration is explicit and application-controlled;
 * the registry has no I/O, no dynamic import, and no eval — it is a typed map.
 */
export function createRoundRegistry(): RoundRegistry {
  const entries = new Map<string, RoundTypeEntry>()

  return {
    register(entry) {
      if (entries.has(entry.type)) {
        throw new RegistryError(`round type already registered: ${entry.type}`)
      }
      entries.set(entry.type, entry)
    },
    lookup(type) {
      const entry = entries.get(type)
      return entry ? { status: 'known', entry } : { status: 'unknown', type }
    },
    isKnown(type) {
      return entries.has(type)
    },
    knownTypes() {
      return [...entries.keys()] as RoundType[]
    },
  }
}
