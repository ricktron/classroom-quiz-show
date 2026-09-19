/**
 * Corrupt-import salvage.
 *
 * Canonical import (`importGame.ts`) remains the only path to a trusted
 * GameDefinition. This module does not repair that path and does not accept a
 * partial game. It reads a failed, but structurally safe, game file and builds
 * an authoring draft the teacher can finish.
 *
 * Automatic preservation copies only values the file already contains.
 * Missing questions, answers, category names, point values, and round meaning
 * stay blank. Identifiers are kept only when the file supplied a valid unique
 * id; they are never rewritten to glue the wrong rows together.
 */

import { revalidateDraft } from '../authoring/validateDraft'
import {
  AUTHORING_DRAFT_VERSION,
  WORKBOOK_FORMAT_VERSION,
} from '../authoring/contract'
import {
  deriveBoardRoundId,
  deriveCategoryId,
  deriveFinalRoundId,
  deriveTeamId,
  deriveTileId,
  sanitizeAuthoringToken,
} from '../authoring/ids'
import type {
  AuthoringDraft,
  DraftCategory,
  DraftClue,
  DraftFinal,
  DraftTeam,
} from '../authoring/types'
import {
  MAX_ALTERNATE_LENGTH,
  MAX_ALTERNATES,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_MULTIPLIER,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TOTAL_TILES,
} from '../game/categoryBoard/limits'
import {
  MAX_FINAL_ALTERNATE_LENGTH,
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
} from '../game/finalWager/limits'
import { isValidSameOriginPath, MAX_MEDIA_ALT_LENGTH, MAX_MEDIA_ATTRIBUTION_LENGTH, MAX_MEDIA_CAPTION_LENGTH } from '../game/media/limits'
import type { PromptContent } from '../game/media/definition'
import { isTeamAccent } from '../game/teams/accents'
import { MAX_TEAM_NAME_LENGTH, MAX_TEAMS } from '../game/teams/limits'
import { MAX_RESPONSE_SECONDS, MIN_RESPONSE_SECONDS } from '../game/timing/limits'
import {
  CANONICAL_GAME_FILE_FORMAT,
  ID_PATTERN,
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  SUPPORTED_SCHEMA_VERSION,
} from './canonicalFormat'
import { importGameFromJsonText } from './importGame'
import type { ImportIssue, ImportIssueCode } from './issues'
import { isPlainRecord, scanImportedDocument } from './safetyScan'

const REVIEW_GAME_ID = 'import-review'

const FAIL_CLOSED_CODES = new Set<ImportIssueCode>([
  'input-not-text',
  'empty-input',
  'input-too-large',
  'invalid-json',
  'root-not-object',
  'missing-format',
  'unsupported-format',
  'missing-schema-version',
  'invalid-schema-version',
  'unsupported-schema-version',
  'unsafe-object-key',
  'non-data-value',
  'non-finite-number',
  'cyclic-reference',
  'document-too-deep',
  'issues-truncated',
  'internal-error',
  'construction-failed',
])

export interface SalvageDerivedIdentity {
  readonly game: boolean
  readonly boardRound: boolean
  readonly finalRound: boolean
  readonly categoryOrders: readonly number[]
  readonly tileKeys: readonly string[]
  readonly teamOrders: readonly number[]
}

export interface ImportCorrectionView {
  readonly headline: string
  readonly detail: string
  readonly kept: readonly string[]
  readonly needsTeacher: readonly string[]
  readonly rejected: readonly string[]
  readonly draft: AuthoringDraft
  readonly gameIdFromSource: boolean
  readonly derived: SalvageDerivedIdentity
  readonly persisted: boolean
}

export type CorruptImportSalvage =
  | { readonly outcome: 'not-needed' }
  | { readonly outcome: 'fail-closed'; readonly headline: string; readonly detail: string }
  | { readonly outcome: 'correction'; readonly view: ImportCorrectionView }

interface WalkNotes {
  kept: string[]
  needsTeacher: string[]
  rejected: string[]
  omittedUnknown: boolean
  derivedTile: boolean
  invalidAccent: boolean
  droppedPicture: boolean
  droppedAlternate: boolean
}

