/**
 * Untrusted workbook bytes → non-playable AuthoringDraft (Slice 20).
 *
 * Pipeline: filename → ZIP preflight → SheetJS adapt → CQS workbook contract →
 * draft. Never produces GameDefinition and never touches session state.
 */

import {
  AUTHORING_DRAFT_VERSION,
  CLUE_HEADERS,
  CLUES_SHEET,
  FINAL_HEADERS,
  FINAL_SHEET,
  GAME_HEADERS,
  GAME_SHEET,
  INSTRUCTIONS_SHEET,
  META_KEYS,
  META_SHEET,
  UNSUPPORTED_MEDIA_HEADERS,
  WORKBOOK_FORMAT,
  WORKBOOK_FORMAT_VERSION,
  isWorkbookProfile,
  sheetsForProfile,
  type WorkbookProfile,
} from './contract'
import { revalidateDraft } from './validateDraft'
import {
  deriveBoardRoundId,
  deriveCategoryId,
  deriveFinalRoundId,
  deriveGameCanonicalId,
  deriveTeamId,
  deriveTileId,
} from './ids'
import { authoringIssue, columnLetter, type AuthoringIssue } from './issues'
import {
  MAX_ALTERNATES,
  MAX_CLUE_ROWS,
  MAX_FINAL_SEMANTIC_DATA_ROWS,
  MAX_GAME_SEMANTIC_DATA_ROWS,
  MAX_RESPONSE_SECONDS,
  MAX_TEAMS,
  MAX_TOTAL_AUTHORED_TEXT,
  MIN_RESPONSE_SECONDS,
} from './limits'
import { preflightWorkbookBytes } from './preflight'
import { adaptSheetJsWorkbook, type RawCell, type RawSheet, type RawWorkbook } from './sheetjsAdapter'
import type {
  AuthoringDraft,
  DraftCategory,
  DraftClue,
  DraftFinal,
  DraftTeam,
  ParseWorkbookResult,
} from './types'

const KNOWN_SYSTEM_SHEETS = new Set<string>([
  META_SHEET,
  INSTRUCTIONS_SHEET,
  GAME_SHEET,
  CLUES_SHEET,
  FINAL_SHEET,
])

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) return true
  }
  return false
}

function cellText(cell: RawCell | undefined): string | null {
  if (!cell || cell.kind === 'empty') return null
  if (cell.kind === 'formula') return null
  if (cell.kind === 'error') return null
  if (cell.kind === 'boolean') return cell.boolean ? 'TRUE' : 'FALSE'
  if (cell.kind === 'number') {
    return Number.isFinite(cell.number) ? String(cell.number) : null
  }
  return cell.text ?? null
}

function requireLiteralString(
  cell: RawCell | undefined,
  sheet: string,
  field: string,
  issues: AuthoringIssue[],
  required: boolean,
): string | undefined {
  if (!cell || cell.kind === 'empty') {
    if (required) {
      issues.push(
        authoringIssue('required-value-missing', 'blocker', 'cell', `${field} is required.`, {
          sheet,
          row: cell?.row,
          column: cell ? columnLetter(cell.col) : undefined,
          a1: cell?.a1,
          field,
        }),
      )
    }
    return undefined
  }
  if (cell.kind === 'formula') {
    issues.push(
      authoringIssue(
        'formula-not-allowed',
        'blocker',
        'cell',
        `${field} must be a literal value, not a formula (cached values are ignored).`,
        {
          sheet,
          row: cell.row,
          column: columnLetter(cell.col),
          a1: cell.a1,
          field,
        },
      ),
    )
    return undefined
  }
  if (cell.kind === 'error') {
    issues.push(
      authoringIssue('excel-error-cell', 'blocker', 'cell', `${field} contains an Excel error.`, {
        sheet,
        row: cell.row,
        column: columnLetter(cell.col),
        a1: cell.a1,
        field,
      }),
    )
    return undefined
  }
  if (cell.kind === 'boolean') {
    issues.push(
      authoringIssue(
        'invalid-type',
        'blocker',
        'cell',
        `${field} must be text, not a boolean.`,
        { sheet, row: cell.row, column: columnLetter(cell.col), a1: cell.a1, field },
      ),
    )
    return undefined
  }
  const text = cell.kind === 'number' ? String(cell.number) : (cell.text ?? '')
  if (hasControlChars(text)) {
    issues.push(
      authoringIssue(
        'control-characters',
        'blocker',
        'cell',
        `${field} contains disallowed control characters.`,
        { sheet, row: cell.row, column: columnLetter(cell.col), a1: cell.a1, field },
      ),
    )
    return undefined
  }
  if (required && text.trim().length === 0) {
    issues.push(
      authoringIssue(
        'whitespace-only',
        'blocker',
        'cell',
        `${field} must not be blank or whitespace-only.`,
        { sheet, row: cell.row, column: columnLetter(cell.col), a1: cell.a1, field },
      ),
    )
    return undefined
  }
  return text
}

