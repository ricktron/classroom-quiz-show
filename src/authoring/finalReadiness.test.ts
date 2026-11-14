/**
 * UIX-O16: authoring readiness must agree with the canonical Game boundary
 * for required Final content.
 *
 * A Board + Final draft whose Final question or answer is missing (empty or
 * whitespace-only) is a saveable draft, never a playable Game. The canonical
 * importer stays the final authority; these tests pin that the authoring
 * validator no longer claims readiness the importer will refuse.
 */
import { describe, expect, it } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { approveAndImportDraft, markDraftApproved } from './approveAndImport'
import { compileApprovedDraft } from './compileDraft'
import { applyDraftCorrection } from './correctDraft'
import { createBlankAuthoringDraft } from './createBlankDraft'
import { parseAuthoringDraftJson, serializeAuthoringDraft } from './draftRecord'
import { authoringIssue, type AuthoringIssue } from './issues'
import { MAX_FINAL_ANSWER_LENGTH } from './limits'
import { assessAuthoringReadiness } from './readiness'
import type { AuthoringDraft } from './types'
import { revalidateDraft } from './validateDraft'

const registry = createDefaultRegistry()

const VALID_PROMPT = 'Name the densest layer of the Earth.'
const VALID_ANSWER = 'Inner core'

/** A one-tile Board + Final draft whose board is complete and whose Final is untouched (empty). */
function boardCompleteDraft(): AuthoringDraft {
  let draft = createBlankAuthoringDraft({
    title: 'Earth',
    gameKey: 'earth',
    categoryCount: 1,
    cluesPerCategory: 1,
    teamCount: 2,
  })
  draft = applyDraftCorrection(draft, {
    kind: 'clue-field',
    categoryOrder: 1,
    clueOrder: 1,
    field: 'prompt',
    value: 'What is granite?',
  })
  draft = applyDraftCorrection(draft, {
    kind: 'clue-field',
    categoryOrder: 1,
    clueOrder: 1,
    field: 'answer',
    value: 'Igneous rock',
  })
  return draft
}

function withFinal(draft: AuthoringDraft, prompt: string, answer: string): AuthoringDraft {
  let next = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: prompt })
  next = applyDraftCorrection(next, { kind: 'final-field', field: 'answer', value: answer })
  return next
}

/** The Final missing-content diagnostics, and nothing else. */
function finalMissingIssues(draft: AuthoringDraft): AuthoringIssue[] {
  return draft.issues.filter(
    (issue) => issue.sheet === 'FINAL' && issue.code === 'required-value-missing',
  )
}

