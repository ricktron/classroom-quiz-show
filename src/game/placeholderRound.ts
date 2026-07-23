import type { RoundTypeEntry } from './registry'
import {
  PLACEHOLDER_ROUND_TYPE,
  type PlaceholderRoundConfig,
  type RoundDefinition,
} from './roundDefinition'

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
  matches: (definition: RoundDefinition): boolean =>
    definition.type === PLACEHOLDER_ROUND_TYPE &&
    typeof (definition.config as Partial<PlaceholderRoundConfig>).note === 'string',
  createInitialState: (definition: RoundDefinition) => ({
    roundId: definition.id,
    type: definition.type,
  }),
  toPublicRoundView: () => ({ availability: 'available' }),
}
