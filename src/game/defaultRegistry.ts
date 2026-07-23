import { placeholderRoundType } from './placeholderRound'
import { createRoundRegistry, type RoundRegistry } from './registry'

/**
 * The application's default registry for Slice 3: an empty registry with the one
 * built-in placeholder round type registered. Registration is explicit and
 * deterministic; there are no dynamically-discovered or imported types.
 *
 * A fresh instance is returned each call so tests (and independent hosts) never
 * share mutable registry state.
 */
export function createDefaultRegistry(): RoundRegistry {
  const registry = createRoundRegistry()
  registry.register(placeholderRoundType)
  return registry
}
