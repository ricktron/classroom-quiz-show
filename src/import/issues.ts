/**
 * The structured import error model (Slice 4).
 *
 * Import failures are DATA, not exceptions: every failure is one or more
 * `ImportIssue` records with a stable machine-readable `code`, the pipeline
 * `stage` that produced it, a `path` into the imported document, and a
 * human-readable `message` written for a teacher or a future authoring UI.
 *
 * Nothing here ever carries a stack trace, a raw exception object, or the raw
 * imported document. Issues are host-only diagnostics — they are never placed
 * in `PublicState`, in event history, or on the display.
 */

/**
 * Pipeline stages, in execution order. The order is also the report order (see
 * `sortIssues`).
 *
 * Note on `semantic`: it covers BOTH the document safety scan (which runs
 * *before* Zod, so prototype-pollution keys and non-data values are reported
 * precisely instead of as generic "unknown key" noise) and the content-level
 * checks that run *after* Zod (duplicate ids, blank titles). See ADR-004.
 */
export const IMPORT_STAGES = [
  'transport',
  'json-parse',
  'format',
  'version',
  'semantic',
  'schema',
  'registry',
  'construction',
] as const

export type ImportStage = (typeof IMPORT_STAGES)[number]

/**
 * Stable machine-readable issue codes. These are part of the module's public
 * contract: a code may be added, but an existing code must not change meaning.
 */
export const IMPORT_ISSUE_CODES = [
  // transport
  'input-not-text',
  'empty-input',
  'input-too-large',
  // json-parse
  'invalid-json',
  'root-not-object',
  // format
  'missing-format',
  'unsupported-format',
  // version
  'missing-schema-version',
  'invalid-schema-version',
  'unsupported-schema-version',
  // semantic — document safety scan (pre-Zod)
  'unsafe-object-key',
  'non-data-value',
  'non-finite-number',
  'cyclic-reference',
  'document-too-deep',
  'issues-truncated',
  // semantic — content checks (post-Zod)
  'duplicate-round-id',
  'blank-title',
  // semantic — round-config content checks contributed by a round type's own
  // schema (Slice 5). They are reported at the `schema` stage, because the
  // registry decided *which* schema applies and the schema produced them.
  'duplicate-category-id',
  'duplicate-tile-id',
  'blank-text',
  // semantic — team content checks contributed by the team schema (Slice 6).
  // Reported at the `schema` stage for the same reason: the schema produced them.
  'duplicate-team-id',
  'invalid-team-accent',
  // schema (Zod, including round `config` schemas supplied by the registry)
  'missing-field',
  'invalid-type',
  'invalid-value',
  'invalid-format',
  'value-too-small',
  'value-too-large',
  'unknown-field',
  // registry
  'unknown-round-type',
  // construction
  'construction-failed',
  'internal-error',
] as const

export type ImportIssueCode = (typeof IMPORT_ISSUE_CODES)[number]

/** Safe, structured contextual detail. Only primitives — never raw input. */
export type ImportIssueContext = Readonly<Record<string, string | number | boolean>>

/** One actionable import problem. */
export interface ImportIssue {
  /** Stable machine-readable identity of the problem. */
  readonly code: ImportIssueCode
  /** Which pipeline stage rejected the document. */
  readonly stage: ImportStage
  /**
   * Dotted/bracketed path into the imported document (`rounds[1].id`), or the
   * empty string for the document root.
   */
  readonly path: string
  /** Human-readable, actionable message. Safe to show to a host/teacher. */
  readonly message: string
  /** Optional safe extra detail (never raw content, never an exception). */
  readonly context?: ImportIssueContext
}

/** Format a path segment list as `rounds[1].config.note`. */
export function formatPath(segments: readonly (string | number)[]): string {
  let out = ''
  for (const segment of segments) {
    if (typeof segment === 'number') {
      out += `[${segment}]`
    } else if (out.length === 0) {
      out = segment
    } else {
      out += `.${segment}`
    }
  }
  return out
}

/** Human phrasing for a path, so root-level messages read naturally. */
export function describePath(path: string): string {
  return path.length === 0 ? 'the document root' : path
}

/**
 * Render an untrusted value as a short, safe label for a message. Strings are
 * JSON-quoted (so control characters and newlines cannot break the host panel
 * layout) and clipped; objects/arrays are described, never dumped.
 */
export function safeLabel(value: unknown, maxLength = 60): string {
  if (typeof value === 'string') {
    const clipped = value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
    return JSON.stringify(clipped)
  }
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return 'a bigint'
  if (typeof value === 'symbol') return 'a symbol'
  if (typeof value === 'function') return 'a function'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'an array'
  return 'an object'
}

/** Build an issue. Kept as a helper so every producer has the same shape. */
export function issue(
  code: ImportIssueCode,
  stage: ImportStage,
  path: string,
  message: string,
  context?: ImportIssueContext,
): ImportIssue {
  return context === undefined ? { code, stage, path, message } : { code, stage, path, message, context }
}

const STAGE_ORDER = new Map<ImportStage, number>(
  IMPORT_STAGES.map((stage, index) => [stage, index]),
)

/**
 * Deterministic report ordering: by pipeline stage, then by the order the
 * producing stage emitted the issues (which is itself document order — Zod
 * walks the schema shape and array indices deterministically). `Array#sort` is
 * stable in every supported engine, so the within-stage order is preserved.
 *
 * Sorting by stage rather than by path keeps "why did this fail" readable: the
 * earliest, most fundamental problem is reported first.
 */
export function sortIssues(issues: readonly ImportIssue[]): readonly ImportIssue[] {
  return [...issues].sort(
    (a, b) => (STAGE_ORDER.get(a.stage) ?? 0) - (STAGE_ORDER.get(b.stage) ?? 0),
  )
}
