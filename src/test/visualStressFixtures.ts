/**
 * Canonical S05 / S06 visual stress fixture (valid Game data only).
 *
 * Builds UNTRUSTED plain objects for the real import pipeline — same contract
 * as ordinary classroom content. No schema bypass, no injected CSS/classes,
 * no presentation authority.
 *
 * Coverage (within authored bounds):
 * - longest category titles (MAX_CATEGORY_TITLE_LENGTH)
 * - long prompts / answers (near MAX_PROMPT_LENGTH / MAX_ANSWER_LENGTH)
 * - representative same-origin image media
 * - six categories × five tiles (30 tiles; under MAX_TOTAL_TILES)
 * - eight teams with max-length names and distinct accents
 *
 * Viewport / theme / reduced-motion / grayscale stress is applied by tests
 * (1080p, 720p, default, high-contrast, prefers-reduced-motion). Physical
 * Windows scaling remains S06.
 */

import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'
import {
  MAX_ANSWER_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_PROMPT_LENGTH,
} from '../game/categoryBoard/limits'
import { TEAM_ACCENTS } from '../game/teams/accents'
import { MAX_TEAM_NAME_LENGTH, MAX_TEAMS } from '../game/teams/limits'
import { imagePrompt } from './categoryBoardFixtures'

/** Stable id for the S05-F1 visual stress game document. */
export const VISUAL_STRESS_GAME_ID = 's05-f1-visual-stress'

const LONG_CATEGORY =
  'Earth Systems Extremely Long Category Header Text XX' // 52 chars; pad to max below

function maxCategoryTitle(seed: string): string {
  const base = `${seed} ${LONG_CATEGORY}`
  if (base.length >= MAX_CATEGORY_TITLE_LENGTH) {
    return base.slice(0, MAX_CATEGORY_TITLE_LENGTH)
  }
  return `${base}${'X'.repeat(MAX_CATEGORY_TITLE_LENGTH - base.length)}`
}

function longPrompt(label: string): string {
  const stem =
    `${label}: Interpret the multi-step classroom evidence carefully. ` +
    'Students must weigh competing claims, cite the projected diagram, and ' +
    'state a precise conclusion that a back-row viewer can still read aloud. '
  let text = stem
  while (text.length < MAX_PROMPT_LENGTH) {
    text += 'Additional projected detail for wrap stress. '
  }
  return text.slice(0, MAX_PROMPT_LENGTH)
}

function longAnswer(label: string): string {
  const stem = `${label} canonical answer with extended phrasing for projector wrap stress. `
  let text = stem
  while (text.length < MAX_ANSWER_LENGTH) {
    text += 'More answer detail. '
  }
  return text.slice(0, MAX_ANSWER_LENGTH)
}

function stressTile(
  categoryId: string,
  value: number,
  kind: 'text' | 'long' | 'image' = 'text',
): Record<string, unknown> {
  const id = `${categoryId}-${value}`
  if (kind === 'image') {
    return {
      id,
      value,
      prompt: imagePrompt({
        alt: 'Visual stress fixture diagram for projector media balance',
        caption: 'Stress media caption that must remain secondary to the clue',
        attribution: 'CQS test asset',
      }),
      answer: longAnswer(`Image-${value}`),
    }
  }
  if (kind === 'long') {
    return {
      id,
      value,
      prompt: longPrompt(`${categoryId}-${value}`),
      answer: longAnswer(`${categoryId}-${value}`),
    }
  }
  return {
    id,
    value,
    prompt: `Stress prompt ${categoryId} ${value}`,
    answer: `Stress answer ${categoryId} ${value}`,
  }
}

/**
 * Six-column stress board: long headers, mixed used-pattern candidates,
 * one long text clue, and one image clue.
 */
export function visualStressBoardConfig(): Record<string, unknown> {
  const categoryIds = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'] as const
  const values = [100, 200, 300, 400, 500] as const

  return {
    categories: categoryIds.map((id, index) => {
      const tiles = values.map((value, ti) => {
        if (index === 0 && ti === 0) return stressTile(id, value, 'long')
        if (index === 1 && ti === 2) return stressTile(id, value, 'image')
        return stressTile(id, value, 'text')
      })
      return {
        id,
        title: maxCategoryTitle(id.toUpperCase()),
        tiles,
      }
    }),
  }
}

/** Eight max-length team names with distinct accents. */
export function visualStressTeams(): Record<string, unknown>[] {
  return Array.from({ length: MAX_TEAMS }, (_unused, index) => {
    const accent = TEAM_ACCENTS[index]!
    const name = `Ms Garnett Period ${index + 1} TitansXXXX`.slice(0, MAX_TEAM_NAME_LENGTH)
    // Ensure exactly MAX length when possible
    const padded =
      name.length >= MAX_TEAM_NAME_LENGTH
        ? name.slice(0, MAX_TEAM_NAME_LENGTH)
        : `${name}${'Y'.repeat(MAX_TEAM_NAME_LENGTH - name.length)}`
    return {
      id: `stress-t${index + 1}`,
      name: padded,
      accent,
    }
  })
}

/** Canonical game file for S05-F1 / S06 visual stress. */
export function visualStressGameFile(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: VISUAL_STRESS_GAME_ID,
    title: 'S05-F1 Visual Stress Board',
    teams: visualStressTeams(),
    rounds: [
      {
        id: 'stress-board-round',
        type: 'category-board',
        title: 'Visual Stress Board',
        config: visualStressBoardConfig(),
      },
    ],
    ...overrides,
  }
}

export function visualStressGameFileText(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify(visualStressGameFile(overrides), null, 2)
}
