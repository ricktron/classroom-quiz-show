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
    ['absolute windows-style', '\\windows.png'],
    ['parent segment', 'media/../secret.png'],
    ['nested parent', 'a/../secret.png'],
    ['scheme colon https', 'https://evil.example/x.png'],
    ['scheme colon http', 'http://evil.example/x.png'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data uri', 'data:image/png;base64,aaa'],
    ['blob uri', 'blob:https://example.com/uuid'],
    ['file uri', 'file:///etc/passwd'],
    ['query', 'media.png?x=1'],
    ['hash', 'media.png#fragment'],
    ['backslash', 'a\\b.png'],
    ['whitespace', 'media image.png'],
    ['empty', ''],
    ['leading dot', './x.png'],
    ['percent-encoded parent', '%2e%2e/secret.png'],
    ['mixed percent parent', '.%2e/secret.png'],
    ['percent-encoded slash', 'media/%2Fsecret.png'],
    ['empty segment', 'media//image.png'],
    ['trailing slash', 'media/'],
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

/**
 * Regression: normalization must accept its OWN normalized output.
 *
 * `caption` and `attribution` are optional in the authored schema, and
 * normalization turns an omitted one into an explicit `null`. `readTrustedPrompt`
 * re-reads an already-trusted prompt through that same normalizer, so a guard
 * that accepted only `undefined` rejected the very value normalization produced.
 * Three of the four legal combinations were affected, and the consequence was not
 * a missing caption — the sanitizer failed closed and the ENTIRE round projected
 * nothing.
 */
describe('optional image annotations survive a re-read (idempotent normalization)', () => {
  const imageBase = {
    kind: 'image' as const,
    source: { kind: 'same-origin-path' as const, path: 'media-fixtures/slice-11-clue.png' },
    alt: 'Earth cross-section',
  }

  const COMBINATIONS = [
    ['caption absent, attribution absent', {}, null, null],
    ['caption present, attribution absent', { caption: 'Layers' }, 'Layers', null],
    ['caption absent, attribution present', { attribution: 'Fixture' }, null, 'Fixture'],
    [
      'caption present, attribution present',
      { caption: 'Layers', attribution: 'Fixture' },
      'Layers',
      'Fixture',
    ],
  ] as const

  for (const [label, optionals, caption, attribution] of COMBINATIONS) {
    it(`accepts the authored form, normalizes and re-reads — ${label}`, () => {
      const authored = { ...imageBase, ...optionals }

      // The authored form is schema-valid: both optionals really are optional.
      expect(authoredPromptSchema.safeParse(authored).success).toBe(true)

      const normalized = normalizeAuthoredPrompt(authored)
      expect(normalized).toEqual({ ...imageBase, caption, attribution })

      // The point of the regression: a re-read must succeed and be equal.
      const reread = readTrustedPrompt(normalized)
      expect(reread).not.toBeNull()
      expect(reread).toEqual(normalized)

      // Idempotent: normalizing a normalized prompt changes nothing.
      expect(normalizeAuthoredPrompt(normalized)).toEqual(normalized)
    })
  }

  it('still fails closed on optional annotations that are neither string nor absent', () => {
    for (const bad of [123, true, {}, [], () => 'x']) {
      expect(normalizeAuthoredPrompt({ ...imageBase, caption: bad })).toBeNull()
      expect(normalizeAuthoredPrompt({ ...imageBase, attribution: bad })).toBeNull()
      expect(readTrustedPrompt({ ...imageBase, caption: bad, attribution: null })).toBeNull()
      expect(readTrustedPrompt({ ...imageBase, caption: null, attribution: bad })).toBeNull()
    }
  })

  it('widens only the accepted ABSENCE — every other guard is untouched', () => {
    const nulls = { caption: null, attribution: null }
    // a bad source kind, a bad path, and a missing/blank alt are all still refused
    expect(
      readTrustedPrompt({ ...imageBase, ...nulls, source: { kind: 'https', path: 'x' } }),
    ).toBeNull()
    expect(
      readTrustedPrompt({ ...imageBase, ...nulls, source: { kind: 'same-origin-path', path: '../x.png' } }),
    ).toBeNull()
    expect(readTrustedPrompt({ ...imageBase, ...nulls, alt: '' })).toBeNull()
    // and a null ALT is still refused — null is permitted for annotations only
    expect(readTrustedPrompt({ ...imageBase, ...nulls, alt: null })).toBeNull()
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

  /**
   * The board half of the re-read regression. A tile prompt reaches the public
   * wire via `readTrustedPrompt`, so a board built with any legal optional-field
   * combination must still hand back a readable trusted prompt.
   */
  it.each([
    ['caption absent, attribution absent', {}],
    ['caption present, attribution absent', { caption: 'Layers' }],
    ['caption absent, attribution present', { attribution: 'Fixture' }],
    ['caption present, attribution present', { caption: 'Layers', attribution: 'Fixture' }],
  ])('keeps a tile image prompt re-readable — %s', (_label, optionals) => {
    const board = createCategoryBoardDefinition({
      categories: [
        category('a', {
          tiles: [
            tile('a-1', {
              prompt: {
                kind: 'image',
                source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                alt: 'Earth cross-section',
                ...optionals,
              },
            }),
          ],
        }),
      ],
    })
    const stored = board.categories[0].tiles[0].prompt
    const reread = readTrustedPrompt(stored)
    expect(reread).not.toBeNull()
    expect(reread).toEqual(stored)
  })
})
