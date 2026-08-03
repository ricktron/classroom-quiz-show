import { deepFreeze } from '../deepFreeze'
import { isValidSameOriginPath } from './limits'

/**
 * Trusted prompt content (Slice 11).
 *
 * The authored form may be a legacy string or an image object. The trusted
 * domain ALWAYS normalizes to a discriminated `PromptContent` so no consumer
 * may assume a prompt is a bare string (GAME-ENGINE-BOUNDARIES §9).
 *
 * Construction never mutates the input. Image fields are copied; optional
 * caption/attribution become explicit `null` when absent.
 *
 * Because that normalized `null` is itself a value this module must be able to
 * read back — `readTrustedPrompt` re-reads an already-trusted prompt through the
 * same normalizer — normalization is IDEMPOTENT: normalizing a normalized prompt
 * yields an equal prompt. See {@link isOptionalAnnotation}.
 */

/** Same-origin path source — the only source kind implemented in Slice 11. */
export interface SameOriginPathSource {
  readonly kind: 'same-origin-path'
  readonly path: string
}

/** Trusted prompt content: text or a static image. */
export type PromptContent =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'image'
      readonly source: SameOriginPathSource
      readonly alt: string
      readonly caption: string | null
      readonly attribution: string | null
    }

/** Authored image prompt shape (validated, before trusted normalization). */
export interface AuthoredImagePrompt {
  readonly kind: 'image'
  readonly source: { readonly kind: string; readonly path: string }
  readonly alt: string
  readonly caption?: string
  readonly attribution?: string
}

/**
 * Exhaustiveness helper. Call from a `default` / `else` that TypeScript believes
 * is unreachable — never fabricate prompt content silently.
 */
export function assertNeverPromptKind(value: never, label = 'prompt'): never {
  const kind =
    typeof value === 'object' && value !== null && 'kind' in value
      ? String((value as { kind: unknown }).kind)
      : typeof value
  throw new Error(`unsupported ${label} kind: ${kind}`)
}

/** Type guard: text prompt. */
export function isTextPrompt(
  prompt: PromptContent,
): prompt is Extract<PromptContent, { kind: 'text' }> {
  return prompt.kind === 'text'
}

/** Type guard: image prompt. */
export function isImagePrompt(
  prompt: PromptContent,
): prompt is Extract<PromptContent, { kind: 'image' }> {
  return prompt.kind === 'image'
}

/**
 * Is this an acceptable value for an optional image annotation?
 *
 * TWO absences are legitimate, and both must be accepted for
 * {@link normalizeImagePrompt} to accept its own output:
 *
 *  - `undefined` — the AUTHORED form, where the field was simply omitted;
 *  - `null`      — the NORMALIZED form this module itself produces for an
 *                  omitted field (see the header note above).
 *
 * Accepting only `undefined` made normalization non-idempotent: a trusted prompt
 * built from an authored image without a caption or attribution could not be
 * re-read by {@link readTrustedPrompt}, so the sanitizer failed closed and the
 * whole round projected nothing. Anything that is neither a string nor an
 * explicit absence is still refused — this widens the accepted absence, not the
 * accepted content.
 */
function isOptionalAnnotation(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}

function normalizeImagePrompt(value: Record<string, unknown>): PromptContent | null {
  const source = value.source
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return null
  const sourceRecord = source as Record<string, unknown>
  if (sourceRecord.kind !== 'same-origin-path') return null
  if (typeof sourceRecord.path !== 'string') return null
  if (!isValidSameOriginPath(sourceRecord.path)) return null
  if (typeof value.alt !== 'string' || value.alt.length === 0) return null
  if (!isOptionalAnnotation(value.caption)) return null
  if (!isOptionalAnnotation(value.attribution)) return null

  return {
    kind: 'image',
    source: { kind: 'same-origin-path', path: sourceRecord.path },
    alt: value.alt,
    caption: typeof value.caption === 'string' ? value.caption : null,
    attribution: typeof value.attribution === 'string' ? value.attribution : null,
  }
}

/**
 * Normalize an authored prompt (string or image object) into trusted
 * `PromptContent`. Returns `null` when the value cannot be trusted — callers
 * fail closed rather than inventing clue content.
 *
 * The input is never mutated and never retained: every value is copied into a
 * fresh object (then deep-frozen by the board constructor).
 */
export function normalizeAuthoredPrompt(prompt: unknown): PromptContent | null {
  if (typeof prompt === 'string') {
    if (prompt.length === 0) return null
    return { kind: 'text', text: prompt }
  }

  if (typeof prompt !== 'object' || prompt === null || Array.isArray(prompt)) {
    return null
  }

  const value = prompt as Record<string, unknown>
  if (value.kind !== 'image') return null
  return normalizeImagePrompt(value)
}

/**
 * Fail-closed read of already-trusted prompt content. Used by the sanitizer so
 * an impossible private value degrades to "unavailable" instead of leaking or
 * fabricating public content.
 */
export function readTrustedPrompt(prompt: unknown): PromptContent | null {
  if (typeof prompt !== 'object' || prompt === null || Array.isArray(prompt)) return null
  const value = prompt as Record<string, unknown>

  if (value.kind === 'text') {
    if (typeof value.text !== 'string' || value.text.length === 0) return null
    return { kind: 'text', text: value.text }
  }

  if (value.kind === 'image') {
    return normalizeAuthoredPrompt(value)
  }

  return null
}

/** Deep-freeze a prompt content value (used by the board constructor). */
export function freezePromptContent(prompt: PromptContent): PromptContent {
  return deepFreeze(prompt)
}
