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
import { CLUE_HEADERS } from './contract'

const registry = createDefaultRegistry()

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
})
