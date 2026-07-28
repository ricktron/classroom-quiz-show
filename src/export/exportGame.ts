/**
 * Portable game-definition export (Slice 12).
 *
 * Source of truth: the immutable authored `GameDefinition` only. Runtime session
 * state is never represented. The exporter builds a canonical
 * `classroom-quiz-show/game` version-1 document, serializes deterministic
 * compact JSON with one trailing LF, re-imports through the existing
 * `importGameFromJsonText` pipeline, and succeeds only when the re-imported
 * definition is structurally equal and a second export is byte-identical.
 */

import {
  CANONICAL_GAME_FILE_FORMAT,
  MAX_IMPORT_TEXT_LENGTH,
  SUPPORTED_SCHEMA_VERSION,
} from '../import/canonicalFormat'
import { importGameFromJsonText } from '../import/importGame'
import type { CanonicalGameFile } from '../import/schemas'
import {
  GAME_DEFINITION_MODEL_VERSION,
  isGameDefinition,
  type GameDefinition,
} from '../game/gameDefinition'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { RoundRegistry } from '../game/registry'
import type { DataValue } from '../game/roundDefinition'
import type { TeamDefinition } from '../game/teams/definition'
import { CanonicalizeError, canonicalizeData } from './canonicalizeData'

export interface ExportGameOptions {
  readonly registry?: RoundRegistry
  readonly onInternalError?: (error: unknown) => void
}

export type ExportIssueCode =
  | 'invalid-definition'
  | 'unsupported-model-version'
  | 'unexportable-data'
  | 'output-too-large'
  | 'round-trip-import-failed'
  | 'round-trip-mismatch'
  | 'serialization-failed'

export interface ExportIssue {
  readonly code: ExportIssueCode
  readonly path: string
  readonly message: string
}

export type ExportResult =
  | {
      readonly status: 'success'
      readonly document: CanonicalGameFile
      readonly jsonText: string
      readonly filename: string
      readonly metadata: {
        readonly gameId: string
        readonly roundCount: number
        readonly teamCount: number
        readonly characterCount: number
        readonly hasMediaReferences: boolean
      }
    }
  | {
      readonly status: 'failure'
      readonly issues: readonly ExportIssue[]
    }

/**
 * Export a trusted `GameDefinition` to deterministic portable JSON text.
 *
 * Fail-closed: no partial document, no silent repair, no download side effects.
 */
export function exportGameDefinition(
  definition: unknown,
  options: ExportGameOptions = {},
): ExportResult {
  try {
    if (!isGameDefinition(definition)) {
      return failure([
        issue(
          'invalid-definition',
          '',
          'Export requires a trusted GameDefinition. The supplied value is not a valid definition.',
        ),
      ])
    }

    if (definition.modelVersion !== GAME_DEFINITION_MODEL_VERSION) {
      return failure([
        issue(
          'unsupported-model-version',
          'modelVersion',
          `modelVersion ${definition.modelVersion} is not supported for export; supported version: ${GAME_DEFINITION_MODEL_VERSION}.`,
        ),
      ])
    }

    const registry = options.registry ?? createDefaultRegistry()
    let document: CanonicalGameFile
    try {
      document = buildCanonicalDocument(definition)
    } catch (error) {
      if (error instanceof CanonicalizeError) {
        return failure([
          issue(
            'unexportable-data',
            error.path,
            error.message,
          ),
        ])
      }
      throw error
    }

    let jsonText: string
    try {
      jsonText = JSON.stringify(document) + '\n'
    } catch (error) {
      options.onInternalError?.(error)
      return failure([
        issue(
          'serialization-failed',
          '',
          'The game definition could not be serialized to portable JSON.',
        ),
      ])
    }

    if (jsonText.length > MAX_IMPORT_TEXT_LENGTH) {
      return failure([
        issue(
          'output-too-large',
          '',
          `Exported game file is ${jsonText.length} characters, which exceeds the ${MAX_IMPORT_TEXT_LENGTH}-character import limit.`,
        ),
      ])
    }

    const imported = importGameFromJsonText(jsonText, {
      registry,
      onInternalError: options.onInternalError,
    })
    if (imported.status !== 'success') {
      const detail = imported.issues[0]
      return failure([
        issue(
          'round-trip-import-failed',
          detail?.path ?? '',
          detail
            ? `Re-import of the exported file failed: ${detail.message}`
            : 'Re-import of the exported file failed.',
        ),
      ])
    }

    if (!definitionsStructurallyEqual(definition, imported.definition)) {
      return failure([
        issue(
          'round-trip-mismatch',
          '',
          'Re-imported definition is not structurally equal to the source definition.',
        ),
      ])
    }

    const second = exportWithoutRoundTrip(imported.definition)
    if (second.status !== 'success' || second.jsonText !== jsonText) {
      return failure([
        issue(
          'round-trip-mismatch',
          '',
          'Re-export of the re-imported definition is not byte-identical to the first export.',
        ),
      ])
    }

    const filename = `${definition.id}.classroom-quiz-show.json`
    return {
      status: 'success',
      document,
      jsonText,
      filename,
      metadata: {
        gameId: definition.id,
        roundCount: definition.rounds.length,
        teamCount: definition.teams.length,
        characterCount: jsonText.length,
        hasMediaReferences: hasMediaReferences(definition),
      },
    }
  } catch (error) {
    options.onInternalError?.(error)
    return failure([
      issue(
        'serialization-failed',
        '',
        'The game definition could not be exported because of an unexpected internal error.',
      ),
    ])
  }
}

