import { describe, expect, it } from 'vitest'
import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { replay, responsePhaseFor } from '../state/reducer'
import { activeRespondent, waitingRespondents } from '../game/timing/buzzQueue'
import { scanGamepadEdges, translateGamepadEdge } from './gamepadAdapter'
import { GAMEPAD_MAPPING_VERSION, type GamepadMapping } from './gamepadMapping'
import { translateLocalInput } from './commandTranslation'
import { PRIMARY_BUZZ, SECONDARY_ACTION_SLOTS } from './logicalAction'
import { isLocalInputSourceKind } from './localInput'
import { buttons, controller, reportedId, snapshot } from '../test/gamepadFixtures'
import type { GamepadBaseline } from './gamepadAdapter'

/**
 * A controller press through the WHOLE existing chain (Slice 9).
 *
 * Not a mock of the engine — the real store, the real planner, the real reducer,
 * the real queue and the real sanitizer. The claim under test is that Slice 9
 * added an ADAPTER and changed no game semantics: a controller buzz is
 * indistinguishable, downstream, from a keyboard buzz.
 *
 * ```text
 * snapshot → scanGamepadEdges → translateGamepadEdge → LocalInputSignal
 *          → translateLocalInput → RECORD_TEAM_BUZZ → planner → TEAM_BUZZED
 *          → replayed queue → sanitized PublicState
 * ```
 *
 * There is deliberately NO second command, NO second event, NO gamepad-shaped
 * rejection and NO gamepad field anywhere downstream — and that is asserted, not
 * assumed.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const THREE_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
]

/** Team `red` on controller 0 button 0, `blue` on 0/1, `green` on controller 1/0. */
const MAPPING: GamepadMapping = {
  version: GAMEPAD_MAPPING_VERSION,
  bindings: [
    { controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: PRIMARY_BUZZ },
    { controllerIndex: 0, buttonIndex: 1, teamId: 'blue', action: PRIMARY_BUZZ },
    { controllerIndex: 1, buttonIndex: 0, teamId: 'green', action: PRIMARY_BUZZ },
  ],
}

function boardStore(): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(THREE_TEAMS, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  return store
}

function arm(store: SessionStore) {
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
}

const TARGET = { roundId: ROUND, tileId: TILE }

/**
 * Drive the adapter over a scripted sequence of snapshots, dispatching whatever
 * it produces. This is exactly what the host hook does, minus React — so the
 * chain under test is the production one.
 */
function runFrames(
  store: SessionStore,
  frames: ReturnType<typeof snapshot>[],
  options: { enabled?: boolean; capturing?: boolean; target?: typeof TARGET | null } = {},
) {
  const { enabled = true, capturing = false, target = TARGET } = options
  let baseline: GamepadBaseline | null = null
  const outcomes: string[] = []
  let stamp = AT
  for (const frame of frames) {
    const scan = scanGamepadEdges(baseline, frame)
    baseline = scan.baseline
    for (const edge of scan.edges) {
      stamp += 1
      const translation = translateGamepadEdge(edge, MAPPING, { enabled, capturing }, stamp)
      if (translation.status === 'ignored') {
        outcomes.push(`ignored:${translation.reason}`)
        continue
      }
      const command = translateLocalInput(translation.signal, target)
      if (command.status === 'rejected') {
        outcomes.push(`untranslated:${command.reason}`)
        continue
      }
      const result = store.dispatch(command.command)
      outcomes.push(
        result.status === 'accepted'
          ? `accepted:${translation.signal.teamId}`
          : `refused:${result.reason}`,
      )
    }
  }
  return outcomes
}

/** Press then release button `buttonIndex` on `controllerIndex`, from cold. */
function press(controllerIndex: number, buttonIndex: number, buttonCount = 4) {
  const pad = controller(controllerIndex, buttons(buttonCount), {
    reportedId: reportedId('Vendor: 054c Product: 0002'),
    reportedMapping: { status: 'available', value: 'standard' },
  })
  return [
    snapshot(pad),
    snapshot({ ...pad, pressed: buttons(buttonCount, buttonIndex) }),
    snapshot(pad),
  ]
}

const IDENTITY_FORBIDDEN = [
  'reportedid',
  'reportedmapping',
  'classification',
  'candidate',
  '054c',
  '0002',
  'sony-buzz',
  'profile',
  'identity-unavailable',
] as const

