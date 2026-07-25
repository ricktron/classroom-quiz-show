import { roundType } from '../game/ids'
import type { RoundRegistry } from '../game/registry'
import { formatPath, issue, safeLabel, type ImportIssue } from './issues'
import { zodIssuesToImportIssues, type CanonicalGameFile } from './schemas'

/**
 * Registry compatibility — the application-controlled authority on which round
 * types this build can actually play.
 *
 * Two distinct things happen per round:
 *
 *  1. **Type availability** (stage `registry`). An unregistered round type
 *     FAILS THE IMPORT. It is not imported into a partially valid game with the
 *     failure deferred to gameplay.
 *  2. **Config compatibility** (stage `schema`). A registered type supplies its
 *     own strict Zod schema for `config`; that is the single validation path
 *     for that type's configuration. Reported under `schema` because it *is* a
 *     schema failure — the registry only decided *which* schema applies.
 *
 * ## Why this differs from Slice 3
 *
 * Slice 3 deliberately allows an unsupported round type to be *represented* in
 * a trusted in-memory `GameDefinition`, so the engine can be proven to encounter
 * one and fail closed (host diagnostic + neutral "unavailable" display). That
 * remains true and is not weakened here.
 *
 * Slice 4 is about untrusted *imported* content, and it is stricter: an unknown
 * round type never crosses the import boundary at all. A teacher gets an
 * actionable error at import time instead of a dead round mid-lesson. The two
 * rules are complementary, not contradictory — one governs trusted in-memory
 * construction, the other governs untrusted ingestion.
 *
 * Imported content never registers anything: this function only *reads* the
 * registry. There is no path from a game file to `registry.register`.
 */
export function checkRegistryCompatibility(
  document: CanonicalGameFile,
  registry: RoundRegistry,
): readonly ImportIssue[] {
  const issues: ImportIssue[] = []
  const knownTypes = registry.knownTypes()

  document.rounds.forEach((round, index) => {
    const lookup = registry.lookup(roundType(round.type))

    if (lookup.status === 'unknown') {
      const path = formatPath(['rounds', index, 'type'])
      issues.push(
        issue(
          'unknown-round-type',
          'registry',
          path,
          `${path} is not a registered round type (${safeLabel(round.type)}). This build can play: ${knownTypes.join(', ') || 'no round types'}.`,
          { roundIndex: index },
        ),
      )
      return
    }

    // One config validation path per known round type, supplied by the registry.
    const configResult = lookup.entry.configSchema.safeParse(round.config)
    if (!configResult.success) {
      issues.push(
        ...zodIssuesToImportIssues(configResult.error.issues, round.config, {
          stage: 'schema',
          basePath: ['rounds', index, 'config'],
        }),
      )
    }
  })

  return issues
}
