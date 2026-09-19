import { describe, expect, it } from 'vitest'
import { approveAndImportDraft } from '../authoring/approveAndImport'
import { applyDraftCorrection } from '../authoring/correctDraft'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from './importGame'
import {
  analyzeCorruptGameImport,
  applyFreshLibraryIdentity,
} from './salvage'
import { boardGameFile, boardGameFileText, category, tile } from '../test/categoryBoardFixtures'
import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from './canonicalFormat'

const FORBIDDEN_COPY = /\bjson\b|schema|parser|zod|stack trace|undefined/i
const INVENTED = ['Rayleigh scattering', 'Team 1', 'Category 1', 'Untitled question']

function textOf(doc: Record<string, unknown>): string {
  return JSON.stringify(doc)
}

function correctionOf(text: string) {
  const salvage = analyzeCorruptGameImport(text)
  expect(salvage.outcome).toBe('correction')
  if (salvage.outcome !== 'correction') throw new Error('expected correction')
  return salvage.view
}

describe('corrupt import salvage', () => {
  it('leaves a fully valid import on the canonical path', () => {
    const text = boardGameFileText()
    expect(importGameFromJsonText(text).status).toBe('success')
    expect(analyzeCorruptGameImport(text)).toEqual({ outcome: 'not-needed' })
  })

  it('fails closed on unreadable files and does not build a draft', () => {
    for (const text of ['{', '', '[]', JSON.stringify({ format: 'nope', schemaVersion: 1 })]) {
      const salvage = analyzeCorruptGameImport(text)
      expect(salvage.outcome).toBe('fail-closed')
      expect(JSON.stringify(salvage)).not.toMatch(FORBIDDEN_COPY)
      expect(salvage).not.toHaveProperty('view')
    }
    const unsafe = boardGameFile()
    ;(unsafe.rounds as Record<string, unknown>[])[0] = {
      ...(unsafe.rounds as Record<string, unknown>[])[0],
      config: JSON.parse('{"categories":[],"__proto__":{"admin":true}}') as Record<string, unknown>,
    }
    expect(analyzeCorruptGameImport(textOf(unsafe)).outcome).toBe('fail-closed')
    const future = boardGameFile()
    future.schemaVersion = 99
    expect(analyzeCorruptGameImport(textOf(future)).outcome).toBe('fail-closed')
  })

  it('keeps a valid question and does not invent a missing answer', () => {
    const doc = boardGameFile({
      categories: [
        category('sky', {
          title: 'Sky',
          tiles: [
            tile('sky-100', { prompt: 'Why is the sky blue?', answer: 'Scattering', value: 200 }),
            tile('sky-200', { prompt: 'Which gas is most of air?', answer: 5, value: 400 }),
          ],
        }),
      ],
    })
    const view = correctionOf(textOf(doc))
    const clues = view.draft.board.categories[0]?.clues ?? []
    expect(clues.map((clue) => clue.prompt)).toEqual(['Why is the sky blue?', 'Which gas is most of air?'])
    expect(clues[0]?.answer).toBe('Scattering')
    expect(clues[0]?.value).toBe(200)
    expect(clues[1]?.answer).toBe('')
    expect(clues[1]?.value).toBe(400)
    const blob = JSON.stringify(view.draft)
    for (const word of INVENTED) expect(blob).not.toContain(word)
    expect(blob).not.toContain('"5"')
    const copy = [...view.kept, ...view.needsTeacher, ...view.rejected, view.headline, view.detail].join('\n')
    expect(copy).not.toMatch(FORBIDDEN_COPY)

    const registry = createDefaultRegistry()
    expect(approveAndImportDraft(view.draft, { registry }).status).toBe('failure')
    const fixed = applyDraftCorrection(view.draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 2,
      field: 'answer',
      value: 'Nitrogen',
    })
    const approved = approveAndImportDraft(fixed, { registry })
    expect(approved.status).toBe('success')
    if (approved.status !== 'success') return
    expect(approved.importResult.definition.rounds).toHaveLength(1)
    expect(JSON.stringify(approved.importResult.definition)).toContain('Nitrogen')
    expect(JSON.stringify(approved.importResult.definition)).not.toContain('Rayleigh')
  })

  it('does not invent a point value when the file omitted one', () => {
    const doc = boardGameFile({
      categories: [
        {
          id: 'rocks',
          title: 'Rocks',
          tiles: [{ id: 'rocks-1', prompt: 'Name an igneous rock.', answer: 'Granite' }],
        },
      ],
    })
    const view = correctionOf(textOf(doc))
    const clue = view.draft.board.categories[0]?.clues[0]
    expect(clue?.prompt).toBe('Name an igneous rock.')
    expect(clue?.answer).toBe('Granite')
    expect(clue?.valueAuthored).toBe(false)
    expect(approveAndImportDraft(view.draft, { registry: createDefaultRegistry() }).status).toBe('failure')
  })

  it('rejects an unknown round and a private session blob instead of keeping them', () => {
    const doc = boardGameFile()
    const rounds = doc.rounds as Record<string, unknown>[]
    rounds.push({
      id: 'mystery',
      type: 'lightning',
      title: 'Lightning',
      config: { question: 'SECRET-QUESTION' },
    })
    doc.session = { note: 'SECRET-SESSION' }
    const view = correctionOf(textOf(doc))
    const blob = JSON.stringify(view.draft)
    expect(blob).not.toContain('SECRET-QUESTION')
    expect(blob).not.toContain('SECRET-SESSION')
    expect(view.draft.board.categories.length).toBeGreaterThan(0)
    const approved = approveAndImportDraft(view.draft, { registry: createDefaultRegistry() })
    expect(approved.status).toBe('success')
    if (approved.status !== 'success') return
    expect(approved.importResult.definition.rounds.every((round) => round.type !== 'lightning')).toBe(true)
  })

  it('keeps the first question when a later one repeats its identity', () => {
    const doc = boardGameFile({
      categories: [
        {
          id: 'dup',
          title: 'Duplicates',
          tiles: [
            tile('same-id', { prompt: 'First real prompt', answer: 'First answer', value: 100 }),
            tile('same-id', { prompt: 'Second prompt must not replace the first', answer: 'Second answer', value: 200 }),
          ],
        },
      ],
    })
    const view = correctionOf(textOf(doc))
    const clues = view.draft.board.categories[0]?.clues ?? []
    expect(clues).toHaveLength(1)
    expect(clues[0]?.prompt).toBe('First real prompt')
    expect(JSON.stringify(view.draft)).not.toContain('Second prompt must not replace the first')
  })

  it('saves a file with no game identity as a new game id, not import-review', () => {
    const doc = boardGameFile({
      categories: [category('only', { title: 'Only', tiles: [tile('only-1')] })],
    })
    delete doc.id
    const view = correctionOf(textOf(doc))
    expect(view.gameIdFromSource).toBe(false)
    expect(view.draft.game.gameCanonicalId).toBe('import-review')
    const rewritten = applyFreshLibraryIdentity(view.draft, view.derived, 'game-42')
    expect(rewritten?.game.gameCanonicalId).toBe('game-42')
    expect(JSON.stringify(rewritten)).not.toContain('import-review')
  })

  it('keeps a safe picture description and drops an unsafe picture path', () => {
    const doc = boardGameFile({
      categories: [
        {
          id: 'pics',
          title: 'Pictures',
          tiles: [
            {
              id: 'pics-1',
              value: 100,
              answer: 'A crater',
              prompt: {
                kind: 'image',
                source: { kind: 'same-origin-path', path: 'https://evil.example/clue.png' },
                alt: 'Round hole in rock',
              },
            },
          ],
        },
      ],
    })
    const view = correctionOf(textOf(doc))
    const clue = view.draft.board.categories[0]?.clues[0]
    expect(clue?.prompt).toBe('Round hole in rock')
    expect(clue?.promptMedia).toBeUndefined()
    expect(JSON.stringify(view.draft)).not.toContain('evil.example')
  })

  it('does not treat an unsupported workbook version as a game to repair', () => {
    const salvage = analyzeCorruptGameImport(
      JSON.stringify({
        format: CANONICAL_GAME_FILE_FORMAT,
        schemaVersion: SUPPORTED_SCHEMA_VERSION + 4,
        id: 'future',
        title: 'Future',
        rounds: [],
      }),
    )
    expect(salvage.outcome).toBe('fail-closed')
  })
})
