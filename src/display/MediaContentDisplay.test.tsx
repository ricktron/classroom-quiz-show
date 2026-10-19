import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MediaContentDisplay } from './MediaContentDisplay'
import {
  joinBaseAndMediaPath,
  resolveSameOriginMediaSrc,
} from './resolveSameOriginMediaSrc'
import type { PublicPromptContent } from '../state/publicState'
import {
  createPackResourceRegistry,
  setSharedPackResourceRegistryForTests,
} from '../pack/resourceRegistry'
import { TINY_PNG_BYTES } from '../pack/testFixtures'

describe('joinBaseAndMediaPath / resolveSameOriginMediaSrc', () => {
  beforeEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  afterEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })
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

  it('prefers pack registry object URLs over hosted paths', () => {
    const registry = createPackResourceRegistry({
      createObjectURL: () => 'blob:pack-scoped',
      revokeObjectURL: () => undefined,
    })
    setSharedPackResourceRegistryForTests(registry)
    registry.setActiveScope(
      'scope',
      new Map([
        [
          'media-fixtures/slice-11-clue.png',
          { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' },
        ],
      ]),
    )
    expect(resolveSameOriginMediaSrc('media-fixtures/slice-11-clue.png')).toBe('blob:pack-scoped')
  })
})

/**
 * The Display does not resolve an authored path to its hosted URL until pack
 * media hydration settles, so an image clue begins on a loading placeholder
 * (FRC-6). Waiting here is the contract, not a timing hack: resolving earlier
 * is what let the projector paint a deployed asset sitting at an authored clue
 * path.
 */
async function waitForHostedImage(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
  })
}

describe('MediaContentDisplay', () => {
  beforeEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  afterEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  it('renders text prompts with large-type presentation', () => {
    const content: PublicPromptContent = { kind: 'text', text: 'What is the mantle?' }
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-text')).toHaveTextContent('What is the mantle?')
    expect(screen.getByTestId('mcd-text')).toHaveClass('mcd__text')
    expect(screen.getByTestId('mcd-text')).toHaveAttribute('data-length', 'short')
  })

  it('marks schema-near prompt length for compact Display type scale', () => {
    const content: PublicPromptContent = { kind: 'text', text: 'A'.repeat(400) }
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-text')).toHaveAttribute('data-length', 'long')
  })

  it('renders an image with alt, caption, and attribution', async () => {
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Earth layers diagram',
      caption: 'Cross-section',
      attribution: 'Fixture',
    }
    render(<MediaContentDisplay content={content} />)
    await waitForHostedImage()
    const img = screen.getByTestId('mcd-img')
    expect(img).toHaveAttribute('alt', 'Earth layers diagram')
    expect(img.getAttribute('src')).toContain('media-fixtures/slice-11-clue.png')
    expect(screen.getByTestId('mcd-caption')).toHaveTextContent('Cross-section')
    expect(screen.getByTestId('mcd-attribution')).toHaveTextContent('Fixture')
  })

  it('on image error shows Image unavailable and the authored alt as visible text', async () => {
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/missing.png' },
      alt: 'Authored alt fallback',
      caption: null,
      attribution: null,
    }
    render(<MediaContentDisplay content={content} />)
    await waitForHostedImage()
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toHaveTextContent('Image unavailable')
    expect(screen.getByTestId('mcd-alt-fallback')).toHaveTextContent('Authored alt fallback')
    // Does not invent other clue content or expose the source path.
    expect(screen.queryByText(/mantle|crust|answer/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-image-fallback').textContent).not.toContain('media-fixtures')
  })

  it('resets failure state when source.path changes to a valid image', async () => {
    const missing: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/missing.png' },
      alt: 'Missing fixture',
      caption: null,
      attribution: null,
    }
    const { rerender } = render(<MediaContentDisplay content={missing} />)
    await waitForHostedImage()
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
    await waitForHostedImage()
    expect(screen.queryByTestId('mcd-image-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      expect.stringContaining('media-fixtures/slice-11-clue.png'),
    )
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('alt', 'Present fixture')
  })

  it('ignores a stale onError from a previous source after the path changes', async () => {
    const first: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/first.png' },
      alt: 'First',
      caption: null,
      attribution: null,
    }
    const { rerender } = render(<MediaContentDisplay content={first} />)
    await waitForHostedImage()
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
    await waitForHostedImage()
    expect(screen.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      expect.stringContaining('media-fixtures/slice-11-clue.png'),
    )

    // A late error from the abandoned first element must not mark the new image failed.
    fireEvent.error(firstImg)
    expect(screen.queryByTestId('mcd-image-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
  })

  it('shows the pack image once it hydrates, even if the hosted path already failed', async () => {
    const registry = createPackResourceRegistry({
      createObjectURL: () => 'blob:display-pack',
      revokeObjectURL: () => undefined,
    })
    setSharedPackResourceRegistryForTests(registry)
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Pack image',
      caption: null,
      attribution: null,
    }
    /*
      Before hydration settles the Display shows a loading placeholder and does
      NOT resolve the authored path to its hosted URL (FRC-6) — that resolution
      is what let a deployed asset sitting at an authored clue path paint on the
      projector. Once it settles with no pack scope yet, the hosted URL is used
      and can fail, which is the state this test needs.
    */
    const { rerender } = render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-image-loading')).toBeInTheDocument()
    await waitForHostedImage()
    expect(screen.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      expect.stringContaining('media-fixtures/slice-11-clue.png'),
    )
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toBeInTheDocument()

    // Pack media hydrates; the next render resolves the same path to the blob.
    registry.setActiveScope(
      'scope',
      new Map([
        [
          'media-fixtures/slice-11-clue.png',
          { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' },
        ],
      ]),
    )
    rerender(<MediaContentDisplay content={content} />)
    await waitForHostedImage()
    expect(screen.queryByTestId('mcd-image-fallback')).not.toBeInTheDocument()
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:display-pack')

    // A failure of the blob itself still fails closed.
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toBeInTheDocument()
  })

  it('keeps long caption and attribution wrapping classes for responsive projectors', async () => {
    const long = 'Word '.repeat(40).trim()
    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Alt',
      caption: long,
      attribution: long,
    }
    render(<MediaContentDisplay content={content} />)
    await waitForHostedImage()
    expect(screen.getByTestId('mcd-caption')).toHaveClass('mcd__caption')
    expect(screen.getByTestId('mcd-attribution')).toHaveClass('mcd__attribution')
    expect(screen.getByTestId('mcd-caption')).toHaveTextContent(long)
  })

  it('uses pack-scoped object URLs when the registry has assets', () => {
    const registry = createPackResourceRegistry({
      createObjectURL: () => 'blob:display-pack',
      revokeObjectURL: () => undefined,
    })
    setSharedPackResourceRegistryForTests(registry)
    registry.setActiveScope(
      'scope',
      new Map([
        [
          'media-fixtures/slice-11-clue.png',
          { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' },
        ],
      ]),
    )

    const content: PublicPromptContent = {
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
      alt: 'Pack image',
      caption: null,
      attribution: null,
    }
    render(<MediaContentDisplay content={content} />)
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:display-pack')
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
