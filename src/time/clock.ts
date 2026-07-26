/**
 * The clock boundary (Slice 7).
 *
 * Time is the first genuinely non-deterministic input this engine has taken, so
 * it gets an explicit seam rather than a scattering of `Date.now()` calls.
 *
 * ## The rule
 *
 * A clock may be read at exactly two kinds of place:
 *
 *  1. the **command/dispatch edge** — a host control reads `clock.now()` once and
 *     puts the value on the command's `issuedAt`, which the reducer copies onto
 *     the resulting event and never re-derives (`commands.ts`); and
 *  2. the **presentation edge** — a countdown component reads the clock every
 *     animation frame to render "how long is left" from durable facts.
 *
 * A clock must NEVER be read inside `reduce`, `replay`, `planCommand`'s decision
 * logic (beyond the `issuedAt` the command already carries), or the public-state
 * sanitizer. That is what keeps replay of a stored history bit-exact: the same
 * history always produces the same state, on any machine, at any later date.
 *
 * This module is deliberately dependency-free so the host, the display, the sync
 * transport and the tests can all share one abstraction without any of them
 * pulling in a state module they are not allowed to see.
 */

/** A source of wall-clock milliseconds. The single time seam of the engine. */
export interface Clock {
  /** Milliseconds since the Unix epoch, as `Date.now()` reports them. */
  now(): number
}

/** The real clock. The only place the application calls `Date.now()`. */
export const systemClock: Clock = {
  now: () => Date.now(),
}

/**
 * A clock a test drives by hand.
 *
 * Deterministic tests are the point: a timer test that waits for real seconds is
 * slow and flaky, while one that advances a manual clock is exact. `advance`
 * moves time forward; `set` jumps to an absolute instant (used to model a clock
 * that was corrected, or a display whose clock differs from the host's).
 */
export interface ManualClock extends Clock {
  advance(ms: number): void
  set(ms: number): void
}

export function createManualClock(start = 1_700_000_000_000): ManualClock {
  let current = start
  return {
    now: () => current,
    advance(ms: number) {
      current += ms
    },
    set(ms: number) {
      current = ms
    },
  }
}

/**
 * Is this a usable wall-clock instant?
 *
 * Every timestamp that crosses a command or wire boundary is checked with this,
 * so a `NaN`, an `Infinity`, a fractional millisecond, a negative instant or a
 * non-number can never reach a durable event or a projected deadline. Bounded
 * above by the year-10000 mark for the same reason every other input in this
 * repository is bounded: an absurd value is a defect, not a value to render.
 */
export const MAX_INSTANT_MS = 253_402_300_799_000

export function isInstant(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_INSTANT_MS
  )
}
