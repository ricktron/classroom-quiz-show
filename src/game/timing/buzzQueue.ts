/**
 * The ordered buzz queue for one response opportunity (Slice 8).
 *
 * This implements owner decision **OG-2** — a FULL ORDERED QUEUE, not a
 * first-only lockout — and **OG-3** — after an incorrect response or a host pass,
 * the next queued team is promoted.
 *
 * Like every other gameplay value in this engine it is SESSION state derived
 * purely by replaying the append-only event log. There is no queue object, no
 * mutable list, no cache and no write path outside `reduce`, which is what makes
 * undo exact for free (ADR-002; ADR-006's proof restated).
 *
 * ## The representation, and why it is one list plus one index
 *
 * ```ts
 * { order: ['t-red', 't-blue', 't-green'], resolvedCount: 1 }
 *          ↑ done      ↑ ACTIVE    ↑ waiting
 * ```
 *
 * `order` is every team that has been accepted for this response opportunity, in
 * accepted order, each at most once. `resolvedCount` is how many of them have
 * finished their turn. Everything else is derived:
 *
 * | Question | Derivation |
 * | --- | --- |
 * | who is answering | `order[resolvedCount]` |
 * | who is waiting | `order.slice(resolvedCount + 1)` |
 * | is anyone answering | `resolvedCount < order.length` |
 * | has the queue run out | `order.length > 0 && resolvedCount === order.length` |
 * | may this team buzz | `!order.includes(teamId)` |
 *
 * A single ordered list with a pointer beats a `{ active, waiting[] }` pair for
 * one specific reason: promotion is `resolvedCount + 1`, which cannot lose,
 * reorder or duplicate an entry, whereas shifting between two collections can. It
 * also keeps the "each team appears at most once" rule a property of ONE array
 * rather than an invariant spanning two.
 *
 * Teams that have already had their turn stay in `order`. That is not
 * bookkeeping for its own sake — it is exactly what makes "a team that already
 * answered and got it wrong cannot buzz again for this clue" derivable, and it is
 * what distinguishes an EXHAUSTED queue (everyone who buzzed has had a turn) from
 * an EMPTY one (nobody has buzzed yet). The two look identical if you only track
 * who is waiting, and they are not the same classroom situation at all.
 *
 * ## Ordering authority
 *
 * Accepted order is the order the events were appended — the log's `seq`. The
 * reducer reads no clock and does no sorting; `occurredAt` is arrival EVIDENCE
 * and is never consulted here. Two presses stamped with the same millisecond are
 * therefore not a tie: whichever command reached the planner first is first, and
 * that is deterministic under replay. See ADR-008 "Tie handling".
 */

/** The queue for one response opportunity. Derived by replay; never mutated. */
export interface BuzzQueueState {
  /**
   * Every accepted team for this response opportunity, in accepted order. A team
   * appears at most once — enforced by the planner and re-checked on application.
   */
  readonly order: readonly string[]
  /**
   * How many entries have finished their turn. `order[resolvedCount]` is the
   * ACTIVE respondent; everything before it is done, everything after is waiting.
   * Never greater than `order.length`.
   */
  readonly resolvedCount: number
}

/** Nobody has buzzed for this response opportunity. */
export const EMPTY_BUZZ_QUEUE: BuzzQueueState = Object.freeze({
  order: Object.freeze([]) as readonly string[],
  resolvedCount: 0,
})

/**
 * The queue as a discriminated situation, for UI and projection.
 *
 * Deriving a union here rather than letting each surface index into `order`
 * directly is what stops "active" from being inferred from an array position in
 * scattered rendering code — an impossible combination (an active team with an
 * exhausted queue, say) is simply not expressible.
 */
export type BuzzQueueStatus =
  | { readonly status: 'empty' }
  | {
      readonly status: 'active'
      readonly activeTeamId: string
      readonly waitingTeamIds: readonly string[]
    }
  | { readonly status: 'exhausted' }

/** Is this queue untouched — nobody has buzzed at all? */
export function isEmptyBuzzQueue(queue: BuzzQueueState): boolean {
  return queue.order.length === 0
}

/** The team currently answering, or `null` when nobody is. */
export function activeRespondent(queue: BuzzQueueState): string | null {
  if (queue.resolvedCount >= queue.order.length) return null
  return queue.order[queue.resolvedCount]
}

/** The teams still waiting behind the active respondent, in order. */
export function waitingRespondents(queue: BuzzQueueState): readonly string[] {
  if (queue.resolvedCount >= queue.order.length) return []
  return queue.order.slice(queue.resolvedCount + 1)
}

/** Teams whose turn is already over, in the order they had it. */
export function resolvedRespondents(queue: BuzzQueueState): readonly string[] {
  return queue.order.slice(0, Math.min(queue.resolvedCount, queue.order.length))
}

/** Has every team that buzzed already had its turn? */
export function isQueueExhausted(queue: BuzzQueueState): boolean {
  return queue.order.length > 0 && queue.resolvedCount >= queue.order.length
}

/** Has this team already buzzed for this response opportunity? */
export function hasTeamBuzzed(queue: BuzzQueueState, teamId: string): boolean {
  return queue.order.includes(teamId)
}

/** The queue as one discriminated situation. */
export function buzzQueueStatus(queue: BuzzQueueState): BuzzQueueStatus {
  if (isEmptyBuzzQueue(queue)) return { status: 'empty' }
  const active = activeRespondent(queue)
  if (active === null) return { status: 'exhausted' }
  return { status: 'active', activeTeamId: active, waitingTeamIds: waitingRespondents(queue) }
}

