/**
 * Teacher library operations over the existing saved-definition store.
 */

import { createBlankAuthoringDraft } from '../authoring/createBlankDraft'
import { draftFromDefinition } from '../authoring/draftFromDefinition'
import { approveAndImportDraft } from '../authoring/approveAndImport'
import type { AuthoringDraft } from '../authoring/types'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import type { PersistenceAdapter } from '../persistence/adapter'
import { persistenceErr, type PersistenceResult } from '../persistence/results'
import {
  createStubGameDefinition,
  duplicateSavedDefinition,
  loadLibraryRecord,
  renameSavedDefinition,
  saveDefinition,
  touchSavedDefinitionOpenedAt,
  type LibraryRecord,
} from '../persistence/savedDefinitions'
import { systemClock } from '../time/clock'

export async function createNewLibraryGame(
  adapter: PersistenceAdapter,
  registry?: RoundRegistry,
): Promise<PersistenceResult<{ readonly definition: GameDefinition; readonly draft: AuthoringDraft }>> {
  const gameKey = `game-${systemClock.now()}`
  const draft = createBlankAuthoringDraft({ title: 'New Game', gameKey })
  const stub = createStubGameDefinition(draft.game.gameCanonicalId, draft.game.title)
  const saved = await saveDefinition(adapter, stub, { mode: 'save', registry, draft })
  if (!saved.ok) return saved
  return { ok: true, value: { definition: stub, draft } }
}

export async function saveAuthoringDraftToLibrary(
  adapter: PersistenceAdapter,
  draft: AuthoringDraft,
  registry: RoundRegistry,
  mode: 'save' | 'replace' = 'replace',
): Promise<
  PersistenceResult<{
    readonly definition: GameDefinition
    readonly playable: boolean
    readonly draft: AuthoringDraft
  }>
> {
  const approved = approveAndImportDraft(draft, { registry })
  const definition =
    approved.status === 'success'
      ? approved.importResult.definition
      : createStubGameDefinition(draft.game.gameCanonicalId, draft.game.title)
  const playable = approved.status === 'success'
  const savedDraft = approved.status === 'success' ? approved.draft : draft
  const saved = await saveDefinition(adapter, definition, {
    mode,
    registry,
    draft: savedDraft,
  })
  if (!saved.ok) return saved
  if (saved.value === 'needs-replace') {
    return persistenceErr(
      'conflict',
      'A saved game with this id already exists. Confirm replace to overwrite it.',
    )
  }
  return {
    ok: true,
    value: {
      definition,
      playable,
      draft: savedDraft,
    },
  }
}

export async function openLibraryGame(
  adapter: PersistenceAdapter,
  gameId: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<LibraryRecord & { readonly draft: AuthoringDraft }>> {
  const loaded = await loadLibraryRecord(adapter, gameId, registry)
  if (!loaded.ok) return loaded
  await touchSavedDefinitionOpenedAt(adapter, gameId)
  const draft = loaded.value.draft ?? draftFromDefinition(loaded.value.definition)
  return { ok: true, value: { ...loaded.value, draft } }
}

export { duplicateSavedDefinition, renameSavedDefinition }
