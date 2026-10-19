import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MediaContentDisplay } from './MediaContentDisplay'
import { resolveSameOriginMediaSrc } from './resolveSameOriginMediaSrc'
import type { PublicPromptContent } from '../state/publicState'
import {
  createPackResourceRegistry,
  setSharedPackResourceRegistryForTests,
} from '../pack/resourceRegistry'
import { TINY_PNG_BYTES } from '../pack/testFixtures'

/**
 * FRC-6 — the projector must not paint a DIFFERENT clue's image while pack
 * media is still hydrating.
 *
 * The report asked what "an old hosted image" meant during the first-paint
 * transient. I first adjudicated it ACCEPTABLE TRANSIENT on the argument that
 * the hosted fallback could only ever serve "the correct content for the clue's
 * own path, or nothing". An independent reviewer showed that is FALSE:
 *
 *  - authored media paths are not namespaced away from build output
 *    (`isValidSameOriginPath` imposes no reserved prefix), and
 *  - `public/media-fixtures/` ships REAL clue images at clue-shaped paths, which
 *    `globPatterns` sweeps into the deployment.
 *
 * The repository's own canonical pack fixtures author
 * `media-fixtures/slice-11-clue.png` while carrying DIFFERENT bytes for it
 * inside the pack. So on a fresh projector the hosted fallback served the
 * repo's slice-11 image, not the pack's — a different clue's image, on the
 * projector, in front of a class. A fresh projector reaches that with no
 * service worker at all, so precache behaviour was never what protected it.
 *
 * Repaired the way the brief prescribes: while hydration is unresolved the
 * Display shows a neutral LOADING placeholder and does not resolve the authored
 * path to its hosted URL at all. That closes the wrong-image route and also
 * stops "Image unavailable" — a terminal claim — being asserted about a state
 * the Display cannot yet verify.
 */

const PACK_PATH = 'media-fixtures/frc6-clue.png'

const imageContent = (
  path: string,
  alt = 'A clue image',
): Extract<PublicPromptContent, { kind: 'image' }> => ({
  kind: 'image',
  source: { kind: 'same-origin-path', path },
  alt,
  caption: null,
  attribution: null,
})

function hydratedRegistryFor(path: string, blobUrl: string) {
  const registry = createPackResourceRegistry({
    createObjectURL: () => blobUrl,
    revokeObjectURL: () => undefined,
  })
  setSharedPackResourceRegistryForTests(registry)
  registry.setActiveScope(
    'frc6-scope',
    new Map([[path, { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' }]]),
  )
  return registry
}

beforeEach(() => {
  setSharedPackResourceRegistryForTests(null)
})
afterEach(() => {
  setSharedPackResourceRegistryForTests(null)
})

describe('FRC-6: the projector while pack hydration is unresolved', () => {
  it('shows a loading placeholder, and never requests the authored path', () => {
    render(<MediaContentDisplay content={imageContent(PACK_PATH)} />)

    // No <img> at all: the hosted URL is not requested, so a deployed build
    // asset sitting at this authored path cannot paint.
    expect(screen.queryByTestId('mcd-img')).toBeNull()
    expect(screen.getByTestId('mcd-image-loading')).toBeInTheDocument()
    // And it does not claim unavailability it cannot verify.
    expect(screen.queryByTestId('mcd-image-fallback')).toBeNull()
    expect(screen.getByTestId('mcd-image-loading')).not.toHaveTextContent(/unavailable/i)
    // The alt still reaches the room, so the clue is not silent.
    expect(screen.getByTestId('mcd-alt-fallback')).toHaveTextContent('A clue image')
  })

  it('never paints a deployed asset that happens to sit at the authored path', () => {
    // The reviewer's reproduction, as a regression: this exact path ships in
    // `public/media-fixtures/` AND is authored by the repo's pack fixtures with
    // different bytes. Before the repair the transient painted the deployed one.
    const collidingPath = 'media-fixtures/slice-11-clue.png'
    const hostedUrl = resolveSameOriginMediaSrc(collidingPath)
    expect(hostedUrl).not.toBeNull()

    render(<MediaContentDisplay content={imageContent(collidingPath)} />)

    expect(screen.queryByTestId('mcd-img')).toBeNull()
    expect(screen.getByTestId('mcd-image-loading')).toBeInTheDocument()
  })

  it('paints the pack blob immediately when the scope is already hydrated', () => {
    hydratedRegistryFor(PACK_PATH, 'blob:frc6-pack-image')
    render(<MediaContentDisplay content={imageContent(PACK_PATH)} />)
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:frc6-pack-image')
  })

  it('keeps a hosted-path failure scoped to that source, not to the pack blob', () => {
    // #165, on ONE mounted component: re-mounting would reset the failure latch
    // and prove nothing about it. The scope is hydrated here so an <img> exists
    // to fail in the first place.
    hydratedRegistryFor(PACK_PATH, 'blob:frc6-first')
    const { rerender } = render(<MediaContentDisplay content={imageContent(PACK_PATH)} />)
    fireEvent.error(screen.getByTestId('mcd-img'))
    expect(screen.getByTestId('mcd-image-fallback')).toHaveTextContent(/image unavailable/i)

    hydratedRegistryFor(PACK_PATH, 'blob:frc6-settled')
    rerender(<MediaContentDisplay content={imageContent(PACK_PATH)} />)

    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:frc6-settled')
    expect(screen.queryByTestId('mcd-image-fallback')).toBeNull()
  })
})
