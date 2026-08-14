import { describe, expect, it } from 'vitest'
import { applyDraftCorrection } from './correctDraft'
import { createBlankAuthoringDraft } from './createBlankDraft'
import { approveAndImportDraft } from './approveAndImport'
import { createDefaultRegistry } from '../game/defaultRegistry'

describe('createBlankAuthoringDraft', () => {
  it('creates a board-plus-final draft with visible incomplete state', () => {
    const draft = createBlankAuthoringDraft({ title: 'Earth', gameKey: 'earth' })
    expect(draft.profile).toBe('board-plus-final')
    expect(draft.board.categories).toHaveLength(6)
    expect(draft.board.categories[0].clues).toHaveLength(5)
    expect(draft.final).toBeDefined()
    expect(draft.status).toBe('blocked')
    expect(draft.issues.some((issue) => issue.code === 'incomplete-clue')).toBe(true)
    expect(draft.provenance.origin).toBe('in-app')
    expect(draft.game.teamNameBank).toEqual([])
  })

  it('becomes compilable after every tile and Final are filled', () => {
    let draft = createBlankAuthoringDraft({
      title: 'Earth',
      gameKey: 'earth',
      categoryCount: 1,
      cluesPerCategory: 1,
      teamCount: 2,
    })
    draft = applyDraftCorrection(draft, { kind: 'category-title', categoryOrder: 1, title: 'Rocks' })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'prompt',
      value: 'What is granite?',
    })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'answer',
      value: 'Igneous rock',
    })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: 'Name the densest layer.' })
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: 'Inner core' })
    expect(draft.status).toBe('ready_for_approval')
    const imported = approveAndImportDraft(draft, { registry: createDefaultRegistry() })
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(imported.importResult.definition.rounds).toHaveLength(2)
    expect(imported.importResult.definition.title).toBe('Earth')
  })
})
