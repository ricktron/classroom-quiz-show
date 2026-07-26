/**
 * Bounded-input limits for team configuration (Slice 6).
 *
 * Every limit has a stated CLASSROOM reason, following the Slice 4/5 bounded
 * input philosophy: an out-of-range value is REJECTED with an actionable
 * message, never truncated, renamed, or repaired into validity.
 *
 * The governing constraints are a projector at 1280×720 read from the back of a
 * room, and a single teacher driving the whole game from one laptop.
 */

/**
 * Minimum number of teams when the `teams` field is present.
 *
 * ONE team is deliberately allowed. A single-team game is genuinely useful: a
 * whole-class review where the class plays as one side against the board, an
 * individual practice run, or a demonstration of the app. Rejecting it would
 * remove a real classroom mode for no safety benefit. A game with NO teams is
 * also valid — omit the field entirely (that is exactly the Slice 5 board,
 * which scores nothing).
 */
export const MIN_TEAMS = 1

/**
 * Maximum number of teams.
 *
 * Rationale: the projector scoreboard must stay legible from the back of a
 * classroom. At 1280×720 eight team cards is the point at which names and
 * scores are still readable side by side (wrapping to two rows); beyond that the
 * type shrinks below comfortable reading size. Eight also matches the accent
 * palette, so every team can have a distinct accent. A class of 30 splits
 * naturally into 4–6 teams, so eight is a generous ceiling rather than a target.
 */
export const MAX_TEAMS = 8

/**
 * Maximum team-name length.
 *
 * Rationale: a name is projected inside one scoreboard card roughly 200 px wide
 * at 720p. 40 characters wraps to at most two lines at a readable size, and is
 * long enough for "Ms. Garnett's 4th Period Titans".
 */
export const MAX_TEAM_NAME_LENGTH = 40

/**
 * Maximum length of a team id. Mirrors the canonical `MAX_ID_LENGTH` so team ids
 * obey exactly the same rules as game and round ids.
 */
export const TEAM_MAX_ID_LENGTH = 64

/**
 * Identifier grammar for team ids.
 *
 * This deliberately mirrors the canonical game-file identifier grammar
 * (`ID_PATTERN` in `src/import/canonicalFormat.ts`) rather than importing it:
 * the game domain must not depend on the import layer. A test asserts the two
 * patterns stay identical so they cannot drift apart.
 *
 * Note the leading-alphanumeric rule also means a team id can never be
 * `__proto__`, `constructor`, or `prototype`.
 */
export const TEAM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Maximum length accepted for the RAW `accent` string before it is checked
 * against the palette. It exists only so a pathological value produces a clean
 * length error instead of a huge echoed message; the real check is palette
 * membership.
 */
export const MAX_TEAM_ACCENT_LENGTH = 32