/**
 * Append a team to the queue. PURE — returns a new queue, or `null` when the
 * team is already in it (the duplicate rule, checked structurally rather than by
 * convention).
 */
export function appendBuzz(queue: BuzzQueueState, teamId: string): BuzzQueueState | null {
  if (hasTeamBuzzed(queue, teamId)) return null
  return { order: [...queue.order, teamId], resolvedCount: queue.resolvedCount }
}

/**
 * Promote the next queued team. PURE — returns a new queue, or `null` when there
 * is no active respondent to resolve.
 *
 * Only the pointer moves, so the remaining order is preserved exactly and the
 * queue keeps its identity: a promotion is never a new queue.
 */
export function promoteNext(queue: BuzzQueueState): BuzzQueueState | null {
  if (activeRespondent(queue) === null) return null
  return { order: queue.order, resolvedCount: queue.resolvedCount + 1 }
}

/**
 * Structural guard. Used on event application so a stored log that disagrees with
 * the rules degrades to "not applicable" rather than producing an impossible
 * queue (a negative pointer, a pointer past the end, a duplicated team).
 */
export function isBuzzQueueState(value: unknown): value is BuzzQueueState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.order)) return false
  if (!v.order.every((entry) => typeof entry === 'string' && entry.length > 0)) return false
  if (new Set(v.order as string[]).size !== v.order.length) return false
  return (
    typeof v.resolvedCount === 'number' &&
    Number.isInteger(v.resolvedCount) &&
    v.resolvedCount >= 0 &&
    v.resolvedCount <= v.order.length
  )
}

/**
 * How an active response ended — the typed adjudication for one turn.
 *
 * One bounded union rather than parallel commands, for the reason ADR-006 §7
 * gives for `ScoreAdjustmentMode`: the meaning belongs in a typed field on one
 * fact. Months later the log still answers what the teacher meant.
 *
 * **No member scores.** `incorrect` records a judgement, not a deduction —
 * inventing an automatic penalty would break ADR-006's reveal/score independence
 * and would take a decision out of the teacher's hands. `correct` likewise awards
 * nothing: scoring stays on the separate Host scoring panel.
 *
 * | Kind | Queue transition | Scores? |
 * | --- | --- | --- |
 * | `incorrect` | promote next (OG-3) | No |
 * | `passed` | promote next (OG-3) | No |
 * | `correct` | end opportunity — empty the queue (not exhausted) | No |
 *
 * `correct` does **not** auto-reveal answer text, auto-return to the board, or
 * auto-award points. Public projection of the judgement is a separate allow-list
 * field (`PublicBoardResponseOutcome`); buzz `exhausted` must never stand in for
 * a correct adjudication (that would falsely show "No one left to answer").
 *
 * Historical note: Slice 8 deliberately omitted `correct` because reveal already
 * closed the window. REAL MVP S05 Path A adds `correct` as an explicit
 * opportunity-ending adjudication that still scores nothing (ADR-008 amendment).
 */
export const ACTIVE_RESPONSE_RESOLUTION_KINDS = ['incorrect', 'passed', 'correct'] as const

export type ActiveResponseResolutionKind = (typeof ACTIVE_RESPONSE_RESOLUTION_KINDS)[number]

export type ActiveResponseResolution =
  | {
      /** The active team answered and the teacher judged it wrong. Scores nothing. */
      readonly kind: 'incorrect'
    }
  | {
      /**
       * The teacher moved on from the active team WITHOUT asserting correctness —
       * they hesitated, ran out of time, or deferred. Scores nothing.
       *
       * This is precisely "host pass". It is NOT: a team declining to answer
       * (which the teacher records the same way, because the log records what the
       * host did), skipping the clue (return to the board), closing the response
       * opportunity (reveal the answer or reset), or clearing the queue (reset).
       */
      readonly kind: 'passed'
    }
  | {
      /**
       * The teacher judged the active team correct. Scores nothing, reveals
       * nothing, and does not return to the board. Ends the live response
       * opportunity for this clue by clearing the queue to empty (not exhausted)
       * and recording the adjudication on the phase outcome field.
       */
      readonly kind: 'correct'
    }

const RESOLUTION_KIND_SET: ReadonlySet<string> = new Set(ACTIVE_RESPONSE_RESOLUTION_KINDS)

/** Structural guard for a resolution. Fails closed at the command boundary. */
export function isActiveResponseResolution(value: unknown): value is ActiveResponseResolution {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.kind === 'string' && RESOLUTION_KIND_SET.has(v.kind)
}

/** Host-facing label for a resolution. Host-only copy — never projected. */
export const ACTIVE_RESPONSE_RESOLUTION_LABEL: Readonly<
  Record<ActiveResponseResolutionKind, string>
> = {
  incorrect: 'marked incorrect',
  passed: 'passed by the host',
  correct: 'marked correct',
}

/**
 * Most recent board-response adjudication for the live response opportunity.
 *
 * Replacement, not history: each accepted resolution overwrites the prior one.
 * Cleared with the response-opportunity lifecycle (reset, tile change, reveal,
 * return to board, round change, game end). Carries only team id + kind — no
 * timestamps, event ids, seq, score, or animation state.
 */
export type BoardResponseOutcome = {
  readonly teamId: string
  readonly kind: ActiveResponseResolutionKind
}

/** Structural guard for a private board-response outcome. */
export function isBoardResponseOutcome(value: unknown): value is BoardResponseOutcome {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.teamId === 'string' &&
    v.teamId.length > 0 &&
    typeof v.kind === 'string' &&
    RESOLUTION_KIND_SET.has(v.kind)
  )
}