export function analyzeCorruptGameImport(text: unknown): CorruptImportSalvage {
  const imported = importGameFromJsonText(text)
  if (imported.status === 'success') return { outcome: 'not-needed' }
  if (imported.issues.some((issue) => FAIL_CLOSED_CODES.has(issue.code))) {
    return { outcome: 'fail-closed', ...failClosedCopy(imported.issues) }
  }
  if (typeof text !== 'string') {
    return {
      outcome: 'fail-closed',
      headline: 'This file cannot be used safely.',
      detail: 'Nothing was saved. Classroom Quiz Show did not try to repair it.',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      outcome: 'fail-closed',
      headline: 'This file could not be read.',
      detail: 'It is not a Classroom Quiz Show game file. Nothing was saved.',
    }
  }
  if (!isPlainRecord(parsed) || scanImportedDocument(parsed).length > 0) {
    return {
      outcome: 'fail-closed',
      headline: 'This file cannot be used safely.',
      detail: 'Nothing was saved. Classroom Quiz Show did not try to repair it.',
    }
  }
  if (
    parsed.format !== CANONICAL_GAME_FILE_FORMAT ||
    parsed.schemaVersion !== SUPPORTED_SCHEMA_VERSION
  ) {
    return {
      outcome: 'fail-closed',
      headline: 'This file is not a Classroom Quiz Show game.',
      detail: 'Nothing was saved, and the file was not converted.',
    }
  }

  return walkGame(parsed)
}

export function describeUnfinishedDraft(
  draft: AuthoringDraft,
  detail: string,
): ImportCorrectionView {
  const kept: string[] = []
  const needsTeacher: string[] = []
  for (const category of draft.board.categories) {
    const categoryName = category.title.trim().length > 0 ? labelText(category.title) : 'A category with no name'
    for (const clue of category.clues) {
      const prompt = clue.prompt.trim()
      const answer = clue.answer.trim()
      const named = prompt.length > 0 ? `“${labelText(prompt)}”` : 'A blank question'
      if (prompt.length > 0 && answer.length > 0 && clue.valueAuthored !== false) {
        kept.push(`${named} in ${categoryName} can be used as written.`)
      } else {
        const missing: string[] = []
        if (prompt.length === 0) missing.push('a question')
        if (answer.length === 0) missing.push('an answer')
        if (clue.valueAuthored === false) missing.push('a point value')
        needsTeacher.push(
          missing.length > 0
            ? `${named} in ${categoryName} still needs ${missing.join(' and ')}.`
            : `${named} in ${categoryName} still needs you to finish it.`,
        )
      }
    }
  }
  if (draft.final) {
    const prompt = draft.final.prompt.trim()
    const answer = draft.final.answer.trim()
    if (prompt.length > 0 && answer.length > 0) {
      kept.push('Final can be used as written.')
    } else {
      needsTeacher.push('Final still needs a question or an answer.')
    }
  }
  return {
    headline: 'Some of this import still needs you.',
    detail,
    kept,
    needsTeacher,
    rejected: [],
    draft,
    gameIdFromSource: true,
    derived: emptyDerived(),
    persisted: true,
  }
}

export function applyFreshLibraryIdentity(
  draft: AuthoringDraft,
  derived: SalvageDerivedIdentity,
  newGameId: string,
): AuthoringDraft | null {
  if (!isIdentifier(newGameId) || newGameId === draft.game.gameCanonicalId) return null
  const boardRoundId = derived.boardRound
    ? deriveBoardRoundId(newGameId)
    : draft.game.boardRoundCanonicalId
  const finalRoundId =
    draft.final === undefined
      ? null
      : derived.finalRound
        ? deriveFinalRoundId(newGameId)
        : draft.final.roundCanonicalId
  if (boardRoundId === null || (draft.final && finalRoundId === null)) return null

  const categoryOrders = new Set(derived.categoryOrders)
  const tileKeys = new Set(derived.tileKeys)
  const teamOrders = new Set(derived.teamOrders)
  const categories = draft.board.categories.map((category) => {
    const canonicalId = categoryOrders.has(category.order)
      ? deriveCategoryId(newGameId, category.order)
      : category.canonicalId
    if (canonicalId === null) return null
    const clues = category.clues.map((clue) => {
      const tileCanonicalId = tileKeys.has(`${category.order}:${clue.clueOrder}`)
        ? deriveTileId(newGameId, category.order, clue.clueOrder)
        : clue.tileCanonicalId
      if (tileCanonicalId === null) return null
      return { ...clue, categoryCanonicalId: canonicalId, tileCanonicalId }
    })
    if (clues.some((clue) => clue === null)) return null
    return { ...category, canonicalId, clues: clues as DraftClue[] }
  })
  if (categories.some((category) => category === null)) return null

  const teams = draft.game.teams.map((team) => {
    const canonicalId = teamOrders.has(team.order)
      ? deriveTeamId(newGameId, team.order)
      : team.canonicalId
    if (canonicalId === null) return null
    return { ...team, canonicalId }
  })
  if (teams.some((team) => team === null)) return null

  const next: AuthoringDraft = {
    ...draft,
    game: {
      ...draft.game,
      gameKey: sanitizeAuthoringToken(newGameId),
      gameCanonicalId: newGameId,
      boardRoundCanonicalId: boardRoundId,
      teams: teams as DraftTeam[],
    },
    board: { categories: categories as DraftCategory[] },
    final:
      draft.final && finalRoundId
        ? { ...draft.final, roundCanonicalId: finalRoundId }
        : draft.final,
  }
  return revalidateDraft(next)
}

