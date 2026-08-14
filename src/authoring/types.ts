import type { AuthoringIssue } from './issues'
import type { WorkbookProfile } from './contract'
import { AUTHORING_DRAFT_VERSION, WORKBOOK_FORMAT_VERSION } from './contract'
import type { PromptContent } from '../game/media/definition'

export const DRAFT_STATUSES = [
  'blocked',
  'review_required',
  'ready_for_approval',
  'approved',
] as const
export type DraftStatus = (typeof DRAFT_STATUSES)[number]

export interface DraftTeam {
  readonly order: number
  readonly name: string
  readonly authoringKey: string
  readonly canonicalId: string
}

export interface DraftClue {
  readonly categoryOrder: number
  readonly categoryTitle: string
  readonly clueOrder: number
  readonly value: number
  readonly prompt: string
  readonly answer: string
  readonly alternates: readonly string[]
  readonly notes?: string
  readonly multiplier?: number
  readonly categoryCanonicalId: string
  readonly tileCanonicalId: string
  /** Preserved imported image prompt. Text editing uses `prompt` when this is absent. */
  readonly promptMedia?: PromptContent
  readonly provenance: {
    readonly sheet: string
    readonly row: number
    readonly a1Prompt: string
  }
}

export interface DraftCategory {
  readonly order: number
  readonly title: string
  readonly canonicalId: string
  readonly clues: readonly DraftClue[]
}

export interface DraftFinal {
  readonly prompt: string
  readonly answer: string
  readonly alternates: readonly string[]
  readonly notes?: string
  readonly roundTitle: string
  readonly roundCanonicalId: string
  readonly provenance: {
    readonly sheet: string
    readonly row: number
    readonly a1Prompt: string
  }
}

export interface DraftProvenance {
  readonly filename: string
  readonly workbookFormatVersion: typeof WORKBOOK_FORMAT_VERSION
  readonly profile: WorkbookProfile
  readonly detectedSheets: readonly string[]
  /** Additive origin seam. Omitted on historical workbook drafts. */
  readonly origin?: 'workbook' | 'in-app'
}

export interface AuthoringDraft {
  readonly version: typeof AUTHORING_DRAFT_VERSION
  readonly profile: WorkbookProfile
  readonly workbookFormatVersion: typeof WORKBOOK_FORMAT_VERSION
  readonly status: DraftStatus
  readonly game: {
    readonly title: string
    readonly gameKey: string
    readonly gameCanonicalId: string
    readonly responseSeconds?: number
    readonly boardRoundCanonicalId: string
    readonly boardRoundTitle: string
    readonly teams: readonly DraftTeam[]
    /**
     * Game-owned humorous team-name bank for a future S04B selection seam.
     * Not compiled into the canonical game file in S04A.
     */
    readonly teamNameBank?: readonly string[]
  }
  readonly board: {
    readonly categories: readonly DraftCategory[]
  }
  readonly final?: DraftFinal
  readonly provenance: DraftProvenance
  readonly issues: readonly AuthoringIssue[]
  /** Content fingerprint used to invalidate approval after material edits. */
  readonly contentFingerprint: string
}

export type ParseWorkbookResult =
  | { readonly status: 'success'; readonly draft: AuthoringDraft }
  | { readonly status: 'failure'; readonly issues: readonly AuthoringIssue[] }

export type CompileDraftResult =
  | {
      readonly status: 'success'
      readonly jsonText: string
      readonly document: Readonly<Record<string, unknown>>
    }
  | { readonly status: 'failure'; readonly issues: readonly AuthoringIssue[] }
