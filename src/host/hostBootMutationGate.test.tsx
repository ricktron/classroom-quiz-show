import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostRoute } from '../routes/HostRoute'
import { ROUTES } from '../routes/paths'
import { ThemeProvider } from '../theme/ThemeProvider'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import type { PersistenceAdapter } from '../persistence/adapter'
import {
  HOST_WRITER_LEASE_KEY,
  HOST_WRITER_RELEASE_STORAGE_KEY,
  OBJECT_STORE_COORDINATION,
} from '../persistence/constants'
import {
  HOST_TEST_AT,
  hostPersistenceOptions,
  stubHostMatchMedia,
} from '../test/hostPersistenceTestFixtures'

/**
 * FRC-1 — no teacher action may be accepted and then silently discarded by
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
  // The inventory below PRESSES every control it finds actionable, and the
  // template-download controls reach `URL.createObjectURL`, which jsdom does not
  // implement. Without this the run reported "passed" while emitting uncaught
  // exceptions — a dirty run is not a green run.
  if (typeof URL.createObjectURL !== 'function') {
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: () => 'blob:host-boot-gate',
      revokeObjectURL: () => undefined,
    }))
  }
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
    renderHost(adapter, 'frc1-gated')

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
      renderHost(adapter, `frc1-delay-${delayMs}`)

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
    renderHost(adapter, `frc1-ready-${delayMs}`)

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
  renderHost(shared, 'frc1-leader')
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
            element={<HostRoute persistenceOptions={hostPersistenceOptions(shared, 'frc1-follower')} />}
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

/**
 * Whether a control is really pressable, the way a browser decides it.
 *
 * `HTMLButtonElement.disabled` reflects only the element's own attribute, so a
 * button inside `<fieldset disabled>` still reports `false` in jsdom while
 * being inert in a real browser. Gating by fieldset is an existing CQS pattern
 * (the gameplay region), so the inventory below must honour it or it would
 * report controls as live that no teacher can press.
 */
function isActionable(element: HTMLElement): boolean {
  if ((element as HTMLButtonElement).disabled) return false
  if (element.closest('[aria-disabled="true"]') !== null) return false
  const fieldset = element.closest('fieldset[disabled]')
  if (fieldset === null) return true
  // A control inside a disabled fieldset's FIRST legend is not disabled by it,
  // so treating it as inert here would hide a real finding.
  const legend = fieldset.querySelector(':scope > legend')
  return legend !== null && legend.contains(element)
}

/**
 * The controls inside Advanced diagnostics that are NOT session commands, so may
 * stay actionable in a read-only window. Everything else under `host-advanced`
 * reaches `dispatch`, so this list is the allowlist and the test below fails
 * closed: a newly added mutation-capable button is enabled, is not named here,
 * and turns this test RED without anyone remembering to extend it.
 */
const NON_COMMAND_HOST_CONTROLS: readonly string[] = [
  // Host chrome and navigation: posture and window state only.
  'More',
  'host-chrome-mute',
  'host-chrome-display',
  'setup-play',
  '<input name=host-theme>',
  // Presentation audio: device output, never the session.
  'audio-enable',
  'audio-panic-mute',
  // Content PREPARATION. These stage text or read a file; the dispatching step
  // in each flow (import-run, spreadsheet-approve, pack-import-file) is gated.
  'Load valid sample file',
  'Load category-board sample file',
  'Load board + final-wager sample file',
  'Load sample with unregistered round type',
  'Load sample with a duplicate team id',
  'Load sample with a duplicate tile id',
  'Clear',
  'spreadsheet-download-classic',
  'spreadsheet-download-final',
  'spreadsheet-upload',
  'import-json',
  'diagnostic-report-text',
  // Export and read-only ledger views.
  'export-download',
  'pack-export-download',
  'Refresh ledger',
  'Filter by game',
  'Filter by class label',
  'Sort completed summaries',
  // Advanced diagnostics: observability only. None reaches the session — they
  // copy a sanitized snapshot to the clipboard or clear an in-memory trace
  // buffer. "Reset trace" does have a side effect, so this list means "changes
  // nothing in the session", not "side-effect free".
  'Advanced diagnostics',
  'Copy diagnostic reportTroubleshooting evidence · no classroo',
  'diagnostic-report-copy',
  'Wbuzz signal-chain traceQ7 diagnostic · Advanced only · no c',
  'wbuzz-signal-trace-reset',
  'wbuzz-signal-trace-copy-text',
  'wbuzz-signal-trace-copy-json',
]