function requireNumber(
  cell: RawCell | undefined,
  sheet: string,
  field: string,
  issues: AuthoringIssue[],
  required: boolean,
): number | undefined {
  if (!cell || cell.kind === 'empty') {
    if (required) {
      issues.push(
        authoringIssue('required-value-missing', 'blocker', 'cell', `${field} is required.`, {
          sheet,
          field,
          a1: cell?.a1,
          row: cell?.row,
        }),
      )
    }
    return undefined
  }
  if (cell.kind === 'formula') {
    issues.push(
      authoringIssue(
        'formula-not-allowed',
        'blocker',
        'cell',
        `${field} must be a literal number, not a formula.`,
        { sheet, row: cell.row, column: columnLetter(cell.col), a1: cell.a1, field },
      ),
    )
    return undefined
  }
  if (cell.kind === 'error') {
    issues.push(
      authoringIssue('excel-error-cell', 'blocker', 'cell', `${field} contains an Excel error.`, {
        sheet,
        row: cell.row,
        a1: cell.a1,
        field,
      }),
    )
    return undefined
  }
  if (cell.kind === 'boolean') {
    issues.push(
      authoringIssue('invalid-type', 'blocker', 'cell', `${field} must be a number, not a boolean.`, {
        sheet,
        row: cell.row,
        a1: cell.a1,
        field,
      }),
    )
    return undefined
  }
  if (cell.kind === 'number') {
    return cell.number
  }
  const text = (cell.text ?? '').trim()
  if (text.length === 0) {
    if (required) {
      issues.push(
        authoringIssue('required-value-missing', 'blocker', 'cell', `${field} is required.`, {
          sheet,
          row: cell.row,
          a1: cell.a1,
          field,
        }),
      )
    }
    return undefined
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    issues.push(
      authoringIssue('invalid-type', 'blocker', 'cell', `${field} must be a number.`, {
        sheet,
        row: cell.row,
        a1: cell.a1,
        field,
      }),
    )
    return undefined
  }
  return Number(text)
}

interface HeaderMap {
  readonly indexByHeader: ReadonlyMap<string, number>
  readonly headerRow: number
}

function mapHeaders(
  sheet: RawSheet,
  expected: readonly string[],
  issues: AuthoringIssue[],
  allowExtraKnown = false,
): HeaderMap | null {
  if (sheet.rows.length === 0) {
    issues.push(
      authoringIssue('missing-header', 'blocker', 'workbook', `Sheet ${sheet.name} has no header row.`, {
        sheet: sheet.name,
      }),
    )
    return null
  }

  const headerCells = sheet.rows[0]!
  const seen = new Map<string, number>()
  const unsupportedMedia = new Set<string>(UNSUPPORTED_MEDIA_HEADERS.map((h) => h.toLowerCase()))
  const expectedSet = new Set(expected)

  for (let c = 0; c < headerCells.length; c += 1) {
    const cell = headerCells[c]!
    if (cell.kind === 'empty') continue
    if (cell.kind === 'formula') {
      issues.push(
        authoringIssue(
          'formula-not-allowed',
          'blocker',
          'workbook',
          'Header cells must be literal text.',
          { sheet: sheet.name, row: cell.row, a1: cell.a1 },
        ),
      )
      continue
    }
    const label = (cellText(cell) ?? '').trim()
    if (label.length === 0) continue
    if (unsupportedMedia.has(label.toLowerCase())) {
      issues.push(
        authoringIssue(
          'unsupported-media-field',
          'blocker',
          'workbook',
          `Unsupported media header ${JSON.stringify(label)} in workbook format 1 (text-only).`,
          { sheet: sheet.name, row: cell.row, column: columnLetter(c), a1: cell.a1, field: label },
        ),
      )
      continue
    }
    if (seen.has(label)) {
      issues.push(
        authoringIssue(
          'duplicate-header',
          'blocker',
          'workbook',
          `Duplicate header ${JSON.stringify(label)}.`,
          { sheet: sheet.name, row: cell.row, column: columnLetter(c), a1: cell.a1, field: label },
        ),
      )
      continue
    }
    if (!expectedSet.has(label) && !allowExtraKnown) {
      issues.push(
        authoringIssue(
          'unsupported-header',
          'blocker',
          'workbook',
          `Unsupported header ${JSON.stringify(label)}.`,
          { sheet: sheet.name, row: cell.row, column: columnLetter(c), a1: cell.a1, field: label },
        ),
      )
      continue
    }
    seen.set(label, c)
  }

  for (const required of expected) {
    // Team* and optional fields are still "expected" headers in the contract
    // template; only Title/GameKey etc. are required at the data layer.
    if (!seen.has(required)) {
      // Optional GAME/FINAL trailing fields may be absent if never authored —
      // require the core set per sheet below.
      void required
    }
  }

  return { indexByHeader: seen, headerRow: sheet.headerRow }
}

