/**
 * PUBLIC (projector-safe) state.
 *
 * This module is the ONLY state-shape module the display surface is allowed to
 * import. It deliberately imports nothing from the private state, the store, the
 * reducer, commands, or events. Keeping it free of those dependencies is a
 * structural guarantee that a display component cannot accidentally pull a
 * private type (or a private value along with it) into the projector bundle.
 *
 * Slice 11 adds one narrow, Zod-free import from `game/media/limits` so the
 * public prompt guard shares the same same-origin path grammar as import —
 * without pulling the authored Zod schema into the projector path.
 *
 * `PublicState` is an explicit allow-list: every field here is safe to show on a
 * classroom projector. There is no `[key: string]` index signature and no
 * `unknown`/`any` escape hatch, so the type itself cannot grow a private field
 * by accident — adding one is a deliberate, reviewable edit.
 *
 * See docs/architecture/GAME-ENGINE-BOUNDARIES.md (§4) and ADR-002.
 */

import { isValidSameOriginPath } from '../game/media/limits'

/**
 * Bump when the PublicState wire shape changes incompatibly. Slice 3 added the
 * `game` field (1 → 2); Slice 5 added the `round` field (2 → 3); Slice 6 added
 * the `teams` field (3 → 4); Slice 7 added the `response` field (4 → 5); Slice 8
 * added the required `buzz` field INSIDE `response` (5 → 6); Slice 11 changes
 * `PublicCategoryBoardSelection.prompt` from a bare string to
 * `PublicPromptContent` (6 → 7); Slice 14 adds a second member to
 * `PublicRoundState` — the Final Wager DTO (7 → 8). A display expecting an older
 * shape fails closed on the version mismatch — an old wire shape is never
 * reinterpreted, guessed at, or upgraded, and version 7 is never re-read as
 * though it were version 8.
 *
 * The Slice 11 bump is deliberate: a version-6 display that received an image
 * object in `prompt` would coerce it to `"[object Object]"` or crash, and a
 * version-7 display that received a bare string would treat media as missing.
 * That is exactly the implicit compatibility guessing ADR-004 forbids.
 *
 * The Slice 14 bump is deliberate for the same class of reason: a version-7
 * display validates `round` with a guard that accepts only `kind: 'board'`, so a
 * Final payload would fail that guard and freeze the projector on its last board
 * snapshot — a class would watch a stale board through the whole Final round with
 * no indication anything was wrong. Failing closed on the VERSION instead makes
 * the mismatch visible and unambiguous.
 */
export const PUBLIC_STATE_SCHEMA_VERSION = 8 as const

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
 * Projector-safe prompt content (Slice 11). Mirrors the trusted domain
 * `PromptContent` allow-list: text, or a static image with a same-origin path.
 * Unknown kinds are rejected by the runtime guard — never reinterpreted.
 */
export type PublicPromptContent =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'image'
      readonly source: { readonly kind: 'same-origin-path'; readonly path: string }
      readonly alt: string
      readonly caption: string | null
      readonly attribution: string | null
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
  /** The prompt content, or `null` before the prompt reveal. */
  readonly prompt: PublicPromptContent | null
  /**
   * The canonical answer, or `null` before the answer reveal. Alternates are
   * deliberately NOT projected — they are a host grading aid. Answers remain
   * plain strings (media applies to prompts only).
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
 * ── Final Wager public DTO (Slice 14) ────────────────────────────────────────
 *
 * The projector's view of the closing wager round. Like the board DTO this is a
 * **current-stage-only** payload, not the Final definition with private fields
 * blanked out: the prompt is not sent until the host opens the response window,
 * the answer is not sent until the host reveals it, and a team's wager and
 * response are not sent until that team is revealed. There is therefore no hidden
 * wager, response or answer sitting in the projector's memory waiting to be
 * inspected — the content is simply never sent.
 *
 * Never present at any stage, by construction: unrevealed wagers, unrevealed
 * responses, host notes, alternate answers, pending correctness, the eligibility
 * mode, the wager caps, the pre-final score snapshot, authored team or round ids,
 * the round-type identifier, the reveal order, event history, undo metadata,
 * timer ids, `issuedAt`/`occurredAt`, or host-writer lease data.
 */

