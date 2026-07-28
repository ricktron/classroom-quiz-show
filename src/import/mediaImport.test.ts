import { describe, expect, it } from 'vitest'
import { importGameFromUnknown } from './importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { readCategoryBoardDefinition } from '../game/categoryBoard/definition'
import type { ImportIssue } from './issues'

function issuesOf(document: unknown): readonly ImportIssue[] {
  const result = importGameFromUnknown(document)
  if (result.status !== 'failure') throw new Error('expected failure')
  return result.issues
}

function at(document: unknown, path: string): ImportIssue | undefined {
  return issuesOf(document).find((issue) => issue.path === path)
}

describe('media import (Slice 11)', () => {
  it('imports a legacy string prompt unchanged in meaning (normalized to text)', () => {
    const result = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: 'What layer is this?' })] })],
      }),
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const board = readCategoryBoardDefinition(result.definition.rounds[0])
    expect(board?.categories[0].tiles[0].prompt).toEqual({
      kind: 'text',
      text: 'What layer is this?',
    })
  })

  it('imports an image-prompt game successfully', () => {
    const result = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('geology', {
            title: 'Geology',
            tiles: [
              tile('geo-100', {
                prompt: imagePrompt({
                  alt: 'A teal test pixel used as a clue image',
                  caption: 'Slice 11 fixture',
                  attribution: 'CI fixture',
                }),
                answer: 'The mantle',
                notes: 'HOST-ONLY-NOTE-MEDIA',
                alternates: ['Upper mantle'],
              }),
            ],
          }),
        ],
      }),
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const board = readCategoryBoardDefinition(result.definition.rounds[0])
    expect(board?.categories[0].tiles[0].prompt).toEqual({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'A teal test pixel used as a clue image',
      caption: 'Slice 11 fixture',
      attribution: 'CI fixture',
    })
    // Notes/alternates stay on the private tile and are never part of the prompt.
    expect(board?.categories[0].tiles[0].notes).toBe('HOST-ONLY-NOTE-MEDIA')
    expect(board?.categories[0].tiles[0].alternates).toEqual(['Upper mantle'])
  })

  it('fails unsupported media kind with unsupported-media-kind and no active load', () => {
    const document = boardGameFile({
      categories: [
        category('a', {
          tiles: [
            tile('a-1', {
              prompt: {
                kind: 'video',
                source: { kind: 'same-origin-path', path: 'x.mp4' },
                alt: 'clip',
              },
            }),
          ],
        }),
      ],
    })
    const issue = at(document, 'rounds[0].config.categories[0].tiles[0].prompt.kind')
    expect(issue?.code).toBe('unsupported-media-kind')
    expect(importGameFromUnknown(document).status).toBe('failure')
  })

  it('fails an https source with invalid-media-source', () => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'https', path: 'https://evil.example/x.png' },
                  alt: 'remote',
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.source.kind',
    )
    expect(issue?.code).toBe('invalid-media-source')
  })

  it('fails a path with .. as invalid-media-source', () => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'same-origin-path', path: 'media/../secret.png' },
                  alt: 'bad',
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.source.path',
    )
    expect(issue?.code).toBe('invalid-media-source')
  })

  it.each([
    ['percent-encoded parent', '%2e%2e/secret.png'],
    ['empty segment', 'media//image.png'],
    ['query string', 'media.png?x=1'],
    ['data uri shape', 'data:image/png;base64,aaa'],
  ])('fails %s as invalid-media-source', (_label, path) => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'same-origin-path', path },
                  alt: 'bad',
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.source.path',
    )
    expect(issue?.code).toBe('invalid-media-source')
  })

  it('failed import leaves a previously loaded game definition untouched', () => {
    const good = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: 'Keep me' })] })],
      }),
    )
    expect(good.status).toBe('success')
    if (good.status !== 'success') return
    const before = JSON.stringify(good.definition)

    const bad = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'audio',
                  source: { kind: 'same-origin-path', path: 'x.mp3' },
                  alt: 'nope',
                },
              }),
            ],
          }),
        ],
      }),
    )
    expect(bad.status).toBe('failure')
    // The earlier successful result object is an immutable snapshot — a later
    // failure must not mutate it (and callers never load failure into the store).
    expect(JSON.stringify(good.definition)).toBe(before)
  })

  it('fails a missing alt as missing-field', () => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.alt',
    )
    expect(issue?.code).toBe('missing-field')
  })

  it('fails whitespace-only alt as blank-text', () => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                  alt: '   ',
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.alt',
    )
    expect(issue?.code).toBe('blank-text')
  })

  it('fails an unknown key on the image object as unknown-field', () => {
    const issue = at(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: {
                  kind: 'image',
                  source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                  alt: 'ok',
                  mimeType: 'image/png',
                },
              }),
            ],
          }),
        ],
      }),
      'rounds[0].config.categories[0].tiles[0].prompt.mimeType',
    )
    expect(issue?.code).toBe('unknown-field')
  })

  it('still rejects a top-level tile.media field as unknown-field', () => {
    const issue = at(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { media: 'x.png' })] })],
      }),
      'rounds[0].config.categories[0].tiles[0].media',
    )
    expect(issue?.code).toBe('unknown-field')
  })
})
