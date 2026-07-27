import { isLocalInputAction, type LocalInputAction } from './logicalAction'

/**
 * The local-input boundary value (Slice 8).
 *
 * A {@link LocalInputSignal} is what an adapter produces and what the command
 * translator consumes. It is the "mapped logical team input" named by
 * `ROADMAP-AMENDMENT-001` §5.6, and it is the LAST device-independent value
 * before the ordinary command path takes over:
 *
 * ```text
 * raw browser input          KeyboardEvent (host-private, adapter only)
 *   → local input adapter    keyboardAdapter.ts
 *   → LocalInputSignal       this module — no device data, no key, no button
 *   → validated game command RECORD_TEAM_BUZZ (state/commands.ts)
 *   → append-only event      TEAM_BUZZED (state/events.ts)
 *   → reducer                buzz queue derived by replay
 *   → sanitized public state PublicBuzzState
 * ```
 *
 * ## Three things kept apart on purpose
 *
 * 1. **Physical input identity** — a key code, one day a button index. It lives
 *    in the mapping (`keyboardMapping.ts`) and never leaves the adapter side.
 * 2. **Logical action** — what the press means (`logicalAction.ts`).
 * 3. **Team assignment** — which team the press speaks for.
 *
 * A signal is (2) + (3) plus bounded arrival evidence. It carries no `code`, no
 * `key`, no button, no handset, no vendor/product id, no poll timing and no
 * diagnostic reading — those are host-private by §5.6 and are not representable
 * here, which is stronger than "not currently included".
 *
 * ## `observedAt` is EVIDENCE, not authority
 *
 * The stamp is read once at the input edge (the same dispatch-edge clock rule as
 * every other command — ADR-007 §1) and travels to the command's `issuedAt`. It
 * is never the tiebreaker: accepted order is the event log's `seq` order, which
 * is deterministic and replay-safe. See ADR-008 §"Tie handling".
 *
 * ## Not a plugin framework
 *
 * There is deliberately no adapter registry object, no dynamic lookup and no
 * `register()` surface. The amendment's §5.6 registry idea is satisfied by
 * something smaller and stronger for one adapter: the source kind is a bounded
 * union that only application code can extend, so content can never introduce an
 * input source and there is no code path from a game file to an input adapter.
 */

/**
 * Every local input source this build recognizes.
 *
 * Slice 8 ships exactly one. Slice 9 adds `'gamepad'` here and supplies its
 * adapter; nothing else in the chain changes, which is the whole point of the
 * boundary. Unrecognized values fail closed at {@link isLocalInputSourceKind}.
 */
export const LOCAL_INPUT_SOURCE_KINDS = ['keyboard'] as const

export type LocalInputSourceKind = (typeof LOCAL_INPUT_SOURCE_KINDS)[number]

const SOURCE_KIND_SET: ReadonlySet<string> = new Set(LOCAL_INPUT_SOURCE_KINDS)

export function isLocalInputSourceKind(value: unknown): value is LocalInputSourceKind {
  return typeof value === 'string' && SOURCE_KIND_SET.has(value)
}

/** Host-facing label for a source. Host-only copy — never projected. */
export const LOCAL_INPUT_SOURCE_LABEL: Readonly<Record<LocalInputSourceKind, string>> = {
  keyboard: 'Keyboard',
}

/**
 * One validated logical input, ready to become a command.
 *
 * `teamId` is an authored team id and is checked against the loaded game by the
 * planner — the adapter's mapping is a convenience, never the authority, exactly
 * as the scoring UI is never the authority for an amount (ADR-006).
 */
export interface LocalInputSignal {
  /** Which adapter produced this. Bounded; host-private beyond diagnostics. */
  readonly source: LocalInputSourceKind
  /** What the press means. */
  readonly action: LocalInputAction
  /** Which team it speaks for. Validated again by the planner. */
  readonly teamId: string
  /** Arrival evidence read at the input edge. NEVER the ordering authority. */
  readonly observedAt: number
}

/** Structural guard for a signal. Used at the translator boundary. */
export function isLocalInputSignal(value: unknown): value is LocalInputSignal {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    isLocalInputSourceKind(v.source) &&
    isLocalInputAction(v.action) &&
    typeof v.teamId === 'string' &&
    v.teamId.length > 0 &&
    typeof v.observedAt === 'number' &&
    Number.isInteger(v.observedAt) &&
    v.observedAt >= 0
  )
}
