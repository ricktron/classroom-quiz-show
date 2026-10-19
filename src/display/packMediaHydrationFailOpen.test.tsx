import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MediaContentDisplay } from './MediaContentDisplay'
import type { PublicPromptContent } from '../state/publicState'
import { setSharedPackResourceRegistryForTests } from '../pack/resourceRegistry'

/**
 * FRC-6 R2 — a rejecting hydration must not strand the projector.
 *
 * FRC-6 made the hosted-path fallback conditional on pack hydration having
 * SETTLED. That bought a real safety property, and it bought one new risk with
 * it: settling is what releases the fallback, so a hydration promise that
 * rejects would leave the Display on "Loading image…" permanently — a projector
 * that never shows the clue, for the rest of the lesson.
 *
 * A reviewer reproduced exactly that by forcing the rejection: six tests failed
 * by timeout, the component never leaving the placeholder.
 *
 * Production reachability is CLOSED today and this is NOT a claim of a live
 * defect: `ensureDisplayPackMediaHydration` converts every failure below it
 * into a result rather than throwing (`adapter.open()` catches, including
 * `UpgradeBlockedError`; `withTransaction` returns a result; `close()` cannot
 * throw). But that safety lived in four other files and nothing asserted it.
 * This pins it where the consequence is, and the repair fails OPEN — back to
 * the pre-FRC-6 behaviour of attempting the hosted path, which is the right
 * direction to fail in.
 *
 * Mounted in its own file because `vi.mock` is hoisted and applies file-wide.
 */
/** Lets a test fire a pack-scope announcement the component is subscribed to. */
const announce = vi.hoisted(() => ({ fire: null as null | (() => void) }))

vi.mock('../pack/packMediaScopeSync', async () => {
  const actual =
    await vi.importActual<typeof import('../pack/packMediaScopeSync')>('../pack/packMediaScopeSync')
  return {
    ...actual,
    ensureDisplayPackMediaHydration: () => Promise.reject(new Error('frc6: hydration rejected')),
    subscribePackScopeAnnouncements: (onAnnouncement: () => void) => {
      announce.fire = onAnnouncement
      return () => {
        announce.fire = null
      }
    },
  }
})

const imageContent = (path: string): Extract<PublicPromptContent, { kind: 'image' }> => ({
  kind: 'image',
  source: { kind: 'same-origin-path', path },
  alt: 'A clue image',
  caption: null,
  attribution: null,
})

describe('FRC-6 R2: a rejecting pack hydration still reaches a decision', () => {
  beforeEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  afterEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  it('settles and attempts the hosted path rather than holding the placeholder forever', async () => {
    render(<MediaContentDisplay content={imageContent('media-fixtures/frc6-reject.png')} />)

    // The placeholder is correct WHILE unresolved — that is the FRC-6 repair.
    expect(screen.getByTestId('mcd-image-loading')).toBeInTheDocument()

    // And it must not be terminal. Without the `catch` branch this never
    // resolves and the test fails by timeout, which is the reviewer's
    // reproduction turned into a detector.
    await waitFor(() => {
      expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('mcd-image-loading')).toBeNull()
  })

  /*
    The sibling call on the announcement path, which the mount-path fix missed.

    A reviewer found that `subscribePackScopeAnnouncements`'s callback called
    `ensureDisplayPackMediaHydration().then(...)` with no rejection handler. It
    cannot strand the projector — `hydrationSettled` is already true by then —
    but it is an UNHANDLED promise rejection, and that fails the whole suite in
    CI even while the test itself passes. So the consequence is invisible to an
    ordinary assertion, and this detector watches for it directly.

    Scenario: a teacher switches packs mid-lesson, the announcement fires, and
    hydration rejects.
  */
  it('handles a rejection on the announcement path, with no unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      render(<MediaContentDisplay content={imageContent('media-fixtures/frc6-announce.png')} />)
      await waitFor(() => {
        expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
      })

      expect(announce.fire).not.toBeNull()
      await act(async () => {
        announce.fire?.()
        // A macrotask, so an unhandled rejection has actually been reported
        // rather than merely queued.
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(unhandled).toEqual([])
      // And the clue is still painted: swallowing the failure keeps the image.
      expect(screen.getByTestId('mcd-img')).toBeInTheDocument()
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
