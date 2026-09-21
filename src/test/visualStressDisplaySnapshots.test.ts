import { describe, expect, it } from 'vitest'
import {
  MAX_ANSWER_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_PROMPT_LENGTH,
} from '../game/categoryBoard/limits'
import { MAX_TEAMS } from '../game/teams/limits'
import {
  VISUAL_STRESS_IMAGE_PATH,
  visualStressLongAnswer,
  visualStressLongPrompt,
} from './visualStressFixtures'
import {
  visualStressAnswerRevealSnapshot,
  visualStressArmedWaitingBuzzSnapshot,
  visualStressActiveClaimMaxWaitingSnapshot,
  visualStressBoardSnapshot,
  visualStressExhaustedBuzzSnapshot,
  visualStressFirstActiveClaimSnapshot,
  visualStressImagePromptSnapshot,
  visualStressLongPromptSnapshot,
  visualStressPromotedActiveClaimSnapshot,
} from './visualStressDisplaySnapshots'

describe('S05-F1 visual stress Display snapshots', () => {
  it('projects a six-column board with one used tile and eight teams through the sanitizer', () => {
    const state = visualStressBoardSnapshot(101)
    expect(state.revision).toBe(101)
    expect(state.round?.kind).toBe('board')
    if (state.round?.kind !== 'board' || state.round.stage !== 'board') {
      throw new Error('expected board stage')
    }
    expect(state.round.categories).toHaveLength(6)
    expect(state.round.categories[0]!.title.length).toBe(MAX_CATEGORY_TITLE_LENGTH)
    expect(state.round.categories[0]!.tiles[0]!.used).toBe(true)
    expect(state.round.categories[0]!.tiles[1]!.used).toBe(false)
    expect(state.teams?.status).toBe('available')
    if (state.teams?.status !== 'available') return
    expect(state.teams.teams).toHaveLength(MAX_TEAMS)
    expect(state.teams.teams[0]!.score).toBe(-999999)
    expect(state.teams.teams[7]!.score).toBe(100007)
  })

  it('projects schema-max long prompt content from the canonical fixture', () => {
    const state = visualStressLongPromptSnapshot(110)
    expect(state.round?.kind).toBe('board')
    if (state.round?.kind !== 'board' || state.round.stage !== 'prompt') {
      throw new Error('expected prompt stage')
    }
    expect(state.round.selection.prompt).toEqual({
      kind: 'text',
      text: visualStressLongPrompt(),
    })
    expect(state.round.selection.answer).toBeNull()
    expect(visualStressLongPrompt().length).toBe(MAX_PROMPT_LENGTH)
    expect(state.response?.armed).toBe(true)
    expect(state.response?.timer.status).toBe('running')
  })

  it('projects schema-max answer reveal retaining the prompt', () => {
    const state = visualStressAnswerRevealSnapshot(120)
    if (state.round?.kind !== 'board' || state.round.stage !== 'answer') {
      throw new Error('expected answer stage')
    }
    expect(state.round.selection.prompt).toEqual({
      kind: 'text',
      text: visualStressLongPrompt(),
    })
    expect(state.round.selection.answer).toBe(visualStressLongAnswer())
    expect(visualStressLongAnswer().length).toBe(MAX_ANSWER_LENGTH)
  })

  it('projects the stress image path from the canonical fixture', () => {
    const state = visualStressImagePromptSnapshot(111)
    if (state.round?.kind !== 'board' || state.round.stage !== 'prompt') {
      throw new Error('expected prompt stage')
    }
    expect(state.round.selection.prompt).toEqual({
      kind: 'image',
      source: { kind: 'same-origin-path', path: VISUAL_STRESS_IMAGE_PATH },
      alt: 'Visual stress fixture diagram for projector media balance',
      caption: 'Stress media caption that must remain secondary to the clue',
      attribution: 'CQS test asset',
    })
  })
})

describe('S05 buzz/active-claim Display snapshots', () => {
  it('projects armed waiting-for-buzz with no public active claim', () => {
    const state = visualStressArmedWaitingBuzzSnapshot(130)
    expect(state.response?.armed).toBe(true)
    expect(state.response?.buzz).toEqual({ status: 'none' })
  })

  it('projects first active claim by positional key without waiting identities', () => {
    const state = visualStressFirstActiveClaimSnapshot(131)
    expect(state.response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't0',
      waitingCount: 0,
    })
    const serialized = JSON.stringify(state.response?.buzz)
    expect(serialized).not.toMatch(/stress-t2|waitingTeams|queue/)
  })

  it('projects max waiting count without ordered waiting identities', () => {
    const state = visualStressActiveClaimMaxWaitingSnapshot(132)
    expect(state.response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't0',
      waitingCount: 7,
    })
    expect(JSON.stringify(state)).not.toMatch(/"waitingTeams"/)
    expect(Object.keys(state.response?.buzz ?? {})).toEqual([
      'status',
      'activeTeamKey',
      'waitingCount',
    ])
  })

  it('projects promotion to the next active team through the sanitizer', () => {
    const state = visualStressPromotedActiveClaimSnapshot(133)
    expect(state.response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't1',
      waitingCount: 0,
    })
  })

  it('projects exhausted distinctly from none', () => {
    const state = visualStressExhaustedBuzzSnapshot(134)
    expect(state.response?.buzz).toEqual({ status: 'exhausted' })
  })
})
