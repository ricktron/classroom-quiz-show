/**
 * The application-controlled team accent palette (Slice 6).
 *
 * A team may carry a presentation accent, but imported content may only NAME a
 * token from this fixed list. It can never supply a colour, a gradient, a CSS
 * declaration, a class name, or any other style value: the token is mapped to a
 * CSS class by application code, and an unrecognized token is REJECTED at the
 * import boundary rather than passed through.
 *
 * That keeps the theme boundary honest (GAME-ENGINE-BOUNDARIES §8): accents are
 * presentation only, they never affect scoring, validation, event semantics, or
 * the private→public boundary, and a future theme engine can redefine what each
 * token *looks* like without touching a single game file.
 *
 * Accessibility: an accent is always SUPPLEMENTAL. Every surface that uses one
 * also renders the team's name as text, so no information is conveyed by colour
 * alone. Two teams may deliberately share an accent — identity is the stable
 * team id and the visible name, never the colour.
 */

/**
 * The palette, in the order used to assign defaults. Eight tokens, matching
 * `MAX_TEAMS`, so an eight-team game can give every team a distinct accent
 * without the teacher choosing one.
 */
export const TEAM_ACCENTS = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
] as const

export type TeamAccent = (typeof TEAM_ACCENTS)[number]

const TEAM_ACCENT_SET: ReadonlySet<string> = new Set(TEAM_ACCENTS)

/** Runtime guard. Used at the import boundary and again at the public boundary. */
export function isTeamAccent(value: unknown): value is TeamAccent {
  return typeof value === 'string' && TEAM_ACCENT_SET.has(value)
}

/**
 * The accent a team gets when it does not author one: the palette entry at its
 * authored position, wrapping if there are somehow more teams than tokens.
 *
 * This default is applied ONLY by the trusted domain constructor
 * (`createTeamDefinitions`), never by a Zod `.default()`/`.transform()` — the
 * same rule the category board's `multiplier` default follows, so the import
 * boundary keeps reporting exactly what was authored.
 *
 * It is a pure function of the index, so it is deterministic across replays and
 * across host and display.
 */
export function defaultTeamAccent(index: number): TeamAccent {
  if (!Number.isInteger(index)) return TEAM_ACCENTS[0]
  const length = TEAM_ACCENTS.length
  return TEAM_ACCENTS[((index % length) + length) % length]
}

/** The CSS class that renders an accent. Application-controlled, never authored. */
export function teamAccentClass(accent: TeamAccent): string {
  return `accent--${accent}`
}
