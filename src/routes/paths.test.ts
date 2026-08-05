import { describe, expect, it } from 'vitest'
import { TEAM_ACCENTS } from '../game/teams/accents'
import {
  ROUTES,
  absoluteDisplayUrlWithTheme,
  absoluteHashUrl,
  displayPathWithTheme,
  themeIdFromDisplaySearch,
} from './paths'

describe('route table', () => {
  it('exposes root, host and display paths', () => {
    expect(ROUTES.root).toBe('/')
    expect(ROUTES.host).toBe('/host')
    expect(ROUTES.display).toBe('/display')
  })
})

describe('absoluteHashUrl (base-path helper)', () => {
  it('composes origin + base + hash under the GitHub Pages base path', () => {
    const url = absoluteHashUrl(
      ROUTES.display,
      'https://example.github.io',
      '/classroom-quiz-show/',
    )
    expect(url).toBe(
      'https://example.github.io/classroom-quiz-show/#/display',
    )
  })

  it('works at the site root (dev / custom domain)', () => {
    const url = absoluteHashUrl(ROUTES.host, 'http://localhost:5173', '/')
    expect(url).toBe('http://localhost:5173/#/host')
  })

  it('normalizes a base path missing its trailing slash', () => {
    const url = absoluteHashUrl(
      ROUTES.host,
      'https://example.github.io',
      '/classroom-quiz-show',
    )
    expect(url).toBe('https://example.github.io/classroom-quiz-show/#/host')
  })

  it('normalizes a hash path missing its leading slash', () => {
    const url = absoluteHashUrl('display', 'https://x.test', '/')
    expect(url).toBe('https://x.test/#/display')
  })
})

describe('theme-aware display launch helpers', () => {
  it('builds validated theme query paths for both themes', () => {
    expect(displayPathWithTheme('default')).toBe('/display?theme=default')
    expect(displayPathWithTheme('high-contrast')).toBe(
      '/display?theme=high-contrast',
    )
  })

  it('builds absolute URLs under site root and GitHub Pages base', () => {
    expect(
      absoluteDisplayUrlWithTheme('high-contrast', 'http://localhost:5173', '/'),
    ).toBe('http://localhost:5173/#/display?theme=high-contrast')
    expect(
      absoluteDisplayUrlWithTheme(
        'default',
        'https://example.github.io',
        '/classroom-quiz-show/',
      ),
    ).toBe(
      'https://example.github.io/classroom-quiz-show/#/display?theme=default',
    )
  })

  it('forces invalid candidates through resolveThemeId before encoding', () => {
    expect(displayPathWithTheme('DEFAULT')).toBe('/display?theme=default')
    expect(displayPathWithTheme('crimson')).toBe('/display?theme=default')
    expect(displayPathWithTheme('https://evil.example')).toBe(
      '/display?theme=default',
    )
    expect(displayPathWithTheme('')).toBe('/display?theme=default')
  })

  it('parses display search and fails closed for missing/invalid values', () => {
    expect(themeIdFromDisplaySearch('')).toBe('default')
    expect(themeIdFromDisplaySearch('?')).toBe('default')
    expect(themeIdFromDisplaySearch('?theme=default')).toBe('default')
    expect(themeIdFromDisplaySearch('?theme=high-contrast')).toBe(
      'high-contrast',
    )
    expect(themeIdFromDisplaySearch('?theme=')).toBe('default')
    expect(themeIdFromDisplaySearch('?theme=High-Contrast')).toBe('default')
    expect(themeIdFromDisplaySearch('?theme=javascript:alert(1)')).toBe(
      'default',
    )
    for (const accent of TEAM_ACCENTS) {
      expect(themeIdFromDisplaySearch(`?theme=${accent}`)).toBe('default')
    }
  })
})
