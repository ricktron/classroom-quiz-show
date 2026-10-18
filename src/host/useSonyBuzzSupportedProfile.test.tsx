import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSonyBuzzSupportedProfile } from './useSonyBuzzSupportedProfile'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { loadSonyBuzzMappingRecord } from '../persistence/sonyBuzzMappingStore'
import { createFakeWebHidTransport, createFakeHidDevice } from '../input/webHidTransport'
import { SONY_BUZZ_EXPECTED_BUTTON_COUNT } from '../input/sonyBuzzSupportedProfile'
import type { GamepadControllerInfo } from './useGamepadBuzzInput'

/**
 * CBN-1: Save team mapping is truthful. A many-to-one mapping (several Buzzers
 * for one team) saves; a mapping that cannot be used is refused with teacher
 * copy, and the previously saved mapping is left exactly as it was.
 */

const TEAMS = createTeamDefinitions(twoTeams())
const NO_CONTROLLERS = [] as const

function renderProfile() {
  const persistenceAdapter = createMemoryPersistenceAdapter()
  const transport = createFakeWebHidTransport({ available: false })
  const hook = renderHook(() =>
    useSonyBuzzSupportedProfile({
      gameId: 'game-1',
      teams: TEAMS,
      controllers: NO_CONTROLLERS,
      transport,
      persistenceAdapter,
    }),
  )
  return { ...hook, persistenceAdapter }
}

describe('Save team mapping (CBN-1)', () => {
  it('saves several Buzzers for one team and reports it saved', async () => {
    const { result, persistenceAdapter } = renderProfile()
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    act(() => {
      result.current.setSlotTeam(3, 'red')
      result.current.setSlotTeam(4, 'red')
    })
    let saved = false
    await act(async () => {
      saved = await result.current.saveAssociations()
    })
    expect(saved).toBe(true)
    expect(result.current.mappingStatus).toBe('ready')
    expect(result.current.mappingIssue).toBeNull()
    const loaded = await loadSonyBuzzMappingRecord(persistenceAdapter)
    expect(loaded.status === 'loaded' && loaded.record.associations).toEqual([
      { slotId: 1, teamId: 'red' },
      { slotId: 2, teamId: 'blue' },
      { slotId: 3, teamId: 'red' },
      { slotId: 4, teamId: 'red' },
    ])
  })

  it('refuses a mapping it cannot use, explains why, and keeps the saved one', async () => {
    const { result, persistenceAdapter } = renderProfile()
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    await act(async () => {
      await result.current.saveAssociations()
    })
    expect(result.current.mappingStatus).toBe('ready')

    act(() => result.current.setSlotTeam(3, 'ghost-team'))
    let saved = true
    await act(async () => {
      saved = await result.current.saveAssociations()
    })
    expect(saved).toBe(false)
    expect(result.current.mappingIssue).toMatch(/not saved/i)
    expect(result.current.mappingIssue).toMatch(/Buzzer 3/)
    // The earlier, valid saved mapping is untouched and still reported as saved.
    expect(result.current.mappingStatus).toBe('ready')
    const loaded = await loadSonyBuzzMappingRecord(persistenceAdapter)
    expect(loaded.status === 'loaded' && loaded.record.associations).toEqual([
      { slotId: 1, teamId: 'red' },
      { slotId: 2, teamId: 'blue' },
    ])
  })

  it('clears a refusal once the teacher edits or clears, and does not claim a kept mapping that never existed', async () => {
    const { result } = renderProfile()
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    act(() => result.current.setSlotTeam(3, 'ghost-team'))
    await act(async () => {
      await result.current.saveAssociations()
    })
    // Nothing was saved before, so the copy must not say a saved mapping was kept.
    expect(result.current.mappingIssue).toMatch(/not saved/i)
    expect(result.current.mappingIssue).not.toMatch(/saved mapping was not changed/i)
    act(() => result.current.setSlotTeam(3, 'red'))
    expect(result.current.mappingIssue).toBeNull()

    act(() => result.current.setSlotTeam(4, 'ghost-team'))
    await act(async () => {
      await result.current.saveAssociations()
    })
    expect(result.current.mappingIssue).not.toBeNull()
    await act(async () => {
      await result.current.clearSavedMapping()
    })
    expect(result.current.mappingIssue).toBeNull()
  })
})

