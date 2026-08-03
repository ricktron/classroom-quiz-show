import { deepFreeze } from '../deepFreeze'
import { roundType, type RoundType } from '../ids'
import type { RoundDefinition } from '../roundDefinition'
import {
  freezePromptContent,
  normalizeAuthoredPrompt,
  type PromptContent,
} from '../media/definition'
import { finalWagerConfigSchema } from './schema'

/**
 * The trusted `final-wager` round domain model (Slice 14).
 *
 * This module owns the step between "validated authored config" and "a typed
 * Final round the engine may play". It is the ONLY place a
 * `FinalWagerDefinition` can be created, and it always re-validates: it never
 * trusts its caller's provenance, so an in-memory fixture and an imported game
 * file get exactly the same treatment — the arrangement
 * `createCategoryBoardDefinition` established in Slice 5.
 *
 * ## What a Final round IS
 *
 * One question, one canonical answer, an optional host grading aid, and an
 * optional host note. That is the whole authored surface. Everything that makes
 * Final *Final* — who may play, what they may risk, whether their exact wording
 * is captured, who is revealed first, what happens on a tie — is a HOST decision
 * taken during the lesson and recorded as events, never authored content.
 *
 * ## What a Final round is NOT
 *
 * It is not a game mode, a preset, a policy object, or a second state engine. It
 * is a registered round type sitting beside `category-board` in the same
 * registry, validated by the same import pipeline, exported by the same canonical
 * exporter, and played through the same command → event → replay core.
 */

/** The registered round-type identifier for the Final Wager round. */
export const FINAL_WAGER_ROUND_TYPE: RoundType = roundType('final-wager')

/** A complete, immutable, playable Final round. */
export interface FinalWagerDefinition {
  /**
   * The Final question (text or same-origin image). PRIVATE until the host
   * explicitly starts the response window — which is the action that makes it
   * public. Normalized at construction, so no consumer may assume a bare string.
   */
  readonly prompt: PromptContent
  /** The canonical answer. PRIVATE until the host explicitly reveals it. */
  readonly answer: string
  /**
   * Additional answers the host may accept. HOST-ONLY — a grading aid that is
   * never projected at any stage, and never replaces the canonical `answer`.
   */
  readonly alternates: readonly string[]
  /** Host-only teaching note, or `null`. NEVER projected, at any stage. */
  readonly notes: string | null
}

/** Thrown when trusted construction is given config it cannot accept. */
export class FinalWagerConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinalWagerConfigError'
  }
}

/**
 * The authored config shape as it appears in a game file. Kept structurally
 * identical to the Zod schema; the schema is the authority, this is the view used
 * to read the validated input back out.
 */
interface FinalWagerConfigShape {
  /** Legacy string or authored image object — normalized by the constructor. */
  readonly prompt: unknown
  readonly answer: string
  readonly alternates?: readonly string[]
  readonly notes?: string
}

/**
 * Build a trusted, deep-frozen Final round from authored config.
 *
 * The input is re-validated with the same strict schema the import boundary
 * uses, so this cannot be used to smuggle an invalid Final past validation. The
 * input object is never mutated and never retained: every value below is copied
 * into a fresh object graph, so a caller that later mutates its own config cannot
 * affect the frozen definition.
 *
 * @throws {FinalWagerConfigError} if `config` is not a valid Final round.
 */
export function createFinalWagerDefinition(config: unknown): FinalWagerDefinition {
  const parsed = finalWagerConfigSchema.safeParse(config)
  if (!parsed.success) {
    throw new FinalWagerConfigError(
      'final-wager config did not pass validation and cannot be constructed',
    )
  }
  // Read from the ORIGINAL validated input, not from Zod's output: the schema
  // performs no coercion, so both are equal, and reading the input keeps the
  // "a schema validates, it never rewrites" rule true by construction.
  const source = config as FinalWagerConfigShape

  const prompt = normalizeAuthoredPrompt(source.prompt)
  if (prompt === null) {
    throw new FinalWagerConfigError(
      'final-wager prompt could not be normalized to trusted media content',
    )
  }

  return deepFreeze<FinalWagerDefinition>({
    prompt: freezePromptContent(prompt),
    answer: source.answer,
    alternates: source.alternates === undefined ? [] : [...source.alternates],
    notes: source.notes === undefined ? null : source.notes,
  })
}

/** Is this round a Final Wager round? Checks the type only, not the config. */
export function isFinalWagerRound(round: RoundDefinition): boolean {
  return round.type === FINAL_WAGER_ROUND_TYPE
}

/**
 * TOTAL, fail-closed read of a round's config as a trusted Final round.
 *
 * Returns `null` — never throws — when the round is not a Final or its config
 * cannot be validated. Every runtime consumer (the command planner, the
 * sanitizer, the host panel) goes through this, so a structurally impossible
 * round degrades to "no Final" instead of crashing or guessing.
 *
 * Deliberately NOT memoized, for the same reason `readCategoryBoardDefinition`
 * is not: a cache keyed on a definition would be a second source of truth that
 * could drift from the frozen definition during replay.
 */
export function readFinalWagerDefinition(
  round: RoundDefinition,
): FinalWagerDefinition | null {
  if (!isFinalWagerRound(round)) return null
  try {
    return createFinalWagerDefinition(round.config)
  } catch {
    return null
  }
}
