import { test, expect, type Page } from '@playwright/test'
import {
  importHomeJsonExpectSaved,
  playFromAuthoringToClassSetup,
  returnHomeFromAuthoring,
} from './helpers/menusQ2'
import { menusBoardGameJson, menusBoardPlusFinalGameJson } from './helpers/menusGameJson'

/**
 * UIX-O16: the editor told a teacher "This game has the required content and
 * can be played" for a complete board with an empty Final. The canonical import
 * boundary refuses that game, so Play led to a blank Host with no explanation.
 *
 * These are ordinary-teacher journeys through real controls on the production
 * build. They are browser evidence, not physical classroom qualification.
 */

test.describe.configure({ mode: 'serial' })

const validation = (page: Page) => page.getByTestId('authoring-validation')
const playButton = (page: Page) => page.getByRole('button', { name: /^play$/i })
const finalQuestion = (page: Page) => page.locator('#final-prompt')
const finalAnswer = (page: Page) => page.locator('#final-answer')

/** Console errors and uncaught exceptions seen during a journey. */
function watchRuntime(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  return problems
}

async function openNewGame(page: Page, title: string): Promise<void> {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await page.getByTestId('home-new-game').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await page.getByLabel(/game title/i).fill(title)
}

/** Author every board tile through the tile editor. Final is left untouched. */
async function fillEveryBoardTile(page: Page): Promise<void> {
  for (let guard = 0; guard < 40; guard += 1) {
    const incomplete = page.locator('.authoring-board__tile--incomplete')
    if ((await incomplete.count()) === 0) break
    await incomplete.first().click()
    await page.locator('#tile-prompt').fill(`O16 question ${guard + 1}`)
    await page.locator('#tile-answer').fill(`O16 answer ${guard + 1}`)
  }
  await expect(page.locator('.authoring-board__tile--incomplete')).toHaveCount(0)
}

async function saveExpectSaved(page: Page): Promise<void> {
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-save-status')).toContainText(/^saved$/i, {
    timeout: 20_000,
  })
}

async function expectFinalStillNeeds(page: Page, needs: RegExp): Promise<void> {
  await expect(validation(page)).toContainText(needs)
  await expect(validation(page)).not.toContainText(/can be played/i)
  await expect(playButton(page)).toBeDisabled()
}

