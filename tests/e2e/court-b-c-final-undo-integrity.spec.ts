import { test, expect, type Page } from '@playwright/test'

/**
 * Court B repair C — Final Undo integrity (NEW-1 + CB-06b).
 *
 * NEW-1 (independently reproduced on beeacd33): the Final response window keeps
 * running after responses lock. When it expired after a team was settled, a
 * reversible "response time up" event sat on top of the Undo stack; undoing it
 * restored an already-past deadline that expired again at once, so ordinary
 * Undo could never reach the settlement. The same loop also blocked Undo deeper
 * in history when the window expired before settlement.
 *
 * CB-06b: after a Final settlement the score panel named it the last score
 * change but disabled "Undo last score change", saying the next undo was not a
 * score.
 *
 * The page clock is installed so the window expiry is deterministic (no sleeps,
 * no retries): fastForward fires exactly the expiry the Host arms.
 */

const GAME = JSON.stringify({
  format: 'classroom-quiz-show/game',
  schemaVersion: 1,
  id: 'court-b-c-final-undo',
  title: 'Court B Final Undo',
  timer: { responseSeconds: 30 },
  teams: [
    { id: 'alpha', name: 'Team Alpha', accent: 'crimson' },
    { id: 'bravo', name: 'Team Bravo', accent: 'azure' },
  ],
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Board',
      config: {
        categories: [
          {
            id: 'cat-a',
            title: 'Rocks',
            tiles: [
              { id: 'a-100', value: 100, prompt: 'Synthetic rocks prompt one', answer: 'Answer A1' },
              { id: 'a-200', value: 200, prompt: 'Synthetic rocks prompt two', answer: 'Answer A2' },
            ],
          },
          {
            id: 'cat-b',
            title: 'Skies',
            tiles: [
              { id: 'b-100', value: 100, prompt: 'Synthetic skies prompt one', answer: 'Answer B1' },
              { id: 'b-200', value: 200, prompt: 'Synthetic skies prompt two', answer: 'Answer B2' },
            ],
          },
        ],
      },
    },
    {
      id: 'final-round',
      type: 'final-wager',
      title: 'Final',
      config: { prompt: 'Synthetic final prompt', answer: 'Synthetic final answer' },
    },
  ],
})

const liveUndo = (page: Page) =>
  page.getByRole('group', { name: 'Live game actions' }).getByRole('button').first()
const scores = (page: Page) =>
  page.getByRole('region', { name: 'Teams & scoring' }).getByRole('list').first()
const finalPanel = (page: Page) => page.getByRole('region', { name: 'Final wager' })

