import type { GameDefinition } from '../game/gameDefinition'
import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from './canonicalFormat'
import { sortIssues, type ImportIssue } from './issues'

/**
 * The explicit import result type (Slice 4).
 *
 * Ordinary invalid input is NEVER signalled by throwing — it is a `failure`
 * result carrying structured issues. Because the union is discriminated on
 * `status`, TypeScript forces every caller to handle both outcomes before it
 * can reach `definition`; there is no way to obtain a `GameDefinition` from a
 * failed import.
 */

/** Safe, host-only facts about a successful import. Never projected. */
export interface ImportMetadata {
  /** The canonical format identity that was accepted. */
  readonly format: typeof CANONICAL_GAME_FILE_FORMAT
  /** The schema version that was accepted. */
  readonly schemaVersion: typeof SUPPORTED_SCHEMA_VERSION
  /** The imported (supplied, validated) game id. */
  readonly gameId: string
  /** Number of rounds in the imported game. */
  readonly roundCount: number
}

export interface ImportSuccess {
  readonly status: 'success'
  /** A trusted, deep-frozen definition built by the Slice 3 factory. */
  readonly definition: GameDefinition
  readonly metadata: ImportMetadata
}

export interface ImportFailure {
  readonly status: 'failure'
  /** One or more issues, in deterministic report order. Never empty. */
  readonly issues: readonly ImportIssue[]
}

export type ImportResult = ImportSuccess | ImportFailure

export function importSuccess(
  definition: GameDefinition,
  metadata: ImportMetadata,
): ImportSuccess {
  return { status: 'success', definition, metadata }
}

/**
 * Build a failure result. Issues are sorted deterministically here so every
 * producer in the pipeline gets the same ordering guarantee for free.
 */
export function importFailure(issues: readonly ImportIssue[]): ImportFailure {
  return { status: 'failure', issues: sortIssues(issues) }
}
