import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostRoute } from '../routes/HostRoute'
import { ROUTES } from '../routes/paths'
import { ThemeProvider } from '../theme/ThemeProvider'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import type { PersistenceAdapter } from '../persistence/adapter'
import { hostPersistenceOptions, stubHostMatchMedia } from '../test/hostPersistenceTestFixtures'

/**
 * CBN-4 — no teacher action may be accepted and then silently discarded by
 * Host persistence boot.
 *
 * `dispatchSessionCommand` already refuses every session command while
 * `bootPhase !== 'ready'`, so an *enabled* mutation control during boot is a
 * control that appears to work and then does nothing at all. The repair is the
 * honest-availability half of that guard: mutation-capable Host controls are
 * unavailable until saved-state initialization settles, while the boot status
 * line carries the truthful copy ("Opening saved games…").
 */

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubHostMatchMedia(vi)
})

/** Wraps an adapter so the FIRST `open()` settles only after `delayMs`. */
function withDelayedFirstOpen(inner: PersistenceAdapter, delayMs: number): PersistenceAdapter {
  let delayed = false
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'open') {
        return async () => {
          if (!delayed) {
            delayed = true
            await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
          }
          return (target as PersistenceAdapter).open()
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as PersistenceAdapter
}

/** Wraps an adapter so the FIRST `open()` settles only when `release()` runs. */
function withGatedFirstOpen(inner: PersistenceAdapter): {
  readonly adapter: PersistenceAdapter
  readonly release: () => void
} {
  let releaseFn: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    releaseFn = resolve
  })
  let gated = false
  const adapter = new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'open') {
        return async () => {
          if (!gated) {
            gated = true
            await gate
          }
          return (target as PersistenceAdapter).open()
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as PersistenceAdapter
  return { adapter, release: () => releaseFn() }
}

function renderHost(adapter: PersistenceAdapter, tabId: string) {
  return render(
    <MemoryRouter initialEntries={[ROUTES.host]}>
      <ThemeProvider>
        <Routes>
          <Route
            path={ROUTES.host}
            element={<HostRoute persistenceOptions={hostPersistenceOptions(adapter, tabId)} />}
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

const initializeButton = () =>
  screen.getByRole('button', { name: /initialize \/ reset session/i })

const bootStatus = () => screen.getByTestId('persistence-status').textContent ?? ''

const BOOT_STATUS_COPY = /opening saved games/i

async function waitForBootSettled(): Promise<void> {
  await waitFor(
    () => {
      expect(bootStatus()).not.toMatch(BOOT_STATUS_COPY)
    },
    { timeout: 5000 },
  )
}

async function waitForInitializeActionable(): Promise<void> {
  await waitForBootSettled()
  await waitFor(
    () => {
      expect(initializeButton()).not.toBeDisabled()
    },
    { timeout: 5000 },
  )
}

function sessionInitializedCount(): number {
  const history = screen.queryByTestId('event-history')
  if (!history) return 0
  return within(history)
    .queryAllByText('SESSION_INITIALIZED')
    .length
}

describe('mutation controls during unsettled persistence boot', () => {
  it('holds Initialize / reset session unavailable until boot settles, and loses nothing', async () => {
    const { adapter, release } = withGatedFirstOpen(createMemoryPersistenceAdapter())
    renderHost(adapter, 'cbn4-gated')

    const button = await screen.findByRole('button', {
      name: /initialize \/ reset session/i,
    })

    // Truthful boot copy, and the control is honestly unavailable.
    expect(bootStatus()).toMatch(BOOT_STATUS_COPY)
    expect(button).toBeDisabled()

    // A teacher press during boot must not be accepted-then-erased.
    fireEvent.click(button)
    expect(screen.getByTestId('private-session').textContent).toBe('—')

    release()
    await waitForInitializeActionable()

    // Boot settled without resurrecting the discarded press.
    expect(bootStatus()).not.toMatch(BOOT_STATUS_COPY)
    expect(screen.getByTestId('private-session').textContent).toBe('—')
    expect(screen.getByTestId('private-revision').textContent).toBe('0')
    expect(sessionInitializedCount()).toBe(0)
  })

  it.each([500, 1500])(
    'holds Initialize / reset session unavailable across a %ims storage-open delay',
    async (delayMs) => {
      const adapter = withDelayedFirstOpen(createMemoryPersistenceAdapter(), delayMs)
      renderHost(adapter, `cbn4-delay-${delayMs}`)

      const button = await screen.findByRole('button', {
        name: /initialize \/ reset session/i,
      })
      expect(bootStatus()).toMatch(BOOT_STATUS_COPY)
      expect(button).toBeDisabled()

      fireEvent.click(button)
      await waitForInitializeActionable()
      expect(screen.getByTestId('private-session').textContent).toBe('—')
      expect(sessionInitializedCount()).toBe(0)
    },
  )
})

describe.each([0, 500, 1500])('Host at %ims storage-open delay, after boot', (delayMs) => {
  it('makes Initialize / reset session actionable, with one durable effect per activation', async () => {
    const adapter = withDelayedFirstOpen(createMemoryPersistenceAdapter(), delayMs)
    renderHost(adapter, `cbn4-ready-${delayMs}`)

    await waitForInitializeActionable()
    fireEvent.click(initializeButton())

    await waitFor(() => {
      expect(screen.getByTestId('private-session').textContent).not.toBe('—')
    })
    // One activation, one SESSION_INITIALIZED: no phantom or double activation.
    expect(screen.getByTestId('private-revision').textContent).toBe('1')
    expect(sessionInitializedCount()).toBe(1)
  })
})

it('holds Initialize / reset session unavailable in a read-only follower window', async () => {
  const shared = createMemoryPersistenceAdapter()
  renderHost(shared, 'cbn4-leader')
  await waitForInitializeActionable()

  // A second Host window on the same device, while the first still holds the
  // lease. Scope every follower query to its own container: both windows are
  // mounted in the same document.
  const followerHost = document.body.appendChild(document.createElement('div'))
  render(
    <MemoryRouter initialEntries={[ROUTES.host]}>
      <ThemeProvider>
        <Routes>
          <Route
            path={ROUTES.host}
            element={<HostRoute persistenceOptions={hostPersistenceOptions(shared, 'cbn4-follower')} />}
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
    { container: followerHost, baseElement: followerHost },
  )
  const follower = within(followerHost)

  await waitFor(() => {
    expect(follower.getByTestId('persistence-follower-notice')).toBeInTheDocument()
  })
  expect(
    follower.getByRole('button', { name: /initialize \/ reset session/i }),
  ).toBeDisabled()
})
