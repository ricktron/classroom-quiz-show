import { describe, expect, it } from 'vitest'
import { applyDraftCorrection } from '../authoring/correctDraft'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSampleGame } from '../game/sampleGame'
import { exportGameDefinition } from '../export/exportGame'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import {
  listSavedDefinitions,
  loadLibraryRecord,
  recentSavedDefinitions,
  saveDefinition,
} from '../persistence/savedDefinitions'
import {
  createNewLibraryGame,
  duplicateSavedDefinition,
  openLibraryGame,
  renameSavedDefinition,
  saveAuthoringDraftToLibrary,
} from './gameLibrary'

describe('teacher game library', () => {
  it('creates, lists, renames, and duplicates without touching a session store', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.value.draft.status).toBe('blocked')
    expect(created.value.definition.rounds).toHaveLength(0)

    const listed = await listSavedDefinitions(adapter)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value[0]?.playable).toBe(false)
    expect(listed.value[0]?.hasDraft).toBe(true)

    const renamed = await renameSavedDefinition(adapter, created.value.definition.id, 'Earth Science', registry)
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return
    expect(renamed.value.title).toBe('Earth Science')

    const copy = await duplicateSavedDefinition(adapter, created.value.definition.id, registry)
    expect(copy.ok).toBe(true)
    if (!copy.ok) return
    expect(copy.value.title).toBe('Copy of Earth Science')
    expect(copy.value.id).not.toBe(created.value.definition.id)
    const secondCopy = await duplicateSavedDefinition(adapter, created.value.definition.id, registry)
    expect(secondCopy.ok).toBe(true)
    if (!secondCopy.ok) return
    expect(secondCopy.value.id).not.toBe(copy.value.id)
    const firstCopy = await loadLibraryRecord(adapter, copy.value.id, registry)
    expect(firstCopy.ok).toBe(true)
    if (firstCopy.ok) expect(firstCopy.value.definition.title).toBe('Copy of Earth Science')

    const original = await loadLibraryRecord(adapter, created.value.definition.id, registry)
    expect(original.ok).toBe(true)
    if (original.ok) expect(original.value.definition.title).toBe('Earth Science')
  })

  it('keeps v1 compiled records readable and sorts recent by opened/saved time', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const sample = createSampleGame()
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', sample.id, {
        recordVersion: 1,
        gameId: sample.id,
        title: sample.title,
        savedAt: 10,
        jsonText: (() => {
          const exported = exportGameDefinition(sample)
          if (exported.status !== 'success') throw new Error('sample export failed')
          return exported.jsonText
        })(),
      })
    })
    const listed = await listSavedDefinitions(adapter)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value[0]?.gameId).toBe(sample.id)
    expect(listed.value[0]?.hasDraft).toBe(false)
    expect(listed.value[0]?.playable).toBe(true)

    await saveDefinition(adapter, createSampleGame(), { mode: 'save' })
    const recent = recentSavedDefinitions(listed.value)
    expect(recent[0]?.savedAt).toBeGreaterThanOrEqual(recent[recent.length - 1]?.savedAt ?? 0)
  })

  it('saves an incomplete draft without claiming it is playable, then becomes playable after content is filled', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    let draft = created.value.draft
    draft = applyDraftCorrection(draft, { kind: 'game-title', title: 'Weather' })
    const incomplete = await saveAuthoringDraftToLibrary(adapter, draft, registry)
    expect(incomplete.ok).toBe(true)
    if (!incomplete.ok) return
    expect(incomplete.value.playable).toBe(false)

    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 6 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 5 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 4 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 3 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 2 })
    while ((draft.board.categories[0]?.clues.length ?? 0) > 1) {
      draft = applyDraftCorrection(draft, {
        kind: 'remove-clue',
        categoryOrder: 1,
        clueOrder: draft.board.categories[0].clues.length,
      })
    }
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'prompt',
      value: 'What is hail?',
    })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'answer',
      value: 'Ice pellets',
    })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: 'Name a high cloud.' })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: 'Cirrus' })
    const complete = await saveAuthoringDraftToLibrary(adapter, draft, registry)
    expect(complete.ok).toBe(true)
    if (!complete.ok) return
    expect(complete.value.playable).toBe(true)
    expect(complete.value.definition.rounds.length).toBeGreaterThan(0)
  })

  it('surfaces an unreadable authoring draft instead of silently dropping it', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const gameId = created.value.definition.id
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      const stored = await tx.get('savedDefinitions', gameId)
      await tx.put('savedDefinitions', gameId, {
        ...(stored as object),
        authoringDraftJson: '{not-valid-draft',
      })
    })
    const loaded = await loadLibraryRecord(adapter, gameId, registry)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.draft).toBeNull()
    expect(loaded.value.draftUnreadable).toBe(true)
    const opened = await openLibraryGame(adapter, gameId, registry)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.value.draftUnreadable).toBe(true)
    expect(opened.value.draft.game.gameCanonicalId).toBe(gameId)
  })

  it('keeps the last playable compiled Game when an incomplete draft is saved', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    let draft = created.value.draft
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 6 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 5 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 4 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 3 })
    draft = applyDraftCorrection(draft, { kind: 'remove-category', categoryOrder: 2 })
    while ((draft.board.categories[0]?.clues.length ?? 0) > 1) {
      draft = applyDraftCorrection(draft, {
        kind: 'remove-clue',
        categoryOrder: 1,
        clueOrder: draft.board.categories[0].clues.length,
      })
    }
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'prompt',
      value: 'What is hail?',
    })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'answer',
      value: 'Ice pellets',
    })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: 'Name a high cloud.' })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: 'Cirrus' })
    const complete = await saveAuthoringDraftToLibrary(adapter, draft, registry)
    expect(complete.ok).toBe(true)
    if (!complete.ok) return
    expect(complete.value.playable).toBe(true)
    const playableRounds = complete.value.definition.rounds.length
    expect(playableRounds).toBeGreaterThan(0)

    const wiped = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'prompt',
      value: '',
    })
    const incomplete = await saveAuthoringDraftToLibrary(adapter, wiped, registry)
    expect(incomplete.ok).toBe(true)
    if (!incomplete.ok) return
    expect(incomplete.value.definition.rounds).toHaveLength(playableRounds)
    const listed = await listSavedDefinitions(adapter)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value[0]?.playable).toBe(true)
    expect(listed.value[0]?.hasDraft).toBe(true)
    const loaded = await loadLibraryRecord(adapter, created.value.definition.id, registry)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.definition.rounds).toHaveLength(playableRounds)
    expect(loaded.value.draft?.board.categories[0]?.clues[0]?.prompt).toBe('')
  })

  it('does not claim a same-id save succeeded when replace confirmation is required', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const changed = applyDraftCorrection(created.value.draft, {
      kind: 'game-title',
      title: 'Changed title',
    })
    const conflict = await saveAuthoringDraftToLibrary(adapter, changed, registry, 'save')
    expect(conflict.ok).toBe(false)
    if (conflict.ok) return
    expect(conflict.code).toBe('conflict')
  })
})