function requireHeaders(
  map: HeaderMap | null,
  required: readonly string[],
  sheet: string,
  issues: AuthoringIssue[],
): boolean {
  if (!map) return false
  let ok = true
  for (const name of required) {
    if (!map.indexByHeader.has(name)) {
      ok = false
      issues.push(
        authoringIssue(
          'missing-header',
          'blocker',
          'workbook',
          `Missing required header ${JSON.stringify(name)}.`,
          { sheet, field: name },
        ),
      )
    }
  }
  return ok
}

function cellAt(row: readonly RawCell[], map: HeaderMap, header: string): RawCell | undefined {
  const idx = map.indexByHeader.get(header)
  if (idx === undefined) return undefined
  return row[idx]
}

function parseMeta(
  workbook: RawWorkbook,
  issues: AuthoringIssue[],
): { profile: WorkbookProfile } | null {
  const matches = workbook.sheetNames.filter((n) => n === META_SHEET)
  if (matches.length === 0) {
    issues.push(
      authoringIssue('missing-metadata', 'blocker', 'workbook', 'Missing required sheet CQS_META.'),
    )
    return null
  }
  if (matches.length > 1 || workbook.sheetNames.filter((n) => n === META_SHEET).length !== 1) {
    // SheetNames is unique in Excel; still guard duplicate logical presence.
  }

  const sheet = workbook.sheets.get(META_SHEET)
  if (!sheet) {
    issues.push(
      authoringIssue('missing-metadata', 'blocker', 'workbook', 'Missing required sheet CQS_META.'),
    )
    return null
  }

  const values = new Map<string, { value: string; a1?: string; row?: number }>()
  for (const row of sheet.rows) {
    const keyCell = row[0]
    const valueCell = row[1]
    const key = (cellText(keyCell) ?? '').trim()
    if (!key || key.toLowerCase() === 'key') continue
    if (keyCell?.kind === 'formula' || valueCell?.kind === 'formula') {
      issues.push(
        authoringIssue(
          'formula-not-allowed',
          'blocker',
          'workbook',
          'CQS_META cells must be literal values.',
          { sheet: META_SHEET, a1: keyCell?.a1 ?? valueCell?.a1 },
        ),
      )
      continue
    }
    const value = (cellText(valueCell) ?? '').trim()
    if (values.has(key)) {
      issues.push(
        authoringIssue(
          'malformed-metadata',
          'blocker',
          'workbook',
          `Duplicate metadata key ${JSON.stringify(key)}.`,
          { sheet: META_SHEET, field: key, a1: keyCell?.a1 },
        ),
      )
      continue
    }
    values.set(key, { value, a1: valueCell?.a1, row: valueCell?.row })
  }

  const format = values.get(META_KEYS.format)?.value
  const versionRaw = values.get(META_KEYS.workbookFormatVersion)?.value
  const profileRaw = values.get(META_KEYS.profile)?.value

  if (format !== WORKBOOK_FORMAT) {
    issues.push(
      authoringIssue(
        'malformed-metadata',
        'blocker',
        'workbook',
        `CQS_META.format must be ${JSON.stringify(WORKBOOK_FORMAT)}.`,
        { sheet: META_SHEET, field: META_KEYS.format, a1: values.get(META_KEYS.format)?.a1 },
      ),
    )
    return null
  }

  const version = versionRaw === undefined ? NaN : Number(versionRaw)
  if (!Number.isInteger(version) || version !== WORKBOOK_FORMAT_VERSION) {
    issues.push(
      authoringIssue(
        'unsupported-workbook-version',
        'blocker',
        'workbook',
        `Unsupported workbookFormatVersion ${JSON.stringify(versionRaw)}. Supported: ${WORKBOOK_FORMAT_VERSION}.`,
        {
          sheet: META_SHEET,
          field: META_KEYS.workbookFormatVersion,
          a1: values.get(META_KEYS.workbookFormatVersion)?.a1,
        },
      ),
    )
    return null
  }

  if (!profileRaw || !isWorkbookProfile(profileRaw)) {
    issues.push(
      authoringIssue(
        'unsupported-profile',
        'blocker',
        'workbook',
        `Unsupported profile ${JSON.stringify(profileRaw)}.`,
        { sheet: META_SHEET, field: META_KEYS.profile, a1: values.get(META_KEYS.profile)?.a1 },
      ),
    )
    return null
  }

  return { profile: profileRaw }
}

