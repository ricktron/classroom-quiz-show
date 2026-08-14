/**
 * Approved AuthoringDraft → exact canonical schema-1 JSON document text.
 *
 * Pure compiler. Does not call the importer and does not mutate session state.
 */

import {
  CANONICAL_GAME_FILE_FORMAT,
  SUPPORTED_SCHEMA_VERSION,
} from '../import/canonicalFormat'
import { authoringIssue } from './issues'
import type { AuthoringDraft, CompileDraftResult } from './types'

export function compileApprovedDraft(draft: AuthoringDraft): CompileDraftResult {
  if (draft.status === 'blocked') {
    return {
      status: 'failure',
      issues: [
        authoringIssue(
          'blocking-structural-state',
          'blocker',
          'draft',
          'Cannot compile a blocked authoring draft.',
        ),
      ],
    }
  }

  if (draft.status !== 'approved' && draft.status !== 'ready_for_approval') {
    // Approval gate is enforced by approveAndImport; compile itself requires
    // non-blocked content.
  }

  if (draft.status !== 'approved') {
    return {
      status: 'failure',
      issues: [
        authoringIssue(
          'blocking-structural-state',
          'blocker',
          'draft',
          'Draft must be explicitly approved before compilation.',
        ),
      ],
    }
  }

  const boardConfig = {
    categories: draft.board.categories.map((category) => ({
      id: category.canonicalId,
      title: category.title,
      tiles: category.clues.map((clue) => {
        const tile: Record<string, unknown> = {
          id: clue.tileCanonicalId,
          value: clue.value,
          prompt: clue.promptMedia ?? clue.prompt,
          answer: clue.answer,
        }
        if (clue.alternates.length > 0) tile.alternates = [...clue.alternates]
        if (clue.notes) tile.notes = clue.notes
        if (clue.multiplier !== undefined) tile.multiplier = clue.multiplier
        return tile
      }),
    })),
  }

  const rounds: Record<string, unknown>[] = [
    {
      id: draft.game.boardRoundCanonicalId,
      type: 'category-board',
      title: draft.game.boardRoundTitle,
      config: boardConfig,
    },
  ]

  if (draft.profile === 'board-plus-final') {
    if (!draft.final) {
      return {
        status: 'failure',
        issues: [
          authoringIssue(
            'blocking-structural-state',
            'blocker',
            'draft',
            'Board + Final draft is missing Final content.',
            { sheet: 'FINAL' },
          ),
        ],
      }
    }
    const finalConfig: Record<string, unknown> = {
      prompt: draft.final.prompt,
      answer: draft.final.answer,
    }
    if (draft.final.alternates.length > 0) finalConfig.alternates = [...draft.final.alternates]
    if (draft.final.notes) finalConfig.notes = draft.final.notes
    rounds.push({
      id: draft.final.roundCanonicalId,
      type: 'final-wager',
      title: draft.final.roundTitle,
      config: finalConfig,
    })
  }

  const document: Record<string, unknown> = {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: draft.game.gameCanonicalId,
    title: draft.game.title,
    rounds,
  }

  if (draft.game.teams.length > 0) {
    document.teams = draft.game.teams.map((team) => ({
      id: team.canonicalId,
      name: team.name,
    }))
  }

  if (draft.game.responseSeconds !== undefined) {
    document.timer = { responseSeconds: draft.game.responseSeconds }
  }

  const jsonText = `${JSON.stringify(document)}\n`
  return { status: 'success', jsonText, document }
}
