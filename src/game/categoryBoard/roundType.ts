import type { RoundTypeEntry } from '../registry'
import type { RoundDefinition } from '../roundDefinition'
import {
  CATEGORY_BOARD_ROUND_TYPE,
  isCategoryBoardRound,
  readCategoryBoardDefinition,
} from './definition'
import { categoryBoardConfigSchema } from './schema'

/**
 * The `category-board` registry entry — the first PLAYABLE round type (Slice 5).
 *
 * Everything here is code defined in this module and registered by application
 * code (`createDefaultRegistry`). Imported content can never register this type,
 * replace its schema, replace its reducer, replace its public projection, supply
 * a callback, or supply an executable handler: a game file is data, and there is
 * no path from data to `registry.register`. Duplicate registration still throws
 * `RegistryError`, exactly as for the placeholder type.
 *
 * The gameplay behavior of this round does NOT live in the registry entry. The
 * reveal-stage state machine lives in the pure reducer (`src/state/reducer.ts`)
 * and its public projection in the allow-list sanitizer
 * (`src/state/sanitize.ts`), so gameplay state stays derived from the
 * append-only event log and the private→public boundary stays in exactly one
 * place. The entry supplies identity, the single config validation path, a
 * definition compatibility check, and the neutral Slice 3 runtime seam.
 */
export const categoryBoardRoundType: RoundTypeEntry = {
  type: CATEGORY_BOARD_ROUND_TYPE,
  displayName: 'Category board (categories × values, prompt/answer reveal)',
  configSchema: categoryBoardConfigSchema,
  /**
   * A definition matches only if it is this type AND its config validates as a
   * real board. A round whose type says `category-board` but whose config is
   * unusable is reported as not matching rather than being played half-broken.
   */
  matches: (definition: RoundDefinition): boolean =>
    isCategoryBoardRound(definition) && readCategoryBoardDefinition(definition) !== null,
  createInitialState: (definition: RoundDefinition) => ({
    roundId: definition.id,
    type: definition.type,
  }),
  toPublicRoundView: () => ({ availability: 'available' }),
}
