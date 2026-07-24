import { createDefaultRegistry } from '../game/defaultRegistry'
import type { RoundRegistry } from '../game/registry'
import {
  CANONICAL_GAME_FILE_FORMAT,
  MAX_IMPORT_TEXT_LENGTH,
  SUPPORTED_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
} from './canonicalFormat'
import { issue, safeLabel, type ImportIssue } from './issues'
import { normalizeToGameDefinition } from './normalize'
import { checkRegistryCompatibility } from './registryCheck'
import { importFailure, importSuccess, type ImportResult } from './result'
import { isPlainRecord, scanImportedDocument } from './safetyScan'
import { canonicalGameFileSchema, zodIssuesToImportIssues } from './schemas'
import { validateSemantics } from './semantic'

/**
 * THE canonical import pipeline (Slice 4).
 *
 * This module is the ONE trusted ingestion boundary for game definitions. Every
 * import entry point — pasted JSON, the built-in sample, a future file picker,
 * a future spreadsheet adapter, a future authoring tool — converges here. There
 * is deliberately no second validation path and no "trusted" shortcut for
 * samples or tests: an adapter may only decode its transport into text or an
 * object and then call one of the two functions below.
 *
 * ```
 * unknown input
 *   → transport decoding      (text length / emptiness guards)
 *   → JSON parsing            (JSON.parse only — never eval/Function/import)
 *   → format discrimination   (exact format identity)
 *   → version discrimination  (exact, implemented schema version)
 *   → document safety scan    (plain, finite, acyclic, safely-keyed data)
 *   → Zod validation          (strict structure, no coercion)
 *   → semantic validation     (unique ids, non-blank titles)
 *   → registry compatibility  (registered type + that type's config schema)
 *   → normalization           (branded ids, deep copy)
 *   → trusted construction    (createGameDefinition → deep-frozen)
 *   → success | structured failure
 * ```
 *
 * Nothing in this module reaches the session store, the event history, the sync
 * layer, `PublicState`, or the display. It is a pure function from input to
 * result; a failed import literally cannot mutate anything because the pipeline
 * has no reference to any of those. Loading a *successful* result is a separate,
 * explicit caller decision made through the existing `INITIALIZE_GAME` command.
 */

/** Optional sink for developer diagnostics. Never reaches a result or the UI. */
export type InternalErrorReporter = (error: unknown) => void

export interface ImportOptions {
  /**
   * Registry used to decide which round types are importable. Defaults to the
   * application's default registry. Injectable for tests only — imported
   * content can never choose, extend, or mutate it.
   */
  readonly registry?: RoundRegistry
  /**
   * Called with the raw error if the pipeline itself fails unexpectedly. The
   * returned result still carries only a safe generic issue.
   */
  readonly onInternalError?: InternalErrorReporter
}

/**
 * Import from JSON **text** — the transport adapter for pasted content, a file
 * picker, or anything else that produces a string. It performs only
 * transport-level decoding and then converges on `importGameFromUnknown`.
 */
export function importGameFromJsonText(text: unknown, options: ImportOptions = {}): ImportResult {
  try {
    if (typeof text !== 'string') {
      return importFailure([
        issue(
          'input-not-text',
          'transport',
          '',
          `Expected the game file to be JSON text, but received ${safeLabel(text)}.`,
        ),
      ])
    }
    if (text.trim().length === 0) {
      return importFailure([
        issue('empty-input', 'transport', '', 'The game file is empty. Paste or choose a game file first.'),
      ])
    }
    if (text.length > MAX_IMPORT_TEXT_LENGTH) {
      return importFailure([
        issue(
          'input-too-large',
          'transport',
          '',
          `The game file is ${text.length} characters, which is larger than the ${MAX_IMPORT_TEXT_LENGTH}-character limit.`,
          { length: text.length, limit: MAX_IMPORT_TEXT_LENGTH },
        ),
      ])
    }

    let parsed: unknown
    try {
      // JSON.parse ONLY. The pipeline never uses eval, `new Function`, dynamic
      // `import()`, or any other mechanism that could execute imported text.
      parsed = JSON.parse(text)
    } catch (error) {
      const detail = error instanceof SyntaxError ? clip(error.message, 160) : 'unparseable content'
      return importFailure([
        issue(
          'invalid-json',
          'json-parse',
          '',
          `The game file is not valid JSON: ${detail}`,
        ),
      ])
    }

    return importGameFromUnknown(parsed, options)
  } catch (error) {
    return internalFailure(error, options)
  }
}

/**
 * Import from an already-decoded value. This is the pipeline proper; it accepts
 * genuinely `unknown` input and assumes nothing about it.
 */
