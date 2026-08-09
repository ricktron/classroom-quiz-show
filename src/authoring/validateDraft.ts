/**
 * Draft revalidation and readiness status (Slice 20).
 */

import {
  MAX_ALTERNATE_LENGTH,
  MAX_ALTERNATES,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_FINAL_ALTERNATE_LENGTH,
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
  MAX_MULTIPLIER,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_RESPONSE_SECONDS,
  MAX_TEAM_NAME_LENGTH,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_TILES,
  MIN_RESPONSE_SECONDS,
} from './limits'
import { authoringIssue, type AuthoringIssue } from './issues'
import { draftContentFingerprint } from './fingerprint'
import type { AuthoringDraft, DraftStatus } from './types'

function lengthIssue(
  value: string,
  max: number,
  field: string,
  location: Partial<AuthoringIssue>,
): AuthoringIssue | null {
  if (value.length > max) {
    return authoringIssue(
      'numeric-out-of-range',
      'blocker',
      'draft',
      `${field} must be at most ${max} characters.`,
      { field, ...location },
    )
  }
  return null
}

export function computeDraftStatus(issues: readonly AuthoringIssue[]): DraftStatus {
  if (issues.some((i) => i.severity === 'blocker')) return 'blocked'
  if (issues.some((i) => i.severity === 'warning')) return 'review_required'
  return 'ready_for_approval'
}

/**
 * Structural / parse-time issues that semantic revalidation does not recompute.
 * Preserved across correction and approval so unresolved blockers cannot be
 * dropped by content-only revalidation.
 */
export function preserveStructuralAuthoringIssues(
  issues: readonly AuthoringIssue[],
): AuthoringIssue[] {
  return issues.filter(
    (issue) =>
      issue.family === 'transport' ||
      issue.family === 'workbook' ||
      issue.code === 'formula-not-allowed' ||
      issue.code === 'excel-error-cell' ||
      issue.code === 'hidden-semantic-content' ||
      issue.code === 'unsupported-media-field' ||
      issue.code === 'duplicate-header' ||
      issue.code === 'missing-header' ||
      issue.code === 'missing-sheet' ||
      issue.code === 'ambiguous-semantic-rows',
  )
}