/**
 * The PRESENTATION discriminator for a Final round.
 *
 * Deliberately NOT the registry round-type string (`final-wager`), for the same
 * reason {@link PUBLIC_BOARD_KIND} is not `category-board`: the projector must
 * never carry an internal round-type identifier, and a wire discriminator kept
 * separate from the registry means a future round type with the same
 * presentation can reuse this renderer without the wire naming a registry entry.
 */
export const PUBLIC_FINAL_KIND = 'final' as const

/** One revealed team's response, as the projector sees it. */
export type PublicFinalResponse =
  | { readonly kind: 'exact'; readonly text: string }
  | { readonly kind: 'not-captured' }
  | { readonly kind: 'no-response' }

/** A settled team's outcome and the points it moved. Present only after settlement. */
export interface PublicFinalSettlement {
  readonly outcome: 'correct' | 'incorrect' | 'no-response'
  /** The signed change applied to that team's score. Never a resulting total. */
  readonly delta: number
}

/**
 * The team currently on screen in the reveal sequence.
 *
 * It names the team by its POSITIONAL key (`t0`, `t1`, …) — the same key
 * {@link PublicTeam} carries — so the display looks the name up from the
 * scoreboard it already has and no authored team id ever travels.
 *
 * `settlement` is `null` between the reveal and the host's adjudication, which is
 * what makes "correctness is not public until the host settles" a shape-level
 * fact rather than a rendering convention.
 */
export interface PublicFinalReveal {
  readonly teamKey: string
  readonly response: PublicFinalResponse
  readonly wager: number
  readonly settlement: PublicFinalSettlement | null
}

/** How Final finished: one team ahead, or a shared lead. */
export type PublicFinalOutcome = 'unique-leader' | 'tied'

/**
 * The public Final state, discriminated by stage. The variants carry disjoint
 * data, which is what makes "the prompt is not sent before the response window"
 * and "no wager is sent before its team's reveal" type-level facts.
 */
export type PublicFinalWagerState =
  | { readonly kind: typeof PUBLIC_FINAL_KIND; readonly stage: 'setup' }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'wager-entry'
      /** Generic countdown only. The class sees time, never anyone's wager. */
      readonly timer: PublicResponseTimer
    }
  | { readonly kind: typeof PUBLIC_FINAL_KIND; readonly stage: 'wagers-locked' }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'response-entry'
      readonly prompt: PublicPromptContent
      readonly timer: PublicResponseTimer
    }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'responses-locked'
      readonly prompt: PublicPromptContent
    }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'answer-revealed'
      readonly prompt: PublicPromptContent
      readonly answer: string
    }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'team-reveal'
      readonly prompt: PublicPromptContent
      readonly answer: string
      readonly reveal: PublicFinalReveal
    }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'resolution'
      /**
       * `null` when Final resolved without a question ever going public — a
       * Classic Final in which no team qualified. The class sees the result, and
       * no prompt is fabricated for a round nobody played.
       */
      readonly prompt: PublicPromptContent | null
      readonly answer: string | null
      /**
       * The LAST team revealed, kept on screen beside the result.
       *
       * Settling the final team is the climax of the whole game, and blanking
       * that team the instant it is judged — exactly when a class is looking at
       * it — would be the projector taking the moment away. It is `null` only
       * when no team was ever revealed.
       */
      readonly reveal: PublicFinalReveal | null
      readonly outcome: PublicFinalOutcome
    }
  | { readonly kind: typeof PUBLIC_FINAL_KIND; readonly stage: 'sudden-death' }
  | {
      readonly kind: typeof PUBLIC_FINAL_KIND
      readonly stage: 'complete'
      readonly outcome: PublicFinalOutcome
    }

/**
 * The public state of the current round. Two members: the board (Slice 5) and
 * Final (Slice 14). Further playable round types add members here, each with its
 * own allow-listed DTO and its own exact-key guard.
 */
export type PublicRoundState = PublicCategoryBoardState | PublicFinalWagerState

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

