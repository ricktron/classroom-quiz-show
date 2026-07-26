/**
 * Duration helpers shared by the host and the projector (Slice 7).
 *
 * Deliberately dependency-free, for the same reason `publicState.ts` is: the
 * display is allowed to import this without pulling a private state module into
 * the projector bundle, and the host domain is allowed to import it without
 * depending on the display.
 *
 * Nothing here reads a clock. Every function is a pure transformation of numbers
 * a caller has already obtained, so the same inputs always render the same text —
 * which matters when a teacher reads a countdown out loud and a class is watching
 * the same number on a projector.
 */

/** Clamp a value into an inclusive range; a non-finite value resolves to `min`. */
export function clampDuration(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Whole seconds remaining, rounded UP.
 *
 * Rounding up rather than down is deliberate: with 200 ms left the class still
 * has time, so the display should read "1", and the number should reach 0 exactly
 * when the window does.
 */
export function remainingSeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000))
}

/**
 * Format a remaining duration as `M:SS`.
 *
 * Fixed ASCII with no locale, for the same reason `formatSignedDelta` is: a value
 * a teacher reads out must not be able to differ between two machines.
 */
export function formatRemaining(ms: number): string {
  const totalSeconds = remainingSeconds(ms)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

/**
 * Spoken form of a remaining duration, for screen readers.
 *
 * `1:05` read literally is ambiguous; "1 minute 5 seconds" is not. Accessible
 * labels use this while the visible text uses {@link formatRemaining}, so the two
 * always describe the same number.
 */
export function describeRemaining(ms: number): string {
  const totalSeconds = remainingSeconds(ms)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  if (seconds > 0 || minutes === 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
  return parts.join(' ')
}
