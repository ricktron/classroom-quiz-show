/**
 * Deterministic Import Quality Report.
 *
 * Classifies existing validator output plus a small set of heuristic notices.
 * Does not repair imports, does not call a network, and does not claim AI.
 */

import type { AuthoringDraft, DraftClue } from '../authoring/types'
import type { AuthoringIssue } from '../authoring/issues'
import type { ImportIssue } from './issues'
import type { ImportResult } from './result'

export const QUALITY_CLASSIFICATIONS = ['ERROR', 'WARNING', 'HEURISTIC'] as const
export type QualityClassification = (typeof QUALITY_CLASSIFICATIONS)[number]
export const IMPORT_ACCEPTANCE = ['accepted', 'rejected', 'unfinished'] as const
export type ImportAcceptance = (typeof IMPORT_ACCEPTANCE)[number]

export interface QualityFinding {
  readonly classification: QualityClassification
  readonly code: string
  readonly message: string
  readonly path?: string
  readonly source: 'canonical-import' | 'authoring-draft' | 'heuristic'
}

export interface ImportQualityReport {
  readonly title: string
  readonly gameId?: string
  readonly acceptance: ImportAcceptance
  readonly importSucceeded: boolean
  readonly findings: readonly QualityFinding[]
  readonly errorCount: number
  readonly warningCount: number
  readonly heuristicCount: number
}

const GENERIC_NAME = /^(team\s*\d+|red|blue|green|yellow|orange|purple|pink|player\s*\d+|untitled|category\s*\d+|new game)$/i

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function sortFindings(findings: readonly QualityFinding[]): QualityFinding[] {
  const rank: Record<QualityClassification, number> = { ERROR: 0, WARNING: 1, HEURISTIC: 2 }
  return [...findings].sort((a, b) => {
    const classification = rank[a.classification] - rank[b.classification]
    if (classification !== 0) return classification
    const code = a.code.localeCompare(b.code)
    if (code !== 0) return code
    return (a.path ?? '').localeCompare(b.path ?? '')
  })
}

function fromImportIssue(issue: ImportIssue): QualityFinding {
  return {
    classification: 'ERROR',
    code: issue.code,
    message: issue.message,
    path: issue.path,
    source: 'canonical-import',
  }
}

function fromAuthoringIssue(issue: AuthoringIssue): QualityFinding {
  return {
    classification: issue.severity === 'blocker' ? 'ERROR' : 'WARNING',
    code: issue.code,
    message: issue.message,
    path: issue.draftPath ?? issue.canonicalPath ?? issue.field,
    source: 'authoring-draft',
  }
}

function heuristic(
  code: string,
  message: string,
  path?: string,
): QualityFinding {
  return { classification: 'HEURISTIC', code, message, path, source: 'heuristic' }
}