function walkGame(doc: Record<string, unknown>): CorruptImportSalvage {
  if (!Array.isArray(doc.rounds)) {
    return {
      outcome: 'fail-closed',
      headline: 'This file has no question list that can be kept.',
      detail: 'Nothing was saved. Classroom Quiz Show did not invent a board to replace it.',
    }
  }

  const notes: WalkNotes = {
    kept: [],
    needsTeacher: [],
    rejected: [],
    omittedUnknown: false,
    derivedTile: false,
    invalidAccent: false,
    droppedPicture: false,
    droppedAlternate: false,
  }
  const usedIds = new Set<string>()
  const derivedCategories: number[] = []
  const derivedTiles: string[] = []
  const derivedTeams: number[] = []
  let derivedBoard = false
  let derivedFinal = false

  const gameIdFromSource = isIdentifier(doc.id)
  const gameId = gameIdFromSource ? (doc.id as string) : REVIEW_GAME_ID
  if (gameIdFromSource) usedIds.add(gameId)

  const title = nonBlank(doc.title)
  if (title === null) {
    notes.needsTeacher.push('The file has no game name. Enter one. Nothing was invented.')
  } else if (title.length > MAX_TITLE_LENGTH) {
    notes.needsTeacher.push('The game name is too long. It was kept in full so you can shorten it. It was not cut off.')
  }
  noteUnknown(doc, ['format', 'schemaVersion', 'id', 'title', 'teams', 'timer', 'rounds'], notes)

  const teams = readTeams(doc.teams, gameId, usedIds, derivedTeams, notes)
  const responseSeconds = readTimer(doc.timer, notes)

  let boardRound: Record<string, unknown> | null = null
  let finalRound: Record<string, unknown> | null = null
  for (const round of doc.rounds) {
    if (!isPlainRecord(round)) {
      notes.rejected.push('One section of the file was not a round and was not kept.')
      continue
    }
    noteUnknown(round, ['id', 'type', 'title', 'config'], notes)
    if (round.type === 'category-board') {
      if (boardRound) {
        notes.rejected.push(
          'A second question board was not kept, so its questions would not be mixed into the first board.',
        )
        continue
      }
      boardRound = round
    } else if (round.type === 'final-wager') {
      if (finalRound) {
        notes.rejected.push('A second Final was not kept.')
        continue
      }
      finalRound = round
    } else {
      notes.rejected.push('A round was not a question board or Final, so it was not kept.')
    }
  }

  let boardRoundId: string | null = null
  if (boardRound) {
    const sourceId = takeSourceId(boardRound.id, usedIds)
    if (sourceId) boardRoundId = sourceId
    else if (boardRound.id === undefined) {
      boardRoundId = deriveBoardRoundId(gameId)
      derivedBoard = boardRoundId !== null
    } else {
      notes.rejected.push('The question board’s identity could not be used, so the board was not kept.')
      boardRound = null
    }
  }

  const categories =
    boardRound === null
      ? []
      : readCategories(boardRound, gameId, usedIds, derivedCategories, derivedTiles, notes)

  const final = finalRound ? readFinal(finalRound, gameId, usedIds, notes) : undefined
  if (final && finalRound && !isIdentifier(finalRound.id)) derivedFinal = true

  const hasAcademic =
    categories.some(
      (category) =>
        category.title.trim().length > 0 ||
        category.clues.some((clue) => clue.prompt.trim().length > 0 || clue.answer.trim().length > 0),
    ) ||
    (final !== undefined && (final.prompt.trim().length > 0 || final.answer.trim().length > 0))

  if (!hasAcademic || (categories.length === 0 && final === undefined) || boardRoundId === null && categories.length > 0) {
    if (categories.length > 0 && boardRoundId === null) {
      return {
        outcome: 'fail-closed',
        headline: 'The question board could not be kept safely.',
        detail: 'Nothing was saved. Classroom Quiz Show did not invent a replacement board.',
      }
    }
    return {
      outcome: 'fail-closed',
      headline: 'Nothing in this file could be kept safely.',
      detail:
        'Questions, answers, and category names were not filled in. Nothing was saved.',
    }
  }

  if (categories.length === 0 && final) {
    const slotId = deriveCategoryId(gameId, 1)
    const tileId = deriveTileId(gameId, 1, 1)
    if (slotId === null || tileId === null) {
      return {
        outcome: 'fail-closed',
        headline: 'Final could be read, but it cannot be kept without a question board.',
        detail: 'Nothing was saved. Classroom Quiz Show did not invent board questions.',
      }
    }
    derivedCategories.push(1)
    derivedTiles.push('1:1')
    categories.push(emptyCategory(slotId, tileId))
    notes.needsTeacher.push(
      'Final was kept. The file had no question board, so an empty column was added for you to fill. No questions were invented.',
    )
  }

  if (boardRoundId === null) {
    boardRoundId = deriveBoardRoundId(gameId)
    derivedBoard = true
  }
  if (boardRoundId === null) {
    return {
      outcome: 'fail-closed',
      headline: 'This file cannot be kept safely.',
      detail: 'Nothing was saved.',
    }
  }

  const boardTitle = boardRound ? nonBlank(boardRound.title) : null
  const gameTitle = title ?? ''
  if (boardRound && boardTitle === null) {
    notes.needsTeacher.push('The question board had no name of its own.')
  } else if (boardTitle && boardTitle.length > MAX_TITLE_LENGTH) {
    notes.needsTeacher.push('The question board’s name is too long. It was kept in full. It was not cut off.')
  }

  if (notes.omittedUnknown) {
    notes.needsTeacher.push('Extra information in the file was not understood and was not kept.')
  }
  if (notes.derivedTile) {
    notes.needsTeacher.push(
      'Some questions had no identity in the file. They were kept in file order, not attached to a guessed identity.',
    )
  }
  if (notes.invalidAccent) {
    notes.rejected.push('A team color label was not usable and was not replaced.')
  }
  if (notes.droppedPicture) {
    notes.needsTeacher.push('A picture could not be used. Its description was kept as the question when one was present.')
  }
  if (notes.droppedAlternate) {
    notes.needsTeacher.push('Some extra accepted answers were not usable and were not kept.')
  }
  if (!gameIdFromSource) {
    notes.needsTeacher.push(
      'This file had no usable game identity. If you keep it, it is saved as a new game and does not replace another game by guesswork.',
    )
  }

  const profile = final ? 'board-plus-final' : 'classic-board'
  const draft: AuthoringDraft = {
    version: AUTHORING_DRAFT_VERSION,
    profile,
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
    status: 'blocked',
    game: {
      title: gameTitle,
      gameKey: sanitizeAuthoringToken(gameId),
      gameCanonicalId: gameId,
      responseSeconds,
      boardRoundCanonicalId: boardRoundId,
      boardRoundTitle: boardTitle ?? gameTitle,
      teams,
    },
    board: { categories },
    final,
    provenance: {
      filename: 'game-file',
      workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
      profile,
      detectedSheets: final ? ['GAME', 'CLUES', 'FINAL'] : ['GAME', 'CLUES'],
      origin: 'in-app',
    },
    issues: [],
    contentFingerprint: '',
  }

  const view: ImportCorrectionView = {
    headline: 'Some of this file can be kept.',
    detail:
      'Nothing has been saved yet. What can be used is unchanged. Missing questions, answers, and point values were left blank.',
    kept: notes.kept,
    needsTeacher: notes.needsTeacher,
    rejected: notes.rejected,
    draft: revalidateDraft(draft),
    gameIdFromSource,
    derived: {
      game: !gameIdFromSource,
      boardRound: derivedBoard,
      finalRound: derivedFinal,
      categoryOrders: derivedCategories,
      tileKeys: derivedTiles,
      teamOrders: derivedTeams,
    },
    persisted: false,
  }
  return { outcome: 'correction', view }
}