function parseGameSheet(
  sheet: RawSheet,
  issues: AuthoringIssue[],
  profile: WorkbookProfile,
): {
  title: string
  gameKey: string
  responseSeconds?: number
  teams: DraftTeam[]
  gameCanonicalId: string
  boardRoundCanonicalId: string
} | null {
  const map = mapHeaders(sheet, GAME_HEADERS, issues)
  if (!requireHeaders(map, ['Title', 'GameKey'], sheet.name, issues) || !map) return null

  const dataRows = sheet.rows.slice(1).filter((row) => row.some((c) => c.kind !== 'empty'))
  if (dataRows.length === 0) {
    issues.push(
      authoringIssue('required-value-missing', 'blocker', 'cell', 'GAME sheet has no data row.', {
        sheet: GAME_SHEET,
      }),
    )
    return null
  }
  if (dataRows.length > MAX_GAME_SEMANTIC_DATA_ROWS) {
    const extra = dataRows[MAX_GAME_SEMANTIC_DATA_ROWS]!
    issues.push(
      authoringIssue(
        'ambiguous-semantic-rows',
        'blocker',
        'workbook',
        `GAME sheet must contain exactly ${MAX_GAME_SEMANTIC_DATA_ROWS} populated data row; found ${dataRows.length}.`,
        {
          sheet: GAME_SHEET,
          row: extra[0]?.row,
          a1: extra[0]?.a1,
        },
      ),
    )
    // Continue parsing the first row into a blocked draft for review; approval
    // remains fail-closed while this blocker is unresolved.
  }

  const row = dataRows[0]!
  const title = requireLiteralString(cellAt(row, map, 'Title'), GAME_SHEET, 'Title', issues, true)
  const gameKey = requireLiteralString(cellAt(row, map, 'GameKey'), GAME_SHEET, 'GameKey', issues, true)
  if (!title || !gameKey) return null

  const responseSeconds = requireNumber(
    cellAt(row, map, 'ResponseSeconds'),
    GAME_SHEET,
    'ResponseSeconds',
    issues,
    false,
  )
  if (responseSeconds !== undefined) {
    if (
      !Number.isInteger(responseSeconds) ||
      responseSeconds < MIN_RESPONSE_SECONDS ||
      responseSeconds > MAX_RESPONSE_SECONDS
    ) {
      issues.push(
        authoringIssue(
          'invalid-timer',
          'blocker',
          'cell',
          `ResponseSeconds must be an integer from ${MIN_RESPONSE_SECONDS} to ${MAX_RESPONSE_SECONDS}.`,
          { sheet: GAME_SHEET, field: 'ResponseSeconds', a1: cellAt(row, map, 'ResponseSeconds')?.a1 },
        ),
      )
    }
  }

  const gameCanonicalId = deriveGameCanonicalId(gameKey)
  if (!gameCanonicalId) {
    issues.push(
      authoringIssue(
        'identity-normalization-failed',
        'blocker',
        'cell',
        'GameKey could not be normalized into a valid canonical id.',
        { sheet: GAME_SHEET, field: 'GameKey', a1: cellAt(row, map, 'GameKey')?.a1 },
      ),
    )
    return null
  }

  const boardRoundCanonicalId = deriveBoardRoundId(gameCanonicalId)
  if (!boardRoundCanonicalId) {
    issues.push(
      authoringIssue(
        'identity-normalization-failed',
        'blocker',
        'draft',
        'Could not derive a valid board round id.',
        { sheet: GAME_SHEET, field: 'GameKey' },
      ),
    )
    return null
  }

  const teams: DraftTeam[] = []
  for (let i = 1; i <= MAX_TEAMS; i += 1) {
    const header = `Team${i}Name` as const
    const name = requireLiteralString(cellAt(row, map, header), GAME_SHEET, header, issues, false)
    if (name === undefined) continue
    if (name.trim().length === 0) continue
    const canonicalId = deriveTeamId(gameCanonicalId, i)
    if (!canonicalId) {
      issues.push(
        authoringIssue(
          'identity-normalization-failed',
          'blocker',
          'cell',
          `Could not derive team id for ${header}.`,
          { sheet: GAME_SHEET, field: header },
        ),
      )
      continue
    }
    teams.push({
      order: i,
      name: name.trim(),
      authoringKey: header,
      canonicalId,
    })
  }

  if (profile === 'board-plus-final' && teams.length === 0) {
    issues.push(
      authoringIssue(
        'required-value-missing',
        'blocker',
        'cell',
        'Board + Final workbooks require at least one team name (Team1Name).',
        { sheet: GAME_SHEET, field: 'Team1Name' },
      ),
    )
  }

  return {
    title: title.trim(),
    gameKey: gameKey.trim(),
    responseSeconds:
      responseSeconds !== undefined && Number.isInteger(responseSeconds)
        ? responseSeconds
        : undefined,
    teams,
    gameCanonicalId,
    boardRoundCanonicalId,
  }
}

