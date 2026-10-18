import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSonyBuzzSupportedProfile } from './useSonyBuzzSupportedProfile'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { loadSonyBuzzMappingRecord } from '../persistence/sonyBuzzMappingStore'
import { createFakeWebHidTransport } from '../input/webHidTransport'

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