function queueOf(store: SessionStore) {
  const game = store.getState().session?.game
  if (!game) throw new Error('fixture has no game')
  return responsePhaseFor(game, ROUND).queue
}

describe('the source kind', () => {
  it('recognizes `gamepad`, and still fails closed on anything else', () => {
    expect(isLocalInputSourceKind('gamepad')).toBe(true)
    for (const unknown of ['webhid', 'sony', 'buzz', 'phone', 'network', '', 'GAMEPAD']) {
      expect(isLocalInputSourceKind(unknown), unknown).toBe(false)
    }
  })
})

describe('a primary controller buzz through the existing chain', () => {
  it('reaches RECORD_TEAM_BUZZ and appends exactly one TEAM_BUZZED', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0))).toEqual(['accepted:red'])

    // Exactly ONE event, and it is the existing Slice 8 one. No gamepad event
    // type exists for it to be, and no second event is appended alongside it.
    const appended = store.getHistory().slice(before)
    expect(appended.map((event) => event.type)).toEqual(['TEAM_BUZZED'])
    expect(activeRespondent(queueOf(store))).toBe('red')
  })

  it('appends an event carrying no device data at all', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    const serialized = JSON.stringify(store.getHistory()).toLowerCase()
    for (const forbidden of [
      'gamepad',
      'controller',
      'controllerindex',
      'buttonindex',
      'button',
      'pressed',
      'axes',
      'vendor',
      'product',
      'source',
      'mapping',
      'device',
      'poll',
      ...IDENTITY_FORBIDDEN,
    ]) {
      expect(serialized, `event log must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('translates edges into LocalInputSignal with no identity or profile data', () => {
    const translation = translateGamepadEdge(
      { controllerIndex: 0, buttonIndex: 0 },
      MAPPING,
      { enabled: true, capturing: false },
      AT,
    )
    expect(translation.status).toBe('action')
    if (translation.status !== 'action') return
    const serialized = JSON.stringify(translation.signal).toLowerCase()
    for (const forbidden of [
      'controller',
      'button',
      '054c',
      'reported',
      'classification',
      'candidate',
      'profile',
      ...IDENTITY_FORBIDDEN,
    ]) {
      expect(serialized, `signal must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('puts later teams into the existing ordered queue', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    runFrames(store, press(1, 0))
    expect(activeRespondent(queueOf(store))).toBe('red')
    expect(waitingRespondents(queueOf(store))).toEqual(['blue', 'green'])
  })

  it('leaves a duplicate team press inert', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0))).toEqual(['refused:team-already-buzzed'])
    expect(store.getHistory()).toHaveLength(before)
  })

  it('stops the clock through the existing seam, exactly once', () => {
    const store = boardStore()
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 30,
    })
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    const interruptions = store
      .getHistory()
      .filter((event) => event.type === 'RESPONSE_TIMER_INTERRUPTED')
    expect(interruptions).toHaveLength(1)
    expect(responsePhaseFor(store.getState().session!.game!, ROUND).timer.status).toBe(
      'interrupted',
    )
  })

  it('promotes the next team after an incorrect response, unchanged', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    })
    expect(activeRespondent(queueOf(store))).toBe('blue')
  })
})

describe('a press that must change nothing', () => {
  it('appends no event while the clue is NOT armed', () => {
    const store = boardStore()
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0))).toEqual(['refused:response-phase-not-armed'])
    expect(store.getHistory()).toHaveLength(before)
  })

  it('appends no event when there is no open clue', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0), { target: null })).toEqual([
      'untranslated:no-open-clue',
    ])
    expect(store.getHistory()).toHaveLength(before)
  })

  it('appends no event while the adapter is switched off', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0), { enabled: false })).toEqual([
      'ignored:input-disabled',
    ])
    expect(store.getHistory()).toHaveLength(before)
  })

  it('appends no event while a button is being assigned', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    expect(runFrames(store, press(0, 0), { capturing: true })).toEqual([
      'ignored:capture-mode',
    ])
    expect(store.getHistory()).toHaveLength(before)
  })

  /**
   * The roadmap's named completion-evidence case: a controller pulled out while
   * the clue is armed must produce nothing at all.
   */
  it('appends no event when a controller disconnects mid-arming, held button and all', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    const outcomes = runFrames(store, [
      snapshot(controller(0, buttons(4))),
      snapshot(controller(0, buttons(4, 0))), // pressed — that one is a real buzz
      snapshot(), // unplugged mid-press
      snapshot(), // still gone
      snapshot(controller(0, buttons(4, 0))), // back, still held
      snapshot(controller(0, buttons(4, 0))), // still held
    ])
    expect(outcomes).toEqual(['accepted:red'])
    // Exactly ONE appended event: the disconnect, the gap and the held-button
    // reconnect between them added nothing at all.
    expect(store.getHistory().length - before).toBe(1)
  })

  it('appends no event for a button held from the moment the controller appeared', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length
    expect(
      runFrames(store, [
        snapshot(controller(0, buttons(4, 0))),
        snapshot(controller(0, buttons(4, 0))),
        snapshot(controller(0, buttons(4, 0))),
      ]),
    ).toEqual([])
    expect(store.getHistory()).toHaveLength(before)
  })
})