function parseClues(
  sheet: RawSheet,
  issues: AuthoringIssue[],
  gameCanonicalId: string,
): DraftCategory[] {
  const map = mapHeaders(sheet, CLUE_HEADERS, issues)
  if (
    !requireHeaders(
      map,
      ['CategoryOrder', 'Category', 'ClueOrder', 'Value', 'Prompt', 'Answer'],
      sheet.name,
      issues,
    ) ||
    !map
  ) {
    return []
  }

  const dataRows = sheet.rows.slice(1)
  if (dataRows.length > MAX_CLUE_ROWS) {
    issues.push(
      authoringIssue(
        'resource-limit-exceeded',
        'blocker',
        'workbook',
        `CLUES sheet exceeds ${MAX_CLUE_ROWS} rows.`,
        { sheet: 'CLUES' },
      ),
    )
    return []
  }

  const clues: DraftClue[] = []
  const identityKeys = new Set<string>()

  for (const row of dataRows) {
    if (!row.some((c) => c.kind !== 'empty')) continue

    const categoryOrder = requireNumber(
      cellAt(row, map, 'CategoryOrder'),
      'CLUES',
      'CategoryOrder',
      issues,
      true,
    )
    const clueOrder = requireNumber(cellAt(row, map, 'ClueOrder'), 'CLUES', 'ClueOrder', issues, true)
    const value = requireNumber(cellAt(row, map, 'Value'), 'CLUES', 'Value', issues, true)
    const category = requireLiteralString(
      cellAt(row, map, 'Category'),
      'CLUES',
      'Category',
      issues,
      true,
    )
    const prompt = requireLiteralString(cellAt(row, map, 'Prompt'), 'CLUES', 'Prompt', issues, true)
    const answer = requireLiteralString(cellAt(row, map, 'Answer'), 'CLUES', 'Answer', issues, true)
    const notes = requireLiteralString(cellAt(row, map, 'Notes'), 'CLUES', 'Notes', issues, false)
    const multiplier = requireNumber(
      cellAt(row, map, 'Multiplier'),
      'CLUES',
      'Multiplier',
      issues,
      false,
    )

    const alternates: string[] = []
    for (let i = 1; i <= MAX_ALTERNATES; i += 1) {
      const alt = requireLiteralString(
        cellAt(row, map, `Alternate${i}`),
        'CLUES',
        `Alternate${i}`,
        issues,
        false,
      )
      if (alt !== undefined && alt.trim().length > 0) alternates.push(alt.trim())
    }

    if (
      categoryOrder === undefined ||
      clueOrder === undefined ||
      value === undefined ||
      !category ||
      !prompt ||
      !answer
    ) {
      continue
    }

    if (!Number.isInteger(categoryOrder) || categoryOrder < 1) {
      issues.push(
        authoringIssue(
          'invalid-ordering',
          'blocker',
          'cell',
          'CategoryOrder must be an integer ≥ 1.',
          {
            sheet: 'CLUES',
            row: row[0]?.row,
            a1: cellAt(row, map, 'CategoryOrder')?.a1,
            field: 'CategoryOrder',
          },
        ),
      )
      continue
    }
    if (!Number.isInteger(clueOrder) || clueOrder < 1) {
      issues.push(
        authoringIssue('invalid-ordering', 'blocker', 'cell', 'ClueOrder must be an integer ≥ 1.', {
          sheet: 'CLUES',
          row: row[0]?.row,
          a1: cellAt(row, map, 'ClueOrder')?.a1,
          field: 'ClueOrder',
        }),
      )
      continue
    }

    const categoryCanonicalId = deriveCategoryId(gameCanonicalId, categoryOrder)
    const tileCanonicalId = deriveTileId(gameCanonicalId, categoryOrder, clueOrder)
    if (!categoryCanonicalId || !tileCanonicalId) {
      issues.push(
        authoringIssue(
          'identity-normalization-failed',
          'blocker',
          'cell',
          'Could not derive stable category/tile ids for this clue row.',
          { sheet: 'CLUES', row: row[0]?.row, field: 'CategoryOrder' },
        ),
      )
      continue
    }

    const identity = `${categoryOrder}:${clueOrder}`
    if (identityKeys.has(identity)) {
      issues.push(
        authoringIssue(
          'duplicate-authoring-identity',
          'blocker',
          'cell',
          `Duplicate CategoryOrder/ClueOrder identity ${identity}.`,
          {
            sheet: 'CLUES',
            row: row[0]?.row,
            a1: cellAt(row, map, 'ClueOrder')?.a1,
            field: 'ClueOrder',
          },
        ),
      )
      continue
    }
    identityKeys.add(identity)

    const promptCell = cellAt(row, map, 'Prompt')
    clues.push({
      categoryOrder,
      categoryTitle: category.trim(),
      clueOrder,
      value,
      prompt: prompt.trim(),
      answer: answer.trim(),
      alternates,
      notes: notes?.trim() || undefined,
      multiplier,
      categoryCanonicalId,
      tileCanonicalId,
      provenance: {
        sheet: 'CLUES',
        row: promptCell?.row ?? row[0]?.row ?? 0,
        a1Prompt: promptCell?.a1 ?? '',
      },
    })
  }

  const byCategory = new Map<number, DraftCategory>()
  for (const clue of clues) {
    const existing = byCategory.get(clue.categoryOrder)
    if (!existing) {
      byCategory.set(clue.categoryOrder, {
        order: clue.categoryOrder,
        title: clue.categoryTitle,
        canonicalId: clue.categoryCanonicalId,
        clues: [clue],
      })
    } else {
      if (existing.title !== clue.categoryTitle) {
        issues.push(
          authoringIssue(
            'invalid-ordering',
            'blocker',
            'cell',
            `Category title mismatch for CategoryOrder ${clue.categoryOrder}.`,
            {
              sheet: 'CLUES',
              row: clue.provenance.row,
              a1: clue.provenance.a1Prompt,
              field: 'Category',
            },
          ),
        )
      }
      byCategory.set(clue.categoryOrder, {
        ...existing,
        clues: [...existing.clues, clue],
      })
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      ...cat,
      clues: [...cat.clues].sort((a, b) => a.clueOrder - b.clueOrder),
    }))
}

