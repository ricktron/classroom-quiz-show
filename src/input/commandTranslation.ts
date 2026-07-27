import type { SessionCommand } from '../state/commands'
import { isLocalInputSignal, type LocalInputSignal } from './localInput'

/**
 * Logical action → validated game command (Slice 8).
 *
 * This is the last step of the local-input boundary and the only place a
 * {@link LocalInputSignal} becomes a `SessionCommand`. It is pure, total, and
 * deliberately thin: it decides whether the ACTION has a consumer, and nothing
 * else. Whether the game will *accept* the command (is the clue armed? does the
 * team exist? has it already buzzed?) is the planner's decision and is not
 * duplicated here — one authority per question.
 *
 * ## Secondary actions are representable and inert
 *
 * A mapping may bind a physical key to `{ kind: 'secondary', slot: 'secondary2' }`
 * and that mapping validates. Translation then refuses it with
 * `unsupported-action`, so **no secondary action can change game state in Slice
 * 8** — there is no command for it to become, and therefore no event, no reducer
 * transition and no projection.
 *
 * That is the "no speculative contract without its first consumer" rule
 * (`ROADMAP-AMENDMENT-001` §5.1, ADR-004's "never a speculative entry") applied
 * honestly: the CONTRACT is complete enough that a later slice adds a consumer
 * without re-cutting it, while the GAME gains no half-defined behaviour today.
 * Slice 10 supplies the recommended Sony profile and may be the slice that
 * supplies the first consumer.
 */

/** The response-opportunity a translated command targets. */
export interface ResponseOpportunityTarget {
  readonly roundId: string
  readonly tileId: string
}

/** Why a signal produced no command. Bounded and typed. */
export const LOCAL_INPUT_TRANSLATION_REJECTIONS = [
  'malformed-signal',
  'unsupported-action',
  'no-open-clue',
] as const

export type LocalInputTranslationRejection =
  (typeof LOCAL_INPUT_TRANSLATION_REJECTIONS)[number]

/** Host-facing explanation. Host-only copy — never projected. */
export const LOCAL_INPUT_TRANSLATION_MESSAGE: Readonly<
  Record<LocalInputTranslationRejection, string>
> = {
  'malformed-signal': 'That input could not be read as a team action.',
  'unsupported-action':
    'That button is mapped to a secondary action, which nothing uses yet. Only buzz keys do anything in this version.',
  'no-open-clue': 'There is no open clue to buzz on.',
}

export type LocalInputTranslation =
  | { readonly status: 'command'; readonly command: SessionCommand }
  | { readonly status: 'rejected'; readonly reason: LocalInputTranslationRejection }

/**
 * Translate a logical signal into a game command, or explain why it cannot be.
 *
 * `target` is the response opportunity the host surface believes is live. It is
 * carried onto the command so the planner can reject a press that arrived after
 * the host moved to another clue — the command states what it believes, and the
 * planner checks it, exactly as `EXPIRE_RESPONSE_TIMER` does with its timer
 * identity (ADR-007 §6).
 */
export function translateLocalInput(
  signal: LocalInputSignal,
  target: ResponseOpportunityTarget | null,
): LocalInputTranslation {
  if (!isLocalInputSignal(signal)) {
    return { status: 'rejected', reason: 'malformed-signal' }
  }
  if (signal.action.kind !== 'primary-buzz') {
    return { status: 'rejected', reason: 'unsupported-action' }
  }
  if (target === null) {
    return { status: 'rejected', reason: 'no-open-clue' }
  }
  return {
    status: 'command',
    command: {
      type: 'RECORD_TEAM_BUZZ',
      // The arrival stamp becomes `issuedAt`, exactly like every other command:
      // the reducer copies it onto the event and never re-derives it, so replay
      // stays clock-free (ADR-007 §1).
      issuedAt: signal.observedAt,
      roundId: target.roundId,
      tileId: target.tileId,
      teamId: signal.teamId,
    },
  }
}