function readTeams(
  value: unknown,
  gameId: string,
  usedIds: Set<string>,
  derivedTeams: number[],
  notes: WalkNotes,
): DraftTeam[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    notes.rejected.push('The team list could not be read and was not kept.')
    return []
  }
  const teams: DraftTeam[] = []
  for (const entry of value) {
    if (teams.length >= MAX_TEAMS) {
      notes.rejected.push('Further teams were not kept because a game cannot hold more teams than that.')
      break
    }
    if (!isPlainRecord(entry)) {
      notes.rejected.push('A team entry could not be read and was not kept.')
      continue
    }
    noteUnknown(entry, ['id', 'name', 'accent'], notes)
    const name = nonBlank(entry.name)
    if (name === null) {
      notes.rejected.push('A team without a usable name was not kept. No team name was invented.')
      continue
    }
    const order = teams.length + 1
    let canonicalId = takeSourceId(entry.id, usedIds)
    if (canonicalId === null) {
      if (entry.id !== undefined) {
        notes.rejected.push(`Team “${labelText(name)}” had an unusable identity and was not kept.`)
        continue
      }
      canonicalId = deriveTeamId(gameId, order)
      if (canonicalId === null || usedIds.has(canonicalId)) {
        notes.rejected.push(`Team “${labelText(name)}” could not be kept safely.`)
        continue
      }
      usedIds.add(canonicalId)
      derivedTeams.push(order)
    }
    const team: DraftTeam = {
      order,
      name,
      authoringKey: `Team${order}Name`,
      canonicalId,
    }
    if (name.length > MAX_TEAM_NAME_LENGTH) {
      notes.needsTeacher.push(
        `Team “${labelText(name)}” has a long name. It was kept in full. Shorten it if you need to.`,
      )
    }
    const accent = entry.accent !== undefined && isTeamAccent(entry.accent) ? entry.accent : undefined
    if (entry.accent !== undefined && accent === undefined) notes.invalidAccent = true
    teams.push(accent === undefined ? team : { ...team, accent })
    notes.kept.push(`Team “${labelText(name)}” was kept.`)
  }
  return teams
}

