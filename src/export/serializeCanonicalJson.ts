/**
 * Deterministic compact JSON serialization for portable export (Slice 12).
 *
 * `JSON.stringify` reorders integer-index object keys into ascending numeric
 * order, which disagrees with the UTF-16 lexicographic config-key contract.
 * Envelope fields (root / team / timer / round) keep their explicit insertion
 * order; generic `config` trees emit own enumerable string keys in UTF-16 order.
 */

import type { CanonicalGameFile } from '../import/schemas'
import { compareCanonicalKeys } from './canonicalizeData'

/**
 * Serialize a canonical game document to compact JSON text (no trailing LF).
 * Callers append the single trailing LF required by the portable byte contract.
 */
export function serializeCanonicalDocument(document: CanonicalGameFile): string {
  // Exporter always emits an explicit timer envelope (ADR-012).
  const timer = document.timer
  if (timer === undefined) {
    throw new TypeError('Canonical export document is missing the required timer envelope.')
  }

  const teamsField =
    Object.hasOwn(document, 'teams') && Array.isArray(document.teams)
      ? [
          `"teams":[${document.teams
            .map((team) => {
              // Exporter always emits explicit accents (ADR-012); never omit.
              if (typeof team.accent !== 'string') {
                throw new TypeError('Canonical export team is missing a required accent.')
              }
              return serializeTeam({ id: team.id, name: team.name, accent: team.accent })
            })
            .join(',')}]`,
        ]
      : []

  const parts = [
    `"format":${JSON.stringify(document.format)}`,
    `"schemaVersion":${JSON.stringify(document.schemaVersion)}`,
    `"id":${JSON.stringify(document.id)}`,
    `"title":${JSON.stringify(document.title)}`,
    ...teamsField,
    `"timer":${serializeTimer(timer)}`,
    `"rounds":[${document.rounds.map(serializeRound).join(',')}]`,
  ]
  return `{${parts.join(',')}}`
}

function serializeTeam(team: {
  readonly id: string
  readonly name: string
  readonly accent: string
}): string {
  return `{"id":${JSON.stringify(team.id)},"name":${JSON.stringify(team.name)},"accent":${JSON.stringify(team.accent)}}`
}

function serializeTimer(timer: { readonly responseSeconds: number }): string {
  return `{"responseSeconds":${JSON.stringify(timer.responseSeconds)}}`
}

function serializeRound(round: {
  readonly id: string
  readonly type: string
  readonly title: string
  readonly config: Record<string, unknown>
}): string {
  return `{"id":${JSON.stringify(round.id)},"type":${JSON.stringify(round.type)},"title":${JSON.stringify(round.title)},"config":${serializeCanonicalData(round.config)}}`
}

/**
 * Serialize generic config / data values with UTF-16-sorted object keys.
 * Arrays preserve order. Scalars use `JSON.stringify` escaping/number rules.
 */
export function serializeCanonicalData(value: unknown): string {
  if (value === null) return 'null'

  switch (typeof value) {
    case 'string':
    case 'boolean':
    case 'number':
      return JSON.stringify(value)
    case 'object':
      break
    default:
      throw new TypeError(`Cannot serialize value of type ${typeof value}`)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeCanonicalData(item)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort(compareCanonicalKeys)
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${serializeCanonicalData(record[key])}`)
    .join(',')}}`
}
