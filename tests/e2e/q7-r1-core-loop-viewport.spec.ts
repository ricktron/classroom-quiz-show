import { test, expect, type Locator, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import { importMenusJsonAndPlay } from './helpers/menusGameJson'
import { expectAdvancedDiagnosticsUnused } from './helpers/menusQ3'

/**
 * Q7-R1 item 11 — core clue loop teacher-viewport discoverability (§9.1.1).
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-REPAIR-R1-CERTIFICATION-BLOCKERS-1
 *
 * Natural route: Home → Import demo game → Play → Class Setup names → Start
 * Game → Start Round 1 → board. At every step of the ordinary clue loop the
 * NEXT primary control (and, after a buzz, the active claim) must already sit
 * inside the teacher viewport — asserted BEFORE the control is clicked, with
 * no scrollIntoView / hover / focus on the asserted element (Playwright click
 * auto-scrolls, so the assertion must come first).
 *
 *   select tile → Show prompt → Arm clue (+ Start timer) → keyboard buzz →
 *   active claim + Mark incorrect / Mark correct (with the Host-only answer
 *   readable) → Show answer → Return to board
 *
 * Fail-first: on PR #143 head `50691af…` at 1280×720, Arm clue / Start timer
 * and the active claim + Mark correct / Mark incorrect rendered below the fold.
 *
 * Second test: a classic 6×5 board (the Classic Board template shape) — the
 * bottom-row tile must also be selectable without scrolling.
 *
 * Mobile-host (Pixel 5) is a scrolling phone posture and is out of scope for
 * this no-scroll claim. No Advanced diagnostics. Keyboard buzz only (no
 * hardware simulation, no physical Sony evidence).
 */

test.describe.configure({ mode: 'serial' })

/** Whole element inside the viewport, measured without scrolling. */
async function expectFullyInViewport(locator: Locator, step: string): Promise<void> {
  // Hard: the control must exist and be rendered at this step of the loop.
  await expect(locator, `${step}: control rendered`).toBeVisible()
  const page = locator.page()
  const viewport = page.viewportSize()
  const box = await locator.boundingBox()
  const tolerance = 1
  const inside =
    viewport !== null &&
    box !== null &&
    box.y >= -tolerance &&
    box.x >= -tolerance &&
    box.y + box.height <= viewport.height + tolerance &&
    box.x + box.width <= viewport.width + tolerance
  const scrollY = await page.evaluate(() => window.scrollY)
  // Soft: record every off-screen step in one run (fail-first evidence).
  // A product/auto scroll earlier in the loop would make later boxes lie.
  expect.soft(scrollY, `${step}: page still at the top (no scroll so far)`).toBe(0)
  expect
    .soft(
      inside,
      `${step}: must be fully inside the ${viewport?.width}×${viewport?.height} viewport ` +
        `without scrolling (box top=${box?.y.toFixed(0)} bottom=${
          box ? (box.y + box.height).toFixed(0) : '?'
        }, scrollY=${scrollY})`,
    )
    .toBe(true)
}

async function namesStartRoundOne(page: Page): Promise<void> {
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
}

const CLASSIC_CATEGORIES = [
  'Earth Structure',
  'Plate Tectonics',
  'Rocks & Minerals',
  'Weather & Climate',
  'Space Science',
  'Water Cycle',
] as const

/** Classic Board template shape: 6 categories × 5 clues (100–500). */
function classicBoardGameJson(): string {
  return JSON.stringify({
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: 'q7-r1-classic-6x5',
    title: 'Q7 R1 Classic Board',
    timer: { responseSeconds: 45 },
    teams: [
      { id: 'alpha', name: 'Alpha Rockets', accent: 'crimson' },
      { id: 'bravo', name: 'Bravo Comets', accent: 'azure' },
    ],
    rounds: [
      {
        id: 'classic-round',
        type: 'category-board',
        title: 'Classic Board',
        config: {
          categories: CLASSIC_CATEGORIES.map((title, c) => ({
            id: `cat-${c + 1}`,
            title,
            tiles: [100, 200, 300, 400, 500].map((value) => ({
              id: `cat-${c + 1}-${value}`,
              value,
              prompt: `${title} clue worth ${value}: which idea from today's lesson explains this observation?`,
              answer: `${title} answer ${value}`,
              alternates: [`${title} alt ${value}`],
              notes: `Teacher note for ${title} ${value}.`,
            })),
          })),
        },
      },
    ],
  })
}

function skipPhoneHost(projectName: string): void {
  test.skip(
    projectName === 'mobile-host',
    'Phone host is a scrolling posture; the no-scroll claim is for laptop/projector viewports.',
  )
}

test('Q7-R1-11: core clue loop next primary action stays in the teacher viewport', async ({
  page,
}, testInfo) => {
  skipPhoneHost(testInfo.project.name)
  test.slow()

  await importDemoAndPlay(page)
  await namesStartRoundOne(page)

  // 1. Board → select the long-prompt tile with notes + alternates (worst case).
  const tile = page.getByRole('button', { name: 'Earth Structure, 300 points' })
  await expectFullyInViewport(tile, 'board: tile Earth Structure 300')
  await tile.click()

  // 2. Selected → Show prompt on display.
  const showPrompt = page.getByRole('button', { name: 'Show prompt on display' })
  await expectFullyInViewport(showPrompt, 'selected: Show prompt on display')
  await showPrompt.click()
  await expect(page.getByTestId('cbh-public-stage')).toContainText(/the prompt/i)

  // 3. Prompt public → Arm clue (the one arming control) + timer controls.
  const arm = page.getByRole('button', { name: 'Arm clue', exact: true })
  await expectFullyInViewport(arm, 'prompt: Arm clue')
  const startTimer = page.getByRole('button', { name: 'Start timer' })
  await expectFullyInViewport(startTimer, 'prompt: Start timer')
  await arm.click()
  await expect(page.getByTestId('lih-armed')).toContainText('Armed')
  await page.getByLabel('Timer length').selectOption('120')
  await startTimer.click()
  await expect(page.getByTestId('rth-status')).toContainText(/Running/)

  // 4. Keyboard buzz (Team 1 then Team 2) → active claim + adjudication visible.
  await page.keyboard.press('Digit1')
  await page.keyboard.press('Digit2')
  const active = page.getByTestId('lih-active')
  await expect(active).toHaveText('Team 1')
  await expectFullyInViewport(active, 'buzz: active claim (Team 1)')
  await expectFullyInViewport(page.getByTestId('lih-waiting'), 'buzz: waiting queue (Team 2)')
  const markIncorrect = page.getByRole('button', { name: 'Mark incorrect and advance' })
  const markCorrect = page.getByRole('button', { name: 'Mark correct', exact: true })
  await expectFullyInViewport(markCorrect, 'buzz: Mark correct')
  await expectFullyInViewport(markIncorrect, 'buzz: Mark incorrect and advance')
  // The teacher adjudicates against the Host-only answer: it must be readable too.
  await expectFullyInViewport(page.getByTestId('cbh-answer'), 'buzz: Host-only correct answer')
  await markIncorrect.click()

  // 5. Advance → next active claim + Mark correct still in place.
  await expect(active).toHaveText('Team 2')
  await expectFullyInViewport(active, 'advance: active claim (Team 2)')
  await expectFullyInViewport(markCorrect, 'advance: Mark correct')
  await markCorrect.click()
  await expect(page.getByTestId('lih-board-outcome')).toContainText('Team 2 — Correct')
  await expectFullyInViewport(
    page.getByTestId('lih-board-outcome'),
    'correct: board adjudication outcome',
  )

  // 6. Show answer → Return to board.
  const showAnswer = page.getByRole('button', { name: 'Show answer on display' })
  await expectFullyInViewport(showAnswer, 'correct: Show answer on display')
  await showAnswer.click()
  const returnToBoard = page.getByRole('button', { name: 'Return to board', exact: true })
  await expectFullyInViewport(returnToBoard, 'answer: Return to board')
  await returnToBoard.click()

  // 7. Loop continues: next tile is reachable without scrolling.
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  await expect(page.getByRole('button', { name: /Earth Structure, 300 points, already used/ })).toBeDisabled()
  await expectFullyInViewport(
    page.getByRole('button', { name: 'Earth Structure, 100 points' }),
    'board again: next tile',
  )

  // The teacher never scrolled: every check above ran at the top of the page.
  expect(await page.evaluate(() => window.scrollY), 'teacher never scrolled').toBe(0)
  await expectAdvancedDiagnosticsUnused(page)
})

test('Q7-R1-11: classic 6×5 board — bottom-row tile through Return to board without scrolling', async ({
  page,
}, testInfo) => {
  skipPhoneHost(testInfo.project.name)
  test.slow()

  await importMenusJsonAndPlay(page, classicBoardGameJson())
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await namesStartRoundOne(page)

  const tile = page.getByRole('button', { name: 'Water Cycle, 500 points' })
  await expectFullyInViewport(tile, 'classic board: bottom-right tile Water Cycle 500')
  await tile.click()

  const showPrompt = page.getByRole('button', { name: 'Show prompt on display' })
  await expectFullyInViewport(showPrompt, 'classic selected: Show prompt on display')
  await showPrompt.click()

  const arm = page.getByRole('button', { name: 'Arm clue', exact: true })
  await expectFullyInViewport(arm, 'classic prompt: Arm clue')
  await arm.click()
  await expect(page.getByTestId('lih-armed')).toContainText('Armed')

  await page.keyboard.press('Digit2')
  const active = page.getByTestId('lih-active')
  await expect(active).toHaveText('Team 2')
  await expectFullyInViewport(active, 'classic buzz: active claim (Team 2)')
  const markCorrect = page.getByRole('button', { name: 'Mark correct', exact: true })
  await expectFullyInViewport(markCorrect, 'classic buzz: Mark correct')
  await expectFullyInViewport(page.getByTestId('cbh-answer'), 'classic buzz: Host-only correct answer')
  await markCorrect.click()
  await expect(page.getByTestId('lih-board-outcome')).toContainText('Team 2 — Correct')

  const showAnswer = page.getByRole('button', { name: 'Show answer on display' })
  await expectFullyInViewport(showAnswer, 'classic correct: Show answer on display')
  await showAnswer.click()
  const returnToBoard = page.getByRole('button', { name: 'Return to board', exact: true })
  await expectFullyInViewport(returnToBoard, 'classic answer: Return to board')
  await returnToBoard.click()

  await expect(page.getByRole('button', { name: /Water Cycle, 500 points, already used/ })).toBeDisabled()
  await expectFullyInViewport(
    page.getByRole('button', { name: 'Space Science, 500 points' }),
    'classic board again: next bottom-row tile',
  )
  expect(await page.evaluate(() => window.scrollY), 'teacher never scrolled').toBe(0)
  await expectAdvancedDiagnosticsUnused(page)
})