function readTimer(value: unknown, notes: WalkNotes): number | undefined {
  if (value === undefined) return undefined
  if (!isPlainRecord(value)) {
    notes.rejected.push('The response time could not be read and was not replaced.')
    return undefined
  }
  noteUnknown(value, ['responseSeconds'], notes)
  const seconds = value.responseSeconds
  if (seconds === undefined) return undefined
  if (
    typeof seconds === 'number' &&
    Number.isInteger(seconds) &&
    seconds >= MIN_RESPONSE_SECONDS &&
    seconds <= MAX_RESPONSE_SECONDS
  ) {
    return seconds
  }
  notes.rejected.push('The response time was not usable and was not replaced with a guessed time.')
  return undefined
}

function readCategories(
  round: Record<string, unknown>,
  gameId: string,
  usedIds: Set<string>,
  derivedCategories: number[],
  derivedTiles: string[],
  notes: WalkNotes,
): DraftCategory[] {
  if (!isPlainRecord(round.config)) {
    notes.rejected.push('The question board could not be read and was not kept.')
    return []
  }
  noteUnknown(round.config, ['categories'], notes)
  if (!Array.isArray(round.config.categories)) {
    notes.rejected.push('The question board had no category list and was not kept.')
    return []
  }
  const categories: DraftCategory[] = []
  let tileCount = 0
  for (const entry of round.config.categories) {
    if (categories.length >= MAX_CATEGORIES) {
      notes.rejected.push('Further categories were not kept because a board cannot hold more than that.')
      break
    }
    if (!isPlainRecord(entry)) {
      notes.rejected.push('A category could not be read and was not kept.')
      continue
    }
    noteUnknown(entry, ['id', 'title', 'tiles'], notes)
    const title = nonBlank(entry.title) ?? ''
    if (title.length > MAX_CATEGORY_TITLE_LENGTH) {
      notes.needsTeacher.push(
        `Category “${labelText(title)}” has a long name. It was kept in full so you can shorten it. It was not cut off.`,
      )
    }
    const order = categories.length + 1
    let canonicalId = takeSourceId(entry.id, usedIds)
    if (canonicalId === null) {
      if (entry.id !== undefined) {
        notes.rejected.push(
          title.length > 0
            ? `Category “${labelText(title)}” had an unusable identity and was not kept.`
            : 'A category had an unusable identity and was not kept.',
        )
        continue
      }
      canonicalId = deriveCategoryId(gameId, order)
      if (canonicalId === null || usedIds.has(canonicalId)) {
        notes.rejected.push('A category could not be kept safely.')
        continue
      }
      usedIds.add(canonicalId)
      derivedCategories.push(order)
    }
    const clues = readTiles(
      entry.tiles,
      order,
      title,
      canonicalId,
      gameId,
      usedIds,
      derivedTiles,
      notes,
      tileCount,
    )
    tileCount += clues.length
    if (clues.length === 0 && title.length === 0) {
      notes.rejected.push('An empty category was not kept.')
      continue
    }
    if (clues.length === 0) {
      const tileId = deriveTileId(gameId, order, 1)
      if (tileId === null || usedIds.has(tileId)) {
        notes.rejected.push(`Category “${labelText(title)}” had no usable questions and was not kept.`)
        continue
      }
      usedIds.add(tileId)
      derivedTiles.push(`${order}:1`)
      clues.push(emptyClue(order, title, canonicalId, tileId))
      notes.needsTeacher.push(
        `Category “${labelText(title)}” had no usable questions. The name was kept. Add the questions. None were invented.`,
      )
    } else if (title.length === 0) {
      notes.needsTeacher.push('A category name was missing and was left blank. No name was invented.')
    } else {
      notes.kept.push(`Category “${labelText(title)}” was kept.`)
    }
    categories.push({ order, title, canonicalId, clues })
  }
  return categories
}