/**
 * Every styled affordance and form control in the Host's PLAY posture.
 *
 * `getAllByRole('button')` alone returns only `<button>`: it would miss the pack
 * picker's `<label className="btn">` — the exact affordance class this repair
 * had to fix — and miss `<select>` / `<textarea>` / `<input>` controls entirely.
 *
 * KNOWN GAP, recorded here rather than implied away. This sweeps ONE posture.
 * The SETUP posture is not inventoried, and ten further affordances become
 * actionable there in a demoted window (`host-change-game`, the five
 * `readiness-*` tasks, `setup-revisit-names`, `setup-open-display`,
 * `setup-reveal-buzzers`, `setup-skip-buzzers`) — all verified non-command, but
 * none checked by this test. Setup is also where `ClassroomSetupPanel` renders,
 * whose team-name controls stay actionable in a window that cannot dispatch,
 * show "Selected: <name>", and silently never reach the session. That is a real
 * OPEN defect, not an allowlist omission, so it is deliberately not given an
 * entry below. Still invisible either way: a `div`/`li` with a click handler and
 * no role, and `contenteditable`.
 */
/**
 * A stable identifier for an affordance: its `data-testid` when it has one,
 * otherwise its trimmed label. Matching on `textContent` alone is fragile — a
 * future control sharing a label would silently inherit an allowlist entry.
 */
function affordanceId(element: HTMLElement): string {
  const testId = element.getAttribute('data-testid')
  if (testId !== null) return testId
  const id = element.getAttribute('id')
  if (id !== null && id.length > 0) return `#${id}`
  const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''
  // Never return an empty identifier: an anonymous affordance must not be able
  // to slip past the allowlist by matching an empty entry.
  if (label.length > 0) return label.slice(0, 60)
  const name = element.getAttribute('name')
  return `<${element.tagName.toLowerCase()}${name === null ? '' : ` name=${name}`}>`
}

function hostAffordances(): readonly HTMLElement[] {
  const host = screen.getByTestId('host-foundation')
  return [
    ...host.querySelectorAll<HTMLElement>(
      'button, [role="button"], label.btn, a.btn, summary, select, textarea, input:not([type="hidden"])',
    ),
  ]
}

const GAME_FILE = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'frc1-follower-game',
  title: 'FRC-1 Follower Game',
  rounds: [{ id: 'r1', type: 'placeholder', title: 'First', config: { note: 'engine plumbing' } }],
})

/** Hand the durable lease to another window, then make this one notice. */
async function demoteToFollower(adapter: PersistenceAdapter): Promise<void> {
  await adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    await tx.put(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY, {
      ownerId: 'another-host-tab',
      acquiredAt: HOST_TEST_AT,
      expiresAt: HOST_TEST_AT + 600_000,
      windowId: 'another-host-window',
    })
  })
  // The real signal: another window released/claimed saving in this browser.
  fireEvent(window, new StorageEvent('storage', { key: HOST_WRITER_RELEASE_STORAGE_KEY }))
  await waitFor(() => {
    expect(screen.getByTestId('persistence-follower-notice')).toBeInTheDocument()
  })
}

