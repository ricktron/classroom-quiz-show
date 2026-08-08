import { describe, expect, it } from 'vitest'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { inventoryPackMedia, inventorySourcePaths } from './mediaInventory'

describe('pack media inventory', () => {
  it('returns no media for text-only games', () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(inventoryPackMedia(imported.definition)).toEqual([])
  })

  it('collects, dedupes, and sorts image source paths', () => {
    const prompt = imagePrompt()
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', { prompt }),
              tile('a-2', { prompt }),
            ],
          }),
          category('b', {
            tiles: [tile('b-1', { prompt: imagePrompt({ source: { kind: 'same-origin-path', path: 'z.png' }, alt: 'z' }) })],
          }),
        ],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(inventorySourcePaths(imported.definition)).toEqual([
      'media-fixtures/slice-11-clue.png',
      'z.png',
    ])
  })

  it('keeps different paths distinct even when bytes would match', () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [
          category('a', {
            tiles: [
              tile('a-1', { prompt: imagePrompt({ source: { kind: 'same-origin-path', path: 'a.png' }, alt: 'a' }) }),
              tile('a-2', { prompt: imagePrompt({ source: { kind: 'same-origin-path', path: 'b.png' }, alt: 'b' }) }),
            ],
          }),
        ],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    expect(inventorySourcePaths(imported.definition)).toEqual(['a.png', 'b.png'])
  })
})