/**
 * CBN-6c — "ready" must mean the mapping can actually be materialized.
 *
 * `profileReady` gated on `associations.length > 0`, which is not the same
 * question: associations can be non-empty and still fail to materialize (a slot
 * set to a team this game does not have). The honest gate is the materialized
 * mapping itself, which is the artefact gameplay actually uses.
 */
describe('profileReady means the mapping can be materialized (CBN-6c)', () => {
  /**
   * A present, supported Wbuzz pad, so readiness turns only on the mapping.
   * The reported id must carry the real vendor/product tokens, and the button
   * count must match the expected topology, or the hook does not see a pad at
   * all and every readiness assertion below would pass for the wrong reason.
   */
  const WBUZZ: readonly GamepadControllerInfo[] = [
    {
      controllerIndex: 0,
      buttonCount: SONY_BUZZ_EXPECTED_BUTTON_COUNT,
      reportedId: { status: 'available', value: 'Vendor: 054c Product: 1000' },
      reportedMapping: { status: 'available', value: 'standard' },
      classification: 'candidate-sony-buzz-wireless',
    },
  ]

  function renderWithTeams(gameId: string, teams: ReturnType<typeof createTeamDefinitions>) {
    const persistenceAdapter = createMemoryPersistenceAdapter()
    const transport = createFakeWebHidTransport({
      available: true,
      granted: [createFakeHidDevice()],
    })
    const hook = renderHook(
      (props: { gameId: string; teams: ReturnType<typeof createTeamDefinitions> }) =>
        useSonyBuzzSupportedProfile({
          gameId: props.gameId,
          teams: props.teams,
          controllers: WBUZZ,
          transport,
          persistenceAdapter,
        }),
      { initialProps: { gameId, teams } },
    )
    return { ...hook, persistenceAdapter, transport }
  }

  it('never reports ready while the mapping materializes to nothing', async () => {
    const OTHER_TEAMS = createTeamDefinitions([
      { id: 'amber', name: 'Amber', accent: 'amber' },
      { id: 'violet', name: 'Violet', accent: 'violet' },
    ])
    const { result, rerender } = renderWithTeams('game-1', TEAMS)
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    expect(result.current.associations.length).toBeGreaterThan(0)

    // The loaded game changes to one with entirely different team ids. Until the
    // saved-mapping read settles, the associations still name the OLD teams, so
    // the mapping cannot be materialized for this game.
    act(() => {
      rerender({ gameId: 'game-2', teams: OTHER_TEAMS })
    })

    expect(result.current.associations.length).toBeGreaterThan(0)
    expect(result.current.materializedMapping.bindings).toHaveLength(0)
    // The invariant: readiness may never outrun materializability.
    expect(result.current.profileReady).toBe(false)
  })

  it('keeps a materializable mapping available to gameplay', async () => {
    const { result } = renderWithTeams('game-1', TEAMS)
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    act(() => result.current.setSlotTeam(3, 'red'))
    // Readiness also needs a healthy transport, which is a separate fact; what
    // this pins is that a good mapping is never the thing holding readiness back.
    expect(result.current.materializedMapping.bindings.length).toBeGreaterThan(0)
    expect(result.current.associations.length).toBeGreaterThan(0)
  })

  it('stops reporting ready once every Buzzer is unassigned', async () => {
    const { result } = renderWithTeams('game-1', TEAMS)
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    act(() => {
      for (const slot of [1, 2, 3, 4] as const) result.current.setSlotTeam(slot, null)
    })
    expect(result.current.associations).toHaveLength(0)
    expect(result.current.materializedMapping.bindings).toHaveLength(0)
    expect(result.current.profileReady).toBe(false)
  })
})
