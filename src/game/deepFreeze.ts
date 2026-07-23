/**
 * Recursively freeze an object graph in place and return it.
 *
 * Used so a `GameDefinition` becomes immutable the moment it is created: once
 * frozen, neither application code nor a `GameSession` can mutate the authored
 * definition or any nested round/config (see ADR-003 — "definition cannot be
 * mutated through session operations"). Freezing is shallow-per-level but
 * applied to every level, including arrays.
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
    Object.freeze(value)
  }
  return value
}