function readTiles(
  value: unknown,
  categoryOrder: number,
  categoryTitle: string,
  categoryId: string,
  gameId: string,
  usedIds: Set<string>,
  derivedTiles: string[],
  notes: WalkNotes,
  already: number,
): DraftClue[] {
  if (!Array.isArray(value)) {
    notes.rejected.push(
      categoryTitle.length > 0
        ? `Questions in “${labelText(categoryTitle)}” could not be read and were not kept.`
        : 'A category’s questions could not be read and were not kept.',
    )
    return []
  }
  const clues: DraftClue[] = []
  for (const entry of value) {
    if (already + clues.length >= MAX_TOTAL_TILES || clues.length >= MAX_TILES_PER_CATEGORY) {
      notes.rejected.push('Further questions were not kept because the board is already as large as a class game can play.')
      break
    }
    if (!isPlainRecord(entry)) {
      notes.rejected.push('A question could not be read and was not kept.')
      continue
    }
    noteUnknown(entry, ['id', 'value', 'prompt', 'answer', 'alternates', 'notes', 'multiplier'], notes)
    const prompt = readPrompt(entry.prompt, notes)
    const answer = nonBlank(entry.answer)
    if (prompt.kind === 'unusable' && answer === null) {
      notes.rejected.push('A question had no usable question text or answer and was not kept.')
      continue
    }
    if (prompt.kind === 'missing' && answer === null) {
      notes.rejected.push('A score or blank row without a question or answer was not kept.')
      continue
    }
    const promptText = prompt.kind === 'text' ? prompt.text : ''
    const answerText = answer ?? ''
    if (entry.answer !== undefined && typeof entry.answer !== 'string') {
      notes.needsTeacher.push(
        `“${labelText(promptText || 'A question')}” had an answer that was not text, so the answer was left blank.`,
      )
    } else if (answerText.trim().length === 0) {
      notes.needsTeacher.push(
        `“${labelText(promptText || categoryTitle || 'A question')}” has no answer. None was invented.`,
      )
    }
    if (prompt.kind === 'unusable') {
      notes.needsTeacher.push('A question’s text could not be used and was left blank. No question was invented.')
    } else if (prompt.kind === 'missing') {
      notes.needsTeacher.push('A question’s text was missing and was left blank. No question was invented.')
    }
    const clueOrder = clues.length + 1
    let tileId = takeSourceId(entry.id, usedIds)
    if (tileId === null) {
      if (entry.id !== undefined) {
        notes.rejected.push(
          `“${labelText(promptText || answerText || 'A question')}” had an unusable identity and was not kept.`,
        )
        continue
      }
      tileId = deriveTileId(gameId, categoryOrder, clueOrder)
      if (tileId === null || usedIds.has(tileId)) {
        notes.rejected.push('A question could not be kept safely.')
        continue
      }
      usedIds.add(tileId)
      derivedTiles.push(`${categoryOrder}:${clueOrder}`)
      notes.derivedTile = true
    }
    const authoredValue = readValue(entry.value)
    if (authoredValue === null) {
      notes.needsTeacher.push(
        entry.value === undefined
          ? `“${labelText(promptText || answerText || 'A question')}” has no point value. None was guessed.`
          : `“${labelText(promptText || answerText || 'A question')}” had a point value that could not be used. It was left blank, not guessed.`,
      )
    }
    const clue: DraftClue = {
      categoryOrder,
      categoryTitle,
      clueOrder,
      value: authoredValue ?? 0,
      valueAuthored: authoredValue === null ? false : undefined,
      prompt: promptText,
      answer: answerText,
      alternates: readAlternates(entry.alternates, notes),
      notes: readOptionalText(entry.notes, MAX_NOTES_LENGTH, notes),
      multiplier: readMultiplier(entry.multiplier, notes),
      categoryCanonicalId: categoryId,
      tileCanonicalId: tileId,
      promptMedia: prompt.kind === 'text' ? prompt.media : undefined,
      provenance: { sheet: 'IMPORT', row: clueOrder + 1, a1Prompt: 'C' },
    }
    if (promptText.trim().length > 0 && answerText.trim().length > 0 && authoredValue !== null) {
      notes.kept.push(`“${labelText(promptText)}” was kept with its answer and point value.`)
    }
    if (promptText.length > MAX_PROMPT_LENGTH || answerText.length > MAX_ANSWER_LENGTH) {
      notes.needsTeacher.push('Some text is longer than a question can be. It was not cut off. Shorten it in the editor.')
    }
    clues.push(clue)
  }
  return clues
}

