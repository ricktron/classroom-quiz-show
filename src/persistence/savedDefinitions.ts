import { exportGameDefinition } from '../export/exportGame'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import { importGameFromJsonText } from '../import/importGame'
import { systemClock } from '../time/clock'
import type { PersistenceAdapter } from './adapter'
import {
  OBJECT_STORE_SAVED_DEFINITIONS,
  SAVED_DEFINITION_RECORD_VERSION,
} from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface SavedDefinitionSummary {
  readonly gameId: string
  readonly title: string
  readonly savedAt: number
}

export interface SavedDefinitionRecord extends SavedDefinitionSummary {
  readonly recordVersion: typeof SAVED_DEFINITION_RECORD_VERSION
  readonly jsonText: string
}

export interface SaveDefinitionOptions {
  readonly mode: 'save' | 'replace'
  readonly registry?: RoundRegistry
}

export async function listSavedDefinitions(
  adapter: PersistenceAdapter,
): Promise<PersistenceResult<readonly SavedDefinitionSummary[]>> {
  let summaries: SavedDefinitionSummary[] = []
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const records = await tx.getAll(OBJECT_STORE_SAVED_DEFINITIONS)
    const parsed: SavedDefinitionSummary[] = []
    for (const record of records) {
      const checked = readSavedDefinitionRecord(record)
      if (!checked.ok) throw new PersistenceDataError(checked.message)
      parsed.push({
        gameId: checked.value.gameId,
        title: checked.value.title,
        savedAt: checked.value.savedAt,
      })
    }
    parsed.sort((a, b) => a.title.localeCompare(b.title) || a.gameId.localeCompare(b.gameId))
    summaries = parsed
  })
  if (!result.ok) {
    return result.code === 'transaction-failed'
      ? persistenceErr('corrupt', 'A saved definition record is corrupt.')
      : result
  }
  return persistenceOk(summaries)
}

export async function saveDefinition(
  adapter: PersistenceAdapter,
  definition: GameDefinition,
  options: SaveDefinitionOptions,
): Promise<PersistenceResult<'created' | 'noop' | 'replaced' | 'needs-replace'>> {
  const exported = exportGameDefinition(definition, { registry: options.registry })
  if (exported.status !== 'success') {
    return persistenceErr('invalid', 'The game definition cannot be exported for persistence.')
  }

  const record: SavedDefinitionRecord = {
    recordVersion: SAVED_DEFINITION_RECORD_VERSION,
    gameId: definition.id,
    title: definition.title,
    savedAt: systemClock.now(),
    jsonText: exported.jsonText,
  }

  let outcome: 'created' | 'noop' | 'replaced' | 'needs-replace' = 'created'
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const existing = await tx.get(OBJECT_STORE_SAVED_DEFINITIONS, definition.id)
    if (existing === undefined) {
      await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, definition.id, record)
      outcome = 'created'
      return
    }
    const checked = readSavedDefinitionRecord(existing)
    if (!checked.ok) throw new PersistenceDataError(checked.message)
    if (checked.value.jsonText === record.jsonText) {
      outcome = 'noop'
      return
    }
    if (options.mode !== 'replace') {
      outcome = 'needs-replace'
      return
    }
    await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, definition.id, record)
    outcome = 'replaced'
  })

  if (!result.ok) {
    return result.code === 'transaction-failed'
      ? persistenceErr('corrupt', 'The existing saved definition record is corrupt.')
      : result
  }
  return persistenceOk(outcome)
}

export async function deleteDefinition(
  adapter: PersistenceAdapter,
  gameId: string,
): Promise<PersistenceResult<void>> {
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    await tx.delete(OBJECT_STORE_SAVED_DEFINITIONS, gameId)
  })
  return result
}

export async function loadDefinition(
  adapter: PersistenceAdapter,
  gameId: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<GameDefinition>> {
  const loaded: { record?: SavedDefinitionRecord } = {}
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const stored = await tx.get(OBJECT_STORE_SAVED_DEFINITIONS, gameId)
    if (stored === undefined) return
    const checked = readSavedDefinitionRecord(stored)
    if (!checked.ok) throw new PersistenceDataError(checked.message)
    loaded.record = checked.value
  })
  if (!result.ok) {
    return result.code === 'transaction-failed'
      ? persistenceErr('corrupt', 'The saved definition record is corrupt.')
      : result
  }
  const record = loaded.record
  if (record === undefined) return persistenceErr('not-found', 'No saved definition exists for that game id.')

  const imported = importGameFromJsonText(record.jsonText, { registry })
  if (imported.status !== 'success') {
    return persistenceErr('corrupt', 'The saved definition JSON failed canonical import.')
  }
  return persistenceOk(imported.definition)
}

function readSavedDefinitionRecord(input: unknown): PersistenceResult<SavedDefinitionRecord> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return persistenceErr('corrupt', 'Saved definition record is not an object.')
  }
  const record = input as Record<string, unknown>
  if (record.recordVersion !== SAVED_DEFINITION_RECORD_VERSION) {
    return persistenceErr('unsupported-version', 'Saved definition record version is unsupported.')
  }
  if (typeof record.gameId !== 'string' || record.gameId.length === 0) {
    return persistenceErr('corrupt', 'Saved definition gameId is invalid.')
  }
  if (typeof record.title !== 'string' || record.title.length === 0) {
    return persistenceErr('corrupt', 'Saved definition title is invalid.')
  }
  if (typeof record.savedAt !== 'number' || !Number.isInteger(record.savedAt) || record.savedAt < 0) {
    return persistenceErr('corrupt', 'Saved definition savedAt is invalid.')
  }
  if (typeof record.jsonText !== 'string' || record.jsonText.length === 0) {
    return persistenceErr('corrupt', 'Saved definition jsonText is invalid.')
  }
  return persistenceOk({
    recordVersion: SAVED_DEFINITION_RECORD_VERSION,
    gameId: record.gameId,
    title: record.title,
    savedAt: record.savedAt,
    jsonText: record.jsonText,
  })
}

class PersistenceDataError extends Error {}