/**
 * ── Response-phase public DTO (Slice 7) ──────────────────────────────────────
 *
 * The countdown and the armed light ARE public: a class has to see how long is
 * left and whether the buzzers (one day) are live. So this DTO is deliberately
 * present at the one stage where it means something — the open, prompt-revealed
 * clue — and absent everywhere else.
 *
 * ## A deadline, not a tick stream
 *
 * A running timer is projected as its ABSOLUTE deadline plus the configured
 * duration, and the display derives "how long is left" locally against its own
 * clock. The host does not publish a revision per second: the sync channel drops
 * non-newer envelopes and is a snapshot transport, not a frame transport
 * (`ROADMAP-AMENDMENT-001` §5.3). A paused, interrupted or expired timer carries
 * no deadline at all, because there is nothing counting down.
 *
 * ## What it deliberately never carries
 *
 * The internal `timerId`, the interruption SOURCE, which host controls exist, the
 * authored timer block, the round id, the private phase map, and — added in Slice
 * 8 — every trace of the input that produced a buzz: no key code, no mapping, no
 * device, no adapter name, no diagnostics. "Stopped" is all a class needs to know
 * about the clock; who is answering arrives through {@link PublicBuzzState}
 * instead, deliberately and separately.
 */

/**
 * ── Buzz-queue public DTO (Slice 8) ──────────────────────────────────────────
 *
 * **Who is answering IS public** — that is the whole point of a buzzer in a
 * classroom, and a class that cannot see it will just shout. So the active
 * respondent is projected.
 *
 * **The full waiting order is deliberately NOT public.** The projector carries the
 * active team and a COUNT of teams waiting; the host panel carries the full
 * ordered queue. Three reasons, and the decision is recorded rather than assumed:
 *
 * 1. *Smallest useful surface.* The class needs to know who has the floor. Naming
 *    everyone who was a fraction slower adds no classroom value.
 * 2. *It is a leaderboard by another name.* A public ranked list of who reacted
 *    fastest is precisely the reaction-time claim this project refuses to make
 *    (`ROADMAP-AMENDMENT-001` §5.7) — and the count still tells a class that
 *    others are waiting, which is the useful part.
 * 3. *Projector legibility.* One name plus "2 waiting" stays readable from the
 *    back of a room; a five-row ordered list under a live clue does not.
 *
 * The active team is named by its POSITIONAL key (`t0`, `t1`, …), the same key
 * {@link PublicTeam} already carries, so the display looks the name up from the
 * scoreboard it already has. The authored team id never travels, and the name is
 * never duplicated onto a second field that could drift from the first.
 */

/**
 * The projector-visible buzz state, discriminated by status.
 *
 *  - `none`      — nobody has buzzed for this clue yet.
 *  - `active`    — a team has the floor, with a count of teams still waiting.
 *  - `exhausted` — every team that buzzed has had its turn, and none is left.
 *
 * `exhausted` is a distinct member rather than "active with nobody active",
 * because a class seeing "no one is answering" after three teams tried is in a
 * completely different situation from one where nobody has pressed anything, and
 * a projector must not make the two look identical.
 */
export type PublicBuzzState =
  | { readonly status: 'none' }
  | {
      readonly status: 'active'
      /** Positional key of the team answering — matches {@link PublicTeam.key}. */
      readonly activeTeamKey: string
      /** How many teams are queued behind it. Never a list, never an order. */
      readonly waitingCount: number
    }
  | { readonly status: 'exhausted' }

/** Wire-level bound on the waiting count, mirroring `MAX_TEAMS`. A test asserts they match. */
export const PUBLIC_MAX_WAITING_COUNT = 8

/** Wire-level grammar for a positional team key. Deliberately not the authored id. */
export const PUBLIC_TEAM_KEY_PATTERN = /^t[0-9]{1,2}$/

function isPublicBuzzState(value: unknown): value is PublicBuzzState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  switch (v.status) {
    case 'none':
    case 'exhausted':
      return v.activeTeamKey === undefined && v.waitingCount === undefined
    case 'active':
      return (
        typeof v.activeTeamKey === 'string' &&
        PUBLIC_TEAM_KEY_PATTERN.test(v.activeTeamKey) &&
        typeof v.waitingCount === 'number' &&
        Number.isInteger(v.waitingCount) &&
        v.waitingCount >= 0 &&
        v.waitingCount <= PUBLIC_MAX_WAITING_COUNT
      )
    default:
      return false
  }
}

/** The projector-visible timer, discriminated by status. */
export type PublicResponseTimer =
  | { readonly status: 'idle' }
  | {
      readonly status: 'running'
      /** The window that was started, so a progress bar needs no second value. */
      readonly durationMs: number
      /** Absolute instant the window ends, on the HOST's clock. */
      readonly deadline: number
    }
  | { readonly status: 'paused'; readonly durationMs: number; readonly remainingMs: number }
  | { readonly status: 'expired'; readonly durationMs: number }
  | {
      readonly status: 'interrupted'
      readonly durationMs: number
      readonly remainingMs: number
    }

