import { exportGameDefinition } from '../export/exportGame'
import { createGameDefinition, type GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import { importGameFromJsonText } from '../import/importGame'
import type { AuthoringDraft } from '../authoring/types'
import { parseAuthoringDraftJson, serializeAuthoringDraft } from '../authoring/draftRecord'
import { systemClock } from '../time/clock'
import type { PersistenceAdapter } from './adapter'
import {
  OBJECT_STORE_SAVED_DEFINITIONS,
  SAVED_DEFINITION_RECORD_VERSION,
  SUPPORTED_SAVED_DEFINITION_RECORD_VERSIONS,
} from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface SavedDefinitionSummary {
  readonly gameId: string
  readonly title: string
  readonly savedAt: number
  readonly openedAt?: number
  readonly hasDraft: boolean
  readonly playable: boolean
}

export interface SavedDefinitionRecord extends SavedDefinitionSummary {
  readonly recordVersion: (typeof SUPPORTED_SAVED_DEFINITION_RECORD_VERSIONS)[number]
  readonly jsonText: string
  readonly authoringDraftJson?: string
}

export interface SaveDefinitionOptions {
  readonly mode: 'save' | 'replace'
  readonly registry?: RoundRegistry
  /** When replacing/saving, keep an existing authoring draft unless a new one is supplied. */
  readonly preserveDraft?: boolean
  readonly draft?: AuthoringDraft | null
}

export interface LibraryRecord {
  readonly summary: SavedDefinitionSummary
  readonly definition: GameDefinition
  readonly draft: AuthoringDraft | null
  readonly draftUnreadable: boolean
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
      parsed.push(toSummary(checked.value))
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

export function recentSavedDefinitions(
  summaries: readonly SavedDefinitionSummary[],
): readonly SavedDefinitionSummary[] {
  return [...summaries].sort((a, b) => {
    const aRecent = a.openedAt ?? a.savedAt
    const bRecent = b.openedAt ?? b.savedAt
    if (bRecent !== aRecent) return bRecent - aRecent
    return a.title.localeCompare(b.title) || a.gameId.localeCompare(b.gameId)
  })
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

  const draftJson =
    options.draft === undefined
      ? undefined
      : options.draft === null
        ? undefined
        : serializeAuthoringDraft(options.draft)

  let outcome: 'created' | 'noop' | 'replaced' | 'needs-replace' = 'created'
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const existing = await tx.get(OBJECT_STORE_SAVED_DEFINITIONS, definition.id)
    const existingRecord = existing === undefined ? null : readSavedDefinitionRecord(existing)
    if (existing !== undefined && !existingRecord?.ok) {
      throw new PersistenceDataError(existingRecord?.message ?? 'Existing saved definition is corrupt.')
    }

    const preservedDraft =
      options.draft !== undefined
        ? draftJson
        : options.preserveDraft === false
          ? undefined
          : existingRecord?.ok
            ? existingRecord.value.authoringDraftJson
            : undefined

    const record: SavedDefinitionRecord = {
      recordVersion: SAVED_DEFINITION_RECORD_VERSION,
      gameId: definition.id,
      title: definition.title,
      savedAt: systemClock.now(),
      openedAt: existingRecord?.ok ? existingRecord.value.openedAt : undefined,
      jsonText: exported.jsonText,
      authoringDraftJson: preservedDraft,
      hasDraft: typeof preservedDraft === 'string',
      playable: isPlayableJson(exported.jsonText, options.registry),
    }

    if (existing === undefined) {
      await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, definition.id, record)
      outcome = 'created'
      return
    }
    const checked = existingRecord
    if (!checked || !checked.ok) throw new PersistenceDataError('The existing saved definition record is corrupt.')
    if (
      checked.value.jsonText === record.jsonText &&
      (checked.value.authoringDraftJson ?? '') === (record.authoringDraftJson ?? '')
    ) {
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
  const loaded = await loadLibraryRecord(adapter, gameId, registry)
  if (!loaded.ok) return loaded
  return persistenceOk(loaded.value.definition)
}

export async function loadLibraryRecord(
  adapter: PersistenceAdapter,
  gameId: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<LibraryRecord>> {
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
  const hasDraftJson = typeof record.authoringDraftJson === 'string'
  const draft = hasDraftJson ? parseAuthoringDraftJson(record.authoringDraftJson) : null
  return persistenceOk({
    summary: toSummary(record),
    definition: imported.definition,
    draft,
    draftUnreadable: hasDraftJson && draft === null,
  })
}

export async function renameSavedDefinition(
  adapter: PersistenceAdapter,
  gameId: string,
  title: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<GameDefinition>> {
  const trimmed = title.trim()
  if (trimmed.length === 0) return persistenceErr('invalid', 'A game title cannot be empty.')
  const loaded = await loadLibraryRecord(adapter, gameId, registry)
  if (!loaded.ok) return loaded
  const renamed = createGameDefinition({
    id: loaded.value.definition.id,
    title: trimmed,
    rounds: loaded.value.definition.rounds,
    teams: loaded.value.definition.teams,
    timer: loaded.value.definition.timer,
  })
  const draft = loaded.value.draft
    ? {
        ...loaded.value.draft,
        game: {
          ...loaded.value.draft.game,
          title: trimmed,
          boardRoundTitle: trimmed,
        },
      }
    : null
  const saved = await saveDefinition(adapter, renamed, {
    mode: 'replace',
    registry,
    draft,
  })
  if (!saved.ok) return saved
  return persistenceOk(renamed)
}

export async function duplicateSavedDefinition(
  adapter: PersistenceAdapter,
  gameId: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<GameDefinition>> {
  const loaded = await loadLibraryRecord(adapter, gameId, registry)
  if (!loaded.ok) return loaded
  const copyTitle = `Copy of ${loaded.value.definition.title}`
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const copyId =
      attempt === 1
        ? `${loaded.value.definition.id}-copy`
        : `${loaded.value.definition.id}-copy-${attempt}`
    const copy = createGameDefinition({
      id: copyId,
      title: copyTitle,
      rounds: loaded.value.definition.rounds,
      teams: loaded.value.definition.teams,
      timer: loaded.value.definition.timer,
    })
    const draft = loaded.value.draft
      ? {
          ...loaded.value.draft,
          game: {
            ...loaded.value.draft.game,
            title: copyTitle,
            gameCanonicalId: copyId,
            gameKey: copyId,
            boardRoundTitle: copyTitle,
          },
        }
      : null
    const saved = await saveDefinition(adapter, copy, { mode: 'save', registry, draft })
    if (!saved.ok) return saved
    if (saved.value === 'created') return persistenceOk(copy)
  }
  return persistenceErr('conflict', 'Could not create another copy without replacing an existing game.')
}

export async function touchSavedDefinitionOpenedAt(
  adapter: PersistenceAdapter,
  gameId: string,
  openedAt: number = systemClock.now(),
): Promise<PersistenceResult<void>> {
  const result = await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
    const stored = await tx.get(OBJECT_STORE_SAVED_DEFINITIONS, gameId)
    if (stored === undefined) return
    const checked = readSavedDefinitionRecord(stored)
    if (!checked.ok) throw new PersistenceDataError(checked.message)
    await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, gameId, {
      ...checked.value,
      recordVersion: SAVED_DEFINITION_RECORD_VERSION,
      openedAt,
    })
  })
  return result
}

export function createStubGameDefinition(id: string, title: string): GameDefinition {
  return createGameDefinition({
    id,
    title: title.trim() || 'Untitled game',
    rounds: [],
  })
}

function isPlayableJson(jsonText: string, registry?: RoundRegistry): boolean {
  const imported = importGameFromJsonText(jsonText, { registry })
  return imported.status === 'success' && imported.definition.rounds.length > 0
}

function toSummary(record: SavedDefinitionRecord): SavedDefinitionSummary {
  return {
    gameId: record.gameId,
    title: record.title,
    savedAt: record.savedAt,
    openedAt: record.openedAt,
    hasDraft: typeof record.authoringDraftJson === 'string',
    playable: record.playable,
  }
}

function readSavedDefinitionRecord(input: unknown): PersistenceResult<SavedDefinitionRecord> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return persistenceErr('corrupt', 'Saved definition record is not an object.')
  }
  const record = input as Record<string, unknown>
  if (
    typeof record.recordVersion !== 'number' ||
    !SUPPORTED_SAVED_DEFINITION_RECORD_VERSIONS.includes(
      record.recordVersion as (typeof SUPPORTED_SAVED_DEFINITION_RECORD_VERSIONS)[number],
    )
  ) {
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
  if (record.authoringDraftJson !== undefined && typeof record.authoringDraftJson !== 'string') {
    return persistenceErr('corrupt', 'Saved definition authoring draft is invalid.')
  }
  if (record.openedAt !== undefined && (typeof record.openedAt !== 'number' || !Number.isInteger(record.openedAt))) {
    return persistenceErr('corrupt', 'Saved definition openedAt is invalid.')
  }
  const playable =
    typeof record.playable === 'boolean' ? record.playable : isPlayableJson(record.jsonText)
  return persistenceOk({
    recordVersion: record.recordVersion as SavedDefinitionRecord['recordVersion'],
    gameId: record.gameId,
    title: record.title,
    savedAt: record.savedAt,
    openedAt: typeof record.openedAt === 'number' ? record.openedAt : undefined,
    jsonText: record.jsonText,
    authoringDraftJson:
      typeof record.authoringDraftJson === 'string' ? record.authoringDraftJson : undefined,
    hasDraft: typeof record.authoringDraftJson === 'string',
    playable,
  })
}

class PersistenceDataError extends Error {}
