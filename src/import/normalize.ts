import { createGameDefinition, type GameDefinition } from '../game/gameDefinition'
import { roundId, roundType } from '../game/ids'
import type { DataValue, RoundConfig, RoundDefinition } from '../game/roundDefinition'
import { createTeamDefinitions, NO_TEAMS } from '../game/teams/definition'
import type { CanonicalGameFile } from './schemas'

/**
 * Normalization — the narrow, lossless step between "validated data" and
 * "trusted domain object".
 *
 * What normalization IS allowed to do (all of it documented and tested):
 *  - construct branded `GameId` / `RoundId` / `RoundType` values from strings
 *    that have already been validated against the identifier grammar;
 *  - deep-COPY the validated config so the caller's input object is never
 *    mutated (the trusted factory deep-freezes what it is given, and freezing
 *    the caller's own object would be a mutation of the input);
 *  - hand validated teams to the trusted team constructor, which re-validates
 *    with the SAME schema and applies the one documented accent default;
 *  - hand the result to the Slice 3 trusted constructor, which enforces the
 *    domain invariants again and deep-freezes the definition.
 *
 * What normalization must NEVER do — return a failure instead:
 *  generate a missing id · de-duplicate ids · drop or replace an unsupported
 *  round · substitute a default config · truncate an overlong value · invent a
 *  title · reorder rounds or teams · rename a team · invent a team · silently
 *  drop unknown fields · accept a partially valid game · change semantic meaning
 *  in any way.
 *
 * Because every value written below is copied verbatim from the validated
 * document — and the Zod schemas perform no coercion — normalization is
 * meaning-preserving by construction and deterministic: the same document
 * always yields an equivalent definition.
 */

/**
 * Recursively copy validated JSON data. The safety scan has already proven the
 * graph is plain, finite, acyclic data with no reserved keys, so this cannot
 * encounter a function, a cycle, or a class instance.
 *
 * `Object.create(null)`-style construction is deliberate: the copied config
 * carries no prototype at all, so even a hypothetical reserved key could not
 * reach `Object.prototype`.
 */
function cloneData(value: DataValue): DataValue {
  if (Array.isArray(value)) return value.map(cloneData)
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, DataValue> = Object.create(null) as Record<string, DataValue>
    for (const [key, item] of Object.entries(value)) copy[key] = cloneData(item)
    return copy
  }
  return value
}

function cloneConfig(config: Record<string, unknown>): RoundConfig {
  // Safe: `scanImportedDocument` proved every value in the document is a
  // `DataValue` before this point in the pipeline.
  return cloneData(config as unknown as DataValue) as RoundConfig
}

/**
 * Convert a fully validated canonical document into a trusted, deep-frozen
 * `GameDefinition`. Round order is exactly the order of the `rounds` array; the
 * registry never influences it.
 *
 * May throw `GameDefinitionError` if the trusted factory rejects the input.
 * That would mean validation and the domain model disagree, so the pipeline
 * catches it and reports a `construction`-stage issue rather than letting an
 * exception escape.
 */
export function normalizeToGameDefinition(document: CanonicalGameFile): GameDefinition {
  const rounds: RoundDefinition[] = document.rounds.map((round) => ({
    id: roundId(round.id),
    type: roundType(round.type),
    title: round.title,
    config: cloneConfig(round.config),
  }))

  // Teams go through their own trusted constructor, which re-validates with the
  // same schema and builds a fresh, frozen object graph — so the document's array
  // is neither retained nor mutated. An absent `teams` field means "no teams";
  // nothing is invented for a game that did not ask for any.
  const teams =
    document.teams === undefined ? NO_TEAMS : createTeamDefinitions(document.teams)

  return createGameDefinition({
    id: document.id,
    title: document.title,
    rounds,
    teams,
  })
}
