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
import type { PersistenceResult } from '../persistence/results'
import {
  createStubGameDefinition,
  duplicateSavedDefinition,
  loadLibraryRecord,
  renameSavedDefinition,
  saveDefinition,
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
  if (approved.status === 'success') {
    const saved = await saveDefinition(adapter, approved.importResult.definition, {
      mode,
      registry,
      draft: approved.draft,
    })
    if (!saved.ok) return saved
    return {
      ok: true,
      value: {
        definition: approved.importResult.definition,
        playable: true,
        draft: approved.draft,
      },
    }
  }

  const stub = createStubGameDefinition(draft.game.gameCanonicalId, draft.game.title)
  const saved = await saveDefinition(adapter, stub, { mode, registry, draft })
  if (!saved.ok) return saved
  return { ok: true, value: { definition: stub, playable: false, draft } }
}

export async function openLibraryGame(
  adapter: PersistenceAdapter,
  gameId: string,
  registry?: RoundRegistry,
): Promise<PersistenceResult<LibraryRecord & { readonly draft: AuthoringDraft }>> {
  const loaded = await loadLibraryRecord(adapter, gameId, registry)
  if (!loaded.ok) return loaded
  const draft = loaded.value.draft ?? draftFromDefinition(loaded.value.definition)
  return { ok: true, value: { ...loaded.value, draft } }
}

export { duplicateSavedDefinition, renameSavedDefinition }