export function validateDraftContent(draft: AuthoringDraft): AuthoringIssue[] {
  const issues: AuthoringIssue[] = []

  const titleLen = lengthIssue(draft.game.title, MAX_TITLE_LENGTH, 'Title', {
    sheet: 'GAME',
    field: 'Title',
  })
  if (titleLen) issues.push(titleLen)

  if (draft.game.responseSeconds !== undefined) {
    if (
      !Number.isInteger(draft.game.responseSeconds) ||
      draft.game.responseSeconds < MIN_RESPONSE_SECONDS ||
      draft.game.responseSeconds > MAX_RESPONSE_SECONDS
    ) {
      issues.push(
        authoringIssue(
          'invalid-timer',
          'blocker',
          'draft',
          `ResponseSeconds must be an integer from ${MIN_RESPONSE_SECONDS} to ${MAX_RESPONSE_SECONDS}.`,
          { sheet: 'GAME', field: 'ResponseSeconds' },
        ),
      )
    }
  }

  for (const team of draft.game.teams) {
    const t = lengthIssue(team.name, MAX_TEAM_NAME_LENGTH, team.authoringKey, {
      sheet: 'GAME',
      field: team.authoringKey,
    })
    if (t) issues.push(t)
  }

  if (draft.profile === 'board-plus-final' && draft.game.teams.length === 0) {
    issues.push(
      authoringIssue(
        'required-value-missing',
        'blocker',
        'draft',
        'Board + Final requires at least one team name.',
        { sheet: 'GAME', field: 'Team1Name' },
      ),
    )
  }

  if (draft.board.categories.length === 0) {
    issues.push(
      authoringIssue(
        'blocking-structural-state',
        'blocker',
        'draft',
        'At least one category with clues is required.',
        { sheet: 'CLUES' },
      ),
    )
  }

  if (draft.board.categories.length > MAX_CATEGORIES) {
    issues.push(
      authoringIssue(
        'numeric-out-of-range',
        'blocker',
        'draft',
        `At most ${MAX_CATEGORIES} categories are allowed.`,
        { sheet: 'CLUES', field: 'CategoryOrder' },
      ),
    )
  }

  let totalTiles = 0
  const tileIds = new Set<string>()
  const categoryIds = new Set<string>()

  for (const category of draft.board.categories) {
    const catTitle = lengthIssue(category.title, MAX_CATEGORY_TITLE_LENGTH, 'Category', {
      sheet: 'CLUES',
      field: 'Category',
      draftPath: `board.categories[${category.order}].title`,
    })
    if (catTitle) issues.push(catTitle)

    if (categoryIds.has(category.canonicalId)) {
      issues.push(
        authoringIssue(
          'duplicate-authoring-identity',
          'blocker',
          'draft',
          `Duplicate category identity ${category.canonicalId}.`,
          { sheet: 'CLUES', field: 'CategoryOrder', draftPath: `board.categories[${category.order}]` },
        ),
      )
    }
    categoryIds.add(category.canonicalId)

    if (category.clues.length === 0) {
      issues.push(
        authoringIssue(
          'incomplete-clue',
          'blocker',
          'draft',
          `CategoryOrder ${category.order} has no clues.`,
          { sheet: 'CLUES', field: 'CategoryOrder' },
        ),
      )
    }
    if (category.clues.length > MAX_TILES_PER_CATEGORY) {
      issues.push(
        authoringIssue(
          'numeric-out-of-range',
          'blocker',
          'draft',
          `CategoryOrder ${category.order} exceeds ${MAX_TILES_PER_CATEGORY} clues.`,
          { sheet: 'CLUES', field: 'ClueOrder' },
        ),
      )
    }

    for (const clue of category.clues) {
      totalTiles += 1
      if (tileIds.has(clue.tileCanonicalId)) {
        issues.push(
          authoringIssue(
            'duplicate-authoring-identity',
            'blocker',
            'draft',
            `Duplicate tile identity ${clue.tileCanonicalId}.`,
            {
              sheet: clue.provenance.sheet,
              row: clue.provenance.row,
              a1: clue.provenance.a1Prompt,
              field: 'ClueOrder',
            },
          ),
        )
      }
      tileIds.add(clue.tileCanonicalId)

      if (!Number.isInteger(clue.value) || clue.value < 0 || clue.value > MAX_TILE_VALUE) {
        issues.push(
          authoringIssue(
            'numeric-out-of-range',
            'blocker',
            'draft',
            `Value must be an integer from 0 to ${MAX_TILE_VALUE}.`,
            {
              sheet: clue.provenance.sheet,
              row: clue.provenance.row,
              a1: clue.provenance.a1Prompt,
              field: 'Value',
            },
          ),
        )
      }

      const p = lengthIssue(clue.prompt, MAX_PROMPT_LENGTH, 'Prompt', {
        sheet: clue.provenance.sheet,
        row: clue.provenance.row,
        a1: clue.provenance.a1Prompt,
      })
      if (p) issues.push(p)
      const a = lengthIssue(clue.answer, MAX_ANSWER_LENGTH, 'Answer', {
        sheet: clue.provenance.sheet,
        row: clue.provenance.row,
      })
      if (a) issues.push(a)
      if (clue.notes) {
        const n = lengthIssue(clue.notes, MAX_NOTES_LENGTH, 'Notes', {
          sheet: clue.provenance.sheet,
          row: clue.provenance.row,
        })
        if (n) issues.push(n)
      }
      if (clue.alternates.length > MAX_ALTERNATES) {
        issues.push(
          authoringIssue(
            'numeric-out-of-range',
            'blocker',
            'draft',
            `At most ${MAX_ALTERNATES} alternates are allowed.`,
            { sheet: clue.provenance.sheet, row: clue.provenance.row, field: 'Alternate1' },
          ),
        )
      }
      for (const alt of clue.alternates) {
        const al = lengthIssue(alt, MAX_ALTERNATE_LENGTH, 'Alternate', {
          sheet: clue.provenance.sheet,
          row: clue.provenance.row,
        })
        if (al) issues.push(al)
      }
      if (clue.multiplier !== undefined) {
        if (
          !Number.isInteger(clue.multiplier) ||
          clue.multiplier < 1 ||
          clue.multiplier > MAX_MULTIPLIER
        ) {
          issues.push(
            authoringIssue(
              'numeric-out-of-range',
              'blocker',
              'draft',
              `Multiplier must be an integer from 1 to ${MAX_MULTIPLIER}.`,
              { sheet: clue.provenance.sheet, row: clue.provenance.row, field: 'Multiplier' },
            ),
          )
        }
      }

      if (clue.prompt.trim().length === 0 || clue.answer.trim().length === 0) {
        issues.push(
          authoringIssue(
            'incomplete-clue',
            'blocker',
            'draft',
            'Each clue requires a non-empty Prompt and Answer.',
            {
              sheet: clue.provenance.sheet,
              row: clue.provenance.row,
              a1: clue.provenance.a1Prompt,
            },
          ),
        )
      }
    }
  }

  if (totalTiles > MAX_TOTAL_TILES) {
    issues.push(
      authoringIssue(
        'numeric-out-of-range',
        'blocker',
        'draft',
        `At most ${MAX_TOTAL_TILES} total clues are allowed.`,
        { sheet: 'CLUES' },
      ),
    )
  }

  if (draft.profile === 'board-plus-final') {
    if (!draft.final) {
      issues.push(
        authoringIssue(
          'blocking-structural-state',
          'blocker',
          'draft',
          'Board + Final profile requires Final content.',
          { sheet: 'FINAL' },
        ),
      )
    } else {
      const fp = lengthIssue(draft.final.prompt, MAX_PROMPT_LENGTH, 'Prompt', {
        sheet: 'FINAL',
        row: draft.final.provenance.row,
        a1: draft.final.provenance.a1Prompt,
      })
      if (fp) issues.push(fp)
      const fa = lengthIssue(draft.final.answer, MAX_FINAL_ANSWER_LENGTH, 'Answer', {
        sheet: 'FINAL',
        row: draft.final.provenance.row,
      })
      if (fa) issues.push(fa)
      if (draft.final.notes) {
        const fn = lengthIssue(draft.final.notes, MAX_FINAL_NOTES_LENGTH, 'Notes', {
          sheet: 'FINAL',
          row: draft.final.provenance.row,
        })
        if (fn) issues.push(fn)
      }
      if (draft.final.alternates.length > MAX_FINAL_ALTERNATES) {
        issues.push(
          authoringIssue(
            'numeric-out-of-range',
            'blocker',
            'draft',
            `Final allows at most ${MAX_FINAL_ALTERNATES} alternates.`,
            { sheet: 'FINAL', field: 'Alternate1' },
          ),
        )
      }
      for (const alt of draft.final.alternates) {
        const al = lengthIssue(alt, MAX_FINAL_ALTERNATE_LENGTH, 'Alternate', {
          sheet: 'FINAL',
          row: draft.final.provenance.row,
        })
        if (al) issues.push(al)
      }
    }
  }

  return issues
}

export function revalidateDraft(
  draft: AuthoringDraft,
  additionalIssues: readonly AuthoringIssue[] = [],
): AuthoringDraft {
  const contentIssues = validateDraftContent(draft)
  const merged = [...additionalIssues, ...contentIssues]
  const status = computeDraftStatus(merged)
  const fingerprint = draftContentFingerprint(draft)
  return {
    ...draft,
    issues: merged,
    status,
    contentFingerprint: fingerprint,
  }
}