/** The projector-visible response phase: the armed light, the timer and the queue. */
export interface PublicResponseState {
  /** Whether the clue is armed. Rendered as words, never as colour alone. */
  readonly armed: boolean
  readonly timer: PublicResponseTimer
  /**
   * Who has the floor (Slice 8). Required, not optional — see the version note on
   * {@link PUBLIC_STATE_SCHEMA_VERSION}.
   */
  readonly buzz: PublicBuzzState
}

/**
 * Upper bound for a projected duration, mirroring `MAX_RESPONSE_SECONDS` rather
 * than importing it (this module stays dependency-free — see the file header). A
 * test asserts the two stay equal.
 */
export const PUBLIC_MAX_TIMER_DURATION_MS = 600_000

function isBoundedDurationMs(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PUBLIC_MAX_TIMER_DURATION_MS
  )
}

function isPublicResponseTimer(value: unknown): value is PublicResponseTimer {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  switch (v.status) {
    case 'idle':
      return true
    case 'running':
      return (
        isBoundedDurationMs(v.durationMs) &&
        typeof v.deadline === 'number' &&
        Number.isInteger(v.deadline) &&
        v.deadline >= 0
      )
    case 'paused':
    case 'interrupted':
      return isBoundedDurationMs(v.durationMs) && isBoundedDurationMs(v.remainingMs)
    case 'expired':
      return isBoundedDurationMs(v.durationMs)
    default:
      return false
  }
}

/**
 * Strict guard for the response DTO (or `null`).
 *
 * Like the round guard it validates the status/payload PAIRING, not just field
 * types: a `paused` timer carrying a deadline, or a `running` one carrying a
 * leftover remaining value, is rejected outright rather than rendered. A
 * malformed timer fails the whole snapshot, so the display keeps its last safe
 * state instead of putting `NaN` on a projector.
 */
export function isPublicResponseState(value: unknown): value is PublicResponseState | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.armed !== 'boolean') return false
  if (!isPublicResponseTimer(v.timer)) return false
  if (!isPublicBuzzState(v.buzz)) return false
  const timer = v.timer as Record<string, unknown>
  // Pairing checks: no field may be present that the status does not define.
  if (timer.status === 'running' && timer.remainingMs !== undefined) return false
  if ((timer.status === 'paused' || timer.status === 'interrupted') && timer.deadline !== undefined) {
    return false
  }
  if (timer.status === 'expired' && (timer.deadline !== undefined || timer.remainingMs !== undefined)) {
    return false
  }
  return true
}

/**
 * How much of the window is left, from the display's point of view.
 *
 * `hostNow` must be the display's own clock reading ALREADY corrected by the
 * estimated host offset (`receiver.ts`), so a deadline computed on the host is
 * compared against an instant on the same notional clock. The caller supplies the
 * reading; this function reads no clock, so a test can ask "what would the
 * projector show 12 seconds in?" without waiting 12 seconds.
 *
 * The result is clamped to `0 … durationMs`: a projector never shows a negative
 * countdown, and a corrected clock can never make it show more than the window
 * that was actually started. Reaching zero is NOT expiry — the display keeps
 * showing `running` at 0:00 until the host publishes the authoritative `expired`
 * status, because only the host may end a window (ADR-007 §10).
 */
export function publicRemainingMsAt(timer: PublicResponseTimer, hostNow: number): number {
  switch (timer.status) {
    case 'running':
      return clampPublicDuration(timer.deadline - hostNow, timer.durationMs)
    case 'paused':
    case 'interrupted':
      return clampPublicDuration(timer.remainingMs, timer.durationMs)
    case 'expired':
    case 'idle':
    default:
      return 0
  }
}

