import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
 * FRC-6 — adjudication of the pack-media first-paint transient.
 *
 * The previous campaign's report said that on a fresh projector the first image
 * clue can briefly show "Image unavailable" OR "an old hosted image" before
 * pack hydration settles, and asked what "an old hosted image" actually means.
 *
 * Adjudicated ACCEPTABLE TRANSIENT, and pinned here so the reasoning cannot
 * quietly stop being true. The three facts the verdict rests on:
 *
 *  1. The pre-hydration src is the hosted URL of the CURRENT clue's own
 *     authored path. It is never another clue's path and never another game's.
 *  2. The service worker has NO runtime caching, so it can only serve files
 *     from the BUILD precache. Teacher media is never in the build, so no
 *     earlier class's media can be served at that URL. This is the load-bearing
 *     fact, and test 3 makes it a durable constraint rather than an observation.
 *  3. A hosted-path failure before hydration does not hide the pack blob once
 *     it settles (the repair in #165), so the transient is bounded.
 *
 * What remains imperfect is the COPY, not the content: a failed hosted request
 * during the transient reads "Image unavailable", which asserts permanence
 * about a bounded loading state. Recorded as a preference item; it exposes no
 * wrong or private media, which is the question that would have blocked.
 */

const PACK_IMAGE: Extract<PublicPromptContent, { kind: 'image' }> = {
  kind: 'image',
  source: { kind: 'same-origin-path', path: 'media-fixtures/frc6-clue.png' },
  alt: 'A pack-carried clue image',
  caption: null,
  attribution: null,
}

const OTHER_IMAGE: Extract<PublicPromptContent, { kind: 'image' }> = {
  kind: 'image',
  source: { kind: 'same-origin-path', path: 'media-fixtures/frc6-other-clue.png' },
  alt: 'A different clue image',
  caption: null,
  attribution: null,
}

beforeEach(() => {
  setSharedPackResourceRegistryForTests(null)
})
afterEach(() => {
  setSharedPackResourceRegistryForTests(null)
})

describe('FRC-6: what the projector can show before pack hydration settles', () => {
  it('falls back to the CURRENT clue’s own authored path, never another clue’s', () => {
    // No pack registry yet: this is the pre-hydration state.
    const mine = resolveSameOriginMediaSrc(PACK_IMAGE.source.path)
    const other = resolveSameOriginMediaSrc(OTHER_IMAGE.source.path)
    expect(mine).not.toBeNull()
    expect(mine!.endsWith('media-fixtures/frc6-clue.png')).toBe(true)
    // The fallback is a pure function of the clue's own path, so it cannot
    // resolve to a different clue's media.
    expect(mine).not.toBe(other)
    expect(mine!.includes('frc6-other-clue')).toBe(false)
  })

  it('renders the pack blob, not the hosted path, once hydration has settled', () => {
    const registry = createPackResourceRegistry({
      createObjectURL: () => 'blob:frc6-pack-image',
      revokeObjectURL: () => undefined,
    })
    setSharedPackResourceRegistryForTests(registry)
    registry.setActiveScope(
      'frc6-scope',
      new Map([
        [PACK_IMAGE.source.path, { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' }],
      ]),
    )

    render(<MediaContentDisplay content={PACK_IMAGE} />)
    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:frc6-pack-image')
  })

  it('does not let a hosted-path failure during the transient hide the settled pack blob', () => {
    // The transient, on ONE mounted component: no pack scope yet, and the
    // hosted request fails. Re-mounting instead would reset the failure latch
    // and prove nothing about it.
    const { rerender } = render(<MediaContentDisplay content={PACK_IMAGE} />)
    fireEvent.error(screen.getByTestId('mcd-img'))
    // "Image unavailable" — copy that asserts permanence about a bounded
    // loading state. This is the recorded preference item, not a wrong image.
    expect(screen.getByTestId('mcd-image-fallback')).toHaveTextContent(/image unavailable/i)

    // Hydration settles. The failure was scoped to the hosted src, so the SAME
    // component must now show the blob rather than the latched failure (#165).
    const registry = createPackResourceRegistry({
      createObjectURL: () => 'blob:frc6-settled',
      revokeObjectURL: () => undefined,
    })
    setSharedPackResourceRegistryForTests(registry)
    registry.setActiveScope(
      'frc6-scope',
      new Map([
        [PACK_IMAGE.source.path, { bytes: TINY_PNG_BYTES, mediaType: 'image/png', sha256: 'x' }],
      ]),
    )
    rerender(<MediaContentDisplay content={PACK_IMAGE} />)

    expect(screen.getByTestId('mcd-img')).toHaveAttribute('src', 'blob:frc6-settled')
    expect(screen.queryByTestId('mcd-image-fallback')).toBeNull()
  })

  it('keeps the service worker free of runtime caching, which is what the verdict rests on', () => {
    /*
      The load-bearing constraint, not an observation.

      "An old hosted image" could only be an EARLIER CLASS's media if something
      served teacher media at the hosted path. The service worker precaches
      build output only and has no `runtimeCaching`, so it cannot. If a future
      change adds runtime caching — especially of images — then stale media
      from a previous game could be served during this transient and the
      ACCEPTABLE TRANSIENT verdict above would no longer hold. This test fails
      at that moment, which is the point.
    */
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(config).toContain('VitePWA')
    expect(config).not.toContain('runtimeCaching')
    // Precache globs cover built shell assets; teacher media is never built in.
    expect(config).toContain("globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,wav}']")
  })
})
