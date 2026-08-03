/**
 * Bounded-input limits for the `final-wager` round (Slice 14).
 *
 * Every limit here exists for a stated CLASSROOM reason, following the same
 * bounded-input philosophy as `categoryBoard/limits.ts`, `teams/limits.ts` and
 * `timing/limits.ts`: an out-of-range value is REJECTED with an actionable
 * message, and nothing is ever silently truncated, clamped, or repaired into
 * validity.
 *
 * The governing constraints are the same two as everywhere else: a projector at
 * 1280×720 read from the back of a classroom, and a single class period.
 */

/**
 * Maximum canonical Final answer length.
 *
 * Rationale: a Final answer is read aloud and projected at large type, and it is
 * the one answer a whole class looks at simultaneously. 300 characters matches
 * `MAX_ANSWER_LENGTH` on a board tile so authors are not surprised by a tighter
 * budget on the round that matters most.
 */
export const MAX_FINAL_ANSWER_LENGTH = 300

/**
 * Maximum number of alternate acceptable Final answers.
 *
 * Rationale: alternates are a host grading aid, scanned at a glance while the
 * room waits. Beyond about eight the host cannot read them quickly enough to be
 * useful — the same reasoning as `MAX_ALTERNATES`.
 */
export const MAX_FINAL_ALTERNATES = 8

/** Maximum length of a single Final alternate. Same reasoning as the answer. */
export const MAX_FINAL_ALTERNATE_LENGTH = 300

/**
 * Maximum host-only Final note length.
 *
 * Rationale: notes are host-only teaching context (a misconception to watch for,
 * how strictly to grade a borderline phrasing). 600 characters keeps the host
 * panel scannable mid-lesson — the same budget as `MAX_NOTES_LENGTH`.
 */
export const MAX_FINAL_NOTES_LENGTH = 600

/**
 * Maximum length of a captured exact response.
 *
 * Rationale: an exact response is what a team wrote down and the host typed in.
 * It is a phrase, not an essay, and it is projected at that team's reveal, so it
 * shares the answer budget rather than the prompt budget.
 */
export const MAX_FINAL_RESPONSE_LENGTH = 300

/**
 * The wager cap used for a team whose pre-final score is zero or negative when
 * NO preceding ordinary category-board clue value exists.
 *
 * Rationale: CQS-OD-006 defines the non-positive-team cap as "the highest
 * positive effective ordinary category-board tile value among rounds preceding
 * Final". A Final with no preceding board (a Final-only game) has no such value,
 * so the cap is zero — the team plays Final for the record with an explicit zero
 * wager rather than being handed an invented headroom nobody authored.
 */
export const NO_PRECEDING_CLUE_WAGER_CAP = 0

/**
 * The smallest legal wager. Zero is a real, explicit choice — a team that
 * refuses to risk anything still participates, is still adjudicated, and still
 * produces an auditable settlement.
 */
export const MIN_FINAL_WAGER = 0
