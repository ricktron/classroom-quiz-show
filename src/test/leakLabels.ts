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
  // Slice 4: the host import harness. Its heading, its raw-JSON field, and any
  // validation issue text are host-only diagnostics and must never be projected.
  'Import diagnostics',
  'Game file JSON',
  'Import failed',
  'classroom-quiz-show/game',
  // Slice 5: the category-board host panel. Its private-block badge, its
  // alternate-answer list, and its "what the projector shows" indicator are all
  // host-only and must never appear on the projector.
  'Host only',
  'Acceptable alternates',
  'On the display now',
]