describe('UIX-O16: Final readiness agrees with the canonical Game boundary', () => {
  it('blocks a Board + Final draft whose Final object is absent', () => {
    const base = withFinal(boardCompleteDraft(), VALID_PROMPT, VALID_ANSWER)
    const { final: _removed, ...rest } = base
    void _removed
    const draft = revalidateDraft(rest as AuthoringDraft)
    expect(draft.status).toBe('blocked')
    expect(
      draft.issues.some((issue) => issue.sheet === 'FINAL' && issue.severity === 'blocker'),
    ).toBe(true)
  })

  it.each([
    { name: 'empty prompt', prompt: '', answer: VALID_ANSWER, fields: ['Prompt'] },
    { name: 'empty answer', prompt: VALID_PROMPT, answer: '', fields: ['Answer'] },
    { name: 'both empty', prompt: '', answer: '', fields: ['Prompt', 'Answer'] },
    { name: 'both whitespace-only', prompt: '   ', answer: ' \t\n ', fields: ['Prompt', 'Answer'] },
    { name: 'valid prompt, whitespace answer', prompt: VALID_PROMPT, answer: '  ', fields: ['Answer'] },
    { name: 'whitespace prompt, valid answer', prompt: ' \n', answer: VALID_ANSWER, fields: ['Prompt'] },
  ])('blocks an incomplete Final: $name', ({ prompt, answer, fields }) => {
    const draft = withFinal(boardCompleteDraft(), prompt, answer)

    expect(draft.status).toBe('blocked')
    const missing = finalMissingIssues(draft)
    // Exactly one diagnostic per missing field: no duplicates, no extras.
    expect(missing.map((issue) => issue.field)).toEqual(fields)
    for (const issue of missing) {
      expect(issue.severity).toBe('blocker')
      expect(issue.family).toBe('draft')
      expect(issue.sheet).toBe('FINAL')
      expect(issue.message).toMatch(/final/i)
      expect(issue.message).toMatch(issue.field === 'Prompt' ? /question/i : /answer/i)
    }
  })

  it('leaves the untouched Final of a new game blocked even once the board is complete', () => {
    const draft = boardCompleteDraft()
    expect(draft.final).toEqual(expect.objectContaining({ prompt: '', answer: '' }))
    expect(draft.status).toBe('blocked')
    expect(finalMissingIssues(draft).map((issue) => issue.field)).toEqual(['Prompt', 'Answer'])
    // The board itself is complete: Final is the only thing still blocking.
    expect(draft.issues.filter((issue) => issue.severity === 'blocker')).toHaveLength(2)
  })

  it('is ready, compiles, and imports once both Final fields are valid', () => {
    const draft = withFinal(boardCompleteDraft(), VALID_PROMPT, VALID_ANSWER)
    expect(finalMissingIssues(draft)).toEqual([])
    expect(draft.status).toBe('ready_for_approval')

    const imported = approveAndImportDraft(draft, { registry })
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(imported.importResult.definition.rounds.map((round) => round.type)).toEqual([
      'category-board',
      'final-wager',
    ])
  })

  it('restores the blocker when valid Final content is removed, and clears it again on correction', () => {
    let draft = withFinal(boardCompleteDraft(), VALID_PROMPT, VALID_ANSWER)
    expect(draft.status).toBe('ready_for_approval')

    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: '' })
    expect(draft.status).toBe('blocked')
    expect(finalMissingIssues(draft).map((issue) => issue.field)).toEqual(['Answer'])

    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: VALID_ANSWER })
    expect(draft.status).toBe('ready_for_approval')
    expect(finalMissingIssues(draft)).toEqual([])

    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: '   ' })
    expect(draft.status).toBe('blocked')
    expect(finalMissingIssues(draft).map((issue) => issue.field)).toEqual(['Prompt'])

    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'prompt', value: VALID_PROMPT })
    expect(draft.status).toBe('ready_for_approval')
    expect(finalMissingIssues(draft)).toEqual([])
  })

  it('does not require Final content on the Classic Board profile', () => {
    const base = boardCompleteDraft()
    const { final: _removed, ...rest } = base
    void _removed
    const classic = revalidateDraft({
      ...(rest as AuthoringDraft),
      profile: 'classic-board',
      provenance: { ...base.provenance, profile: 'classic-board', detectedSheets: ['GAME', 'CLUES'] },
    })
    expect(classic.status).toBe('ready_for_approval')
    expect(classic.issues.filter((issue) => issue.sheet === 'FINAL')).toEqual([])

    const imported = approveAndImportDraft(classic, { registry })
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(imported.importResult.definition.rounds.map((round) => round.type)).toEqual([
      'category-board',
    ])
  })

  it('keeps unrelated blockers effective alongside the Final blockers', () => {
    // Incomplete clue, valid Final: the clue blocker alone still blocks.
    let draft = withFinal(
      createBlankAuthoringDraft({
        title: 'Earth',
        gameKey: 'earth',
        categoryCount: 1,
        cluesPerCategory: 1,
      }),
      VALID_PROMPT,
      VALID_ANSWER,
    )
    expect(draft.status).toBe('blocked')
    expect(draft.issues.map((issue) => issue.code)).toEqual(['incomplete-clue'])

    // Incomplete clue and incomplete Final: both families are reported.
    draft = applyDraftCorrection(draft, { kind: 'final-field', field: 'answer', value: '' })
    expect(draft.issues.some((issue) => issue.code === 'incomplete-clue')).toBe(true)
    expect(finalMissingIssues(draft).map((issue) => issue.field)).toEqual(['Answer'])

    // The existing Final length limit is still enforced, and is not double-reported as missing.
    const tooLong = withFinal(
      boardCompleteDraft(),
      VALID_PROMPT,
      'x'.repeat(MAX_FINAL_ANSWER_LENGTH + 1),
    )
    expect(tooLong.status).toBe('blocked')
    expect(tooLong.issues.map((issue) => issue.code)).toEqual(['numeric-out-of-range'])
  })

  it('refuses a direct approval/import attempt at the authoring boundary, before compilation', () => {
    const draft = withFinal(boardCompleteDraft(), VALID_PROMPT, '')

    expect(markDraftApproved(draft).status).toBe('blocked')

    const result = approveAndImportDraft(draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.draft.status).toBe('blocked')
    // Refused by the located draft blocker, not left for the importer to discover.
    expect(result.importResult).toBeUndefined()
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        code: 'required-value-missing',
        severity: 'blocker',
        family: 'draft',
        sheet: 'FINAL',
        field: 'Answer',
      }),
    )
  })

  it('ignores a caller that pre-marks an incomplete draft as ready or approved', () => {
    const incomplete = withFinal(boardCompleteDraft(), '', VALID_ANSWER)
    for (const status of ['ready_for_approval', 'approved'] as const) {
      const forged: AuthoringDraft = { ...incomplete, status, issues: [] }

      const result = approveAndImportDraft(forged, { registry })
      expect(result.status).toBe('failure')
      expect(result.draft.status).toBe('blocked')

      // The pure compiler does not emit a Final the importer is certain to refuse.
      const compiled = compileApprovedDraft({ ...forged, status: 'approved' })
      expect(compiled.status).toBe('failure')
      if (compiled.status !== 'failure') continue
      expect(compiled.issues[0]).toEqual(
        expect.objectContaining({ severity: 'blocker', sheet: 'FINAL', field: 'Prompt' }),
      )
    }
  })

  it('leaves the canonical importer as the authority for a hand-built Game with an empty Final', () => {
    const approved = approveAndImportDraft(
      withFinal(boardCompleteDraft(), VALID_PROMPT, VALID_ANSWER),
      { registry },
    )
    expect(approved.status).toBe('success')
    if (approved.status !== 'success') return

    for (const field of ['prompt', 'answer'] as const) {
      for (const blank of ['', '   ']) {
        const document = JSON.parse(approved.jsonText) as {
          rounds: Array<{ type: string; config: Record<string, unknown> }>
        }
        const final = document.rounds.find((round) => round.type === 'final-wager')
        if (!final) throw new Error('compiled game has no final-wager round')
        final.config[field] = blank
        const imported = importGameFromJsonText(JSON.stringify(document), { registry })
        expect(imported.status).toBe('failure')
      }
    }
  })

  it('round-trips an incomplete draft through persistence JSON without losing content or readiness truth', () => {
    const draft = withFinal(boardCompleteDraft(), VALID_PROMPT, '')
    const reopened = parseAuthoringDraftJson(serializeAuthoringDraft(draft))
    if (!reopened) throw new Error('draft JSON could not be reopened')

    expect(reopened.game.gameCanonicalId).toBe(draft.game.gameCanonicalId)
    expect(reopened.final).toEqual(draft.final)
    expect(reopened.board).toEqual(draft.board)
    expect(reopened.status).toBe('blocked')
    expect(finalMissingIssues(reopened).map((issue) => issue.field)).toEqual(['Answer'])
  })

  it('recalculates readiness for a draft stored as ready before this repair', () => {
    // Drafts saved by an earlier build carry `ready_for_approval` with an empty
    // Final. No migration: status is recomputed on read, content is untouched.
    const incomplete = withFinal(boardCompleteDraft(), VALID_PROMPT, '')
    const stored = serializeAuthoringDraft({
      ...incomplete,
      status: 'ready_for_approval',
      issues: [],
    })
    const reopened = parseAuthoringDraftJson(stored)
    if (!reopened) throw new Error('stored draft JSON could not be reopened')

    expect(reopened.final).toEqual(incomplete.final)
    expect(reopened.status).toBe('blocked')
    expect(finalMissingIssues(reopened).map((issue) => issue.field)).toEqual(['Answer'])
  })
})

