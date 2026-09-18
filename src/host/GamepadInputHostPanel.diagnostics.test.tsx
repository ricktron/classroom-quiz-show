import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import { fakeGamepadSource, fakePollDriver } from '../test/gamepadFixtures'
import { createMemoryPersistenceAdapter } from '../persistence'
import { createFakeWebHidTransport } from '../input/webHidTransport'
import type { HostInputDiagnosticSignals } from './diagnostics/types'
import { assembleDiagnosticSnapshot } from './diagnostics/assembleDiagnosticSnapshot'
import { formatDiagnosticReport } from './diagnostics/formatDiagnosticReport'

/**
 * S04C-H2 repair: diagnostic input counts/summaries must derive from
 * authoritative current Host state. Outside Class Setup, responding-slot /
 * teacher-summary observation is unmounted — those fields must be
 * `not-collected`, not a stale Class Setup snapshot or an invented `0`.
 */

const AT = 1_000_000

const THREE_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
]

function boardStore(): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(THREE_TEAMS, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

describe('GamepadInputHostPanel diagnostic signal ownership', () => {
  it('outside Class Setup publishes live counts and marks observation fields not-collected', () => {
    const store = boardStore()
    const game = store.getState().session?.game
    if (!game) throw new Error('fixture has no game')
    const signals: HostInputDiagnosticSignals[] = []

    render(
      <GamepadInputHostPanel
        dispatch={store.dispatch}
        game={game}
        clock={createManualClock(AT)}
        source={fakeGamepadSource()}
        scheduler={fakePollDriver()}
        persistenceAdapter={createMemoryPersistenceAdapter()}
        webHidTransport={createFakeWebHidTransport({ available: false })}
        selectionMode={false}
        onInputDiagnosticSignals={(next) => {
          signals.push(next)
        }}
      />,
    )

    expect(signals.length).toBeGreaterThan(0)
    const latest = signals.at(-1)!
    expect(latest.controllersResponding).toBe('not-collected')
    expect(latest.sonyTeacherSummary).toBe('not-collected')
    expect(latest.connectedGamepadCount).toBe(0)
    expect(typeof latest.controllersAssigned).toBe('number')
    expect(latest.sonyReceiver).toBeTruthy()
    expect(latest.sonyReceiver).not.toBe('not-collected')
  })

  it('leaving Class Setup clears observation fields instead of preserving stale counts', () => {
    const store = boardStore()
    const game = store.getState().session?.game
    if (!game) throw new Error('fixture has no game')
    const signals: HostInputDiagnosticSignals[] = []
    const persistenceAdapter = createMemoryPersistenceAdapter()
    const webHidTransport = createFakeWebHidTransport({ available: false })
    const source = fakeGamepadSource()
    const scheduler = fakePollDriver()
    const clock = createManualClock(AT)

    const view = render(
      <GamepadInputHostPanel
        dispatch={store.dispatch}
        game={game}
        clock={clock}
        source={source}
        scheduler={scheduler}
        persistenceAdapter={persistenceAdapter}
        webHidTransport={webHidTransport}
        selectionMode={true}
        onInputDiagnosticSignals={(next) => {
          signals.push(next)
        }}
      />,
    )

    const whileInSetup = signals.at(-1)
    expect(whileInSetup).toBeDefined()

    view.rerender(
      <GamepadInputHostPanel
        dispatch={store.dispatch}
        game={game}
        clock={clock}
        source={source}
        scheduler={scheduler}
        persistenceAdapter={persistenceAdapter}
        webHidTransport={webHidTransport}
        selectionMode={false}
        onInputDiagnosticSignals={(next) => {
          signals.push(next)
        }}
      />,
    )

    const afterLeave = signals.at(-1)!
    expect(afterLeave.controllersResponding).toBe('not-collected')
    expect(afterLeave.sonyTeacherSummary).toBe('not-collected')
    expect(afterLeave.controllersResponding).not.toBe(0)
  })

  it('formats outside-Class-Setup observation fields as not-collected in the report text', () => {
    const text = formatDiagnosticReport(
      assembleDiagnosticSnapshot({
        persistence: {
          bootPhase: 'ready',
          durabilityStatus: 'idle',
          leadership: 'leader',
        },
        audio: { activation: 'ready', muted: false },
        displayWindow: 'closed',
        inputSignals: {
          sonyReceiver: 'disconnected',
          sonyTeacherSummary: 'not-collected',
          controllersResponding: 'not-collected',
          controllersAssigned: 0,
          connectedGamepadCount: 1,
        },
        browser: {
          platform: 'MacIntel',
          viewportWidth: 1280,
          viewportHeight: 720,
          screenWidth: 1920,
          screenHeight: 1080,
          devicePixelRatio: 2,
          gamepadApi: 'available',
          webHidApi: 'unavailable',
        },
        runtime: 'web',
        appVersion: '0.1.0',
      }),
    )

    expect(text).toContain('controllersResponding: not-collected')
    expect(text).toContain('sonyTeacherSummary: not-collected')
    expect(text).toContain('connectedGamepadCount: 1')
    expect(text).toContain('sonyReceiver: disconnected')
    expect(text).not.toContain('controllersResponding: 0')
  })
})