function readFinal(
  round: Record<string, unknown>,
  gameId: string,
  usedIds: Set<string>,
  notes: WalkNotes,
): DraftFinal | undefined {
  if (!isPlainRecord(round.config)) {
    notes.rejected.push('Final could not be read and was not kept.')
    return undefined
  }
  noteUnknown(round.config, ['prompt', 'answer', 'alternates', 'notes'], notes)
  const prompt = readPrompt(round.config.prompt, notes)
  const answer = nonBlank(round.config.answer)
  if ((prompt.kind !== 'text' || prompt.text.trim().length === 0) && answer === null) {
    notes.rejected.push('Final had no usable question or answer and was not kept.')
    return undefined
  }
  let roundId = takeSourceId(round.id, usedIds)
  if (roundId === null) {
    if (round.id !== undefined) {
      notes.rejected.push('Final had an unusable identity and was not kept.')
      return undefined
    }
    roundId = deriveFinalRoundId(gameId)
    if (roundId === null || usedIds.has(roundId)) {
      notes.rejected.push('Final could not be kept safely.')
      return undefined
    }
    usedIds.add(roundId)
  }
  const promptText = prompt.kind === 'text' ? prompt.text : ''
  const answerText = answer ?? ''
  if (promptText.trim().length === 0 || answerText.trim().length === 0) {
    notes.needsTeacher.push('Final is missing a question or an answer. Nothing was invented.')
  } else {
    notes.kept.push('Final was kept with its question and answer.')
  }
  if (promptText.length > MAX_PROMPT_LENGTH || answerText.length > MAX_FINAL_ANSWER_LENGTH) {
    notes.needsTeacher.push('Final’s text is longer than allowed. It was kept in full. It was not cut off.')
  }
  const sourceTitle = nonBlank(round.title)
  const title = sourceTitle ?? 'Final'
  if (sourceTitle === null) {
    notes.needsTeacher.push('Final had no name, so it is labeled Final. That label is not a question or an answer.')
  } else if (sourceTitle.length > MAX_TITLE_LENGTH) {
    notes.needsTeacher.push('Final’s name is too long. It was kept in full. It was not cut off.')
  }
  return {
    prompt: promptText,
    answer: answerText,
    alternates: readAlternates(round.config.alternates, notes, true),
    notes: readOptionalText(round.config.notes, MAX_FINAL_NOTES_LENGTH, notes),
    roundTitle: title,
    roundCanonicalId: roundId,
    provenance: { sheet: 'FINAL', row: 2, a1Prompt: 'A' },
  }
}

type ReadPrompt =
  | { readonly kind: 'text'; readonly text: string; readonly media?: PromptContent }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unusable' }

function readPrompt(value: unknown, notes: WalkNotes): ReadPrompt {
  if (value === undefined) return { kind: 'missing' }
  if (typeof value === 'string') {
    if (value.trim().length === 0) return { kind: 'missing' }
    return { kind: 'text', text: value }
  }
  if (!isPlainRecord(value)) return { kind: 'unusable' }
  const alt = typeof value.alt === 'string' && value.alt.trim().length > 0 ? value.alt : null
  const media = readImage(value)
  if (media) return { kind: 'text', text: media.alt, media }
  if (alt) {
    notes.droppedPicture = true
    return { kind: 'text', text: alt }
  }
  return { kind: 'unusable' }
}

function readImage(
  value: Record<string, unknown>,
): Extract<PromptContent, { kind: 'image' }> | null {
  if (value.kind !== 'image') return null
  if (!onlyKeys(value, ['kind', 'source', 'alt', 'caption', 'attribution'])) return null
  if (!isPlainRecord(value.source) || !onlyKeys(value.source, ['kind', 'path'])) return null
  if (value.source.kind !== 'same-origin-path' || typeof value.source.path !== 'string') return null
  if (!isValidSameOriginPath(value.source.path)) return null
  if (typeof value.alt !== 'string' || value.alt.trim().length === 0 || value.alt.length > MAX_MEDIA_ALT_LENGTH) {
    return null
  }
  const caption = optionalAnnotation(value.caption, MAX_MEDIA_CAPTION_LENGTH)
  const attribution = optionalAnnotation(value.attribution, MAX_MEDIA_ATTRIBUTION_LENGTH)
  if (caption === 'invalid' || attribution === 'invalid') return null
  return {
    kind: 'image',
    source: { kind: 'same-origin-path', path: value.source.path },
    alt: value.alt,
    caption,
    attribution,
  }
}

