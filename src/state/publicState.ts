/**
 * PUBLIC (projector-safe) state.
 *
 * This module is the ONLY state-shape module the display surface is allowed to
 * import. It deliberately imports nothing from the private state, the store, the
 * reducer, commands, or events. Keeping it dependency-free is a structural
 * guarantee that a display component cannot accidentally pull a private type (or
 * a private value along with it) into the projector bundle.
 *
 * `PublicState` is an explicit allow-list: every field here is safe to show on a
 * classroom projector. There is no `[key: string]` index signature and no
 * `unknown`/`any` escape hatch, so the type itself cannot grow a private field
 * by accident — adding one is a deliberate, reviewable edit.
 *
 * See docs/architecture/GAME-ENGINE-BOUNDARIES.md (§4) and ADR-002.
 */

/**
 * Bump when the PublicState wire shape changes incompatibly. Slice 3 added the
 * `game` field (1 → 2); Slice 5 added the `round` field (2 → 3); Slice 6 adds the
 * `teams` field (3 → 4). A display expecting an older shape fails closed on the
 * version mismatch — an old wire shape is never reinterpreted, guessed at, or
 * upgraded, and version 3 is never re-read as though it were version 4.
 */
export const PUBLIC_STATE_SCHEMA_VERSION = 4 as const

/**
 * Coarse, public-safe lifecycle phase. This is intentionally NOT the private
 * lifecycle: it never distinguishes internal host-only states and never carries
 * a session id, counter, notes, or diagnostics.
 */
export type PublicPhase = 'no-session' | 'ready' | 'waiting'

/**
 * Neutral, display-safe availability of the current round.
 *  - `none` — no round is selected (or the game has ended).
 *  - `available` — a supported round is current.
 *  - `unavailable` — the current round's type is unsupported; the display fails
 *    closed to a neutral "unavailable" state and reveals nothing about why.
 */
export type PublicRoundAvailability = 'none' | 'available' | 'unavailable'

/**
 * The ONLY game information the display may see. It is deliberately minimal and
 * derived: counts and a 1-based ordinal, a coarse status, and a neutral
 * availability. It never carries the game title, round ids, round-type
 * identifiers, round labels, or any authored config — those stay private.
 */
export interface PublicGameView {
  /** Whether the game is still active or has ended. */
  readonly status: 'active' | 'ended'
  /** Total number of rounds in the game. */
  readonly roundCount: number
  /** 1-based ordinal of the current round, or `null` when none is selected. */
  readonly currentRound: number | null
  /** Neutral availability of the current round. */
  readonly roundAvailability: PublicRoundAvailability
}

/**
 * ── Category-board public DTO (Slice 5) ──────────────────────────────────────
 *
 * This is a **current-stage-only** DTO, not the board definition with private
 * fields blanked out. At `board` stage the payload carries categories and tile
 * values and NOTHING else; from `selected` onward it carries one selection and
 * NOT the rest of the board. There is therefore no "hidden" prompt or answer
 * sitting in the projector's memory waiting to be inspected — the content for
 * unselected tiles is simply never sent.
 *
 * Never present at any stage, by construction: teacher notes, alternate
 * answers, authored category/tile ids, round ids, round-type identifiers, the
 * imported document, import diagnostics, registry internals, event history, or
 * which host controls are available.
 */

/**
 * The PRESENTATION discriminator for a board-style round.
 *
 * It is deliberately NOT the registry round-type string (`category-board`).
 * The projector must never carry an internal round-type identifier — that is
 * the same rule `PublicGameView` follows — and keeping the wire discriminator
 * separate also means a future round type with the same presentation can reuse
 * this renderer without the wire format naming a registry entry.
 */
export const PUBLIC_BOARD_KIND = 'board' as const

/** One tile as the projector sees it: a display value and whether it is spent. */
export interface PublicCategoryBoardTile {
  /**
   * Opaque, position-derived rendering key (e.g. `c1t3`). It is NOT the
   * authored tile id: authored ids are teacher-written content and can hint at
   * an answer, so the projector gets a neutral positional key instead.
   */
  readonly key: string
  /** The number printed on the tile — the effective (multiplied) value. */
  readonly value: number
  /** Whether this tile has already been played. */
  readonly used: boolean
}

/** One board column as the projector sees it: a public title and its tiles. */
export interface PublicCategoryBoardCategory {
  /** Opaque, position-derived rendering key (e.g. `c1`). Not the authored id. */
  readonly key: string
  /** The authored, public-facing category title. */
  readonly title: string
  readonly tiles: readonly PublicCategoryBoardTile[]
}

/**
 * The currently selected tile as the projector sees it. `prompt` is `null`
 * until the host reveals it, and `answer` is `null` until the host reveals
 * that; there is no field that "contains the answer but is not rendered".
 */
