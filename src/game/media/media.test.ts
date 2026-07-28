import { describe, expect, it } from 'vitest'
import { authoredPromptSchema, checkAuthoredPromptSemantics, isValidSameOriginPath } from './schema'
import {
  assertNeverPromptKind,
  isImagePrompt,
  isTextPrompt,
  normalizeAuthoredPrompt,
  readTrustedPrompt,
  type PromptContent,
} from './definition'
import {
  MAX_MEDIA_ALT_LENGTH,
  MAX_MEDIA_ATTRIBUTION_LENGTH,
  MAX_MEDIA_CAPTION_LENGTH,
  MAX_MEDIA_PATH_LENGTH,
} from './limits'
import { createCategoryBoardDefinition } from '../categoryBoard/definition'
import { boardConfig, tile, category } from '../../test/categoryBoardFixtures'

/** Extract the importCode from a Zod custom issue, if present. */
function importCodeOf(issues: readonly unknown[]): string | null {
  const issue = issues[0]
  if (typeof issue !== 'object' || issue === null) return null
  const params = (issue as { params?: unknown }).params
  if (typeof params !== 'object' || params === null) return null
  const code = (params as Record<string, unknown>).importCode
  return typeof code === 'string' ? code : null
}

describe('same-origin path grammar', () => {
  it('accepts nested relative asset paths', () => {
    expect(isValidSameOriginPath('media-fixtures/slice-11-clue.png')).toBe(true)
    expect(isValidSameOriginPath('a')).toBe(true)
    expect(isValidSameOriginPath('Pack_1/clue-2.png')).toBe(true)
  })

  it.each([
    ['leading slash', '/media-fixtures/x.png'],
    ['parent segment', 'media/../secret.png'],
    ['scheme colon', 'https://evil.example/x.png'],
    ['query', 'x.png?x=1'],
    ['hash', 'x.png#y'],
    ['backslash', 'a\\b.png'],
    ['whitespace', 'a b.png'],
    ['empty', ''],
    ['leading dot', './x.png'],
  ])('rejects %s', (_label, path) => {
    expect(isValidSameOriginPath(path)).toBe(false)
  })
})