export function importGameFromUnknown(input: unknown, options: ImportOptions = {}): ImportResult {
  try {
    const registry = options.registry ?? createDefaultRegistry()

    // ── json-parse stage: the document root must be a plain object ──────────
    // Rejects top-level arrays, strings, numbers, booleans, null, and exotic
    // objects (Date/Map/class instances) before anything reads a field.
    if (!isPlainRecord(input)) {
      return importFailure([
        issue(
          'root-not-object',
          'json-parse',
          '',
          `A game file must be a JSON object, but the top level is ${safeLabel(input)}.`,
        ),
      ])
    }

    // ── format + version stages ────────────────────────────────────────────
    const discrimination = discriminate(input)
    if (discrimination.length > 0) return importFailure(discrimination)

    // ── semantic stage (part 1): the document is plain, safe data ──────────
    const structural = scanImportedDocument(input)
    if (structural.length > 0) return importFailure(structural)

    // ── schema stage: strict Zod validation, all issues preserved ──────────
    const parsed = canonicalGameFileSchema.safeParse(input)
    if (!parsed.success) {
      return importFailure(zodIssuesToImportIssues(parsed.error.issues, input))
    }
    const document = parsed.data

    // ── semantic stage (part 2) + registry stage ───────────────────────────
    // Both run so a teacher sees every independent problem at once.
    const contentIssues = [
      ...validateSemantics(document),
      ...checkRegistryCompatibility(document, registry),
    ]
    if (contentIssues.length > 0) return importFailure(contentIssues)

    // ── normalization + trusted construction ───────────────────────────────
    try {
      const definition = normalizeToGameDefinition(document)
      return importSuccess(definition, {
        format: CANONICAL_GAME_FILE_FORMAT,
        schemaVersion: SUPPORTED_SCHEMA_VERSION,
        gameId: definition.id,
        roundCount: definition.rounds.length,
      })
    } catch (error) {
      options.onInternalError?.(error)
      return importFailure([
        issue(
          'construction-failed',
          'construction',
          '',
          'The game file passed validation but could not be turned into a game. No game was loaded.',
        ),
      ])
    }
  } catch (error) {
    return internalFailure(error, options)
  }
}

/**
 * Format + version discrimination. Explicit and exact: a missing, malformed,
 * older, or newer version all fail. There is no shape guessing, no "best
 * effort" detection, and no silent upgrade/downgrade. Older versions could only
 * be accepted alongside a real, tested migration — none exists, so none is
 * accepted.
 *
 * Both fields are checked before returning so a document that is wrong about
 * each reports both problems.
 */
function discriminate(input: Record<string, unknown>): readonly ImportIssue[] {
  const issues: ImportIssue[] = []
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key)

  if (!has('format') || input.format === undefined) {
    issues.push(
      issue(
        'missing-format',
        'format',
        'format',
        `format is required. A game file must declare "format": ${JSON.stringify(CANONICAL_GAME_FILE_FORMAT)}.`,
      ),
    )
  } else if (input.format !== CANONICAL_GAME_FILE_FORMAT) {
    issues.push(
      issue(
        'unsupported-format',
        'format',
        'format',
        `format ${safeLabel(input.format)} is not a recognized game-file format; supported format: ${JSON.stringify(CANONICAL_GAME_FILE_FORMAT)}.`,
      ),
    )
  }

  if (!has('schemaVersion') || input.schemaVersion === undefined) {
    issues.push(
      issue(
        'missing-schema-version',
        'version',
        'schemaVersion',
        `schemaVersion is required. Supported version: ${SUPPORTED_SCHEMA_VERSION}.`,
      ),
    )
  } else if (typeof input.schemaVersion !== 'number' || !Number.isInteger(input.schemaVersion)) {
    issues.push(
      issue(
        'invalid-schema-version',
        'version',
        'schemaVersion',
        `schemaVersion must be an integer, but is ${safeLabel(input.schemaVersion)}. Supported version: ${SUPPORTED_SCHEMA_VERSION}.`,
      ),
    )
  } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(input.schemaVersion)) {
    issues.push(
      issue(
        'unsupported-schema-version',
        'version',
        'schemaVersion',
        `schemaVersion ${input.schemaVersion} is not supported; supported version: ${SUPPORTED_SCHEMA_VERSION}. No migration exists for this version.`,
        { found: input.schemaVersion, supported: SUPPORTED_SCHEMA_VERSION },
      ),
    )
  }

  return issues
}

/**
 * Contain an unexpected internal failure at the boundary: the caller gets a
 * safe generic issue, while the raw error goes only to the injected reporter
 * (developer diagnostics), never into the result, `PublicState`, or the display.
 */
function internalFailure(error: unknown, options: ImportOptions): ImportResult {
  options.onInternalError?.(error)
  return importFailure([
    issue(
      'internal-error',
      'construction',
      '',
      'The game file could not be processed because of an unexpected internal error. No game was loaded.',
    ),
  ])
}

function clip(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}