/**
 * Build and serialize without the re-import gate. Used only to prove the second
 * export of a re-imported definition is byte-identical — never as a public API.
 */
function exportWithoutRoundTrip(
  definition: GameDefinition,
): ExportResult {
  try {
    const document = buildCanonicalDocument(definition)
    const jsonText = JSON.stringify(document) + '\n'
    if (jsonText.length > MAX_IMPORT_TEXT_LENGTH) {
      return failure([
        issue(
          'output-too-large',
          '',
          `Exported game file is ${jsonText.length} characters, which exceeds the ${MAX_IMPORT_TEXT_LENGTH}-character import limit.`,
        ),
      ])
    }
    return {
      status: 'success',
      document,
      jsonText,
      filename: `${definition.id}.classroom-quiz-show.json`,
      metadata: {
        gameId: definition.id,
        roundCount: definition.rounds.length,
        teamCount: definition.teams.length,
        characterCount: jsonText.length,
        hasMediaReferences: hasMediaReferences(definition),
      },
    }
  } catch (error) {
    if (error instanceof CanonicalizeError) {
      return failure([issue('unexportable-data', error.path, error.message)])
    }
    return failure([
      issue('serialization-failed', '', 'Second export serialization failed.'),
    ])
  }
}

function buildCanonicalDocument(definition: GameDefinition): CanonicalGameFile {
  // Fresh object with exact root field insertion order.
  const document: Record<string, unknown> = {}
  document.format = CANONICAL_GAME_FILE_FORMAT
  document.schemaVersion = SUPPORTED_SCHEMA_VERSION
  document.id = definition.id
  document.title = definition.title

  if (definition.teams.length > 0) {
    document.teams = definition.teams.map((team) => exportTeam(team))
  }

  document.timer = exportTimer(definition.timer.responseSeconds)
  document.rounds = definition.rounds.map((round, index) => {
    const exported: Record<string, unknown> = {}
    exported.id = round.id
    exported.type = round.type
    exported.title = round.title
    exported.config = canonicalizeData(round.config, `rounds[${index}].config`)
    return exported
  })

  return document as CanonicalGameFile
}

function exportTeam(team: TeamDefinition): Record<string, unknown> {
  const exported: Record<string, unknown> = {}
  exported.id = team.id
  exported.name = team.name
  // Always emit the trusted accent, including defaults — never emit `order`.
  exported.accent = team.accent
  return exported
}

function exportTimer(responseSeconds: number): Record<string, unknown> {
  const timer: Record<string, unknown> = {}
  timer.responseSeconds = responseSeconds
  return timer
}

function definitionsStructurallyEqual(a: GameDefinition, b: GameDefinition): boolean {
  if (a.modelVersion !== b.modelVersion) return false
  if (a.id !== b.id) return false
  if (a.title !== b.title) return false
  if (a.timer.responseSeconds !== b.timer.responseSeconds) return false
  if (a.teams.length !== b.teams.length) return false
  for (let i = 0; i < a.teams.length; i += 1) {
    const left = a.teams[i]!
    const right = b.teams[i]!
    if (left.id !== right.id || left.name !== right.name || left.accent !== right.accent) {
      return false
    }
  }
  if (a.rounds.length !== b.rounds.length) return false
  for (let i = 0; i < a.rounds.length; i += 1) {
    const left = a.rounds[i]!
    const right = b.rounds[i]!
    if (left.id !== right.id || left.type !== right.type || left.title !== right.title) {
      return false
    }
    if (!dataValuesEqual(left.config as DataValue, right.config as DataValue)) {
      return false
    }
  }
  return true
}

function dataValuesEqual(a: DataValue, b: DataValue): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (typeof a === 'number' && typeof b === 'number') {
    // Spec: numbers compare with ===, so -0 and 0 are equivalent.
    return a === b
  }

  if (typeof a !== 'object' || typeof b !== 'object') return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!dataValuesEqual(a[i] as DataValue, b[i] as DataValue)) return false
    }
    return true
  }

  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i += 1) {
    if (aKeys[i] !== bKeys[i]) return false
  }
  for (const key of aKeys) {
    const left = (a as Record<string, DataValue>)[key]
    const right = (b as Record<string, DataValue>)[key]
    if (left === undefined || right === undefined) return false
    if (!dataValuesEqual(left, right)) return false
  }
  return true
}

function hasMediaReferences(definition: GameDefinition): boolean {
  return definition.rounds.some((round) => containsImagePrompt(round.config))
}

function containsImagePrompt(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsImagePrompt)
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (
    record.kind === 'image' &&
    typeof record.source === 'object' &&
    record.source !== null &&
    !Array.isArray(record.source)
  ) {
    return true
  }
  return Object.values(record).some(containsImagePrompt)
}

function issue(code: ExportIssueCode, path: string, message: string): ExportIssue {
  return { code, path, message }
}

function failure(issues: readonly ExportIssue[]): ExportResult {
  return { status: 'failure', issues }
}
