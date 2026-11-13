/**
 * What the editor may truthfully say about a draft's readiness to play.
 *
 * Readiness is the answer of the one real path from draft to Game (explicit
 * approval, compile, canonical import: `approveAndImportDraft`), run as a pure
 * dry run. It is deliberately not a second validator: the editor can therefore
 * never call a draft playable that the canonical import boundary refuses.
 *
 * A draft that is not ready is still saveable. Saveable and playable are
 * different claims.
 */

import type { RoundRegistry } from '../game/registry'
import { approveAndImportDraft } from './approveAndImport'
import type { AuthoringIssue } from './issues'
import type { AuthoringDraft } from './types'

export type FinalMissingPart = 'question' | 'answer'

export type AuthoringReadiness =
  /** Approves, compiles, and passes canonical import as it stands. */
  | { readonly kind: 'playable' }
  /** Draft blockers remain, and they are not only missing Final content. */
  | { readonly kind: 'incomplete' }
  /** The only remaining blockers are the missing Final question and/or answer. */
  | { readonly kind: 'final-incomplete'; readonly missing: readonly FinalMissingPart[] }
  /** No draft blocker, but compile or canonical import refuses the draft. */
  | { readonly kind: 'refused'; readonly issues: readonly AuthoringIssue[] }

function finalMissingPart(issue: AuthoringIssue): FinalMissingPart | null {
  if (issue.family !== 'draft' || issue.code !== 'required-value-missing') return null
  if (issue.draftPath === 'final.prompt') return 'question'
  if (issue.draftPath === 'final.answer') return 'answer'
  return null
}

export function assessAuthoringReadiness(
  draft: AuthoringDraft,
  options: { readonly registry: RoundRegistry },
): AuthoringReadiness {
  const attempt = approveAndImportDraft(draft, options)
  if (attempt.status === 'success') return { kind: 'playable' }

  // Refused before compilation: the draft's own blockers.
  if (attempt.importResult === undefined && attempt.draft.status === 'blocked') {
    const parts = attempt.issues.map(finalMissingPart)
    if (parts.length > 0 && parts.every((part) => part !== null)) {
      return { kind: 'final-incomplete', missing: parts as FinalMissingPart[] }
    }
    return { kind: 'incomplete' }
  }

  return { kind: 'refused', issues: attempt.issues }
}