/** Home import → Play → names → Start → Alpha +200, Bravo +100 → Final question live. */
async function reachFinalQuestion(page: Page) {
  await page.clock.install()
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('textbox', { name: 'Game file text' }).fill(GAME)
  await page.getByRole('button', { name: 'Import file text' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Alpha')
  await fields.nth(0).press('Enter')
  await fields.nth(1).fill('Bravo')
  await fields.nth(1).press('Enter')
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()

  for (const [tile, team] of [
    ['Rocks, 200 points', 'Alpha'],
    ['Skies, 100 points', 'Bravo'],
  ] as const) {
    await page.getByRole('button', { name: tile }).click()
    await page.getByRole('button', { name: 'Show prompt on display' }).click()
    await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
    await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
    await page.getByRole('button', { name: 'Show answer on display' }).click()
    await page.getByRole('button', { name: 'Return to board' }).click()
  }
  await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*100/)

  await page.getByRole('button', { name: 'Go to the Final' }).click()
  await page.getByRole('button', { name: 'Go to the Final now' }).click()
  await page.getByRole('button', { name: 'Begin Final' }).click()
  const wagers = page.getByRole('group', { name: 'Team wagers' })
  await wagers.getByRole('spinbutton', { name: 'Wager (0–200)' }).fill('50')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await wagers.getByRole('spinbutton', { name: 'Wager (0–100)' }).fill('100')
  await wagers.getByRole('button', { name: 'Save wager' }).first().click()
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()
  const responses = page.getByRole('group', { name: 'Team responses' })
  await responses.getByRole('button', { name: 'Answered (no wording)' }).first().click()
  await responses.getByRole('button', { name: 'Answered (no wording)' }).last().click()
  await expect(page.getByRole('button', { name: 'Lock all responses' })).toBeEnabled()
}

async function lockRevealAndJudgeBravo(page: Page, verdict: 'Correct' | 'Incorrect') {
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()
  await page.getByRole('button', { name: /^Reveal Bravo/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${verdict} \\(`) }).click()
}

/** Let the 30 s response window run out on the page clock. */
async function expireResponseWindow(page: Page) {
  await page.clock.fastForward('00:31')
}

for (const verdict of ['Correct', 'Incorrect'] as const) {
  test(`NEW-1: Final ${verdict} stays undoable after the response window expires`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', 'Final journey runs once (1080p)')
    await reachFinalQuestion(page)
    await lockRevealAndJudgeBravo(page, verdict)
    const settled = verdict === 'Correct' ? /Alpha\s*200\s*Bravo\s*200/ : /Alpha\s*200\s*Bravo\s*0/
    await expect(scores(page)).toHaveText(settled)
    await expect(liveUndo(page)).toHaveText(`Undo Final ${verdict.toLowerCase()} (Bravo)`)

    await expireResponseWindow(page)
    // The expiry must not bury the settlement.
    await expect(liveUndo(page)).toHaveText(`Undo Final ${verdict.toLowerCase()} (Bravo)`)

    await liveUndo(page).click()
    await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*100/)
    // Coherent and continuable: Bravo can be judged again, then the game completes.
    await expect(finalPanel(page).getByRole('button', { name: /^Correct \(/ })).toBeVisible()
    await finalPanel(page).getByRole('button', { name: /^Correct \(/ }).click()
    await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*200/)
    await page.getByRole('button', { name: /^Reveal Alpha/ }).click()
    await finalPanel(page).getByRole('button', { name: /^Correct \(/ }).click()
    await expect(scores(page)).toHaveText(/Alpha\s*250\s*Bravo\s*200/)
    await page.getByRole('button', { name: 'End the game session' }).click()
    await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
    await expect(page.getByRole('heading', { name: 'Session summary' })).toBeVisible()
  })
}

test('NEW-1: window expiring before settlement never traps Undo deeper in history', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final journey runs once (1080p)')
  await reachFinalQuestion(page)
  await expireResponseWindow(page)
  await expect(finalPanel(page)).toContainText('time up')
  await lockRevealAndJudgeBravo(page, 'Correct')

  const expected = [
    'Undo Final correct (Bravo)',
    'Undo reveal (Bravo)',
    'Undo show Final answer',
    'Undo lock responses',
  ]
  for (const label of expected) {
    await expect(liveUndo(page)).toHaveText(label)
    await liveUndo(page).click()
  }
  // Past the expiry: the next target is the teacher's own last response entry.
  await expect(liveUndo(page)).toHaveText(/^Undo saved response \(/)
  await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*100/)
})

test('NEW-1: settlement stays undoable across Host reload + Resume after expiry', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final journey runs once (1080p)')
  await reachFinalQuestion(page)
  await lockRevealAndJudgeBravo(page, 'Correct')
  await expireResponseWindow(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*200/)
  await expect(liveUndo(page)).toHaveText('Undo Final correct (Bravo)')
  await liveUndo(page).click()
  await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*100/)
})

test('CB-06b: a Final settlement is offered as the next score undo with truthful copy', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final journey runs once (1080p)')
  await reachFinalQuestion(page)
  await lockRevealAndJudgeBravo(page, 'Correct')
  const scoring = page.getByRole('region', { name: 'Teams & scoring' })
  await expect(scoring).toContainText('Last score change: Bravo +100 (Final, correct).')
  await expect(scoring).not.toContainText('something other than a score')
  const undoScore = scoring.getByRole('button', { name: 'Undo last score change' })
  await expect(undoScore).toBeEnabled()
  await undoScore.click()
  await expect(scores(page)).toHaveText(/Alpha\s*200\s*Bravo\s*100/)
  await expect(finalPanel(page).getByRole('button', { name: /^Correct \(/ })).toBeVisible()
})
