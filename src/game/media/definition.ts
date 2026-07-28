import { deepFreeze } from '../deepFreeze'
import { isValidSameOriginPath } from './schema'

/**
 * Trusted prompt content (Slice 11).
 *
 * The authored form may be a legacy string or an image object. The trusted
 * domain ALWAYS normalizes to a discriminated `PromptContent` so no consumer
 * may assume a prompt is a bare string (GAME-ENGINE-BOUNDARIES §9).
 *
 * Construction never mutates the input. Image fields are copied; optional
 * caption/attribution become explicit `null` when absent.
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

  const source = value.source
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return null
  const sourceRecord = source as Record<string, unknown>
  if (sourceRecord.kind !== 'same-origin-path') return null
  if (typeof sourceRecord.path !== 'string') return null
  if (!isValidSameOriginPath(sourceRecord.path)) return null

  if (typeof value.alt !== 'string' || value.alt.length === 0) return null

  if (value.caption !== undefined && typeof value.caption !== 'string') return null
  if (value.attribution !== undefined && typeof value.attribution !== 'string') return null

  return {
    kind: 'image',
    source: { kind: 'same-origin-path', path: sourceRecord.path },
    alt: value.alt,
    caption: typeof value.caption === 'string' ? value.caption : null,
    attribution: typeof value.attribution === 'string' ? value.attribution : null,
  }
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