describe('secondary actions stay inert', () => {
  it('refuses every ordinal slot at translation, so none can reach the log', () => {
    const store = boardStore()
    arm(store)
    const before = store.getHistory().length

    for (const slot of SECONDARY_ACTION_SLOTS) {
      const secondaryMapping: GamepadMapping = {
        version: GAMEPAD_MAPPING_VERSION,
        bindings: [
          { controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: { kind: 'secondary', slot } },
        ],
      }
      const translation = translateGamepadEdge(
        { controllerIndex: 0, buttonIndex: 0 },
        secondaryMapping,
        { enabled: true, capturing: false },
        AT,
      )
      expect(translation.status, slot).toBe('action')
      expect(
        translation.status === 'action' && translateLocalInput(translation.signal, TARGET),
        slot,
      ).toEqual({ status: 'rejected', reason: 'unsupported-action' })
    }

    // Nothing appended, nothing scored, no queue, no timer change.
    expect(store.getHistory()).toHaveLength(before)
    expect(queueOf(store).order).toEqual([])
    expect(store.getState().session?.game?.teamScores).toEqual({})
  })
})

describe('replay, undo and the public projection', () => {
  it('replays a controller-built queue bit-exactly, with no adapter and no clock', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    runFrames(store, press(1, 0))

    // `replay` sees only the event log: no source, no snapshot, no baseline, no
    // mapping and no clock. A controller-built history is therefore replayable on
    // a machine with no controller attached at all.
    const replayed = replay(store.getHistory())
    expect(replayed).toEqual(store.getState())
    expect(replay(store.getHistory())).toEqual(replayed)
  })

  it('undo restores the prior queue exactly', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    expect(waitingRespondents(queueOf(store))).toEqual(['blue'])
    store.dispatch({ type: 'UNDO', issuedAt: AT })
    expect(waitingRespondents(queueOf(store))).toEqual([])
    expect(activeRespondent(queueOf(store))).toBe('red')
  })

  it('projects no device data, no source kind and no mapping to the display', () => {
    const store = boardStore()
    arm(store)
    runFrames(store, press(0, 0))
    runFrames(store, press(0, 1))
    const serialized = JSON.stringify(store.getPublicState()).toLowerCase()
    for (const forbidden of [
      'gamepad',
      'controller',
      'button',
      'pressed',
      'axes',
      'vendor',
      'product',
      'mapping',
      'binding',
      'adapter',
      'poll',
      'keyboard',
      'source',
      'capture',
      'connected',
      'diagnostic',
      ...IDENTITY_FORBIDDEN,
    ]) {
      expect(serialized, `public state must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('produces a public projection identical to the keyboard-built one', () => {
    // Same two teams, same order — one queue built by controller edges, one by a
    // direct command. The projector cannot tell them apart, and that IS the claim.
    const viaGamepad = boardStore()
    arm(viaGamepad)
    runFrames(viaGamepad, press(0, 0))
    runFrames(viaGamepad, press(0, 1))

    const viaCommand = boardStore()
    arm(viaCommand)
    for (const teamId of ['red', 'blue']) {
      viaCommand.dispatch({
        type: 'RECORD_TEAM_BUZZ',
        issuedAt: AT + 1,
        roundId: ROUND,
        tileId: TILE,
        teamId,
      })
    }

    expect(viaGamepad.getPublicState().response?.buzz).toEqual(
      viaCommand.getPublicState().response?.buzz,
    )
  })
})
