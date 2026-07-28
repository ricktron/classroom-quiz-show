import { z } from 'zod'
import {
  MAX_MEDIA_ALT_LENGTH,
  MAX_MEDIA_ATTRIBUTION_LENGTH,
  MAX_MEDIA_CAPTION_LENGTH,
  MAX_MEDIA_PATH_LENGTH,
  SAME_ORIGIN_PATH_PATTERN,
} from './limits'
import { MAX_PROMPT_LENGTH } from '../categoryBoard/limits'

/**
 * Strict authored prompt / media schemas (Slice 11).
 *
 * Media applies to prompts only. A prompt may be:
 *  - a legacy non-empty string (text), or
 *  - a strict image object with a same-origin-path source.
 *
 * Implemented as ONE schema with an internal branch (not `z.union`) so precise
 * `params.importCode` values survive into the import pipeline. A `z.union`
 * wraps failures as `invalid_union` and loses those codes at the top level.
 *
 * There is no `z.coerce`, `.default()`, `.catch()`, or `.transform()`. Unknown
 * keys fail. Unsupported media kinds and invalid sources fail with stable
 * import issue codes (`unsupported-media-kind`, `invalid-media-source`).
 */

/** JSON-quote and clip an untrusted authored string for use inside a message. */
function quote(value: string, maxLength = 60): string {
  const clipped = value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
  return JSON.stringify(clipped)
}

function addIssue(
  ctx: z.RefinementCtx,
  importCode: string,
  path: readonly (string | number)[],
  message: string,
): void {
  ctx.addIssue({ code: 'custom', path: [...path], message, params: { importCode } })
}

/**
 * Is this path a legal same-origin relative locator?
 *
 * Rejects `..`, schemes, query/hash, backslashes, whitespace, and a leading `/`
 * (the pattern already forbids the last four classes of character).
 */
export function isValidSameOriginPath(path: string): boolean {
  if (path.length < 1 || path.length > MAX_MEDIA_PATH_LENGTH) return false
  if (!SAME_ORIGIN_PATH_PATTERN.test(path)) return false
  if (path.includes('..')) return false
  return true
}

const sameOriginPathSourceSchema = z
  .strictObject({
    kind: z.string().min(1, 'a media source kind must not be empty'),
    path: z
      .string()
      .min(1, 'a media path must not be empty')
      .max(
        MAX_MEDIA_PATH_LENGTH,
        `a media path must be at most ${MAX_MEDIA_PATH_LENGTH} characters`,
      ),
  })
  .superRefine((source, ctx) => {
    if (source.kind !== 'same-origin-path') {
      addIssue(
        ctx,
        'invalid-media-source',
        ['kind'],
        `unsupported media source kind ${quote(source.kind)}. Only "same-origin-path" is accepted — remote URLs, data URIs, and other schemes are refused.`,
      )
      return
    }
    if (!isValidSameOriginPath(source.path)) {
      addIssue(
        ctx,
        'invalid-media-source',
        ['path'],
        `is not a safe same-origin relative path (${quote(source.path)}). Use a path like "media-fixtures/slice-11-clue.png" — no leading slash, no "..", and no ":", "?", "#", "\\\\", or whitespace.`,
      )
    }
  })

const imagePromptObjectSchema = z.strictObject({
  kind: z.literal('image'),
  source: sameOriginPathSourceSchema,
  alt: z
    .string()
    .min(1, 'image alt text must not be empty')
    .max(MAX_MEDIA_ALT_LENGTH, `image alt text must be at most ${MAX_MEDIA_ALT_LENGTH} characters`),
  caption: z
    .string()
    .min(1, 'an image caption must not be empty')
    .max(
      MAX_MEDIA_CAPTION_LENGTH,
      `an image caption must be at most ${MAX_MEDIA_CAPTION_LENGTH} characters`,
    )
    .optional(),
  attribution: z
    .string()
    .min(1, 'image attribution must not be empty')
    .max(
      MAX_MEDIA_ATTRIBUTION_LENGTH,
      `image attribution must be at most ${MAX_MEDIA_ATTRIBUTION_LENGTH} characters`,
    )
    .optional(),
})