describe('authored prompt schema', () => {
  it('accepts a legacy non-empty string as text', () => {
    const result = authoredPromptSchema.safeParse('What is the mantle?')
    expect(result.success).toBe(true)
  })

  it('accepts a strict image prompt', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'A cross-section of Earth layers',
      caption: 'Earth layers',
      attribution: 'USGS public domain',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an image prompt without optional caption/attribution', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Clue image',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unsupported media kind with unsupported-media-kind', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'audio',
      source: { kind: 'same-origin-path', path: 'x.mp3' },
      alt: 'sound',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(importCodeOf(result.error.issues)).toBe('unsupported-media-kind')
  })

  it('rejects a remote URL source with invalid-media-source', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'image',
      source: { kind: 'https', path: 'https://evil.example/x.png' },
      alt: 'remote',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(importCodeOf(result.error.issues)).toBe('invalid-media-source')
  })

  it('rejects an illegal same-origin path with invalid-media-source', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'image',
      source: { kind: 'same-origin-path', path: '../etc/passwd' },
      alt: 'bad path',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(importCodeOf(result.error.issues)).toBe('invalid-media-source')
  })

  it('rejects unknown keys on the image object', () => {
    const result = authoredPromptSchema.safeParse({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'ok',
      mime: 'image/png',
    })
    expect(result.success).toBe(false)
  })

  it('rejects oversized alt / caption / attribution / path', () => {
    expect(
      authoredPromptSchema.safeParse({
        kind: 'image',
        source: { kind: 'same-origin-path', path: 'x.png' },
        alt: 'A'.repeat(MAX_MEDIA_ALT_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(
      authoredPromptSchema.safeParse({
        kind: 'image',
        source: { kind: 'same-origin-path', path: 'x.png' },
        alt: 'ok',
        caption: 'C'.repeat(MAX_MEDIA_CAPTION_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(
      authoredPromptSchema.safeParse({
        kind: 'image',
        source: { kind: 'same-origin-path', path: 'x.png' },
        alt: 'ok',
        attribution: 'A'.repeat(MAX_MEDIA_ATTRIBUTION_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(
      authoredPromptSchema.safeParse({
        kind: 'image',
        source: { kind: 'same-origin-path', path: `${'a'.repeat(MAX_MEDIA_PATH_LENGTH + 1)}.png` },
        alt: 'ok',
      }).success,
    ).toBe(false)
  })
})

describe('prompt semantics', () => {
  it('flags whitespace-only alt as blank-text', () => {
    const issues: { params?: { importCode?: string } }[] = []
    const ctx = {
      addIssue: (issue: { params?: { importCode?: string } }) => {
        issues.push(issue)
      },
    }
    checkAuthoredPromptSemantics(
      {
        kind: 'image',
        source: { kind: 'same-origin-path', path: 'x.png' },
        alt: '   ',
      },
      ctx as never,
      ['prompt'],
    )
    expect(issues.some((i) => i.params?.importCode === 'blank-text')).toBe(true)
  })
})

describe('trusted normalization', () => {
  it('normalizes a string prompt to text kind', () => {
    expect(normalizeAuthoredPrompt('Hello')).toEqual({ kind: 'text', text: 'Hello' })
  })

  it('copies image fields and nulls omitted optionals', () => {
    const prompt = normalizeAuthoredPrompt({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Clue',
    })
    expect(prompt).toEqual({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Clue',
      caption: null,
      attribution: null,
    })
  })

  it('never mutates the authored input object', () => {
    const authored = {
      kind: 'image' as const,
      source: { kind: 'same-origin-path' as const, path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Clue',
      caption: 'Caption',
    }
    const before = JSON.stringify(authored)
    const trusted = normalizeAuthoredPrompt(authored)
    expect(JSON.stringify(authored)).toBe(before)
    if (trusted === null || trusted.kind !== 'image') throw new Error('expected image')
    expect(trusted.source).not.toBe(authored.source)
  })

  it('fails closed on impossible private media at readTrustedPrompt', () => {
    expect(readTrustedPrompt({ kind: 'video', url: 'x' })).toBeNull()
    expect(readTrustedPrompt({ kind: 'image', source: { kind: 'https', path: 'x' }, alt: 'a' })).toBeNull()
    expect(readTrustedPrompt('bare-string')).toBeNull()
  })

  it('provides exhaustive helpers without a silent default branch', () => {
    const text = normalizeAuthoredPrompt('T')
    if (text === null) throw new Error('expected text')
    expect(isTextPrompt(text)).toBe(true)
    expect(isImagePrompt(text)).toBe(false)

    const describePrompt = (prompt: PromptContent): string => {
      switch (prompt.kind) {
        case 'text':
          return prompt.text
        case 'image':
          return prompt.alt
        default:
          return assertNeverPromptKind(prompt)
      }
    }
    expect(describePrompt(text)).toBe('T')
  })
})

describe('category-board construction with media', () => {
  it('builds a board whose string prompt is normalized to text', () => {
    const board = createCategoryBoardDefinition(boardConfig())
    expect(board.categories[0].tiles[0].prompt).toEqual({
      kind: 'text',
      text: 'Prompt for alpha-100',
    })
  })

  it('builds a board with an image prompt', () => {
    const board = createCategoryBoardDefinition({
      categories: [
        category('a', {
          tiles: [
            tile('a-1', {
              prompt: {
                kind: 'image',
                source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                alt: 'Earth cross-section',
                caption: 'Layers',
                attribution: 'Fixture',
              },
            }),
          ],
        }),
      ],
    })
    expect(board.categories[0].tiles[0].prompt).toEqual({
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Earth cross-section',
      caption: 'Layers',
      attribution: 'Fixture',
    })
  })

  it('still rejects a top-level unknown media field on a tile', () => {
    expect(() =>
      createCategoryBoardDefinition({
        categories: [category('a', { tiles: [tile('a-1', { media: 'x.png' })] })],
      }),
    ).toThrow()
  })
})
