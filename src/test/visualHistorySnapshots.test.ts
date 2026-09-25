import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PUBLIC_FINAL_KIND } from '../state/publicState'
import {
  visualHistoryFinalAnswerRevealedSnapshot,
  visualHistoryFinalCompleteGenericSafeSnapshot,
  visualHistoryFinalCompleteTiedSnapshot,
  visualHistoryFinalCompleteWinnerSnapshot,
  visualHistoryFinalResolutionTiedSnapshot,
  visualHistoryFinalResolutionUniqueLeaderSnapshot,
  visualHistoryFinalSuddenDeathSnapshot,
  visualHistoryFinalTeamRevealPendingSnapshot,
  visualHistoryFinalWagerEntrySnapshot,
} from './visualHistoryFinalSnapshots'
import {
  automatedSurfaces,
  ownerLocalSurfaces,
  s06DeferredSurfaces,
  VISUAL_HISTORY_SURFACES,
} from './visualHistoryCaptureRegistry'
import { visualHistoryBoardDepletedSnapshot } from './visualHistoryRecoverySnapshots'

describe('S05 visual history Final snapshots', () => {
  it('projects Final stages through the sanitizer', () => {
    const wager = visualHistoryFinalWagerEntrySnapshot(1)
    expect(wager.round).toMatchObject({ kind: PUBLIC_FINAL_KIND, stage: 'wager-entry' })

    const answer = visualHistoryFinalAnswerRevealedSnapshot(2)
    expect(answer.round).toMatchObject({ kind: PUBLIC_FINAL_KIND, stage: 'answer-revealed' })

    const pending = visualHistoryFinalTeamRevealPendingSnapshot(3)
    expect(pending.round).toMatchObject({ kind: PUBLIC_FINAL_KIND, stage: 'team-reveal' })
    if (pending.round?.kind === PUBLIC_FINAL_KIND && pending.round.stage === 'team-reveal') {
      expect(pending.round.reveal.settlement).toBeNull()
    }

    const unique = visualHistoryFinalResolutionUniqueLeaderSnapshot(4)
    expect(unique.round).toMatchObject({
      kind: PUBLIC_FINAL_KIND,
      stage: 'resolution',
      outcome: 'unique-leader',
    })

    const tied = visualHistoryFinalResolutionTiedSnapshot(5)
    expect(tied.round).toMatchObject({
      kind: PUBLIC_FINAL_KIND,
      stage: 'resolution',
      outcome: 'tied',
    })

    const sudden = visualHistoryFinalSuddenDeathSnapshot(6)
    expect(sudden.round).toMatchObject({ kind: PUBLIC_FINAL_KIND, stage: 'sudden-death' })

    const winner = visualHistoryFinalCompleteWinnerSnapshot(7)
    expect(winner.round).toMatchObject({
      kind: PUBLIC_FINAL_KIND,
      stage: 'complete',
      outcome: 'unique-leader',
    })
    expect(winner.game?.status).toBe('ended')

    const tiedComplete = visualHistoryFinalCompleteTiedSnapshot(8)
    expect(tiedComplete.round).toMatchObject({
      kind: PUBLIC_FINAL_KIND,
      stage: 'complete',
      outcome: 'tied',
    })

    const generic = visualHistoryFinalCompleteGenericSafeSnapshot(9)
    expect(generic.teams).toEqual({ status: 'unavailable' })
    expect(generic.round).toMatchObject({ stage: 'complete' })
  })

  it('projects a fully depleted board', () => {
    const state = visualHistoryBoardDepletedSnapshot(10)
    expect(state.round?.kind).toBe('board')
    if (state.round?.kind !== 'board' || state.round.stage !== 'board') {
      throw new Error('expected board stage')
    }
    expect(state.round.categories.every((c) => c.tiles.every((t) => t.used))).toBe(true)
  })
})

describe('S05 visual history capture registry', () => {
  it('has unique surface ids and automated basenames', () => {
    const ids = VISUAL_HISTORY_SURFACES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const basenames = automatedSurfaces().map((s) => s.basename)
    expect(basenames.every((b) => typeof b === 'string' && b.endsWith('.png'))).toBe(true)
    expect(new Set(basenames).size).toBe(basenames.length)
    expect(automatedSurfaces().length).toBeGreaterThan(30)
    expect(ownerLocalSurfaces().length).toBeGreaterThan(0)
    expect(s06DeferredSurfaces().length).toBeGreaterThan(0)
  })

  it('keeps committed historical PNGs for every automated registry entry', () => {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../docs/design/history/2026-09-s05-complete/screenshots',
    )
    for (const surface of automatedSurfaces()) {
      const file = path.join(root, surface.folder, surface.basename!)
      expect(
        existsSync(file),
        `missing historical screenshot for ${surface.id}: ${surface.folder}/${surface.basename}`,
      ).toBe(true)
    }
  })
})
