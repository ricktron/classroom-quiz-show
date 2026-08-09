/**
 * Explicit teacher approval → compile → importGameFromJsonText.
 *
 * This is the only path from authoring draft to trusted GameDefinition.
 */

import { importGameFromJsonText } from '../import/importGame'
import type { ImportResult } from '../import/result'
import type { RoundRegistry } from '../game/registry'
import { compileApprovedDraft } from './compileDraft'
import { authoringIssue, type AuthoringIssue } from './issues'
import { revalidateDraft } from './validateDraft'
import type { AuthoringDraft } from './types'

export type ApproveAndImportResult =
  | {
      readonly status: 'success'
      readonly draft: AuthoringDraft
      readonly jsonText: string
      readonly importResult: Extract<ImportResult, { status: 'success' }>
    }
  | {
      readonly status: 'failure'
      readonly draft: AuthoringDraft
      readonly issues: readonly AuthoringIssue[]
      readonly importResult?: Extract<ImportResult, { status: 'failure' }>
    }

export function markDraftApproved(draft: AuthoringDraft): AuthoringDraft {
  const fresh = revalidateDraft(draft)
  if (fresh.status === 'blocked') return fresh
  return { ...fresh, status: 'approved' }
}

export function approveAndImportDraft(
  draft: AuthoringDraft,
  options: { readonly registry: RoundRegistry },
): ApproveAndImportResult {
  const approved = markDraftApproved(draft)
  if (approved.status === 'blocked') {
    return {
      status: 'failure',
      draft: approved,
      issues: approved.issues.filter((i) => i.severity === 'blocker'),
    }
  }

  const compiled = compileApprovedDraft(approved)
  if (compiled.status === 'failure') {
    return { status: 'failure', draft: approved, issues: compiled.issues }
  }

  const imported = importGameFromJsonText(compiled.jsonText, { registry: options.registry })
  if (imported.status !== 'success') {
    const mapped = imported.issues.map((issue) =>
      authoringIssue(
        'canonical-import-failed',
        'blocker',
        'canonical',
        issue.message,
        {
          canonicalPath: issue.path,
          canonicalCode: issue.code,
        },
      ),
    )
    return {
      status: 'failure',
      draft: { ...approved, status: 'blocked', issues: [...approved.issues, ...mapped] },
      issues: mapped,
      importResult: imported,
    }
  }

  return {
    status: 'success',
    draft: approved,
    jsonText: compiled.jsonText,
    importResult: imported,
  }
}