function collectHeuristics(draft: AuthoringDraft): QualityFinding[] {
  const findings: QualityFinding[] = []
  const names = draft.game.teams.map((team) => team.name.trim()).filter((name) => name.length > 0)

  for (const team of draft.game.teams) {
    if (GENERIC_NAME.test(team.name.trim())) {
      findings.push(
        heuristic(
          'generic-team-name',
          `“${team.name}” looks like a generic placeholder name, not a class-specific identity.`,
          team.authoringKey,
        ),
      )
    }
  }

  const normalized = names.map((name) => ({ name, key: normalizeName(name) }))
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i]
      const b = normalized[j]
      if (a.key.length === 0 || b.key.length === 0) continue
      const near =
        a.key === b.key ||
        (a.key.length >= 4 && b.key.length >= 4 && (a.key.startsWith(b.key) || b.key.startsWith(a.key)))
      if (near) {
        findings.push(
          heuristic(
            'near-duplicate-team-name',
            `Team names “${a.name}” and “${b.name}” look the same or nearly the same.`,
            'teams',
          ),
        )
      }
    }
  }

  const bank = draft.game.teamNameBank ?? []
  if (bank.length > 0 && bank.length < 64) {
    findings.push(
      heuristic(
        'team-name-bank-short',
        `This game’s name bank has ${bank.length} names. The recommended deck is about 96 unique names. Fewer than 64 is a quality notice, not an import failure.`,
        'teamNameBank',
      ),
    )
  }

  const clues: DraftClue[] = draft.board.categories.flatMap((category) => category.clues)
  const promptKeys = new Map<string, DraftClue>()
  for (const clue of clues) {
    const key = normalizeName(clue.prompt)
    if (key.length >= 8) {
      const prior = promptKeys.get(key)
      if (prior) {
        findings.push(
          heuristic(
            'near-duplicate-prompt',
            `Two clues have the same prompt text after ignoring punctuation and spacing.`,
            clue.tileCanonicalId,
          ),
        )
      } else {
        promptKeys.set(key, clue)
      }
    }

    const answer = clue.answer.trim()
    if (answer.length >= 4 && clue.prompt.toLowerCase().includes(answer.toLowerCase())) {
      findings.push(
        heuristic(
          'possible-answer-leakage',
          'The canonical answer also appears inside the prompt. This may be intentional, or it may give the answer away.',
          clue.tileCanonicalId,
        ),
      )
    }
  }

  if (draft.final) {
    const answer = draft.final.answer.trim()
    if (answer.length >= 4 && draft.final.prompt.toLowerCase().includes(answer.toLowerCase())) {
      findings.push(
        heuristic(
          'possible-answer-leakage',
          'The Final answer also appears inside the Final prompt. This may be intentional, or it may give the answer away.',
          'final',
        ),
      )
    }
  }

  if (GENERIC_NAME.test(draft.game.title.trim())) {
    findings.push(
      heuristic('generic-game-title', `“${draft.game.title}” looks like a placeholder title.`, 'Title'),
    )
  }

  return findings
}

export function buildImportQualityReport(input: {
  readonly title?: string
  readonly gameId?: string
  readonly importResult?: ImportResult
  readonly draft?: AuthoringDraft
  readonly authoringIssues?: readonly AuthoringIssue[]
  readonly acceptance?: ImportAcceptance
}): ImportQualityReport {
  const findings: QualityFinding[] = []

  if (input.importResult?.status === 'failure') {
    findings.push(...input.importResult.issues.map(fromImportIssue))
  }

  if (input.authoringIssues && input.authoringIssues.length > 0) {
    findings.push(...input.authoringIssues.map(fromAuthoringIssue))
  }

  if (input.draft) {
    findings.push(...input.draft.issues.map(fromAuthoringIssue))
    findings.push(...collectHeuristics(input.draft))
  }

  const sorted = sortFindings(findings)
  const acceptance = input.acceptance ?? inferAcceptance(input, sorted)
  return {
    title: input.title ?? input.draft?.game.title ?? 'Imported game',
    gameId: input.gameId ?? input.draft?.game.gameCanonicalId,
    acceptance,
    importSucceeded: acceptance === 'accepted',
    findings: sorted,
    errorCount: sorted.filter((finding) => finding.classification === 'ERROR').length,
    warningCount: sorted.filter((finding) => finding.classification === 'WARNING').length,
    heuristicCount: sorted.filter((finding) => finding.classification === 'HEURISTIC').length,
  }
}

function inferAcceptance(
  input: {
    readonly importResult?: ImportResult
    readonly draft?: AuthoringDraft
    readonly authoringIssues?: readonly AuthoringIssue[]
  },
  findings: readonly QualityFinding[],
): ImportAcceptance {
  if (input.importResult?.status === 'success') return 'accepted'
  if (input.importResult?.status === 'failure') return 'rejected'
  if (input.authoringIssues && input.authoringIssues.length > 0 && !input.draft) return 'rejected'
  if (input.draft) {
    return findings.some((finding) => finding.classification === 'ERROR') ? 'unfinished' : 'accepted'
  }
  return 'rejected'
}
