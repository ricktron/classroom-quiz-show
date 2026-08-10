import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useGamepadBuzzInput } from './useGamepadBuzzInput'
import { createSessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import {
  buttons,
  controller,
  fakeGamepadSource,
  fakePollDriver,
  reportedId,
  reportedMapping,
  snapshot,
} from '../test/gamepadFixtures'
import type { GamepadMapping } from '../input/gamepadMapping'
import { PRIMARY_BUZZ } from '../input/logicalAction'
import { responseOpportunityFor } from './responseOpportunity'
import type { PrivateGameState } from '../state/privateState'

const AT = 1_000_000
const TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
]

function activeGame() {
  const result = importGameFromUnknown(teamBoardGameFile(TEAMS, richBoardConfig()))
  if (result.status !== 'success') throw new Error('import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: 'board-round',
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: 'board-round' })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: 'board-round' })
  return store
}

function wbuzz(pressedIndex?: number) {
  return snapshot(
    controller(0, buttons(20, ...(pressedIndex === undefined ? [] : [pressedIndex])), {
      reportedId: reportedId('Vendor: 054c Product: 1000'),
      reportedMapping: reportedMapping('standard'),
    }),
  )
}

describe('useGamepadBuzzInput reprimeToken', () => {
  it('held red across reprime does not create a false buzz edge', () => {
    const store = activeGame()
    const source = fakeGamepadSource()
    const driver = fakePollDriver()
    const clock = createManualClock(AT)
    const outcomes: string[] = []
    const mapping: GamepadMapping = {
      version: 1,
      bindings: [
        {
          controllerIndex: 0,
          buttonIndex: 0,
          teamId: 'red',
          action: PRIMARY_BUZZ,
        },
      ],
    }

    const { rerender } = renderHook(
      ({ token, game }: { token: number; game: PrivateGameState }) =>
        useGamepadBuzzInput({
          enabled: true,
          capturing: false,
          testMode: false,
          mapping,
          target: responseOpportunityFor(game),
          dispatch: (c) => store.dispatch(c),
          clock,
          source,
          scheduler: driver,
          reprimeToken: token,
          onOutcome: (o) => outcomes.push(o.kind),
        }),
      {
        initialProps: {
          token: 0,
          game: store.getState().session!.game!,
        },
      },
    )

    act(() => {
      source.set(wbuzz())
      driver.poll()
      source.set(wbuzz(0))
      driver.poll()
    })
    expect(outcomes).toContain('accepted')

    outcomes.length = 0
    act(() => {
      rerender({ token: 1, game: store.getState().session!.game! })
      driver.poll()
      driver.poll()
    })
    expect(outcomes).not.toContain('accepted')

    act(() => {
      source.set(wbuzz())
      driver.poll()
    })
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 1, roundId: 'board-round' })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT + 2, roundId: 'board-round' })
    outcomes.length = 0
    act(() => {
      rerender({ token: 1, game: store.getState().session!.game! })
      source.set(wbuzz(0))
      driver.poll()
    })
    expect(outcomes).toContain('accepted')
  })
})
