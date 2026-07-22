import { describe, expect, it } from 'vitest'
import { ROUTES, absoluteHashUrl } from './paths'

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
