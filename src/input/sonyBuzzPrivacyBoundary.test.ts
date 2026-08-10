import { describe, expect, it } from 'vitest'
import { toPublicState } from '../state/sanitize'
import { createSessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createSonyBuzzMappingRecord } from '../persistence/sonyBuzzMappingStore'
import { SONY_BUZZ_SUPPORTED_PROFILE_ID } from './sonyBuzzSupportedProfile'

const AT = 1_000_000

describe('Sony Buzz privacy boundary', () => {
  it('keeps supported-profile identity out of PublicState', () => {
    const imported = importGameFromUnknown(
      teamBoardGameFile(
        [
          { id: 'red', name: 'Red', accent: 'crimson' },
          { id: 'blue', name: 'Blue', accent: 'azure' },
        ],
        richBoardConfig(),
      ),
    )
    if (imported.status !== 'success') throw new Error('import failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
    const publicState = toPublicState(store.getState())
    const json = JSON.stringify(publicState)
    expect(json).not.toContain('sony')
    expect(json).not.toContain('054c')
    expect(json).not.toContain('1000')
    expect(json).not.toContain('webhid')
    expect(json).not.toContain(SONY_BUZZ_SUPPORTED_PROFILE_ID)
    expect(json).not.toContain('controllerIndex')
  })

  it('mapping record remains host-private shaped (no gameplay fields)', () => {
    const record = createSonyBuzzMappingRecord({
      gameId: 'g',
      teamSignature: 'blue\u001fred',
      associations: [{ slotId: 1, teamId: 'red' }],
      optedIn: true,
    })
    const json = JSON.stringify(record)
    expect(json).not.toContain('controllerIndex')
    expect(json).not.toContain('buttonIndex')
    expect(json).not.toContain('pressed')
    expect(json).toContain(SONY_BUZZ_SUPPORTED_PROFILE_ID)
  })
})
