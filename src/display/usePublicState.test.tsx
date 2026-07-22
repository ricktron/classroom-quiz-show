import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { DisplayRoute } from '../routes/DisplayRoute'
import { createPublicStateBroadcaster } from '../sync/broadcaster'
import { isBroadcastChannelSupported } from '../sync/channel'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'

/**
 * These exercise the display hook end-to-end over the REAL BroadcastChannel
 * (same-process delivery), guarded so environments without support are skipped
 * rather than failing.
 */
describe('DisplayRoute + usePublicState', () => {
  it('renders the safe waiting state before any host message (fail closed)', () => {
    render(<DisplayRoute />)
    expect(screen.getByRole('heading', { name: /game display ready/i })).toBeInTheDocument()
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument()
    // Read-only: no interactive controls on the projector.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it.runIf(isBroadcastChannelSupported())(
    'updates when the host broadcasts a newer sanitized snapshot',
    async () => {
      const snapshot: PublicState = {
        ...INITIAL_PUBLIC_STATE,
        revision: 7,
        phase: 'ready',
        headline: 'Session ready',
        detail: 'Waiting for the first round.',
      }
      const broadcaster = createPublicStateBroadcaster({ getSnapshot: () => snapshot })

      render(<DisplayRoute />)
      broadcaster.publish(snapshot)

      await waitFor(() => {
        expect(screen.getByText(/session ready/i)).toBeInTheDocument()
      })

      cleanup()
      broadcaster.close()
    },
  )
})
