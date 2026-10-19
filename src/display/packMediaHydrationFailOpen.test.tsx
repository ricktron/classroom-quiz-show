import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
vi.mock('../pack/packMediaScopeSync', async () => {
  const actual =
    await vi.importActual<typeof import('../pack/packMediaScopeSync')>('../pack/packMediaScopeSync')
  return {
    ...actual,
    ensureDisplayPackMediaHydration: () => Promise.reject(new Error('frc6: hydration rejected')),
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
})