function clampPublicDuration(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value > max ? max : value
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
  /**
   * The response phase of the live clue — arming and the timer — or `null` when
   * there is nothing to show: no open clue, a clue that has been neither armed nor
   * timed, a non-playable round, or an ended game. A projector therefore shows a
   * timer panel only while one genuinely exists.
   */
  readonly response: PublicResponseState | null
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
  response: null,
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

const PUBLIC_TEXT_PROMPT_KEYS = ['kind', 'text'] as const
const PUBLIC_IMAGE_PROMPT_KEYS = ['kind', 'source', 'alt', 'caption', 'attribution'] as const
const PUBLIC_IMAGE_SOURCE_KEYS = ['kind', 'path'] as const

/** Exact-key check — unknown nested media fields reject the snapshot. */
function hasExactOwnKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value)
  if (actual.length !== keys.length) return false
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) return false
  }
  return true
}

function isPublicTextPrompt(v: Record<string, unknown>): boolean {
  return (
    hasExactOwnKeys(v, PUBLIC_TEXT_PROMPT_KEYS) &&
    typeof v.text === 'string' &&
    v.text.length > 0
  )
}

function isPublicImageSource(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const source = value as Record<string, unknown>
  return (
    hasExactOwnKeys(source, PUBLIC_IMAGE_SOURCE_KEYS) &&
    source.kind === 'same-origin-path' &&
    typeof source.path === 'string' &&
    isValidSameOriginPath(source.path)
  )
}

function isPublicImagePrompt(v: Record<string, unknown>): boolean {
  return (
    hasExactOwnKeys(v, PUBLIC_IMAGE_PROMPT_KEYS) &&
    typeof v.alt === 'string' &&
    v.alt.length > 0 &&
    (v.caption === null || typeof v.caption === 'string') &&
    (v.attribution === null || typeof v.attribution === 'string') &&
    isPublicImageSource(v.source)
  )
}

/**
 * Strict guard for public prompt content. Unknown kinds, unknown nested keys,
 * and illegal paths fail closed — a bare string is NOT accepted on wire
 * version 7 (legacy strings are normalized before projection).
 *
 * Path validation uses the same `isValidSameOriginPath` helper as import so
 * the authored and public boundaries cannot drift. `limits.ts` is Zod-free, so
 * the display bundle does not pull the schema module.
 */
export function isPublicPromptContent(value: unknown): value is PublicPromptContent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const v = value as Record<string, unknown>

  if (v.kind === 'text') return isPublicTextPrompt(v)
  if (v.kind === 'image') return isPublicImagePrompt(v)
  return false
}

function isNullablePublicPrompt(value: unknown): value is PublicPromptContent | null {
  return value === null || isPublicPromptContent(value)
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
    isNullablePublicPrompt(v.prompt) &&
    isNullableString(v.answer)
  )
}

/**
 * The EXACT key set each Final stage is allowed to carry.
 *
 * Final has more stages than the board, and its variants differ by one field at a
 * time (a timer here, an answer there), so an "everything optional" guard would
 * happily accept a `wagers-locked` payload that carried a prompt. Naming the keys
 * per stage makes every impossible payload a hard reject — and it makes adding a
 * field to a private Final state a deliberate, reviewable wire edit rather than
 * something that leaks the moment somebody spreads an object.
 */
const PUBLIC_FINAL_STAGE_KEYS: Readonly<Record<string, readonly string[]>> = {
  setup: ['kind', 'stage'],
  'wager-entry': ['kind', 'stage', 'timer'],
  'wagers-locked': ['kind', 'stage'],
  'response-entry': ['kind', 'stage', 'prompt', 'timer'],
  'responses-locked': ['kind', 'stage', 'prompt'],
  'answer-revealed': ['kind', 'stage', 'prompt', 'answer'],
  'team-reveal': ['kind', 'stage', 'prompt', 'answer', 'reveal'],
  resolution: ['kind', 'stage', 'prompt', 'answer', 'reveal', 'outcome'],
  'sudden-death': ['kind', 'stage'],
  complete: ['kind', 'stage', 'outcome'],
}

const PUBLIC_FINAL_RESPONSE_EXACT_KEYS = ['kind', 'text'] as const
const PUBLIC_FINAL_RESPONSE_BARE_KEYS = ['kind'] as const
const PUBLIC_FINAL_SETTLEMENT_KEYS = ['outcome', 'delta'] as const
const PUBLIC_FINAL_REVEAL_KEYS = ['teamKey', 'response', 'wager', 'settlement'] as const

const PUBLIC_FINAL_OUTCOMES: readonly string[] = ['unique-leader', 'tied']
const PUBLIC_SETTLEMENT_OUTCOMES: readonly string[] = ['correct', 'incorrect', 'no-response']