describe('UIX-O16: assessAuthoringReadiness is the canonical path, not a second validator', () => {
  const complete = () => withFinal(boardCompleteDraft(), VALID_PROMPT, VALID_ANSWER)

  it('is playable exactly when approval, compile, and canonical import all accept the draft', () => {
    expect(assessAuthoringReadiness(complete(), { registry })).toEqual({ kind: 'playable' })
    expect(approveAndImportDraft(complete(), { registry }).status).toBe('success')
  })

  it.each([
    { name: 'both missing', prompt: '', answer: ' ', missing: ['question', 'answer'] },
    { name: 'question missing', prompt: '  ', answer: VALID_ANSWER, missing: ['question'] },
    { name: 'answer missing', prompt: VALID_PROMPT, answer: '', missing: ['answer'] },
  ])('names the missing Final parts when they are the only blockers: $name', ({ prompt, answer, missing }) => {
    expect(
      assessAuthoringReadiness(withFinal(boardCompleteDraft(), prompt, answer), { registry }),
    ).toEqual({ kind: 'final-incomplete', missing })
  })

  it('does not single out Final while any other blocker remains', () => {
    // Board clue incomplete as well as Final.
    const blank = createBlankAuthoringDraft({
      title: 'Earth',
      gameKey: 'earth',
      categoryCount: 1,
      cluesPerCategory: 1,
    })
    expect(assessAuthoringReadiness(blank, { registry })).toEqual({ kind: 'incomplete' })

    // An unresolved workbook-source blocker beside a missing Final answer.
    const withSourceBlocker: AuthoringDraft = {
      ...withFinal(boardCompleteDraft(), VALID_PROMPT, ''),
      issues: [
        authoringIssue('formula-not-allowed', 'blocker', 'cell', 'Notes must be a literal value.', {
          sheet: 'CLUES',
        }),
      ],
    }
    expect(assessAuthoringReadiness(withSourceBlocker, { registry })).toEqual({ kind: 'incomplete' })
  })

  it('never reports playable for a draft the canonical importer refuses, even with no draft blocker', () => {
    // A blank game title has no draft blocker today; the importer still refuses it.
    const untitled = applyDraftCorrection(complete(), { kind: 'game-title', title: '   ' })
    expect(untitled.status).toBe('ready_for_approval')

    const readiness = assessAuthoringReadiness(untitled, { registry })
    expect(readiness.kind).toBe('refused')
    if (readiness.kind !== 'refused') return
    expect(readiness.issues.length).toBeGreaterThan(0)
    expect(readiness.issues.every((issue) => issue.family === 'canonical')).toBe(true)
  })

  it('does not mutate the draft it assesses', () => {
    const draft = withFinal(boardCompleteDraft(), VALID_PROMPT, '')
    const before = JSON.stringify(draft)
    assessAuthoringReadiness(draft, { registry })
    assessAuthoringReadiness(complete(), { registry })
    expect(JSON.stringify(draft)).toBe(before)
  })
})