function parseFinal(
  sheet: RawSheet | undefined,
  issues: AuthoringIssue[],
  gameCanonicalId: string,
  required: boolean,
): DraftFinal | undefined {
  if (!sheet) {
    if (required) {
      issues.push(
        authoringIssue('missing-sheet', 'blocker', 'workbook', 'Missing required sheet FINAL.', {
          sheet: FINAL_SHEET,
        }),
      )
    }
    return undefined
  }

  const map = mapHeaders(sheet, FINAL_HEADERS, issues)
  if (!requireHeaders(map, ['Prompt', 'Answer'], sheet.name, issues) || !map) return undefined

  const dataRows = sheet.rows.slice(1).filter((row) => row.some((c) => c.kind !== 'empty'))
  if (dataRows.length === 0) {
    issues.push(
      authoringIssue('required-value-missing', 'blocker', 'cell', 'FINAL sheet has no data row.', {
        sheet: FINAL_SHEET,
      }),
    )
    return undefined
  }
  if (dataRows.length > MAX_FINAL_SEMANTIC_DATA_ROWS) {
    const extra = dataRows[MAX_FINAL_SEMANTIC_DATA_ROWS]!
    issues.push(
      authoringIssue(
        'ambiguous-semantic-rows',
        'blocker',
        'workbook',
        `FINAL sheet must contain exactly ${MAX_FINAL_SEMANTIC_DATA_ROWS} populated data row; found ${dataRows.length}.`,
        {
          sheet: FINAL_SHEET,
          row: extra[0]?.row,
          a1: extra[0]?.a1,
        },
      ),
    )
    // Continue parsing the first row into a blocked draft for review; approval
    // remains fail-closed while this blocker is unresolved.
  }

  const row = dataRows[0]!
  const prompt = requireLiteralString(cellAt(row, map, 'Prompt'), FINAL_SHEET, 'Prompt', issues, true)
  const answer = requireLiteralString(cellAt(row, map, 'Answer'), FINAL_SHEET, 'Answer', issues, true)
  const notes = requireLiteralString(cellAt(row, map, 'Notes'), FINAL_SHEET, 'Notes', issues, false)
  const roundTitle =
    requireLiteralString(
      cellAt(row, map, 'FinalRoundTitle'),
      FINAL_SHEET,
      'FinalRoundTitle',
      issues,
      false,
    )?.trim() || 'Final Wager'

  const alternates: string[] = []
  for (let i = 1; i <= MAX_ALTERNATES; i += 1) {
    const alt = requireLiteralString(
      cellAt(row, map, `Alternate${i}`),
      FINAL_SHEET,
      `Alternate${i}`,
      issues,
      false,
    )
    if (alt !== undefined && alt.trim().length > 0) alternates.push(alt.trim())
  }

  if (!prompt || !answer) return undefined

  const roundCanonicalId = deriveFinalRoundId(gameCanonicalId)
  if (!roundCanonicalId) {
    issues.push(
      authoringIssue(
        'identity-normalization-failed',
        'blocker',
        'draft',
        'Could not derive a valid Final round id.',
        { sheet: FINAL_SHEET },
      ),
    )
    return undefined
  }

  const promptCell = cellAt(row, map, 'Prompt')
  return {
    prompt: prompt.trim(),
    answer: answer.trim(),
    alternates,
    notes: notes?.trim() || undefined,
    roundTitle,
    roundCanonicalId,
    provenance: {
      sheet: FINAL_SHEET,
      row: promptCell?.row ?? row[0]?.row ?? 0,
      a1Prompt: promptCell?.a1 ?? '',
    },
  }
}