/** Forward nested Zod issues onto the parent refinement context. */
function forwardIssues(ctx: z.RefinementCtx, issues: readonly z.core.$ZodIssue[]): void {
  for (const issue of issues) {
    // Preserve structural codes (`unrecognized_keys`, `invalid_type`, …) that
    // the import mapper understands. Zod 4's issue union is wider than
    // `addIssue`'s parameter type, so re-entry is intentionally unchecked.
    ctx.addIssue(issue as never)
  }
}

/**
 * Authored prompt: legacy string text, or a strict image object.
 *
 * Single-schema branching (not `z.union`) so `unsupported-media-kind` and
 * `invalid-media-source` remain top-level import codes.
 */
export const authoredPromptSchema = z.custom<AuthoredPromptInput>().superRefine((value, ctx) => {
  if (typeof value === 'string') {
    if (value.length < 1) {
      addIssue(ctx, 'value-too-small', [], 'a prompt must not be empty')
      return
    }
    if (value.length > MAX_PROMPT_LENGTH) {
      addIssue(
        ctx,
        'value-too-large',
        [],
        `a prompt must be at most ${MAX_PROMPT_LENGTH} characters`,
      )
    }
    return
  }

  // Emit a native invalid_type so the import mapper can promote a missing
  // field to `missing-field` (custom importCode would stay `invalid-type`).
  if (value === undefined) {
    ctx.addIssue({
      code: 'invalid_type',
      expected: 'string',
      path: [],
      message: 'Required',
    } as never)
    return
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    addIssue(
      ctx,
      'invalid-type',
      [],
      'a prompt must be a non-empty string or an image object',
    )
    return
  }

  const record = value as Record<string, unknown>
  if (typeof record.kind !== 'string') {
    addIssue(ctx, 'missing-field', ['kind'], 'a media prompt must declare a kind')
    return
  }

  if (record.kind !== 'image') {
    addIssue(
      ctx,
      'unsupported-media-kind',
      ['kind'],
      `unsupported media kind ${quote(record.kind)}. Only legacy string text and kind "image" are accepted in this release.`,
    )
    return
  }

  const result = imagePromptObjectSchema.safeParse(record)
  if (!result.success) {
    forwardIssues(ctx, result.error.issues)
  }
})

/** Authored prompt shape after structural validation (not yet trusted domain). */
export type AuthoredPromptInput =
  | string
  | {
      readonly kind: 'image'
      readonly source: { readonly kind: string; readonly path: string }
      readonly alt: string
      readonly caption?: string
      readonly attribution?: string
    }

/**
 * Whole-prompt whitespace / optional-text checks.
 *
 * Called from the category-board semantic pass so paths stay exact. Defensive
 * on purpose: Zod may still invoke the board-level refinement after a nested
 * prompt field has already failed, so this must never throw on a partial
 * object (that would surface as `internal-error` and hide the real issue).
 */
export function checkAuthoredPromptSemantics(
  prompt: unknown,
  ctx: z.RefinementCtx,
  basePath: readonly (string | number)[],
): void {
  if (typeof prompt === 'string') {
    if (prompt.trim().length === 0) {
      addIssue(
        ctx,
        'blank-text',
        basePath,
        'contains only whitespace. Write the question text — the pipeline will not invent one.',
      )
    }
    return
  }

  if (typeof prompt !== 'object' || prompt === null || Array.isArray(prompt)) return
  const record = prompt as Record<string, unknown>
  if (record.kind !== 'image') return

  if (typeof record.alt === 'string' && record.alt.trim().length === 0) {
    addIssue(
      ctx,
      'blank-text',
      [...basePath, 'alt'],
      'contains only whitespace. Write alt text that describes the image — the pipeline will not invent one.',
    )
  }

  if (typeof record.caption === 'string' && record.caption.trim().length === 0) {
    addIssue(
      ctx,
      'blank-text',
      [...basePath, 'caption'],
      'contains only whitespace. Remove the caption or write a real one.',
    )
  }

  if (typeof record.attribution === 'string' && record.attribution.trim().length === 0) {
    addIssue(
      ctx,
      'blank-text',
      [...basePath, 'attribution'],
      'contains only whitespace. Remove the attribution or write a real one.',
    )
  }
}
