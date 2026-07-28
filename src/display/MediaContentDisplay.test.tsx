import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MediaContentDisplay } from './MediaContentDisplay'
import {
  joinBaseAndMediaPath,
  resolveSameOriginMediaSrc,
} from './resolveSameOriginMediaSrc'
import type { PublicPromptContent } from '../state/publicState'

describe('joinBaseAndMediaPath / resolveSameOriginMediaSrc', () => {
  it('joins BASE_URL and path with a single slash', () => {
    const joined = resolveSameOriginMediaSrc('media-fixtures/slice-11-clue.png')
    expect(joined).not.toBeNull()
    expect(joined!.endsWith('media-fixtures/slice-11-clue.png')).toBe(true)
    expect(joined!.includes('//media-fixtures')).toBe(false)
  })

  it('resolves correctly under / and /classroom-quiz-show/ bases', () => {
    expect(joinBaseAndMediaPath('/', 'media-fixtures/slice-11-clue.png')).toBe(
      '/media-fixtures/slice-11-clue.png',
    )
    expect(joinBaseAndMediaPath('/classroom-quiz-show/', 'media-fixtures/slice-11-clue.png')).toBe(
      '/classroom-quiz-show/media-fixtures/slice-11-clue.png',
    )
    expect(joinBaseAndMediaPath('/classroom-quiz-show', 'media-fixtures/slice-11-clue.png')).toBe(
      '/classroom-quiz-show/media-fixtures/slice-11-clue.png',
    )
  })

  it('refuses malformed trusted paths instead of emitting a URL', () => {
    expect(joinBaseAndMediaPath('/', '../secret.png')).toBeNull()
    expect(joinBaseAndMediaPath('/', '%2e%2e/secret.png')).toBeNull()
    expect(joinBaseAndMediaPath('/', 'media//image.png')).toBeNull()
    expect(resolveSameOriginMediaSrc('https://evil.example/x.png')).toBeNull()
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
    // Does not invent other clue content or expose the source path.
    expect(screen.queryByText(/mantle|crust|answer/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-image-fallback').textContent).not.toContain('media-fixtures')
  })

  it('resets failure state when source.path changes to a valid image', () => {
    const missing: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/missing.png' },
      alt: 'Missing fixture',
      caption: null,
      attribution: null,
    }
    const { rerender } = render(<MediaContentDisplay content={missing} />)
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toBeInTheDocument()

    const present: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Present fixture',
      caption: null,
      attribution: null,
    }
    rerender(<MediaContentDisplay content={present} />)
    expect(screen.queryByTestId('mcd-image-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      expect.stringContaining('media-fixtures/slice-11-clue.png'),
    )
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('alt', 'Present fixture')
  })

  it('ignores a stale onError from a previous source after the path changes', () => {
    const first: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/first.png' },
      alt: 'First',
      caption: null,
      attribution: null,
    }
    const { rerender } = render(<MediaContentDisplay content={first} />)
    const firstImg = screen.getByTestId('mcd-img')
    const firstSrc = firstImg.getAttribute('src')
    expect(firstSrc).toContain('media-fixtures/first.png')

    const second: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Second',
      caption: null,
      attribution: null,
    }
    rerender(<MediaContentDisplay content={second} />)
    expect(screen.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      expect.stringContaining('media-fixtures/slice-11-clue.png'),
    )

    // A late error from the abandoned first element must not mark the new image failed.
    fireEvent.error(firstImg)
    expect(screen.queryByTestId('mcd-image-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
  })

  it('keeps long caption and attribution wrapping classes for responsive projectors', () => {
    const long = 'Word '.repeat(40).trim()
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Alt',
      caption: long,
      attribution: long,
    }
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-caption')).toHaveClass('mcd__caption')
    expect(screen.getByTestId('mcd-attribution')).toHaveClass('mcd__attribution')
    expect(screen.getByTestId('mcd-caption')).toHaveTextContent(long)
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
