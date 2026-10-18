import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSonyBuzzSupportedProfile } from './useSonyBuzzSupportedProfile'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { loadSonyBuzzMappingRecord } from '../persistence/sonyBuzzMappingStore'
import { createFakeWebHidTransport, createFakeHidDevice } from '../input/webHidTransport'
import { SONY_BUZZ_EXPECTED_BUTTON_COUNT } from '../input/sonyBuzzSupportedProfile'
import {
  classSetupSonyBuzzFullyReady,
  classifyMappingLayer,
  classifyTeacherSummary,
} from '../input/sonyBuzzTeacherReadiness'
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
 * FRC-3 — readiness must never outrun usability.
 *
 * The previous campaign's report suspected that "ready" could be claimed for a
 * mapping that cannot be materialized. Adjudicated as NO DEFECT on the
 * teacher-facing path, and pinned here so that stays true.
 *
 * The hook's own `profileReady` boolean DID gate on `associations.length > 0`
 * rather than on usability — but it had no consumer anywhere in the repository,
 * so no teacher could ever read it. It has been deleted rather than tightened:
 * a stricter unused gate is still a trap. The surface a teacher actually reads
 * is `classifyMappingLayer` -> `classifyTeacherSummary`, and the tests below
 * exercise THAT, including the exact scenario the report implied.
 */
describe('teacher readiness never outruns a usable mapping (FRC-3)', () => {
  /** A present, supported Wbuzz pad, so readiness turns only on the mapping. */
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

  const summaryFor = (mappingStatus: string, associationCount: number) =>
    classifyTeacherSummary({
      receiver: 'connected',
      controllers: 'responding',
      mapping: classifyMappingLayer(mappingStatus, associationCount),
    })

  it('does not claim readiness while the saved mapping is still being read', () => {
    // The scenario the report implied: the loaded game changes to one with
    // different team ids, so until the read settles the associations still name
    // the previous game's teams and nothing can be materialized for this game.
    const summary = summaryFor('loading', 2)
    expect(summary).not.toBe('sony-buzz-ready')
    expect(classSetupSonyBuzzFullyReady(summary)).toBe(false)
  })

  it('does not claim readiness for a stale or unusable saved mapping', () => {
    for (const status of ['stale', 'malformed', 'unsupported-version'] as const) {
      const summary = summaryFor(status, 2)
      expect(summary).not.toBe('sony-buzz-ready')
      expect(classSetupSonyBuzzFullyReady(summary)).toBe(false)
    }
  })

  it('does not claim readiness with no Buzzer assigned at all', () => {
    const summary = summaryFor('ready', 0)
    expect(summary).not.toBe('sony-buzz-ready')
    expect(classSetupSonyBuzzFullyReady(summary)).toBe(false)
  })

  it('claims readiness only for a saved mapping with Buzzers assigned', () => {
    const summary = summaryFor('ready', 2)
    expect(summary).toBe('sony-buzz-ready')
    expect(classSetupSonyBuzzFullyReady(summary)).toBe(true)
  })

  it('materializes nothing for a game whose teams the associations do not name', async () => {
    const OTHER_TEAMS = createTeamDefinitions([
      { id: 'amber', name: 'Amber', accent: 'amber' },
      { id: 'violet', name: 'Violet', accent: 'violet' },
    ])
    const { result, rerender } = renderWithTeams('game-1', TEAMS)
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    expect(result.current.associations.length).toBeGreaterThan(0)

    act(() => {
      rerender({ gameId: 'game-2', teams: OTHER_TEAMS })
    })

    // Associations still name the old teams, so nothing is handed to gameplay —
    // and `mappingStatus` is `loading`, which the teacher summary reports as not
    // ready. The two facts agree.
    expect(result.current.associations.length).toBeGreaterThan(0)
    expect(result.current.materializedMapping.bindings).toHaveLength(0)
    expect(summaryFor(result.current.mappingStatus, result.current.associations.length)).not.toBe(
      'sony-buzz-ready',
    )
  })

  it('hands gameplay a usable mapping once a Buzzer is assigned', async () => {
    const { result } = renderWithTeams('game-1', TEAMS)
    await waitFor(() => expect(result.current.mappingStatus).toBe('absent'))
    act(() => result.current.setSlotTeam(3, 'red'))
    expect(result.current.materializedMapping.bindings.length).toBeGreaterThan(0)
  })
})
