import type { GameDefinition } from '../game/gameDefinition'
import type { DataValue } from '../game/roundDefinition'

/**
 * Deterministic media inventory from a trusted GameDefinition (Slice 19).
 *
 * Collects same-origin-path image prompts only. Dedupes by source path and
 * sorts by sourcePath. Different paths with identical bytes remain distinct.
 */

export interface PackMediaInventoryEntry {
  readonly sourcePath: string
}

function collectImageSourcePaths(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectImageSourcePaths(item, out)
    return
  }
  if (value === null || typeof value !== 'object') return

  const record = value as Record<string, unknown>
  if (
    record.kind === 'image' &&
    typeof record.source === 'object' &&
    record.source !== null &&
    !Array.isArray(record.source)
  ) {
    const source = record.source as Record<string, unknown>
    if (source.kind === 'same-origin-path' && typeof source.path === 'string') {
      out.add(source.path)
    }
  }

  for (const nested of Object.values(record)) {
    collectImageSourcePaths(nested, out)
  }
}

export function inventoryPackMedia(definition: GameDefinition): readonly PackMediaInventoryEntry[] {
  const paths = new Set<string>()
  for (const round of definition.rounds) {
    collectImageSourcePaths(round.config as DataValue, paths)
  }
  return [...paths]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((sourcePath) => ({ sourcePath }))
}

export function inventorySourcePaths(definition: GameDefinition): readonly string[] {
  return inventoryPackMedia(definition).map((entry) => entry.sourcePath)
}
