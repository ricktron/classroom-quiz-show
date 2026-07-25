import { z } from 'zod'
import type { RoundTypeEntry } from './registry'
import {
  PLACEHOLDER_ROUND_TYPE,
  type PlaceholderRoundConfig,
  type RoundDefinition,
} from './roundDefinition'

/**
 * Strict import schema for the placeholder round's `config`.
 *
 * It is intentionally minimal — exactly the one host-only `note` string the
 * Slice 3 config already carries — and STRICT, so an unknown or misspelled key
 * is rejected rather than dropped. It is sufficient to prove that the registry
 * supplies a per-type config schema to the import pipeline, and it deliberately
 * carries no gameplay shape: categories, clues, point ladders, and the rest are
 * Slice 5's `category-board`, not something to smuggle in here.
 */
export const placeholderRoundConfigSchema = z.strictObject({
  note: z.string().min(1, 'note must not be empty').max(500, 'note must be at most 500 characters'),
})

/**
 * The one built-in registered round type for Slice 3.
 *
 * It is deliberately NON-GAMEPLAY: it renders nothing playable and holds no
 * prompts, answers, scoring, teams, or timers. Its only purpose is to prove the
 * round model + registry end to end (a real round can be created, matched,
 * given an initial runtime state, and projected safely). It must NOT quietly
 * grow into a playable round — that is Slice 5's `category-board`.
 *
 * All behavior here is code defined in THIS module. Nothing is sourced from a
 * game definition; `matches` only inspects data.
 */
export const placeholderRoundType: RoundTypeEntry = {
  type: PLACEHOLDER_ROUND_TYPE,
  displayName: 'Placeholder (engine test round — not gameplay)',
  configSchema: placeholderRoundConfigSchema,
  matches: (definition: RoundDefinition): boolean =>
    definition.type === PLACEHOLDER_ROUND_TYPE &&
    typeof (definition.config as Partial<PlaceholderRoundConfig>).note === 'string',
  createInitialState: (definition: RoundDefinition) => ({
    roundId: definition.id,
    type: definition.type,
  }),
  toPublicRoundView: () => ({ availability: 'available' }),
}
