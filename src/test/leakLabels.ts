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
  // Slice 6: the host teams & scoring panel. The projector shows team NAMES and
  // TOTALS (both public by design) and nothing else — never the host's scoring
  // target, the adjustment controls, the mode vocabulary, or the undo affordance.
  'Scoring target',
  'Award full value',
  'Deduct full value',
  'Partial credit',
  'Manual correction',
  'Last score change',
  'Undo last score change',
  // Slice 8: the host local-input & buzz-queue panel. The projector shows the
  // ACTIVE team and a waiting COUNT (both public by design) and nothing else —
  // never a buzz key, never the mapping editor, never the ordered waiting queue,
  // and never the host's queue controls.
  'Buzz key',
  'Buzz keys',
  'Change the buzz key',
  'Reset buzz keys to defaults',
  'Keyboard buzzing',
  'Waiting queue',
  'Mark incorrect and advance',
  'Pass and advance',
  // Slice 14: the host Final Wager panel. The projector shows a generic wager
  // status, the question and answer after their explicit reveals, and ONE
  // revealed team at a time — never the eligibility choice, never a wager cap,
  // never the save/lock controls, never the adjudication buttons, and never the
  // irreversible completion controls.
  'Who plays Final?',
  'Begin Final',
  'Maximum wager',
  'Save wager',
  'Correct wager',
  'Lock all wagers',
  'How will you record responses?',
  'Answered (no wording)',
  'Save wording',
  'Lock all responses',
  'Reveal the answer',
  'Play sudden death',
  'Accept the tie',
  'End the game session',
  'On screen:',
]
