import { describe, expect, it } from 'vitest'
import { createBlankAuthoringDraft } from './createBlankDraft'
import { applyDraftCorrection } from './correctDraft'
import {
  AUTHORING_UNDO_LIMIT,
  canRedoAuthoring,
  canUndoAuthoring,
  emptyAuthoringUndoStack,
  pushAuthoringUndo,
  redoAuthoring,
  undoAuthoring,
} from './undoStack'

describe('authoring undo stack', () => {
  it('undoes and redoes recent draft edits', () => {
    const original = createBlankAuthoringDraft({ title: 'Earth', gameKey: 'earth' })
    const edited = applyDraftCorrection(original, { kind: 'game-title', title: 'Earth Science' })
    const stacked = pushAuthoringUndo(emptyAuthoringUndoStack(), original)
    const undone = undoAuthoring(stacked, edited)
    expect(undone?.draft.game.title).toBe('Earth')
    expect(canRedoAuthoring(undone!.stack)).toBe(true)
    const redone = redoAuthoring(undone!.stack, undone!.draft)
    expect(redone?.draft.game.title).toBe('Earth Science')
  })

  it('does nothing when empty', () => {
    const draft = createBlankAuthoringDraft({ title: 'A', gameKey: 'a' })
    expect(undoAuthoring(emptyAuthoringUndoStack(), draft)).toBeNull()
    expect(redoAuthoring(emptyAuthoringUndoStack(), draft)).toBeNull()
    expect(canUndoAuthoring(emptyAuthoringUndoStack())).toBe(false)
  })

  it('bounds history and clears redo after a new edit', () => {
    let stack = emptyAuthoringUndoStack()
    let current = createBlankAuthoringDraft({ title: 'G0', gameKey: 'g0' })
    for (let i = 1; i <= AUTHORING_UNDO_LIMIT + 5; i += 1) {
      const next = applyDraftCorrection(current, { kind: 'game-title', title: `G${i}` })
      stack = pushAuthoringUndo(stack, current)
      current = next
    }
    expect(stack.past).toHaveLength(AUTHORING_UNDO_LIMIT)
    const undone = undoAuthoring(stack, current)
    const afterNewEdit = pushAuthoringUndo(undone!.stack, undone!.draft)
    expect(canRedoAuthoring(afterNewEdit)).toBe(false)
  })
})
