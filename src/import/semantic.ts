import { formatPath, issue, safeLabel, type ImportIssue } from './issues'
import type { CanonicalGameFile } from './schemas'
import { FINAL_WAGER_ROUND_TYPE } from '../game/finalWager/definition'

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

  issues.push(...validateFinalWagerPlacement(document))

  return issues
}

/**
 * Cross-round rules for the Final Wager round (Slice 14).
 *
 * These are relationships BETWEEN rounds, and between rounds and the game's
 * teams, so no per-round config schema can express them — a Final round's own
 * schema cannot see the rounds beside it or whether the game has any teams.
 * They therefore live here, at the document level, beside the other whole-file
 * checks.
 *
 * Three rules, each with a classroom reason and each REJECTING rather than
 * repairing:
 *
 *  1. **At most one Final.** "Final" means the last question of the lesson. Two
 *     of them is an authoring mistake with no sensible interpretation, and
 *     silently playing the first (or the last) would be the pipeline guessing.
 *  2. **Final must be terminal.** A Final that settles every score and then hands
 *     the class three more board rounds is not a Final. Rather than inventing a
 *     "rounds after Final are ignored" rule at runtime, the file is rejected at
 *     import so the teacher fixes the order once, before the lesson.
 *  3. **Final requires teams.** Final wagers, reveals and settlements are all
 *     per-team. A Final in a game with no teams has nobody to wager, nobody to
 *     reveal and no winner, so it is an unplayable round rather than a quiet
 *     no-op mid-lesson.
 *
 * A game with NO Final round is completely unaffected — which is every game file
 * that was valid before Slice 14.
 */
function validateFinalWagerPlacement(document: CanonicalGameFile): readonly ImportIssue[] {
  const issues: ImportIssue[] = []
  const finalIndices: number[] = []
  document.rounds.forEach((round, index) => {
    if (round.type === FINAL_WAGER_ROUND_TYPE) finalIndices.push(index)
  })
  if (finalIndices.length === 0) return issues

  const first = finalIndices[0]
  for (let i = 1; i < finalIndices.length; i += 1) {
    const index = finalIndices[i]
    const path = formatPath(['rounds', index, 'type'])
    issues.push(
      issue(
        'duplicate-final-round',
        'semantic',
        path,
        `${path} is a second ${safeLabel(FINAL_WAGER_ROUND_TYPE)} round; ${formatPath(['rounds', first, 'type'])} is already one. A game may contain at most one final round — remove one or change its type.`,
        { duplicateOf: formatPath(['rounds', first, 'type']), roundIndex: index },
      ),
    )
  }

  const last = finalIndices[finalIndices.length - 1]
  if (last !== document.rounds.length - 1) {
    const path = formatPath(['rounds', last])
    issues.push(
      issue(
        'final-round-not-terminal',
        'semantic',
        path,
        `${path} is a ${safeLabel(FINAL_WAGER_ROUND_TYPE)} round but ${document.rounds.length - 1 - last} round(s) follow it. A final round must be the last round in the game — move it to the end.`,
        { roundIndex: last, roundsAfter: document.rounds.length - 1 - last },
      ),
    )
  }

  if (document.teams === undefined || document.teams.length === 0) {
    issues.push(
      issue(
        'final-round-requires-teams',
        'semantic',
        'teams',
        `this game contains a ${safeLabel(FINAL_WAGER_ROUND_TYPE)} round but configures no teams. A final round wagers, reveals and settles per team — add at least one team, or remove the final round.`,
        { roundIndex: first },
      ),
    )
  }

  return issues
}