function optionalAnnotation(value: unknown, max: number): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max) return 'invalid'
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : value
}

function readAlternates(value: unknown, notes: WalkNotes, final = false): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    notes.droppedAlternate = true
    return []
  }
  const maxCount = final ? MAX_FINAL_ALTERNATES : MAX_ALTERNATES
  const maxLength = final ? MAX_FINAL_ALTERNATE_LENGTH : MAX_ALTERNATE_LENGTH
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      notes.droppedAlternate = true
      continue
    }
    if (out.length >= maxCount || entry.length > maxLength) {
      notes.droppedAlternate = true
      continue
    }
    out.push(entry)
  }
  return out
}

function readOptionalText(value: unknown, max: number, notes: WalkNotes): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string' && value.trim().length === 0) return undefined
  if (typeof value !== 'string') {
    notes.needsTeacher.push('A teacher note was not text and was not kept.')
    return undefined
  }
  if (value.length > max) {
    notes.needsTeacher.push('A teacher note was longer than allowed and was not cut off. Shorten it in the editor.')
  }
  return value
}

function readMultiplier(value: unknown, notes: WalkNotes): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_MULTIPLIER) {
    return value
  }
  notes.rejected.push('A score multiplier was not usable and was not replaced.')
  return undefined
}

function readValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 0 || value > MAX_TILE_VALUE) return null
  return value
}

function emptyCategory(categoryId: string, tileId: string): DraftCategory {
  return {
    order: 1,
    title: '',
    canonicalId: categoryId,
    clues: [emptyClue(1, '', categoryId, tileId)],
  }
}

function emptyClue(
  categoryOrder: number,
  categoryTitle: string,
  categoryId: string,
  tileId: string,
): DraftClue {
  return {
    categoryOrder,
    categoryTitle,
    clueOrder: 1,
    value: 0,
    valueAuthored: false,
    prompt: '',
    answer: '',
    alternates: [],
    categoryCanonicalId: categoryId,
    tileCanonicalId: tileId,
    provenance: { sheet: 'IMPORT', row: 2, a1Prompt: 'C' },
  }
}

function failClosedCopy(issues: readonly ImportIssue[]): { headline: string; detail: string } {
  const code = issues[0]?.code
  if (code === 'empty-input') {
    return { headline: 'The file is empty.', detail: 'Nothing was saved.' }
  }
  if (code === 'input-too-large') {
    return {
      headline: 'This file is too large to open.',
      detail: 'Nothing was saved, and it was not partially read.',
    }
  }
  if (code === 'invalid-json' || code === 'root-not-object') {
    return {
      headline: 'This file could not be read.',
      detail: 'It is not a Classroom Quiz Show game file. Nothing was saved.',
    }
  }
  if (code === 'unsupported-format' || code === 'missing-format') {
    return {
      headline: 'This file is not a Classroom Quiz Show game.',
      detail: 'Nothing was saved. Use Import spreadsheet for a spreadsheet.',
    }
  }
  if (
    code === 'unsupported-schema-version' ||
    code === 'missing-schema-version' ||
    code === 'invalid-schema-version'
  ) {
    return {
      headline: 'This file is from a version Classroom Quiz Show does not open.',
      detail: 'Nothing was saved, and the file was not converted.',
    }
  }
  return {
    headline: 'This file cannot be used safely.',
    detail: 'Nothing was saved. Classroom Quiz Show did not try to repair it.',
  }
}

function nonBlank(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.trim().length === 0) return null
  return value
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH && ID_PATTERN.test(value)
}

function takeSourceId(value: unknown, used: Set<string>): string | null {
  if (!isIdentifier(value) || used.has(value)) return null
  used.add(value)
  return value
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function noteUnknown(value: Record<string, unknown>, allowed: readonly string[], notes: WalkNotes): void {
  if (!onlyKeys(value, allowed)) notes.omittedUnknown = true
}

function labelText(value: string): string {
  let flat = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    flat += code < 32 || code === 127 ? ' ' : ch
  }
  flat = flat.replace(/\s+/g, ' ').trim()
  if (flat.length === 0) return 'blank text'
  if (flat.length <= 80) return flat
  return `${flat.slice(0, 79)}…`
}

function emptyDerived(): SalvageDerivedIdentity {
  return {
    game: false,
    boardRound: false,
    finalRound: false,
    categoryOrders: [],
    tileKeys: [],
    teamOrders: [],
  }
}
