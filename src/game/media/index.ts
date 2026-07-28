/**
 * Media contract surface (Slice 11).
 *
 * Authored validation lives in `schema.ts`; trusted domain types and
 * normalization live in `definition.ts`; classroom limits live in `limits.ts`.
 */

export {
  MAX_MEDIA_ALT_LENGTH,
  MAX_MEDIA_ATTRIBUTION_LENGTH,
  MAX_MEDIA_CAPTION_LENGTH,
  MAX_MEDIA_PATH_LENGTH,
  SAME_ORIGIN_PATH_PATTERN,
} from './limits'

export {
  authoredPromptSchema,
  checkAuthoredPromptSemantics,
  isValidSameOriginPath,
  type AuthoredPromptInput,
} from './schema'

export {
  assertNeverPromptKind,
  freezePromptContent,
  isImagePrompt,
  isTextPrompt,
  normalizeAuthoredPrompt,
  readTrustedPrompt,
  type AuthoredImagePrompt,
  type PromptContent,
  type SameOriginPathSource,
} from './definition'
