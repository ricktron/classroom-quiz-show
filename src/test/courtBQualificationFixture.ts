/**
 * Court B qualification fixture (Court B triage CB-07).
 *
 * The Home demo game has no Final round, so a Court B brief that requires a Final
 * journey could never be exercised from ordinary demo content. This is the one
 * dedicated, Final-capable qualification Game a blind Court B tester imports
 * through ordinary Home UI (never by state injection). Synthetic text only: no
 * school, class or student content.
 *
 * Test support only. The application never imports this module, so it cannot
 * reach the production bundle.
 *
 * The committed, human-usable copies live beside the brief:
 *   docs/qualification/fixtures/court-b-final-qualification.game.json
 *   docs/qualification/fixtures/court-b-final-qualification.xlsx
 * A freshness test proves both still equal this definition.
 */

export const COURT_B_FIXTURE_TITLE = 'Court B Final Qualification'
export const COURT_B_FIXTURE_TEAMS = ['Team Granite', 'Team Nimbus'] as const
export const COURT_B_FIXTURE_RESPONSE_SECONDS = 30

export interface CourtBFixtureTile {
  readonly value: number
  readonly prompt: string
  readonly answer: string
  readonly alternate?: string
  readonly notes?: string
}

export interface CourtBFixtureCategory {
  readonly title: string
  readonly tiles: readonly CourtBFixtureTile[]
}

export const COURT_B_FIXTURE_CATEGORIES: readonly CourtBFixtureCategory[] = [
  {
    title: 'Rocks',
    tiles: [
      {
        value: 100,
        prompt: 'Synthetic prompt R1: which rock type forms from cooled magma?',
        answer: 'Igneous',
        alternate: 'Igneous rock',
        notes: 'Host-only note R1: never projected.',
      },
      { value: 200, prompt: 'Synthetic prompt R2: which rock type forms from compacted layers?', answer: 'Sedimentary' },
    ],
  },
  {
    title: 'Skies',
    tiles: [
      { value: 100, prompt: 'Synthetic prompt S1: what is water falling from clouds called?', answer: 'Precipitation', alternate: 'Rain' },
      { value: 200, prompt: 'Synthetic prompt S2: which instrument measures air pressure?', answer: 'Barometer' },
    ],
  },
]

export const COURT_B_FIXTURE_FINAL = {
  title: 'Final Wager',
  prompt: 'Synthetic Final prompt: name the process that moves heat through the mantle.',
  answer: 'Mantle convection',
  alternate: 'Convection',
  notes: 'Host-only Final note: never projected.',
} as const

/** Canonical game file (Home → Import Game → Game file text → Import file text). */
export function courtBFixtureGameFile(): Record<string, unknown> {
  return {
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'court-b-final-qualification',
    title: COURT_B_FIXTURE_TITLE,
    teams: COURT_B_FIXTURE_TEAMS.map((name, index) => ({
      id: index === 0 ? 'granite' : 'nimbus',
      name,
      accent: index === 0 ? 'crimson' : 'azure',
    })),
    timer: { responseSeconds: COURT_B_FIXTURE_RESPONSE_SECONDS },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: COURT_B_FIXTURE_TITLE, // the workbook's board round takes the game title
        config: {
          categories: COURT_B_FIXTURE_CATEGORIES.map((category, c) => ({
            id: `category-${c + 1}`,
            title: category.title,
            tiles: category.tiles.map((tile) => ({
              id: `category-${c + 1}-${tile.value}`,
              value: tile.value,
              prompt: tile.prompt,
              answer: tile.answer,
              ...(tile.alternate ? { alternates: [tile.alternate] } : {}),
              ...(tile.notes ? { notes: tile.notes } : {}),
            })),
          })),
        },
      },
      {
        id: 'final-round',
        type: 'final-wager',
        title: COURT_B_FIXTURE_FINAL.title,
        config: {
          prompt: COURT_B_FIXTURE_FINAL.prompt,
          answer: COURT_B_FIXTURE_FINAL.answer,
          alternates: [COURT_B_FIXTURE_FINAL.alternate],
          notes: COURT_B_FIXTURE_FINAL.notes,
        },
      },
    ],
  }
}

/** Rows for the Board + Final workbook sheets (header row first). */
export function courtBFixtureWorkbookRows(): {
  readonly gameRow: readonly unknown[]
  readonly clueRows: readonly (readonly unknown[])[]
  readonly finalRow: readonly unknown[]
} {
  const clueRows: unknown[][] = []
  COURT_B_FIXTURE_CATEGORIES.forEach((category, c) => {
    category.tiles.forEach((tile, t) => {
      clueRows.push([
        c + 1,
        category.title,
        t + 1,
        tile.value,
        tile.prompt,
        tile.answer,
        tile.alternate ?? '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        tile.notes ?? '',
        1,
      ])
    })
  })
  return {
    gameRow: [
      COURT_B_FIXTURE_TITLE,
      'court-b-final-qualification',
      COURT_B_FIXTURE_RESPONSE_SECONDS,
      ...COURT_B_FIXTURE_TEAMS,
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    clueRows,
    finalRow: [
      COURT_B_FIXTURE_FINAL.prompt,
      COURT_B_FIXTURE_FINAL.answer,
      COURT_B_FIXTURE_FINAL.alternate,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      COURT_B_FIXTURE_FINAL.notes,
      COURT_B_FIXTURE_FINAL.title,
    ],
  }
}

/**
 * Journeys a blind Court B run must be able to reach from this fixture through
 * ordinary UI. Each id MUST appear in the brief's journey table and as a test
 * title in tests/e2e/court-b-fixture-reachability.spec.ts (enforced by the
 * fixture freshness test). `requiresFinal` journeys force a Final-capable fixture.
 */
export const COURT_B_JOURNEYS = [
  { id: 'CBJ-01', title: 'Import the game file and reach Class Setup', requiresFinal: false },
  { id: 'CBJ-02', title: 'Import the filled spreadsheet and reach Class Setup', requiresFinal: false },
  { id: 'CBJ-03', title: 'Names, Display and Start Game', requiresFinal: false },
  { id: 'CBJ-04', title: 'Board clue: prompt, score, answer, Undo', requiresFinal: false },
  { id: 'CBJ-05', title: 'Final: wagers, question, responses, reveal, settlement, winner', requiresFinal: true },
  { id: 'CBJ-06', title: 'Final tie: tied-finish completion', requiresFinal: true },
  { id: 'CBJ-07', title: 'Host reload + Resume during the Final', requiresFinal: true },
  /*
    CBJ-08 starts from the committed portable pack
    (docs/qualification/fixtures/court-b-image-clue.cqs-pack), which is a
    Board-only game: see src/test/courtBImageClueFixture.ts for why an image
    clue cannot live in the shared fixture. `requiresFinal: false` is therefore
    correct AND load-bearing — marking it true would demand a Final from
    content that deliberately has none.
  */
  {
    id: 'CBJ-08',
    title: "Image clue from a portable pack: the projector shows the pack's image",
    requiresFinal: false,
  },
  {
    id: 'CBJ-09',
    title: 'Final response window runs out, then settlement and Undo still work',
    requiresFinal: true,
  },
  {
    id: 'CBJ-10',
    title: 'Simulated Sony receiver: supported profile connects, wrong device refused',
    requiresFinal: false,
  },
] as const
