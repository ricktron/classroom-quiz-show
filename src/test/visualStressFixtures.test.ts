import { describe, expect, it } from 'vitest'
import { importGameFromUnknown } from '../import/importGame'
import {
  MAX_ANSWER_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_PROMPT_LENGTH,
} from '../game/categoryBoard/limits'
import { MAX_TEAM_NAME_LENGTH, MAX_TEAMS } from '../game/teams/limits'
import {
  VISUAL_STRESS_GAME_ID,
  VISUAL_STRESS_IMAGE_PATH,
  visualStressBoardConfig,
  visualStressGameFile,
  visualStressTeams,
} from './visualStressFixtures'

describe('S05-F1 visual stress fixture', () => {
  it('imports through the canonical validation pipeline', () => {
    const result = importGameFromUnknown(visualStressGameFile())
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.id).toBe(VISUAL_STRESS_GAME_ID)
    expect(result.definition.teams).toHaveLength(MAX_TEAMS)
  })

  it('exercises longest category titles, long prompt/answer, and image media', () => {
    const config = visualStressBoardConfig() as {
      categories: Array<{
        title: string
        tiles: Array<{ prompt: unknown; answer: string }>
      }>
    }
    expect(config.categories).toHaveLength(6)
    for (const category of config.categories) {
      expect(category.title.length).toBe(MAX_CATEGORY_TITLE_LENGTH)
      expect(category.tiles).toHaveLength(5)
    }
    const longPrompt = config.categories[0]!.tiles[0]!.prompt
    expect(typeof longPrompt).toBe('string')
    expect((longPrompt as string).length).toBe(MAX_PROMPT_LENGTH)
    expect(config.categories[0]!.tiles[0]!.answer.length).toBe(MAX_ANSWER_LENGTH)

    const imagePrompt = config.categories[1]!.tiles[2]!.prompt as {
      kind: string
      source: { kind: string; path: string }
    }
    expect(imagePrompt.kind).toBe('image')
    expect(imagePrompt.source.kind).toBe('same-origin-path')
    expect(imagePrompt.source.path).toBe(VISUAL_STRESS_IMAGE_PATH)
  })

  it('provides eight max-length team names with distinct accents', () => {
    const teams = visualStressTeams()
    expect(teams).toHaveLength(MAX_TEAMS)
    const accents = new Set(teams.map((t) => t.accent))
    expect(accents.size).toBe(MAX_TEAMS)
    for (const team of teams) {
      expect(String(team.name).length).toBe(MAX_TEAM_NAME_LENGTH)
    }
  })
})
