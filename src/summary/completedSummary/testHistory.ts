import { importGameFromUnknown } from '../../import/importGame'
import { createSessionStore } from '../../state/store'
import { richBoardConfig } from '../../test/categoryBoardFixtures'
import { teamBoardGameFile, twoTeams } from '../../test/teamFixtures'
import type { SessionEvent } from '../../state/events'
import type { GameDefinition } from '../../game/gameDefinition'

export function completedHistory(): {
  readonly history: readonly SessionEvent[]
  readonly definition: GameDefinition
} {
  const imported = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
  if (imported.status !== 'success') throw new Error('fixture import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: 10, sessionId: 'summary-session' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 11, definition: imported.definition })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: 20 })
  return { history: store.getHistory(), definition: imported.definition }
}
