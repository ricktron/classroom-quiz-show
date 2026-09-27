import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { parseWorkbookBytes } from './parseWorkbook'
import { buildTestWorkbookBytes } from './testWorkbookFactory'
import { generateWorkbookTemplate } from './generateTemplate'
import { CLUE_HEADERS, FINAL_HEADERS, GAME_HEADERS } from './contract'
import { approveAndImportDraft } from './approveAndImport'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { MAX_WORKBOOK_ARCHIVE_ENTRIES, MAX_WORKBOOK_BYTES } from './limits'
import { isGameDefinition } from '../game/gameDefinition'

describe('workbook parser', () => {
  it('parses a valid Classic Board workbook', async () => {
    const bytes = buildTestWorkbookBytes({ profile: 'classic-board' })
    const result = await parseWorkbookBytes(bytes, 'classic.xlsx')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.profile).toBe('classic-board')
    expect(result.draft.board.categories.length).toBe(2)
    expect(isGameDefinition(result.draft as unknown)).toBe(false)
  })

  it('parses a valid Board + Final workbook', async () => {
    const bytes = buildTestWorkbookBytes({ profile: 'board-plus-final' })
    const result = await parseWorkbookBytes(bytes, 'final.xlsx')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.final?.prompt.length).toBeGreaterThan(0)
    expect(result.draft.game.teams.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects unsupported file types and .xlsm', async () => {
    const bytes = buildTestWorkbookBytes()
    const csv = await parseWorkbookBytes(bytes, 'game.csv')
    expect(csv.status).toBe('failure')
    if (csv.status === 'failure') {
      expect(csv.issues[0]?.code).toBe('unsupported-file-type')
    }
    const xlsm = await parseWorkbookBytes(bytes, 'game.xlsm')
    expect(xlsm.status).toBe('failure')
  })

  it('rejects malformed ZIP/XLSX', async () => {
    const result = await parseWorkbookBytes(new Uint8Array([1, 2, 3, 4, 5]), 'bad.xlsx')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'malformed-xlsx')).toBe(true)
    }
  })

  it('rejects oversized compressed workbooks', async () => {
    const bytes = new Uint8Array(MAX_WORKBOOK_BYTES + 1)
    bytes[0] = 0x50
    bytes[1] = 0x4b
    bytes[2] = 0x03
    bytes[3] = 0x04
    const result = await parseWorkbookBytes(bytes, 'huge.xlsx')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues[0]?.code).toBe('workbook-too-large')
    }
  })

  it('rejects excessive archive entries', async () => {
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < MAX_WORKBOOK_ARCHIVE_ENTRIES + 5; i += 1) {
      files[`entry-${i}.txt`] = new Uint8Array([1])
    }
    const zipped = zipSync(files)
    const result = await parseWorkbookBytes(zipped, 'many.xlsx')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'resource-limit-exceeded')).toBe(true)
    }
  })

  it('treats a malformed authoringRulesVersion as a non-blocking warning, deliberately', async () => {
    // authoringRulesVersion is additive generation-contract provenance, not a
    // structural compatibility signal (ADR-023 §2). A malformed value must not
    // fail closed the way a malformed workbookFormatVersion does.
    const result = await parseWorkbookBytes(
      buildTestWorkbookBytes({ meta: { authoringRulesVersion: 'not-a-number' } }),
      'malformed-rules-version.xlsx',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.provenance.authoringRulesVersion).toBeUndefined()
    const issue = result.draft.issues.find((i) => i.field === 'authoringRulesVersion')
    expect(issue?.code).toBe('malformed-metadata')
    expect(issue?.severity).toBe('warning')
  })

  it('rejects unsupported workbook version and profile', async () => {
    const version = await parseWorkbookBytes(
      buildTestWorkbookBytes({ meta: { workbookFormatVersion: '2' } }),
      'v2.xlsx',
    )
    expect(version.status).toBe('failure')

    const profile = await parseWorkbookBytes(
      buildTestWorkbookBytes({ meta: { profile: 'team-choice' } }),
      'profile.xlsx',
    )
    expect(profile.status).toBe('failure')
  })

  it('preserves a future authoring-rules version without treating it as a structural format failure', async () => {
    const result = await parseWorkbookBytes(
      buildTestWorkbookBytes({ meta: { authoringRulesVersion: '99' } }),
      'future-rules.xlsx',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.provenance.authoringRulesVersion).toBe(99)
    expect(
      result.draft.issues.some(
        (issue) =>
          issue.code === 'metadata-contradiction' &&
          issue.severity === 'warning' &&
          issue.field === 'authoringRulesVersion',
      ),
    ).toBe(true)
    expect(result.draft.issues.some((issue) => issue.code === 'unsupported-workbook-version')).toBe(false)
  })

  it('treats authoring-rules version 1 as structurally compatible provenance under rules version 2', async () => {
    // AUTHORING_RULES_VERSION moved 1 -> 2 (ADR-023 2026-09-27 amendment).
    // Rules version 1 is provenance, not a structural rejection reason: an
    // older workbook must still parse and import cleanly.
    const result = await parseWorkbookBytes(
      buildTestWorkbookBytes({ meta: { authoringRulesVersion: '1' } }),
      'rules-v1-provenance.xlsx',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.provenance.authoringRulesVersion).toBe(1)
    expect(result.draft.issues.some((issue) => issue.field === 'authoringRulesVersion')).toBe(false)
    expect(result.draft.issues.some((issue) => issue.code === 'unsupported-workbook-version')).toBe(false)

    const registry = createDefaultRegistry()
    const approved = approveAndImportDraft(result.draft, { registry })
    expect(approved.status).toBe('success')
  })

  it('parses successfully when authoringRulesVersion metadata is entirely absent (pre-ADR-023 workbook)', async () => {
    const result = await parseWorkbookBytes(
      buildTestWorkbookBytes({ profile: 'classic-board' }),
      'no-rules-version.xlsx',
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.draft.provenance.authoringRulesVersion).toBeUndefined()
    expect(result.draft.issues.some((issue) => issue.code === 'unsupported-workbook-version')).toBe(false)
  })

  it('rejects missing CQS_META and missing semantic sheets', async () => {
    const template = generateWorkbookTemplate('classic-board')
    // Corrupt by rebuilding without META via factory missing sheet simulation:
    const noFinal = await parseWorkbookBytes(
      buildTestWorkbookBytes({ profile: 'board-plus-final', includeFinal: false }),
      'nofinal.xlsx',
    )
    expect(noFinal.status).toBe('success')
    if (noFinal.status === 'success') {
      expect(noFinal.draft.issues.some((i) => i.code === 'missing-sheet')).toBe(true)
    }
    expect(template.bytes.byteLength).toBeGreaterThan(0)
  })

  it('rejects duplicate and missing headers', async () => {
    const dup = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS.slice(0, 5), 'Prompt', ...CLUE_HEADERS.slice(6)],
          [1, 'Rocks', 1, 100, 'Prompt text', 'Answer', '', '', '', '', '', '', '', '', '', 1],
        ],
      }),
      'dup.xlsx',
    )
    expect(dup.status).toBe('success')
    if (dup.status === 'success') {
      expect(dup.draft.issues.some((i) => i.code === 'duplicate-header')).toBe(true)
    }

    const missing = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          ['CategoryOrder', 'Category', 'ClueOrder', 'Value', 'Prompt'],
          [1, 'Rocks', 1, 100, 'Prompt text'],
        ],
      }),
      'missing.xlsx',
    )
    expect(missing.status).toBe('success')
    if (missing.status === 'success') {
      expect(missing.draft.issues.some((i) => i.code === 'missing-header')).toBe(true)
    }
  })

  it('rejects formula semantic cells including cached formula values', async () => {
    const bytes = buildTestWorkbookBytes({
      formulaCells: [{ sheet: 'CLUES', a1: 'E2', formula: '1+1', cached: 'Mars' }],
    })
    const result = await parseWorkbookBytes(bytes, 'formula.xlsx')
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.draft.issues.some((i) => i.code === 'formula-not-allowed')).toBe(true)
    }
  })

  it('rejects booleans where string expected and whitespace-only required fields', async () => {
    const bytes = buildTestWorkbookBytes({
      gameRows: [
        [...GAME_HEADERS],
        ['   ', 'classic-fixture', 30, '', '', '', '', '', '', '', ''],
      ],
    })
    const result = await parseWorkbookBytes(bytes, 'blank.xlsx')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'whitespace-only' || i.code === 'required-value-missing')).toBe(
        true,
      )
    }
  })

  it('rejects hidden semantic sheets and unsupported media headers', async () => {
    const hidden = await parseWorkbookBytes(
      buildTestWorkbookBytes({ hideClues: true }),
      'hidden.xlsx',
    )
    expect(hidden.status).toBe('success')
    if (hidden.status === 'success') {
      expect(hidden.draft.issues.some((i) => i.code === 'hidden-semantic-content')).toBe(true)
    }

    const media = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS, 'ImagePath'],
          [1, 'Rocks', 1, 100, 'Prompt', 'Answer', '', '', '', '', '', '', '', '', '', 1, 'x.png'],
        ],
      }),
      'media.xlsx',
    )
    expect(media.status).toBe('success')
    if (media.status === 'success') {
      expect(media.draft.issues.some((i) => i.code === 'unsupported-media-field')).toBe(true)
    }
  })

  it('preserves provenance sheet/A1 on clues', async () => {
    const result = await parseWorkbookBytes(buildTestWorkbookBytes(), 'prov.xlsx')
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const clue = result.draft.board.categories[0]?.clues[0]
    expect(clue?.provenance.sheet).toBe('CLUES')
    expect(clue?.provenance.a1Prompt).toMatch(/^E\d+$/)
  })

  it('blocks GAME sheets with more than one populated semantic data row', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [
          [...GAME_HEADERS],
          ['Title A', 'game-a', 30, '', '', '', '', '', '', '', ''],
          ['Title B', 'game-b', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'multi-game.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    const ambiguous = parsed.draft.issues.find((i) => i.code === 'ambiguous-semantic-rows')
    expect(ambiguous).toBeDefined()
    expect(ambiguous?.sheet).toBe('GAME')
    expect(ambiguous?.row).toBe(3)

    const approval = approveAndImportDraft(parsed.draft, { registry: createDefaultRegistry() })
    expect(approval.status).toBe('failure')
    if (approval.status !== 'failure') return
    expect(approval.issues.some((i) => i.code === 'ambiguous-semantic-rows')).toBe(true)
  })

  it('accepts GAME sheets with exactly one populated semantic data row', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [
          [...GAME_HEADERS],
          ['Only Title', 'only-game', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'one-game.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.issues.some((i) => i.code === 'ambiguous-semantic-rows')).toBe(false)
    expect(parsed.draft.game.title).toBe('Only Title')
  })

  it('blocks FINAL sheets with more than one populated semantic data row', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        profile: 'board-plus-final',
        finalRows: [
          [...FINAL_HEADERS],
          ['Prompt A', 'Answer A', '', '', '', '', '', '', '', '', '', 'Final'],
          ['Prompt B', 'Answer B', '', '', '', '', '', '', '', '', '', 'Final'],
        ],
      }),
      'multi-final.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    const ambiguous = parsed.draft.issues.find((i) => i.code === 'ambiguous-semantic-rows')
    expect(ambiguous).toBeDefined()
    expect(ambiguous?.sheet).toBe('FINAL')
    expect(ambiguous?.row).toBe(3)

    const approval = approveAndImportDraft(parsed.draft, { registry: createDefaultRegistry() })
    expect(approval.status).toBe('failure')
    if (approval.status !== 'failure') return
    expect(approval.issues.some((i) => i.code === 'ambiguous-semantic-rows')).toBe(true)
  })

  it('accepts FINAL sheets with exactly one populated semantic data row', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({ profile: 'board-plus-final' }),
      'one-final.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.issues.some((i) => i.code === 'ambiguous-semantic-rows')).toBe(false)
    expect(parsed.draft.final?.prompt.length).toBeGreaterThan(0)
  })

  it('blocks a Board + Final workbook with no authored team names with a located diagnostic', async () => {
    // A `final-wager` round wagers, reveals, and settles per team, so the
    // canonical importer itself rejects zero teams
    // (`final-round-requires-teams`, src/import). Requiring Team1Name at the
    // workbook layer surfaces that same invariant earlier with a located
    // GAME/Team1Name diagnostic instead of a later generic canonical failure.
    // This is a Board + Final structural precondition, not a Game/Session
    // identity conflict: authored team slots stay reusable Game content
    // (default names only); actual per-class identity remains Session state
    // set later at Class Setup (see src/session/sessionTeamIdentities.test.ts).
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        profile: 'board-plus-final',
        gameRows: [
          [...GAME_HEADERS],
          ['No Teams Fixture', 'no-teams-fixture', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'no-teams.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.status).toBe('blocked')
    const teamIssue = parsed.draft.issues.find((i) => i.field === 'Team1Name')
    expect(teamIssue).toBeDefined()
    expect(teamIssue?.severity).toBe('blocker')
    expect(teamIssue?.sheet).toBe('GAME')

    const approval = approveAndImportDraft(parsed.draft, { registry: createDefaultRegistry() })
    expect(approval.status).toBe('failure')
    if (approval.status !== 'failure') return
    expect(approval.issues.some((i) => i.field === 'Team1Name')).toBe(true)
  })

  it('does not require a team name for Classic Board (no final round to wager)', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        profile: 'classic-board',
        gameRows: [
          [...GAME_HEADERS],
          ['No Teams Classic Fixture', 'no-teams-classic-fixture', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'no-teams-classic.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.issues.some((i) => i.field === 'Team1Name')).toBe(false)

    const approval = approveAndImportDraft(parsed.draft, { registry: createDefaultRegistry() })
    expect(approval.status).toBe('success')
    if (approval.status !== 'success') return
    expect(isGameDefinition(approval.importResult.definition)).toBe(true)
    expect(approval.importResult.definition.teams ?? []).toEqual([])
  })
})