describe('a window demoted to read-only mid-game', () => {
  it('offers no actionable session command, and loses nothing when pressed', async () => {
    const adapter = createMemoryPersistenceAdapter()
    renderHost(adapter, 'frc1-demoted')
    await waitForInitializeActionable()

    // A real mid-game window: a session AND a loaded game, so every control
    // gated only by `hasSession` / `hasGame` is live.
    fireEvent.click(initializeButton())
    fireEvent.change(screen.getByTestId('import-json'), { target: { value: GAME_FILE } })
    fireEvent.click(screen.getByTestId('import-run'))
    await waitFor(() => {
      expect(screen.getByTestId('game-title')).toHaveTextContent('FRC-1 Follower Game')
    })
    expect(screen.getByTestId('game-rounds')).toBeInTheDocument()

    await demoteToFollower(adapter)

    const stillActionable = hostAffordances().filter(isActionable)
    const unexpected = stillActionable
      .map(affordanceId)
      .filter((id) => !NON_COMMAND_HOST_CONTROLS.includes(id))
    expect(unexpected).toEqual([])

    // Pressing everything still actionable changes nothing in the session —
    // proving the allowlist is command-free, not merely unchecked. (Some of
    // these do have other side effects: the clipboard, an in-memory trace.)
    const revisionBefore = screen.getByTestId('private-revision').textContent
    const historyBefore = screen.getByTestId('event-history').textContent
    for (const element of stillActionable) fireEvent.click(element)
    expect(screen.getByTestId('private-revision').textContent).toBe(revisionBefore)
    expect(screen.getByTestId('event-history').textContent).toBe(historyBefore)
  })

  it('keeps the demoted window from reaching the content-load paths', async () => {
    const adapter = createMemoryPersistenceAdapter()
    renderHost(adapter, 'frc1-demoted-load')
    await waitForInitializeActionable()
    fireEvent.click(initializeButton())

    await demoteToFollower(adapter)

    // The three `ensureSession` entry points, wired from FoundationControls —
    // this pins the WIRING, not just each panel's own prop handling.
    expect(screen.getByTestId('import-run')).toBeDisabled()
    expect(screen.getByTestId('pack-import-file')).toBeDisabled()
    expect(initializeButton()).toBeDisabled()
  })


  it('offers no aggregate data wipe while another window owns saving', async () => {
    const adapter = createMemoryPersistenceAdapter()
    renderHost(adapter, 'frc1-wipe')
    await waitForInitializeActionable()
    fireEvent.click(initializeButton())
    await waitFor(() => {
      expect(screen.getByTestId('private-session').textContent).not.toBe('—')
    })

    await demoteToFollower(adapter)

    // The aggregate wipe is irreversible and covers every CQS record on the
    // device, including the class the SAVING window is in the middle of. The
    // host-wide inventory above would also catch this; it is asserted by name
    // because the consequence is permanent data loss, not a discarded action.
    expect(screen.getByTestId('persistence-clear-all-action')).toBeDisabled()
  })


  it('says why the wipe was refused, in the live region under the button', async () => {
    /*
      The teacher scenario, not a synthetic one: this window's own storage open
      is blocked by another window, so it reports "saving is unavailable" and
      Clear all stays ENABLED — which is what makes it look like the remedy.
      Pressing it must refuse AND say why, in the region under the button.
    */
    const inner = createMemoryPersistenceAdapter()
    const adapter = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'open') {
          return async () => ({
            ok: false,
            code: 'upgrade-blocked',
            message: 'IndexedDB upgrade is blocked by another open Classroom Quiz Show tab.',
          })
        }
        const value = Reflect.get(target, prop, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as PersistenceAdapter

    renderHost(adapter, 'frc1-wipe-copy')
    await waitFor(() => {
      expect(screen.getByTestId('persistence-status').textContent ?? '').toMatch(
        /saving on this device is unavailable/i,
      )
    })

    const wipe = screen.getByTestId('persistence-clear-all-action')
    expect(wipe).toBeEnabled()
    // The confirmation names the ownership risk this window could not rule out.
    fireEvent.click(wipe)
    expect(
      screen.getByTestId('persistence-clear-all-ownership-warning').textContent ?? '',
    ).toMatch(/cannot tell whether another Classroom Quiz Show window/i)

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))

    // Refused, and the reason reaches the region directly under the control —
    // the same silent-refusal class this repair exists to remove, applied to
    // its own new guard. It names the remedy, not only the obstacle.
    await waitFor(() => {
      expect(screen.getByTestId('persistence-clear-all-message').textContent ?? '').toMatch(
        /still has storage open/i,
      )
    })
    expect(screen.getByTestId('persistence-clear-all-message').textContent ?? '').toMatch(
      /close other CQS tabs and windows/i,
    )
  })
})
