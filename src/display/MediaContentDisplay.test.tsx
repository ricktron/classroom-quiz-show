import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MediaContentDisplay } from './MediaContentDisplay'
import { resolveSameOriginMediaSrc } from './resolveSameOriginMediaSrc'
import type { PublicPromptContent } from '../state/publicState'

describe('resolveSameOriginMediaSrc', () => {
  it('joins BASE_URL and path with a single slash', () => {
    const joined = resolveSameOriginMediaSrc('media-fixtures/slice-11-clue.png')
    expect(joined.endsWith('media-fixtures/slice-11-clue.png')).toBe(true)
    expect(joined.includes('//media-fixtures')).toBe(false)
  })
})

describe('MediaContentDisplay', () => {
  it('renders text prompts with large-type presentation', () => {
    const content: PublicPromptContent = { kind: 'text', text: 'What is the mantle?' }
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-text')).toHaveTextContent('What is the mantle?')
    expect(screen.getByTestId('mcd-text')).toHaveClass('mcd__text')
  })

  it('renders an image with alt, caption, and attribution', () => {
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Earth layers diagram',
      caption: 'Cross-section',
      attribution: 'Fixture',
    }
    render(<MediaContentDisplay content={content} />)
    const img = screen.getByTestId('mcd-img')
    expect(img).toHaveAttribute('alt', 'Earth layers diagram')
    expect(img.getAttribute('src')).toContain('media-fixtures/slice-11-clue.png')
    expect(screen.getByTestId('mcd-caption')).toHaveTextContent('Cross-section')
    expect(screen.getByTestId('mcd-attribution')).toHaveTextContent('Fixture')
  })

  it('on image error shows Image unavailable and the authored alt as visible text', () => {
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/missing.png' },
      alt: 'Authored alt fallback',
      caption: null,
      attribution: null,
    }
    render(<MediaContentDisplay content={content} />)
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toHaveTextContent('Image unavailable')
    expect(screen.getByTestId('mcd-alt-fallback')).toHaveTextContent('Authored alt fallback')
    // Does not invent other clue content.
    expect(screen.queryByText(/mantle|crust|answer/i)).not.toBeInTheDocument()
  })

  it('fails closed for an unknown kind without fabricating content', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const content = { kind: 'audio', src: 'x.mp3' } as unknown as PublicPromptContent
    // TypeScript exhaustiveness is compile-time; at runtime cast through.
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-unavailable')).toHaveTextContent('This clue is not available')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    spy.mockRestore()
  })
})
