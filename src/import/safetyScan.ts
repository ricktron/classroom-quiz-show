import { MAX_DOCUMENT_DEPTH } from './canonicalFormat'
import { formatPath, issue, safeLabel, type ImportIssue } from './issues'

/**
 * The document safety scan — the structural half of "content is data, never
 * code" at the import boundary (GAME-ENGINE-BOUNDARIES §5).
 *
 * It runs BEFORE Zod, on the raw parsed value, and proves the whole document is
 * a plain JSON-shaped data graph. Running it first matters for two reasons:
 *
 *  1. **Zod cannot be relied on to reject dangerous keys.** `z.strictObject`
 *     decides "unrecognized" with an `in`-style shape check, and `'__proto__'`,
 *     `'constructor'`, and `'prototype'` are all inherited from
 *     `Object.prototype` — so a strict object silently treats them as
 *     *recognized* and reports nothing. Verified against zod 4.4.x; this scan
 *     closes that gap explicitly rather than depending on library internals.
 *  2. A precise `unsafe-object-key` / `non-data-value` issue is far more
 *     actionable than a generic schema error.
 *
 * `JSON.parse` cannot produce a function, `undefined`, a `Date`, a `Map`, a
 * class instance, or a cycle — but `importGameFromUnknown` accepts an arbitrary
 * in-memory object too, and that path must be equally safe. This scan is what
 * makes both entry points equivalent.
 *
 * Note this is a *rejection* scan, not a sanitizer: it never strips or rewrites
 * anything. Anything it flags fails the import (no silent repair).
 */

/**
 * Object keys that are never accepted anywhere in an imported document. These
 * are the classic prototype-pollution vectors; a game file has no legitimate
 * reason to carry them.
 */
export const UNSAFE_OBJECT_KEYS: readonly string[] = ['__proto__', 'prototype', 'constructor']

/**
 * Cap on scan issues so a pathological document cannot produce an unbounded
 * report. When the cap is reached the scan stops and appends an explicit
 * `issues-truncated` issue — truncation is reported, never silent.
 */
const MAX_SCAN_ISSUES = 25

/** Is this a plain data object (`{}`-like), as opposed to a class instance? */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/**
 * Scan an arbitrary value and return every reason it is not a safe data graph.
 * An empty array means the value is plain, finite, acyclic, safely-keyed data.
 */
export function scanImportedDocument(root: unknown): readonly ImportIssue[] {
  const issues: ImportIssue[] = []
  // Ancestors on the CURRENT path — a repeated reference is a true cycle only
  // if the value is one of its own ancestors (shared siblings are fine).
  const ancestors = new Set<object>()
  let truncated = false

  function add(
    code: Parameters<typeof issue>[0],
    segments: readonly (string | number)[],
    message: string,
  ): void {
    if (issues.length >= MAX_SCAN_ISSUES) {
      truncated = true
      return
    }
    issues.push(issue(code, 'semantic', formatPath(segments), message))
  }

  // Traversal always completes (input size and nesting depth are both bounded);
  // only the RECORDED issue list is capped, so `truncated` is true if and only
  // if at least one real issue was dropped.
  function walk(value: unknown, segments: readonly (string | number)[], depth: number): void {
    const path = formatPath(segments)

    switch (typeof value) {
      case 'string':
      case 'boolean':
        return
      case 'number':
        if (!Number.isFinite(value)) {
          add(
            'non-finite-number',
            segments,
            `${path || 'the document root'} is ${String(value)}; game files may only contain finite numbers.`,
          )
        }
        return
      case 'undefined':
      case 'bigint':
      case 'symbol':
      case 'function':
        add(
          'non-data-value',
          segments,
          `${path || 'the document root'} is ${safeLabel(value)}; game content must be plain JSON data (string, number, boolean, null, array, or object).`,
        )
        return
      default:
        break
    }

    if (value === null) return

    const object = value as object
    if (ancestors.has(object)) {
      add(
        'cyclic-reference',
        segments,
        `${path || 'the document root'} refers back to a value that contains it; game files must be acyclic.`,
      )
      return
    }
    if (depth > MAX_DOCUMENT_DEPTH) {
      add(
        'document-too-deep',
        segments,
        `${path || 'the document root'} is nested deeper than the supported limit of ${MAX_DOCUMENT_DEPTH} levels.`,
      )
      return
    }

    ancestors.add(object)
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...segments, index], depth + 1))
    } else if (isPlainRecord(value)) {
      if (Object.getOwnPropertySymbols(value).length > 0) {
        add(
          'non-data-value',
          segments,
          `${path || 'the document root'} has symbol-keyed properties; game content must be plain JSON data.`,
        )
      }
      for (const key of Object.keys(value)) {
        if (UNSAFE_OBJECT_KEYS.includes(key)) {
          add(
            'unsafe-object-key',
            [...segments, key],
            `${formatPath([...segments, key])} uses the reserved key ${safeLabel(key)}, which is not allowed anywhere in a game file.`,
          )
          continue
        }
        walk(value[key], [...segments, key], depth + 1)
      }
    } else {
      add(
        'non-data-value',
        segments,
        `${path || 'the document root'} is a ${describeExotic(object)}; game content must be plain JSON data (string, number, boolean, null, array, or object).`,
      )
    }
    ancestors.delete(object)
  }

  walk(root, [], 1)

  if (truncated) {
    issues.push(
      issue(
        'issues-truncated',
        'semantic',
        '',
        `Only the first ${MAX_SCAN_ISSUES} structural problems are listed; fix these and import again to see the rest.`,
      ),
    )
  }
  return issues
}

/** A short, safe description of a non-plain object (Date, Map, class instance…). */
function describeExotic(value: object): string {
  const name = value.constructor?.name
  return typeof name === 'string' && name.length > 0 && name.length <= 40
    ? `${name} instance`
    : 'non-plain object'
}
