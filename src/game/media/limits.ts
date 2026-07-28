/**
 * Bounded-input limits for authored media (Slice 11).
 *
 * Every limit has a stated CLASSROOM reason, following the Slice 4/5/6 bounded
 * input philosophy: an out-of-range value is REJECTED with an actionable
 * message, never truncated, renamed, or repaired into validity.
 *
 * Media applies to **prompts only**. Answers, alternates, and notes remain
 * plain strings. One media item occupies the prompt field itself — there is no
 * media array on a tile.
 */

/**
 * Maximum length of a same-origin relative path.
 *
 * Rationale: a path is a local asset locator under the app base URL
 * (`media-fixtures/slice-11-clue.png`), not a remote URL. 500 characters is
 * generous for nested classroom pack folders while keeping import diagnostics
 * readable when a path is echoed in an issue message.
 */
export const MAX_MEDIA_PATH_LENGTH = 500

/**
 * Maximum length of required image alt text.
 *
 * Rationale: alt text is the fail-closed visible fallback when an image cannot
 * load, and it is what assistive technology reads. 300 characters matches the
 * answer-length budget and is long enough for a full clue description without
 * turning the projector into a paragraph of fallback text.
 */
export const MAX_MEDIA_ALT_LENGTH = 300

/**
 * Maximum length of an optional image caption.
 *
 * Rationale: a caption is short public copy under the image (a figure label or
 * one-line clue restatement). 300 characters is enough for one projected
 * sentence and matches the alt budget so authors are not surprised by a
 * tighter caption limit.
 */
export const MAX_MEDIA_CAPTION_LENGTH = 300

/**
 * Maximum length of optional attribution / citation copy.
 *
 * Rationale: attribution names a source ("USGS public domain"). It must fit on
 * one quiet line under the caption without competing with the clue. 200
 * characters is enough for a short citation and keeps the projector calm.
 */
export const MAX_MEDIA_ATTRIBUTION_LENGTH = 200

/**
 * Same-origin relative path grammar.
 *
 * Leading alphanumeric (never `/`, never `.`), then letters, digits, `.`, `_`,
 * `/`, `-`. Rejects schemes (`:`), query/hash (`?`/`#`), backslashes, whitespace,
 * and empty segments introduced by `..` (checked separately). Content cannot
 * point at `https:`, `http:`, `data:`, `blob:`, `file:`, or `javascript:`.
 */
export const SAME_ORIGIN_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
