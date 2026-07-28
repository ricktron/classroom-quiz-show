/**
 * Recursive canonicalizer for authored round `config` data (Slice 12).
 *
 * Known root / team / timer / round envelopes use explicit field orders owned by
 * the exporter. Generic nested config content uses this helper: lexicographic
 * key order into a fresh null-prototype object graph, arrays preserved in order,
 * scalars passed through (with `-0` normalized to `0`).
 *
 * Unsupported or unsafe values fail closed — nothing is dropped or repaired.
 */

export class CanonicalizeError extends Error {
  readonly path: string

  constructor(path: string, message: string) {
    super(message)
    this.name = 'CanonicalizeError'
    this.path = path
  }
}

/**
 * Canonicalize a JSON-like value for portable export.
 *
 * @throws {CanonicalizeError} when the value cannot be represented safely.
 */
export function canonicalizeData(value: unknown, path = ''): unknown {
  return walk(value, path, new Set<object>())
}

function walk(value: unknown, path: string, ancestors: Set<object>): unknown {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      if (!Number.isFinite(value)) {
        throw new CanonicalizeError(
          path,
          `Non-finite number ${String(value)} cannot be exported.`,
        )
      }
      // Normalize negative zero so JSON bytes stay deterministic.
      return Object.is(value, -0) ? 0 : value
    case 'bigint':
      throw new CanonicalizeError(path, 'bigint values cannot be exported.')
    case 'symbol':
      throw new CanonicalizeError(path, 'symbol values cannot be exported.')
    case 'function':
      throw new CanonicalizeError(path, 'Functions cannot be exported.')
    case 'undefined':
      throw new CanonicalizeError(path, 'undefined values cannot be exported.')
    case 'object':
      break
    default:
      throw new CanonicalizeError(path, `Unsupported value type ${typeof value}.`)
  }

  if (value === null) return null

  if (ancestors.has(value)) {
    throw new CanonicalizeError(path, 'Cyclic data cannot be exported.')
  }

  if (Array.isArray(value)) {
    ancestors.add(value)
    try {
      return value.map((item, index) => walk(item, joinPath(path, index), ancestors))
    } finally {
      ancestors.delete(value)
    }
  }

  if (!isCanonicalizableObject(value)) {
    throw new CanonicalizeError(
      path,
      `Unsupported object type ${objectLabel(value)} cannot be exported.`,
    )
  }

  ancestors.add(value)
  try {
    const keys = Object.keys(value).sort()
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>
    for (const key of keys) {
      // Own enumerable string keys only — Object.keys already filters that.
      // Reject undefined property values rather than omitting them.
      const child = (value as Record<string, unknown>)[key]
      out[key] = walk(child, joinPath(path, key), ancestors)
    }
    return out
  } finally {
    ancestors.delete(value)
  }
}

function isCanonicalizableObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

function objectLabel(value: object): string {
  if (value instanceof Date) return 'Date'
  if (value instanceof Map) return 'Map'
  if (value instanceof Set) return 'Set'
  const tag = Object.prototype.toString.call(value)
  return tag === '[object Object]' ? 'class instance' : tag
}

function joinPath(base: string, segment: string | number): string {
  if (typeof segment === 'number') {
    return base.length === 0 ? `[${segment}]` : `${base}[${segment}]`
  }
  return base.length === 0 ? segment : `${base}.${segment}`
}
