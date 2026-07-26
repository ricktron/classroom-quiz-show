import { categoryBoardRoundType } from './categoryBoard/roundType'
import { placeholderRoundType } from './placeholderRound'
import { createRoundRegistry, type RoundRegistry } from './registry'

/**
 * The application's default registry: an empty registry with the built-in round
 * types registered by APPLICATION CODE. Registration is explicit and
 * deterministic; there are no dynamically-discovered or imported types, and
 * registration order never affects round order (that comes from the
 * `GameDefinition`).
 *
 * Two types are registered:
 *  - `placeholder` — the Slice 3 non-gameplay engine-test round. It is kept
 *    deliberately: the foundation, registry and unknown-type tests depend on a
 *    round type with no gameplay surface, and it stays the safe fallback
 *    fixture. It is not a preview of anything.
 *  - `category-board` — the first PLAYABLE round type (Slice 5).
 *
 * A fresh instance is returned each call so tests (and independent hosts) never
 * share mutable registry state.
 */
export function createDefaultRegistry(): RoundRegistry {
  const registry = createRoundRegistry()
  registry.register(placeholderRoundType)
  registry.register(categoryBoardRoundType)
  return registry
}
