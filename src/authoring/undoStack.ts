/**
 * Bounded in-app authoring undo/redo.
 *
 * Snapshots the existing AuthoringDraft. This is not a general command bus.
 */

import type { AuthoringDraft } from './types'

export const AUTHORING_UNDO_LIMIT = 50

export interface AuthoringUndoStack {
  readonly past: readonly AuthoringDraft[]
  readonly future: readonly AuthoringDraft[]
}

export function emptyAuthoringUndoStack(): AuthoringUndoStack {
  return { past: [], future: [] }
}

export function pushAuthoringUndo(
  stack: AuthoringUndoStack,
  previous: AuthoringDraft,
): AuthoringUndoStack {
  const past = [...stack.past, previous]
  const trimmed =
    past.length > AUTHORING_UNDO_LIMIT ? past.slice(past.length - AUTHORING_UNDO_LIMIT) : past
  return { past: trimmed, future: [] }
}

export function undoAuthoring(
  stack: AuthoringUndoStack,
  current: AuthoringDraft,
): { readonly stack: AuthoringUndoStack; readonly draft: AuthoringDraft } | null {
  if (stack.past.length === 0) return null
  const previous = stack.past[stack.past.length - 1]
  return {
    draft: previous,
    stack: {
      past: stack.past.slice(0, -1),
      future: [current, ...stack.future],
    },
  }
}

export function redoAuthoring(
  stack: AuthoringUndoStack,
  current: AuthoringDraft,
): { readonly stack: AuthoringUndoStack; readonly draft: AuthoringDraft } | null {
  if (stack.future.length === 0) return null
  const next = stack.future[0]
  return {
    draft: next,
    stack: {
      past: [...stack.past, current],
      future: stack.future.slice(1),
    },
  }
}

export function canUndoAuthoring(stack: AuthoringUndoStack): boolean {
  return stack.past.length > 0
}

export function canRedoAuthoring(stack: AuthoringUndoStack): boolean {
  return stack.future.length > 0
}
