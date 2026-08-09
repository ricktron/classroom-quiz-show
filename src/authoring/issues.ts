/**
 * Located authoring diagnostics for Slice 20 workbook → draft flow.
 */

export const AUTHORING_ISSUE_SEVERITIES = ['blocker', 'warning'] as const
export type AuthoringIssueSeverity = (typeof AUTHORING_ISSUE_SEVERITIES)[number]

export const AUTHORING_ISSUE_FAMILIES = [
  'transport',
  'workbook',
  'cell',
  'draft',
  'canonical',
] as const
export type AuthoringIssueFamily = (typeof AUTHORING_ISSUE_FAMILIES)[number]

export type AuthoringIssueCode =
  | 'unsupported-file-type'
  | 'workbook-too-large'
  | 'malformed-xlsx'
  | 'resource-limit-exceeded'
  | 'parser-failure'
  | 'active-content-rejected'
  | 'unsupported-workbook-version'
  | 'unsupported-profile'
  | 'missing-sheet'
  | 'duplicate-sheet'
  | 'unknown-sheet-policy'
  | 'missing-header'
  | 'duplicate-header'
  | 'unsupported-header'
  | 'malformed-metadata'
  | 'missing-metadata'
  | 'metadata-contradiction'
  | 'required-value-missing'
  | 'invalid-type'
  | 'formula-not-allowed'
  | 'excel-error-cell'
  | 'numeric-out-of-range'
  | 'duplicate-authoring-identity'
  | 'invalid-ordering'
  | 'invalid-timer'
  | 'hidden-semantic-content'
  | 'unsupported-media-field'
  | 'incomplete-clue'
  | 'blocking-structural-state'
  | 'review-warning'
  | 'canonical-import-failed'
  | 'identity-normalization-failed'
  | 'control-characters'
  | 'whitespace-only'

export interface AuthoringIssue {
  readonly code: AuthoringIssueCode
  readonly severity: AuthoringIssueSeverity
  readonly family: AuthoringIssueFamily
  readonly message: string
  readonly sheet?: string
  readonly row?: number
  readonly column?: string
  readonly a1?: string
  readonly field?: string
  readonly draftPath?: string
  readonly canonicalPath?: string
  readonly canonicalCode?: string
}

export function authoringIssue(
  code: AuthoringIssueCode,
  severity: AuthoringIssueSeverity,
  family: AuthoringIssueFamily,
  message: string,
  location: Omit<AuthoringIssue, 'code' | 'severity' | 'family' | 'message'> = {},
): AuthoringIssue {
  return { code, severity, family, message, ...location }
}

export function columnLetter(index0: number): string {
  let n = index0 + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export function toA1(columnIndex0: number, row1: number): string {
  return `${columnLetter(columnIndex0)}${row1}`
}
