import type { RoundTypeEntry } from '../registry'
import type { RoundDefinition } from '../roundDefinition'
import {
  FINAL_WAGER_ROUND_TYPE,
  isFinalWagerRound,
  readFinalWagerDefinition,
} from './definition'
import { finalWagerConfigSchema } from './schema'

/**
 * The `final-wager` registry entry — the SECOND playable round type (Slice 14).
 *
 * Everything here is code defined in this module and registered by application
 * code (`createDefaultRegistry`). Imported content can never register this type,
 * replace its schema, replace its reducer, replace its public projection, supply
 * a callback, or supply an executable handler: a game file is data, and there is
 * no path from data to `registry.register`. Duplicate registration still throws
 * `RegistryError`, exactly as for the other two types.
 *
 * The gameplay behaviour of this round does NOT live in the registry entry — the
 * same separation `category-board` follows. The phase machine lives in the pure
 * reducer (`src/state/reducer.ts`) and its public projection in the allow-list
 * sanitizer (`src/state/sanitize.ts`), so Final state stays derived from the
 * append-only event log and the private→public boundary stays in exactly one
 * place. The entry supplies identity, the single config validation path, a
 * definition compatibility check, and the neutral Slice 3 runtime seam.
 */
export const finalWagerRoundType: RoundTypeEntry = {
  type: FINAL_WAGER_ROUND_TYPE,
  displayName: 'Final wager (private wagers, timed response, reveal & settlement)',
  configSchema: finalWagerConfigSchema,
  /**
   * A definition matches only if it is this type AND its config validates as a
   * real Final round. A round whose type says `final-wager` but whose config is
   * unusable is reported as not matching rather than being played half-broken.
   */
  matches: (definition: RoundDefinition): boolean =>
    isFinalWagerRound(definition) && readFinalWagerDefinition(definition) !== null,
  createInitialState: (definition: RoundDefinition) => ({
    roundId: definition.id,
    type: definition.type,
  }),
  toPublicRoundView: () => ({ availability: 'available' }),
}
