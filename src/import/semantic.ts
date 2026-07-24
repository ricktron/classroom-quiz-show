import { formatPath, issue, safeLabel, type ImportIssue } from './issues'
import type { CanonicalGameFile } from './schemas'

/**
 * Semantic (content-level) validation — the checks that a structurally valid
 * document can still fail.
 *
 * Zod proves the SHAPE is right. It cannot prove that round ids are unique
 * within the file, or that a title that satisfies `min(1)` is not just spaces.
 * Those are relationships between fields, so they live here and run only after
 * the schema stage has succeeded.
 *
 * Every check below REJECTS. None of them repairs: a duplicate id is not
 * renamed, a blank title is not replaced with a generated one, and no round is
 * dropped to make the rest of the game importable.
 */
export function validateSemantics(document: CanonicalGameFile): readonly ImportIssue[] {
  const issues: ImportIssue[] = []

  if (document.title.trim().length === 0) {
    issues.push(
      issue(
        'blank-title',
        'semantic',
        'title',
        'title contains only whitespace. Give the game a real title — the pipeline will not invent one.',
      ),
    )
  }

  const firstIndexById = new Map<string, number>()
  document.rounds.forEach((round, index) => {
    const previous = firstIndexById.get(round.id)
    if (previous === undefined) {
      firstIndexById.set(round.id, index)
    } else {
      const path = formatPath(['rounds', index, 'id'])
      const original = formatPath(['rounds', previous, 'id'])
      issues.push(
        issue(
          'duplicate-round-id',
          'semantic',
          path,
          `${path} duplicates ${original} (${safeLabel(round.id)}). Round ids must be unique within a game; give this round its own id.`,
          { duplicateOf: original, roundIndex: index },
        ),
      )
    }

    if (round.title.trim().length === 0) {
      const path = formatPath(['rounds', index, 'title'])
      issues.push(
        issue(
          'blank-title',
          'semantic',
          path,
          `${path} contains only whitespace. Give the round a real title — the pipeline will not invent one.`,
        ),
      )
    }
  })

  return issues
}
