import type { GameDefinition } from '../game/gameDefinition'
import type { SniffedMediaType } from '../pack/mediaSniff'
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
} from './constants'
import type { BackupIssue } from './issues'

/** One library game inside a backup (portable Game content + optional draft). */
export interface BackupGameEntry {
  readonly gameId: string
  readonly title: string
  readonly savedAt: number
  readonly openedAt?: number
  readonly playable: boolean
  /** Exact canonical game JSON text — revalidated via importGameFromJsonText. */
  readonly jsonText: string
  /** Optional authoring draft JSON; absent when none. */
  readonly authoringDraftJson?: string
}

/** One pack-media asset inside a backup. */
export interface BackupMediaEntry {
  readonly resourceScopeKey: string
  readonly gameId: string
  readonly gameSha256: string
  readonly sourcePath: string
  readonly byteLength: number
  readonly sha256: string
  readonly mediaType: SniffedMediaType
  /** Standard base64 of raw bytes (no data: URL prefix). */
  readonly bytesBase64: string
}

/** Strict backup document (schemaVersion 1). */
export interface BackupDocumentV1 {
  readonly format: typeof BACKUP_FORMAT
  readonly schemaVersion: typeof BACKUP_SCHEMA_VERSION
  readonly exportedAt: number
  /** Informational only — never trusted for acceptance authority. */
  readonly appVersion: string
  readonly games: readonly BackupGameEntry[]
  readonly packMedia: readonly BackupMediaEntry[]
}

export type BackupBuildResult =
  | {
      readonly status: 'success'
      readonly document: BackupDocumentV1
      readonly jsonText: string
      readonly filename: string
      readonly metadata: {
        readonly gameCount: number
        readonly mediaCount: number
        readonly characterCount: number
      }
    }
  | { readonly status: 'failure'; readonly issues: readonly BackupIssue[] }

export interface BackupGamePreview {
  readonly gameId: string
  readonly title: string
  readonly disposition: 'new' | 'replace'
  readonly existingTitle?: string
  readonly definition: GameDefinition
  readonly hasDraft: boolean
  readonly draftReadable: boolean
}

export interface BackupMediaPreview {
  readonly resourceScopeKey: string
  readonly gameId: string
  readonly sourcePath: string
  readonly byteLength: number
  readonly mediaType: SniffedMediaType
  readonly bytes: Uint8Array
  readonly sha256: string
  readonly gameSha256: string
}

/** Staged, validated backup ready for preview / confirmed apply. */
export interface StagedBackup {
  readonly document: BackupDocumentV1
  readonly games: readonly BackupGamePreview[]
  readonly media: readonly BackupMediaPreview[]
  readonly conflictCount: number
  readonly newCount: number
}

export type BackupParseResult =
  | { readonly status: 'success'; readonly staged: StagedBackup }
  | { readonly status: 'failure'; readonly issues: readonly BackupIssue[] }

export type BackupApplyResult =
  | {
      readonly status: 'success'
      readonly appliedGameCount: number
      readonly appliedMediaCount: number
      readonly replacedGameCount: number
    }
  | { readonly status: 'failure'; readonly issues: readonly BackupIssue[] }
