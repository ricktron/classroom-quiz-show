import { describe, expect, it } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { isGameDefinition } from '../game/gameDefinition'
import { createSessionStore } from '../state/store'
import { exportGameDefinition } from '../export/exportGame'
import { importGameFromJsonText } from '../import/importGame'
import { approveAndImportDraft, markDraftApproved } from './approveAndImport'
import { applyDraftCorrection } from './correctDraft'
import { compileApprovedDraft } from './compileDraft'
import { parseWorkbookBytes } from './parseWorkbook'
import { buildTestWorkbookBytes } from './testWorkbookFactory'
import { CLUE_HEADERS, GAME_HEADERS } from './contract'
import { MAX_CATEGORY_TITLE_LENGTH } from './limits'
import {
  isWorkbookSourceIssue,
  preserveWorkbookSourceIssues,
} from './validateDraft'

const registry = createDefaultRegistry()

function clueCount(draft: { board: { categories: ReadonlyArray<{ clues: readonly unknown[] }> } }) {
  return draft.board.categories.reduce((n, c) => n + c.clues.length, 0)
}

describe('authoring draft + compiler', () => {
  it('draft is not a GameDefinition and cannot initialize a game', async () => {
    const parsed = await parseWorkbookBytes(buildTestWorkbookBytes(), 'd.xlsx')
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(isGameDefinition(parsed.draft as unknown)).toBe(false)

    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    const before = store.getHistory().length
    // @ts-expect-error deliberate misuse
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition: parsed.draft })
    expect(store.getHistory().length).toBe(before)
    expect(store.getState().session?.game).toBeNull()
  })

  it('blockers prevent approval; corrections revalidate and preserve identity', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Prompt', '', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'block.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    const approved = markDraftApproved(parsed.draft)
    expect(approved.status).toBe('blocked')

    const good = await parseWorkbookBytes(buildTestWorkbookBytes(), 'good.xlsx')
    expect(good.status).toBe('success')
    if (good.status !== 'success') return
    const tileId = good.draft.board.categories[0]!.clues[0]!.tileCanonicalId
    const corrected = applyDraftCorrection(good.draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'answer',
      value: 'Igneous rock',
    })
    expect(corrected.board.categories[0]!.clues[0]!.tileCanonicalId).toBe(tileId)
    expect(corrected.board.categories[0]!.clues[0]!.answer).toBe('Igneous rock')
  })

  it('Classic Board end-to-end compile/import with stable ids and export symmetry', async () => {
    const bytes = buildTestWorkbookBytes({ profile: 'classic-board' })
    const parsed = await parseWorkbookBytes(bytes, 'classic.xlsx')
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return

    const first = approveAndImportDraft(parsed.draft, { registry })
    expect(first.status).toBe('success')
    if (first.status !== 'success') return
    expect(first.importResult.definition.rounds[0]?.type).toBe('category-board')
    expect(first.importResult.metadata.schemaVersion).toBe(1)

    const second = approveAndImportDraft(parsed.draft, { registry })
    expect(second.status).toBe('success')
    if (second.status !== 'success') return
    expect(second.importResult.definition.id).toBe(first.importResult.definition.id)
    expect(second.importResult.definition.rounds[0]?.id).toBe(
      first.importResult.definition.rounds[0]?.id,
    )

    const exported = exportGameDefinition(first.importResult.definition, { registry })
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return
    const reimported = importGameFromJsonText(exported.jsonText, { registry })
    expect(reimported.status).toBe('success')
    if (reimported.status !== 'success') return
    expect(reimported.definition.id).toBe(first.importResult.definition.id)
  })

  it('Board + Final compiles with terminal final-wager', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({ profile: 'board-plus-final' }),
      'final.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.importResult.definition.rounds.map((r) => r.type)).toEqual([
      'category-board',
      'final-wager',
    ])
  })

  it('row sorting with stable order keys does not change identities', async () => {
    const ordered = buildTestWorkbookBytes({
      clueRows: [
        [...CLUE_HEADERS],
        [1, 'Rocks', 1, 100, 'P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
        [1, 'Rocks', 2, 200, 'P2', 'A2', '', '', '', '', '', '', '', '', '', 1],
      ],
    })
    const shuffled = buildTestWorkbookBytes({
      clueRows: [
        [...CLUE_HEADERS],
        [1, 'Rocks', 2, 200, 'P2', 'A2', '', '', '', '', '', '', '', '', '', 1],
        [1, 'Rocks', 1, 100, 'P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
      ],
    })
    const a = await parseWorkbookBytes(ordered, 'a.xlsx')
    const b = await parseWorkbookBytes(shuffled, 'b.xlsx')
    expect(a.status).toBe('success')
    expect(b.status).toBe('success')
    if (a.status !== 'success' || b.status !== 'success') return
    expect(a.draft.board.categories[0]!.clues.map((c) => c.tileCanonicalId)).toEqual(
      b.draft.board.categories[0]!.clues.map((c) => c.tileCanonicalId),
    )
  })

  it('compile without approval fails; importer failure remains authoritative', async () => {
    const parsed = await parseWorkbookBytes(buildTestWorkbookBytes(), 'x.xlsx')
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    const compiled = compileApprovedDraft(parsed.draft)
    expect(compiled.status).toBe('failure')

    // Force an approved draft with an invalid title length after fingerprinting by
    // manually constructing an approved status that still fails canonical import
    // via empty categories replaced — use overlong title.
    const overlong = applyDraftCorrection(parsed.draft, {
      kind: 'game-title',
      title: 'x'.repeat(201),
    })
    const result = approveAndImportDraft(overlong, { registry })
    expect(result.status).toBe('failure')
  })

  it('failed import/approval mutates no session/public/persistence state', async () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    const beforeHistory = store.getHistory().length
    const beforePublic = store.getPublicState()
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Prompt', '', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'fail.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    expect(store.getHistory().length).toBe(beforeHistory)
    expect(store.getState().session?.game).toBeNull()
    expect(store.getPublicState()).toEqual(beforePublic)
  })

  it('approveAndImportDraft refuses unresolved formula-not-allowed blockers (trust boundary)', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        formulaCells: [{ sheet: 'CLUES', a1: 'E2', formula: '1+1', cached: 'Mars' }],
      }),
      'formula-approve.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    expect(parsed.draft.issues.some((i) => i.code === 'formula-not-allowed')).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'formula-not-allowed')).toBe(true)
    expect(result.draft.status).toBe('blocked')
    expect(result.importResult).toBeUndefined()
    expect(isGameDefinition(result.draft as unknown)).toBe(false)
  })

  it('approveAndImportDraft refuses unresolved hidden-semantic-content blockers', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({ hideClues: true }),
      'hidden-approve.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.issues.some((i) => i.code === 'hidden-semantic-content')).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'hidden-semantic-content')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('shared workbook-source policy is family-based, not issue-code allowlists', () => {
    const cellInvalid = {
      code: 'invalid-type' as const,
      severity: 'blocker' as const,
      family: 'cell' as const,
      message: 'x',
    }
    const draftLimit = {
      code: 'numeric-out-of-range' as const,
      severity: 'blocker' as const,
      family: 'draft' as const,
      message: 'y',
    }
    expect(isWorkbookSourceIssue(cellInvalid)).toBe(true)
    expect(isWorkbookSourceIssue(draftLimit)).toBe(false)
    expect(preserveWorkbookSourceIssues([cellInvalid, draftLimit])).toEqual([cellInvalid])
  })

  it('invalid ResponseSeconds cannot approve after normalization to undefined', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [[...GAME_HEADERS], ['Title', 'key-abc', 'abc', '', '', '', '', '', '', '', '']],
      }),
      'resp-abc.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    expect(parsed.draft.game.responseSeconds).toBeUndefined()
    expect(
      parsed.draft.issues.some((i) => i.code === 'invalid-type' && i.family === 'cell'),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'invalid-type')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('invalid Multiplier cannot approve after normalization to undefined', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Prompt', 'Answer', '', '', '', '', '', '', '', '', '', 'abc'],
        ],
      }),
      'mult-abc.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    expect(parsed.draft.board.categories[0]?.clues[0]?.multiplier).toBeUndefined()
    expect(
      parsed.draft.issues.some((i) => i.code === 'invalid-type' && i.family === 'cell'),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'invalid-type')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('boolean Notes invalid-type cannot approve after normalization to absent', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Prompt', 'Answer', '', '', '', '', '', '', '', '', 'note', 1],
        ],
        booleanCells: [{ sheet: 'CLUES', a1: 'O2', value: true }],
      }),
      'bool-notes.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.board.categories[0]?.clues[0]?.notes).toBeUndefined()
    expect(
      parsed.draft.issues.some((i) => i.code === 'invalid-type' && i.family === 'cell'),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'invalid-type')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('omitted missing-Prompt clue keeps source blocker through approval', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Valid P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
          [1, 'Rocks', 2, 200, '', 'A2', '', '', '', '', '', '', '', '', '', 1],
          [1, 'Rocks', 3, 300, 'Valid P3', 'A3', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'omit-prompt.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(clueCount(parsed.draft)).toBe(2)
    expect(
      parsed.draft.issues.some(
        (i) =>
          (i.code === 'required-value-missing' || i.code === 'whitespace-only') &&
          i.family === 'cell',
      ),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(
      result.issues.some(
        (i) => i.code === 'required-value-missing' || i.code === 'whitespace-only',
      ),
    ).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('omitted whitespace-only Answer keeps source blocker through approval', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Valid P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
          [1, 'Rocks', 2, 200, 'Valid P2', '   ', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'omit-ws.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(clueCount(parsed.draft)).toBe(1)
    expect(
      parsed.draft.issues.some((i) => i.code === 'whitespace-only' && i.family === 'cell'),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'whitespace-only')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('omitted control-character Prompt keeps source blocker through approval', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Valid P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
          [1, 'Rocks', 2, 200, 'Bad\u0000Prompt', 'A2', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'omit-ctrl.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(clueCount(parsed.draft)).toBe(1)
    expect(
      parsed.draft.issues.some((i) => i.code === 'control-characters' && i.family === 'cell'),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'control-characters')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('duplicate CategoryOrder/ClueOrder keeps source blocker through approval', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'P1', 'A1', '', '', '', '', '', '', '', '', '', 1],
          [1, 'Rocks', 1, 200, 'P2', 'A2', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'dup-id.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(clueCount(parsed.draft)).toBe(1)
    expect(
      parsed.draft.issues.some(
        (i) => i.code === 'duplicate-authoring-identity' && i.family === 'cell',
      ),
    ).toBe(true)

    const result = approveAndImportDraft(parsed.draft, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'duplicate-authoring-identity')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('unrelated title correction cannot erase invalid-type source blocker', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [[...GAME_HEADERS], ['Title', 'key-abc', 'abc', '', '', '', '', '', '', '', '']],
      }),
      'corr-type.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    const corrected = applyDraftCorrection(parsed.draft, {
      kind: 'game-title',
      title: 'Corrected Title',
    })
    expect(corrected.game.title).toBe('Corrected Title')
    expect(
      corrected.issues.some((i) => i.code === 'invalid-type' && i.family === 'cell'),
    ).toBe(true)
    expect(corrected.status).toBe('blocked')

    const result = approveAndImportDraft(corrected, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'invalid-type')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('unrelated title correction cannot erase excel-error-cell source blocker', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, 'Rocks', 1, 100, 'Prompt', 'Answer', '', '', '', '', '', '', '', '', 'note', 1],
        ],
        errorCells: [{ sheet: 'CLUES', a1: 'O2', error: '#N/A' }],
      }),
      'corr-err.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.issues.some((i) => i.code === 'excel-error-cell')).toBe(true)

    const corrected = applyDraftCorrection(parsed.draft, {
      kind: 'game-title',
      title: 'Corrected Title',
    })
    expect(
      corrected.issues.some((i) => i.code === 'excel-error-cell' && i.family === 'cell'),
    ).toBe(true)
    expect(corrected.status).toBe('blocked')

    const result = approveAndImportDraft(corrected, { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.code === 'excel-error-cell')).toBe(true)
    expect(result.importResult).toBeUndefined()
  })

  it('draft-family blockers remain correctable in-app after revalidation', async () => {
    const longCategory = 'C'.repeat(MAX_CATEGORY_TITLE_LENGTH + 1)
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [1, longCategory, 1, 100, 'Prompt', 'Answer', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'draft-corr.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    expect(
      parsed.draft.issues.some(
        (i) => i.code === 'numeric-out-of-range' && i.family === 'draft',
      ),
    ).toBe(true)

    const corrected = applyDraftCorrection(parsed.draft, {
      kind: 'category-title',
      categoryOrder: 1,
      title: 'Rocks',
    })
    expect(
      corrected.issues.some((i) => i.code === 'numeric-out-of-range' && i.family === 'draft'),
    ).toBe(false)
    expect(corrected.status).toBe('ready_for_approval')

    const result = approveAndImportDraft(corrected, { registry })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.importResult.definition).toBeDefined()
  })
})