export interface PublicCategoryBoardSelection {
  /** The selected tile's category title. */
  readonly categoryTitle: string
  /** The selected tile's effective display value. */
  readonly value: number
  /** The prompt, or `null` before the prompt reveal. */
  readonly prompt: string | null
  /**
   * The canonical answer, or `null` before the answer reveal. Alternates are
   * deliberately NOT projected — they are a host grading aid.
   */
  readonly answer: string | null
}

/**
 * The public category-board state, discriminated by stage. The two variants
 * carry disjoint data, which is what makes "the board is not sent while a tile
 * is open" a type-level fact rather than a rendering convention.
 *
 * The `selected` stage intentionally publishes the category and value only —
 * enough for the class to see what was chosen, with no prompt text yet.
 */
export type PublicCategoryBoardState =
  | {
      readonly kind: typeof PUBLIC_BOARD_KIND
      readonly stage: 'board'
      readonly categories: readonly PublicCategoryBoardCategory[]
    }
  | {
      readonly kind: typeof PUBLIC_BOARD_KIND
      readonly stage: 'selected' | 'prompt' | 'answer'
      readonly selection: PublicCategoryBoardSelection
    }

/**
 * The public state of the current round. A union of one today; further playable
 * round types add members here, each with its own allow-listed DTO.
 */
export type PublicRoundState = PublicCategoryBoardState

/**
 * ── Team scoreboard public DTO (Slice 6) ─────────────────────────────────────
 *
 * The scoreboard IS public: a class must be able to see the score. So unlike the
 * board DTO this one is not stage-dependent — it is present at every stage, and
 * it stays present when the game ends so final results can be read.
 *
 * What it deliberately never carries, at any point: the authored team id, the
 * private import diagnostics that produced the teams, the score EVENT history,
 * any undo metadata, the host's currently selected scoring target, which host
 * controls exist, or any style value. Colour is one token from a fixed
 * application palette, and it is always supplemental to the visible name.
 */

/** One team as the projector sees it. */
export interface PublicTeam {
  /**
   * Opaque, position-derived rendering key (e.g. `t0`). It is NOT the authored
   * team id — the same rule the board DTO follows, so authored identifiers never
   * travel to the projector even when they look harmless.
   */
  readonly key: string
  /** The authored, public-facing team name. */
  readonly name: string
  /**
   * One token from the application's fixed accent palette. It is a NAME, never a
   * colour or a style string, so the projector cannot be handed arbitrary CSS.
   */
  readonly accent: string
  /** The team's current score: an integer, possibly negative. */
  readonly score: number
}

/**
 * The scoreboard, discriminated so "we cannot safely show the scores" is an
 * explicit public state rather than a silently missing scoreboard. A projector
 * that shows nothing is indistinguishable from one that is broken; a projector
 * that says "Scores unavailable" tells the teacher something is wrong.
 */
export type PublicTeamsState =
  | { readonly status: 'available'; readonly teams: readonly PublicTeam[] }
  | { readonly status: 'unavailable' }

/**
 * Wire-level accent grammar: a short lower-case token and nothing else.
 *
 * This module stays dependency-free on purpose (see the file header), so it does
 * NOT import the accent palette. Instead it enforces the SHAPE that makes a style
 * injection impossible — no spaces, braces, semicolons, colons, parentheses,
 * `url(`, or `#rrggbb` can match — while palette membership is enforced by the
 * host sanitizer and again by the display's own token map. Three independent
 * checks, none of which relies on the other two.
 *
 * The same mirroring convention as `CATEGORY_BOARD_ID_PATTERN`: a test asserts
 * every real palette token matches this pattern, so the two cannot drift apart.
 */
export const PUBLIC_TEAM_ACCENT_PATTERN = /^[a-z][a-z0-9-]{0,31}$/

/**
 * Wire-level score bound, deliberately mirroring the domain's
 * `MAX_TEAM_SCORE`/`MIN_TEAM_SCORE` rather than importing them (same reason as
 * above). A test asserts the two stay equal.
 */
export const PUBLIC_TEAM_SCORE_LIMIT = 1_000_000

function isPublicTeam(value: unknown): value is PublicTeam {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    v.key.length > 0 &&
    typeof v.name === 'string' &&
    typeof v.accent === 'string' &&
    PUBLIC_TEAM_ACCENT_PATTERN.test(v.accent) &&
    typeof v.score === 'number' &&
    Number.isInteger(v.score) &&
    Math.abs(v.score) <= PUBLIC_TEAM_SCORE_LIMIT
  )
}

/**
 * Strict guard for the scoreboard DTO (or `null`).
 *
 * A malformed score — a float, a `NaN`, an out-of-range total, a missing name, an
 * accent that is not a plain token — fails the whole snapshot, so the display
 * falls back to its last safe state rather than rendering `NaN` on a projector.
 */
export function isPublicTeamsState(value: unknown): value is PublicTeamsState | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.status === 'unavailable') return v.teams === undefined
  if (v.status !== 'available') return false
  return Array.isArray(v.teams) && v.teams.every(isPublicTeam)
}

