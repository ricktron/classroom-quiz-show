import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEAM_ACCENTS } from '../game/teams/accents'
import {
  DEFAULT_THEME_ID,
  THEME_DEPENDENT_TOKEN_NAMES,
  THEME_IDS,
  THEME_META,
  isThemeId,
  resolveThemeId,
} from './themeRegistry'

describe('theme registry', () => {
  it('contains exactly the two authorized IDs', () => {
    expect(THEME_IDS).toEqual(['default', 'high-contrast'])
    expect(THEME_IDS).toHaveLength(2)
    expect(DEFAULT_THEME_ID).toBe('default')
  })

  it('exposes stable visible labels', () => {
    expect(THEME_META.map((m) => m.id)).toEqual([...THEME_IDS])
    expect(THEME_META.map((m) => m.label)).toEqual(['Default', 'High contrast'])
  })

  it('accepts only exact valid IDs', () => {
    expect(isThemeId('default')).toBe(true)
    expect(isThemeId('high-contrast')).toBe(true)
    expect(resolveThemeId('default')).toBe('default')
    expect(resolveThemeId('high-contrast')).toBe('high-contrast')
  })

  it.each([
    [undefined],
    [null],
    [''],
    [' '],
    ['Default'],
    ['DEFAULT'],
    ['high contrast'],
    ['High-Contrast'],
    ['HIGH-CONTRAST'],
    ['unknown'],
    ['dark'],
    ['system'],
    ['javascript:alert(1)'],
    ['https://evil.example/theme.css'],
    ['#35d6e8'],
    ['var(--surface-tile)'],
    ['.accent--crimson'],
    ['{ color: red }'],
    [0],
    [true],
    [{}],
    [['default']],
  ])('resolves invalid candidate %j to default', (candidate) => {
    expect(isThemeId(candidate)).toBe(false)
    expect(resolveThemeId(candidate)).toBe('default')
  })

  it('does not treat team accents as theme IDs', () => {
    for (const accent of TEAM_ACCENTS) {
      expect(isThemeId(accent)).toBe(false)
      expect(resolveThemeId(accent)).toBe('default')
    }
  })
})

describe('theme stylesheet completeness', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/themes.css'), 'utf8')

  function declarationsInBlock(selector: string): string {
    const start = css.indexOf(selector)
    expect(start, `missing selector ${selector}`).toBeGreaterThanOrEqual(0)
    const open = css.indexOf('{', start)
    let depth = 0
    let end = open
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1
      if (css[i] === '}') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    return css.slice(open + 1, end)
  }

  it('declares every theme-dependent token in default and high-contrast blocks', () => {
    const defaultBlock = declarationsInBlock(":root[data-theme='default']")
    const hcBlock = declarationsInBlock(":root[data-theme='high-contrast']")
    for (const token of THEME_DEPENDENT_TOKEN_NAMES) {
      expect(defaultBlock, `default missing ${token}`).toContain(`${token}:`)
      expect(hcBlock, `high-contrast missing ${token}`).toContain(`${token}:`)
    }
  })

  it('has no third theme selector block', () => {
    const themeSelectors = [...css.matchAll(/\[data-theme=['"]([^'"]+)['"]\]/g)].map(
      (m) => m[1],
    )
    expect(new Set(themeSelectors)).toEqual(new Set(['default', 'high-contrast']))
  })

  it('uses the corrected opaque default tile edge', () => {
    const defaultBlock = declarationsInBlock(":root[data-theme='default']")
    expect(defaultBlock).toContain('--border-tile: #35d6e8')
    expect(defaultBlock).toContain('--edge-tile: inset 0 0 0 1px #35d6e8')
    expect(defaultBlock).toContain('--edge-selected: inset 0 0 0 2px #35d6e8')
    // Rejected package form was translucent --border-tile / --edge-tile.
    expect(defaultBlock).not.toMatch(
      /--border-tile:\s*rgba\(53,\s*214,\s*232,\s*0\.55\)/,
    )
    expect(defaultBlock).not.toMatch(
      /--edge-tile:\s*inset 0 0 0 1px rgba\(53,\s*214,\s*232,\s*0\.55\)/,
    )
  })
})