function enforceSheetPresence(
  workbook: RawWorkbook,
  profile: WorkbookProfile,
  issues: AuthoringIssue[],
): void {
  const required = sheetsForProfile(profile)
  const counts = new Map<string, number>()
  for (const name of workbook.sheetNames) {
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  for (const name of required) {
    if (!workbook.sheets.has(name)) {
      issues.push(
        authoringIssue('missing-sheet', 'blocker', 'workbook', `Missing required sheet ${name}.`, {
          sheet: name,
        }),
      )
    }
  }

  for (const [name, count] of counts) {
    if (count > 1) {
      issues.push(
        authoringIssue('duplicate-sheet', 'blocker', 'workbook', `Duplicate sheet ${name}.`, {
          sheet: name,
        }),
      )
    }
  }

  for (const name of workbook.sheetNames) {
    if (KNOWN_SYSTEM_SHEETS.has(name)) continue
    // Unknown sheets are ignored with an explicit warning — never treated as game content.
    issues.push(
      authoringIssue(
        'unknown-sheet-policy',
        'warning',
        'workbook',
        `Unknown sheet ${JSON.stringify(name)} is ignored and is not treated as game content.`,
        { sheet: name },
      ),
    )
  }

  for (const name of required) {
    if (name === META_SHEET) continue
    const sheet = workbook.sheets.get(name)
    if (sheet?.hidden) {
      issues.push(
        authoringIssue(
          'hidden-semantic-content',
          'blocker',
          'workbook',
          `Semantic sheet ${name} must not be hidden.`,
          { sheet: name },
        ),
      )
    }
  }
}

function checkInstructionsContradiction(
  workbook: RawWorkbook,
  profile: WorkbookProfile,
  issues: AuthoringIssue[],
): void {
  const sheet = workbook.sheets.get(INSTRUCTIONS_SHEET)
  if (!sheet) return
  const blob = sheet.rows
    .flat()
    .map((c) => cellText(c) ?? '')
    .join('\n')
  if (!blob.includes(`profile: ${profile}`) && !blob.includes(profile)) {
    issues.push(
      authoringIssue(
        'metadata-contradiction',
        'blocker',
        'workbook',
        'INSTRUCTIONS do not mention the authoritative CQS_META profile.',
        { sheet: INSTRUCTIONS_SHEET, field: 'profile' },
      ),
    )
  }
  if (!blob.includes(`workbookFormatVersion: ${WORKBOOK_FORMAT_VERSION}`) && !blob.includes('workbook format 1')) {
    issues.push(
      authoringIssue(
        'metadata-contradiction',
        'warning',
        'workbook',
        'INSTRUCTIONS should state workbook format 1 for model-neutral external authoring.',
        { sheet: INSTRUCTIONS_SHEET, field: 'workbookFormatVersion' },
      ),
    )
  }
}

function totalAuthoredText(draft: Omit<AuthoringDraft, 'contentFingerprint' | 'status' | 'issues'>): number {
  let total = draft.game.title.length + draft.game.gameKey.length
  for (const team of draft.game.teams) total += team.name.length
  for (const cat of draft.board.categories) {
    total += cat.title.length
    for (const clue of cat.clues) {
      total += clue.prompt.length + clue.answer.length + (clue.notes?.length ?? 0)
      for (const alt of clue.alternates) total += alt.length
    }
  }
  if (draft.final) {
    total +=
      draft.final.prompt.length +
      draft.final.answer.length +
      (draft.final.notes?.length ?? 0) +
      draft.final.roundTitle.length
    for (const alt of draft.final.alternates) total += alt.length
  }
  return total
}

export async function parseWorkbookBytes(
  bytes: Uint8Array,
  filename: string,
): Promise<ParseWorkbookResult> {
  const preflight = await preflightWorkbookBytes(bytes, filename)
  if (preflight.status === 'failure') return preflight

  const adapted = adaptSheetJsWorkbook(bytes)
  if (adapted.status === 'failure') return adapted

  const issues: AuthoringIssue[] = []
  const meta = parseMeta(adapted.workbook, issues)
  if (!meta) return { status: 'failure', issues }

  enforceSheetPresence(adapted.workbook, meta.profile, issues)
  checkInstructionsContradiction(adapted.workbook, meta.profile, issues)

  const gameSheet = adapted.workbook.sheets.get(GAME_SHEET)
  const cluesSheet = adapted.workbook.sheets.get(CLUES_SHEET)
  if (!gameSheet || !cluesSheet) {
    return { status: 'failure', issues }
  }

  const game = parseGameSheet(gameSheet, issues, meta.profile)
  if (!game) return { status: 'failure', issues }

  const categories = parseClues(cluesSheet, issues, game.gameCanonicalId)
  const final =
    meta.profile === 'board-plus-final'
      ? parseFinal(adapted.workbook.sheets.get(FINAL_SHEET), issues, game.gameCanonicalId, true)
      : undefined

  const draftBase = {
    version: AUTHORING_DRAFT_VERSION,
    profile: meta.profile,
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
    game: {
      title: game.title,
      gameKey: game.gameKey,
      gameCanonicalId: game.gameCanonicalId,
      responseSeconds: game.responseSeconds,
      boardRoundCanonicalId: game.boardRoundCanonicalId,
      boardRoundTitle: game.title,
      teams: game.teams,
    },
    board: { categories },
    final,
    provenance: {
      filename,
      workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
      profile: meta.profile,
      detectedSheets: adapted.workbook.sheetNames,
    },
  } as const

  if (totalAuthoredText(draftBase) > MAX_TOTAL_AUTHORED_TEXT) {
    issues.push(
      authoringIssue(
        'resource-limit-exceeded',
        'blocker',
        'workbook',
        `Total authored workbook text exceeds ${MAX_TOTAL_AUTHORED_TEXT} characters.`,
      ),
    )
  }

  const draft = revalidateDraft(
    {
      ...draftBase,
      status: 'blocked',
      issues: [],
      contentFingerprint: '',
    },
    issues,
  )

  return { status: 'success', draft }
}