/** The complete set of information the display shell is permitted to render. */
export interface PublicState {
  /** Wire-shape version so the display can fail closed on an unknown shape. */
  readonly schemaVersion: typeof PUBLIC_STATE_SCHEMA_VERSION
  /**
   * Monotonic revision (never decreases for a given host session). Used purely
   * for transport ordering / de-duplication; carries no private meaning.
   */
  readonly revision: number
  /** Coarse public phase. */
  readonly phase: PublicPhase
  /** Short public headline safe for the projector. */
  readonly headline: string
  /** Secondary public line safe for the projector. */
  readonly detail: string
  /** Safe, derived game view, or `null` when no game is loaded. */
  readonly game: PublicGameView | null
  /**
   * Public state of the current round, or `null` when the current round has no
   * public presentation (no round selected, a non-playable round type, an ended
   * game, or a round whose projection failed and therefore fails closed).
   */
  readonly round: PublicRoundState | null
  /**
   * The public scoreboard, or `null` when the game configures NO teams (and so
   * has no scoreboard at all — that is the Slice 5 board, unchanged).
   */
  readonly teams: PublicTeamsState | null
}

/**
 * The safe default the display shows before it has received any host state, and
 * the state it falls back to if everything else fails. It is a valid
 * `PublicState` describing "no host yet".
 */
export const INITIAL_PUBLIC_STATE: PublicState = {
  schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
  revision: 0,
  phase: 'no-session',
  headline: 'Waiting for the host',
  detail: 'No active round.',
  game: null,
  round: null,
  teams: null,
}

const PUBLIC_PHASES: readonly PublicPhase[] = ['no-session', 'ready', 'waiting']
const PUBLIC_ROUND_AVAILABILITIES: readonly PublicRoundAvailability[] = [
  'none',
  'available',
  'unavailable',
]

/** Strict guard for the nested game view (or `null`). */
function isPublicGameView(value: unknown): value is PublicGameView {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.status === 'active' || v.status === 'ended') &&
    typeof v.roundCount === 'number' &&
    Number.isFinite(v.roundCount) &&
    (v.currentRound === null ||
      (typeof v.currentRound === 'number' && Number.isFinite(v.currentRound))) &&
    typeof v.roundAvailability === 'string' &&
    (PUBLIC_ROUND_AVAILABILITIES as readonly string[]).includes(v.roundAvailability)
  )
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isPublicCategoryBoardTile(value: unknown): value is PublicCategoryBoardTile {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    typeof v.value === 'number' &&
    Number.isFinite(v.value) &&
    typeof v.used === 'boolean'
  )
}

function isPublicCategoryBoardCategory(value: unknown): value is PublicCategoryBoardCategory {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    typeof v.title === 'string' &&
    Array.isArray(v.tiles) &&
    v.tiles.every(isPublicCategoryBoardTile)
  )
}

function isPublicCategoryBoardSelection(value: unknown): value is PublicCategoryBoardSelection {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.categoryTitle === 'string' &&
    typeof v.value === 'number' &&
    Number.isFinite(v.value) &&
    isNullableString(v.prompt) &&
    isNullableString(v.answer)
  )
}

/**
 * Strict guard for the round DTO (or `null`). It validates the stage/payload
 * PAIRING, not just the field types: a `board` stage carrying a `selection`, or
 * a `prompt` stage carrying `categories`, is rejected outright rather than
 * rendered partially. That is what makes an impossible reveal stage fail closed
 * at the display instead of being guessed at.
 */
export function isPublicRoundState(value: unknown): value is PublicRoundState | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.kind !== PUBLIC_BOARD_KIND) return false

  if (v.stage === 'board') {
    return (
      Array.isArray(v.categories) &&
      v.categories.every(isPublicCategoryBoardCategory) &&
      v.selection === undefined
    )
  }
  if (v.stage === 'selected' || v.stage === 'prompt' || v.stage === 'answer') {
    return isPublicCategoryBoardSelection(v.selection) && v.categories === undefined
  }
  return false
}

/**
 * Runtime validator used at BOTH trust boundaries:
 *  - the host re-checks its own projected state before broadcasting, and
 *  - the display validates every decoded message before rendering it.
 *
 * It is strict on purpose: unexpected extra fields are tolerated (a forward-
 * compatible sender), but any missing/mis-typed allow-listed field, or an
 * unknown schema version, causes a hard reject so the display fails closed.
 */
export function isPublicState(value: unknown): value is PublicState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === PUBLIC_STATE_SCHEMA_VERSION &&
    typeof v.revision === 'number' &&
    Number.isFinite(v.revision) &&
    typeof v.phase === 'string' &&
    (PUBLIC_PHASES as readonly string[]).includes(v.phase) &&
    typeof v.headline === 'string' &&
    typeof v.detail === 'string' &&
    isPublicGameView(v.game) &&
    isPublicRoundState(v.round) &&
    isPublicTeamsState(v.teams)
  )
}