function isPublicFinalResponse(value: unknown): value is PublicFinalResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  if (v.kind === 'exact') {
    return (
      hasExactOwnKeys(v, PUBLIC_FINAL_RESPONSE_EXACT_KEYS) &&
      typeof v.text === 'string' &&
      v.text.length > 0
    )
  }
  if (v.kind === 'not-captured' || v.kind === 'no-response') {
    return hasExactOwnKeys(v, PUBLIC_FINAL_RESPONSE_BARE_KEYS)
  }
  return false
}

function isBoundedPublicWager(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= PUBLIC_TEAM_SCORE_LIMIT
  )
}

function isPublicFinalSettlement(value: unknown): value is PublicFinalSettlement | null {
  if (value === null) return true
  if (typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    hasExactOwnKeys(v, PUBLIC_FINAL_SETTLEMENT_KEYS) &&
    typeof v.outcome === 'string' &&
    PUBLIC_SETTLEMENT_OUTCOMES.includes(v.outcome) &&
    typeof v.delta === 'number' &&
    Number.isInteger(v.delta) &&
    Math.abs(v.delta) <= PUBLIC_TEAM_SCORE_LIMIT
  )
}

function isPublicFinalReveal(value: unknown): value is PublicFinalReveal {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    hasExactOwnKeys(v, PUBLIC_FINAL_REVEAL_KEYS) &&
    typeof v.teamKey === 'string' &&
    PUBLIC_TEAM_KEY_PATTERN.test(v.teamKey) &&
    isPublicFinalResponse(v.response) &&
    isBoundedPublicWager(v.wager) &&
    isPublicFinalSettlement(v.settlement)
  )
}

/**
 * Strict guard for the Final DTO. It validates the stage/payload PAIRING through
 * an exact key set per stage, so a `wagers-locked` payload carrying a prompt, or
 * a `team-reveal` payload missing its reveal, is rejected outright rather than
 * rendered partially.
 */
function isPublicFinalWagerState(v: Record<string, unknown>): boolean {
  const stage = v.stage
  if (typeof stage !== 'string') return false
  const keys = PUBLIC_FINAL_STAGE_KEYS[stage]
  if (keys === undefined) return false
  if (!hasExactOwnKeys(v, keys)) return false

  switch (stage) {
    case 'setup':
    case 'wagers-locked':
    case 'sudden-death':
      return true
    case 'wager-entry':
      return isPublicResponseTimer(v.timer)
    case 'response-entry':
      return isPublicPromptContent(v.prompt) && isPublicResponseTimer(v.timer)
    case 'responses-locked':
      return isPublicPromptContent(v.prompt)
    case 'answer-revealed':
      return isPublicPromptContent(v.prompt) && typeof v.answer === 'string' && v.answer.length > 0
    case 'team-reveal':
      return (
        isPublicPromptContent(v.prompt) &&
        typeof v.answer === 'string' &&
        v.answer.length > 0 &&
        isPublicFinalReveal(v.reveal)
      )
    case 'resolution':
      return (
        isNullablePublicPrompt(v.prompt) &&
        isNullableString(v.answer) &&
        (v.reveal === null || isPublicFinalReveal(v.reveal)) &&
        typeof v.outcome === 'string' &&
        PUBLIC_FINAL_OUTCOMES.includes(v.outcome)
      )
    case 'complete':
      return typeof v.outcome === 'string' && PUBLIC_FINAL_OUTCOMES.includes(v.outcome)
    default:
      return false
  }
}

/**
 * Strict guard for the round DTO (or `null`). It validates the stage/payload
 * PAIRING, not just the field types: a `board` stage carrying a `selection`, or
 * a `prompt` stage carrying `categories`, is rejected outright rather than
 * rendered partially. That is what makes an impossible reveal stage fail closed
 * at the display instead of being guessed at.
 *
 * Dispatch is on the PRESENTATION `kind`, so a payload whose kind this build does
 * not know fails closed rather than being tried against every guard in turn.
 */
export function isPublicRoundState(value: unknown): value is PublicRoundState | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.kind === PUBLIC_FINAL_KIND) return isPublicFinalWagerState(v)
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
    isPublicTeamsState(v.teams) &&
    isPublicResponseState(v.response)
  )
}