test('Journeys A, B, C, E: incomplete Final is named, partial Final stays blocked, complete Final reaches Host', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const runtime = watchRuntime(page)

  // Journey A: a new Board + Final game with a complete board and an untouched Final.
  await openNewGame(page, 'O16 Readiness Game')
  await fillEveryBoardTile(page)
  await expectFinalStillNeeds(page, /final still needs a question and an answer/i)
  await expect(validation(page)).toContainText(/save and come back/i)
  await expect(finalQuestion(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(finalAnswer(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('final-prompt-help')).toContainText(/final needs a question/i)
  await expect(page.getByTestId('final-answer-help')).toContainText(/final needs an answer/i)

  // The teacher can still save the unfinished draft; saved is not playable.
  await saveExpectSaved(page)
  await expectFinalStillNeeds(page, /final still needs a question and an answer/i)

  // Journey B, partial Final: question only, then answer only. Keyboard reaches both fields.
  await finalQuestion(page).focus()
  await page.keyboard.type('O16 final question')
  await expectFinalStillNeeds(page, /final still needs an answer/i)
  await expect(page.getByTestId('final-prompt-help')).toHaveCount(0)
  await expect(page.getByTestId('final-answer-help')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(finalAnswer(page)).toBeFocused()

  await finalQuestion(page).fill('')
  await finalAnswer(page).fill('O16 final answer')
  await expectFinalStillNeeds(page, /final still needs a question/i)
  await expect(page.getByTestId('final-prompt-help')).toBeVisible()
  await expect(page.getByTestId('final-answer-help')).toHaveCount(0)

  // Whitespace is not content.
  await finalQuestion(page).fill('   ')
  await expectFinalStillNeeds(page, /final still needs a question/i)

  // Journey C: correction clears the Final blockers and the normal path opens.
  await finalQuestion(page).fill('O16 final question')
  await expect(validation(page)).toContainText(/can be played/i)
  await expect(page.getByTestId('final-prompt-help')).toHaveCount(0)
  await expect(page.getByTestId('final-answer-help')).toHaveCount(0)
  await expect(finalQuestion(page)).not.toHaveAttribute('aria-invalid', 'true')
  await expect(finalAnswer(page)).not.toHaveAttribute('aria-invalid', 'true')

  // Removing valid content brings the blocker straight back: no stale success.
  await finalAnswer(page).fill('')
  await expectFinalStillNeeds(page, /final still needs an answer/i)
  await finalAnswer(page).fill('O16 final answer')
  await expect(validation(page)).toContainText(/can be played/i)

  // Journey E: the valid authored game reaches Host through the ordinary Play control.
  await saveExpectSaved(page)
  await playFromAuthoringToClassSetup(page)
  await expect(page.getByTestId('play-not-ready')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)

  expect(runtime).toEqual([])
})

test('Journey D: an incomplete Final saves as a draft, survives leaving and reload, then completes and plays', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const runtime = watchRuntime(page)

  await openNewGame(page, 'O16 Saved Draft')
  await fillEveryBoardTile(page)
  await finalQuestion(page).fill('O16 saved final question')
  await saveExpectSaved(page)
  await expectFinalStillNeeds(page, /final still needs an answer/i)

  // Navigate away. Home offers the editor, never a Play that cannot work.
  await returnHomeFromAuthoring(page)
  const unfinished = page.getByTestId('home-hero-unfinished')
  await expect(unfinished).toBeVisible()
  await expect(unfinished).toContainText('O16 Saved Draft')
  await expect(page.getByTestId('home-hero-play')).toHaveCount(0)

  // Reopen: authored content and readiness are exactly as they were left.
  await page.getByTestId('home-hero-edit').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByLabel(/game title/i)).toHaveValue('O16 Saved Draft')
  await expect(finalQuestion(page)).toHaveValue('O16 saved final question')
  await expect(finalAnswer(page)).toHaveValue('')
  await expect(page.locator('.authoring-board__tile--incomplete')).toHaveCount(0)
  await expectFinalStillNeeds(page, /final still needs an answer/i)

  // A full reload reads the same draft back from this device.
  await page.reload()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(finalQuestion(page)).toHaveValue('O16 saved final question')
  await expectFinalStillNeeds(page, /final still needs an answer/i)

  // Complete Final and proceed through the normal path.
  await finalAnswer(page).fill('O16 saved final answer')
  await expect(validation(page)).toContainText(/can be played/i)
  await saveExpectSaved(page)
  await playFromAuthoringToClassSetup(page)
  await expect(page.getByTestId('play-not-ready')).toHaveCount(0)

  expect(runtime).toEqual([])
})

test('Host recovery: Play with discarded edits explains the unfinished game and leads back to the editor', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const runtime = watchRuntime(page)

  // Everything authored in memory, nothing saved: the saved game is still unfinished.
  await openNewGame(page, 'O16 Discarded Edits')
  await fillEveryBoardTile(page)
  await finalQuestion(page).fill('O16 unsaved final question')
  await finalAnswer(page).fill('O16 unsaved final answer')
  await expect(validation(page)).toContainText(/can be played/i)

  await playButton(page).click()
  await page.getByRole('button', { name: /discard unsaved changes/i }).click()
  await expect(page).toHaveURL(/[?&]play=/)

  // Host says what is wrong and where to fix it, instead of a blank screen.
  const notice = page.getByTestId('play-not-ready')
  await expect(notice).toBeVisible({ timeout: 20_000 })
  await expect(notice).toContainText(/not ready to play yet/i)
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-change-game')).toBeVisible()

  // Recovery is one keyboard-reachable action back to the same game.
  await page.getByTestId('play-not-ready-edit').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByLabel(/game title/i)).toHaveValue('New Game')
  await expect(validation(page)).toContainText(/missing questions or answers/i)

  expect(runtime).toEqual([])
})

test('Journey F: imported Classic Board and Board + Final games stay ready and playable from the editor', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const runtime = watchRuntime(page)

  // Imported Board + Final: opens ready, with no Final diagnostics.
  await page.goto('./')
  await importHomeJsonExpectSaved(
    page,
    menusBoardPlusFinalGameJson({ id: 'o16-imported-final', title: 'O16 Imported Final' }),
  )
  await page.getByTestId('home-hero-edit').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByLabel(/game title/i)).toHaveValue('O16 Imported Final')
  await expect(validation(page)).toContainText(/can be played/i)
  await expect(page.getByTestId('final-prompt-help')).toHaveCount(0)
  await expect(page.getByTestId('final-answer-help')).toHaveCount(0)
  await expect(playButton(page)).toBeEnabled()

  // Emptying its Final answer blocks it; restoring the answer clears the blocker.
  const originalAnswer = await finalAnswer(page).inputValue()
  await finalAnswer(page).fill('')
  await expectFinalStillNeeds(page, /final still needs an answer/i)
  await finalAnswer(page).fill(originalAnswer)
  await expect(validation(page)).toContainText(/can be played/i)
  await saveExpectSaved(page)
  await returnHomeFromAuthoring(page)

  // Imported Classic Board: no Final section, no Final requirement, still playable.
  await importHomeJsonExpectSaved(
    page,
    menusBoardGameJson({ id: 'o16-imported-classic', title: 'O16 Imported Classic', teamCount: 2 }),
  )
  await page.getByTestId('home-hero-edit').click()
  await expect(page.getByRole('heading', { name: /edit game/i })).toBeVisible()
  await expect(page.getByLabel(/game title/i)).toHaveValue('O16 Imported Classic')
  await expect(page.getByRole('heading', { name: /^final$/i })).toHaveCount(0)
  await expect(validation(page)).toContainText(/can be played/i)
  await playFromAuthoringToClassSetup(page)
  await expect(page.getByTestId('play-not-ready')).toHaveCount(0)

  expect(runtime).toEqual([])
})
