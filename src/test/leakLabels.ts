/**
 * The permanent "projector-leak" baseline.
 *
 * These labels represent private, host-only, or answer-revealing content that
 * must NEVER appear on the projector display. Both the component tests and the
 * Playwright e2e suite assert the display contains none of them.
 *
 * NOTE: label matching is only a BASELINE smoke check. It is not by itself proof
 * of the private→public sanitizer boundary (see GAME-ENGINE-BOUNDARIES.md). As
 * of Slice 2 the real allow-list sanitizer exists and is additionally guarded by
 * STRUCTURAL PublicState assertions in src/state/sanitize.test.ts (allow-listed
 * keys only, future-field non-leak, serialized-value checks). These string
 * checks remain as a cheap, permanent smoke test alongside them.
 */
export const FORBIDDEN_DISPLAY_LABELS: readonly string[] = [
  'Correct answer',
  'Teacher notes',
  'Award points',
  'Subtract points',
  'Host controls',
  'Wager entry',
  'Import diagnostics',
]
