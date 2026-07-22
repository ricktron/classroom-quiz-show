/**
 * The permanent "projector-leak" baseline.
 *
 * These labels represent private, host-only, or answer-revealing content that
 * must NEVER appear on the projector display. Both the component tests and the
 * Playwright e2e suite assert the display contains none of them.
 *
 * NOTE: label matching is only a BASELINE smoke check. It is not proof of the
 * future private→public sanitizer boundary (see GAME-ENGINE-BOUNDARIES.md).
 * When the real sanitizer lands, structural PublicState assertions must be
 * added alongside these string checks.
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
