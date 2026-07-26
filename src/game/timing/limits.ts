/**
 * Bounded limits for the response timer (Slice 7).
 *
 * Every limit here exists for a stated CLASSROOM reason, following the same
 * bounded-input philosophy as `categoryBoard/limits.ts` and `teams/limits.ts`: a
 * game file is validated against explicit bounds, an out-of-range duration is
 * REJECTED with an actionable message, and nothing is ever silently clamped into
 * validity.
 */

/** Milliseconds in a second. Named so the conversion is never a bare literal. */
export const MS_PER_SECOND = 1000

/**
 * Shortest authored response window.
 *
 * Rationale: five seconds is the shortest window a class can actually react to —
 * a teacher reads the prompt, a team decides, someone answers. Anything shorter
 * is a stopwatch, not a response window, and would also make the projector's
 * countdown unreadable from the back of a room.
 */
export const MIN_RESPONSE_SECONDS = 5

/**
 * Longest authored response window.
 *
 * Rationale: ten minutes is longer than any single clue in a class period —
 * `MAX_TOTAL_TILES` already assumes roughly 45–60 seconds per tile. The ceiling
 * exists so a mistyped `6000` is rejected rather than putting a two-hour clock in
 * front of a class.
 */
export const MAX_RESPONSE_SECONDS = 600

/**
 * The response window used when a game authors no timer configuration.
 *
 * Rationale: thirty seconds is the common classroom "think, discuss, answer"
 * window for a single board clue, and it matches the tile-pacing assumption
 * behind `MAX_TOTAL_TILES`.
 *
 * Like `DEFAULT_MULTIPLIER` and the positional accent default, this is applied
 * ONLY by the trusted domain constructor — never by a Zod `.default()` — so the
 * import boundary keeps reporting exactly what was authored.
 */
export const DEFAULT_RESPONSE_SECONDS = 30

/**
 * How early an expiration command may be accepted, in milliseconds.
 *
 * A host timeout callback can fire a millisecond or two before the deadline it
 * was scheduled for (timers are "no sooner than", but a clock read either side of
 * the boundary can still disagree). This tolerance keeps that harmless while
 * still rejecting an expiration dispatched meaningfully *early* — which is the
 * host trying to end a window that has not ended.
 */
export const EXPIRY_TOLERANCE_MS = 250

/**
 * Host-offered durations, in seconds.
 *
 * A convenience for the host `<select>` only — the authored default is always
 * offered alongside these, and any bounded value the planner accepts is legal.
 * This list is presentation, not policy.
 */
export const HOST_DURATION_PRESET_SECONDS: readonly number[] = [
  MIN_RESPONSE_SECONDS,
  10,
  15,
  30,
  45,
  60,
  90,
  120,
]
