import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  COURT_B_IMAGE_ALT,
  COURT_B_IMAGE_AUTHORED_PATH,
  COURT_B_IMAGE_FIXTURE_TITLE,
  COURT_B_PACK_IMAGE_HEIGHT,
  COURT_B_PACK_IMAGE_WIDTH,
} from '../../src/test/courtBImageClueFixture'
import {
  UNSUPPORTED_HID_PRODUCT_ID,
  assertProductReadBoundary,
  assertWbuzzBoundaryInstalled,
  getHidSimSnapshot,
  installWbuzzHardwareSimulator,
} from './helpers/simulatedWbuzzHardware'

/**
 * Court B harness (CB-07): every journey named in
 * docs/qualification/COURT-B-BLACK-BOX-BRIEF.md is mechanically reachable from
 * the committed qualification fixture, starting at Home, through ordinary
 * visible controls (no state injection, no test ids, no diagnostics).
 *
 * Each test title carries its journey id in brackets; the fixture guard
 * (src/test/courtBQualificationFixture.test.ts) fails if a brief journey has no
 * test here.
 */

const FIXTURE_DIR = resolve(process.cwd(), 'docs/qualification/fixtures')
const GAME_FILE = resolve(FIXTURE_DIR, 'court-b-final-qualification.game.json')
const SPREADSHEET = resolve(FIXTURE_DIR, 'court-b-final-qualification.xlsx')
const IMAGE_CLUE_PACK = resolve(FIXTURE_DIR, 'court-b-image-clue.cqs-pack')
const TITLE = 'Court B Final Qualification'

/*
  CBJ-08 constants come from the fixture module rather than being restated, so
  the journey cannot drift from the committed pack it is asserting about. The
  colliding path and the two image sizes are the journey's discriminators; the
  vitest guard (src/test/courtBImageClueFixture.test.ts) proves the collision is
  still armed and the sizes still differ.
*/
const IMAGE_CLUE_TITLE = COURT_B_IMAGE_FIXTURE_TITLE
const IMAGE_CLUE_ALT = COURT_B_IMAGE_ALT
const COLLIDING_ASSET_PATH = COURT_B_IMAGE_AUTHORED_PATH
const PACK_IMAGE_WIDTH = COURT_B_PACK_IMAGE_WIDTH
const PACK_IMAGE_HEIGHT = COURT_B_PACK_IMAGE_HEIGHT

test.beforeEach(({ page }, info) => {
  void page
  test.skip(info.project.name !== 'desktop-1080p', 'journey reachability runs once (1080p)')
})

async function importGameFile(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('textbox', { name: 'Game file text' }).fill(readFileSync(GAME_FILE, 'utf8'))
  await page.getByRole('button', { name: 'Import file text' }).click()
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
}

async function playToClassSetup(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  await expect(page.getByRole('region', { name: 'Class setup' })).toBeVisible()
  await expect(page.getByText(TITLE).first()).toBeVisible()
}

async function namesDisplayStart(page: Page, context: BrowserContext): Promise<Page> {
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Granite')
  await fields.nth(0).press('Enter')
  await fields.nth(1).fill('Nimbus')
  await fields.nth(1).press('Enter')
  const popup = context.waitForEvent('page')
  await setup.getByRole('button', { name: 'Open display' }).first().click()
  const display = await popup
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({
    timeout: 20_000,
  })
  // The teacher goes back to the Host window (a real click focuses it; a
  // synthetic one does not, and a background headless page stalls rAF).
  await page.bringToFront()
  await page.getByRole('button', { name: 'Start Game' }).click()
  await expect(page.getByRole('button', { name: 'Start Round 1' })).toBeVisible()
  return display
}

/**
 * The Host says when the class session is durably saved ("Saving this class
 * session." while a write is in flight). A reload before that may lose the last
 * action, as it would for a teacher, so reload journeys wait for it first.
 */
async function waitUntilSavedOnThisDevice(page: Page) {
  await expect(
    page.getByText('This class session is saved on this device.', { exact: true }).first(),
  ).toBeAttached()
}

const scores = (page: Page) =>
  page.getByRole('region', { name: 'Teams & scoring' }).getByRole('list').first()

async function scoreTile(page: Page, tile: string, team: 'Granite' | 'Nimbus') {
  await page.getByRole('button', { name: tile }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${team}`) }).check()
  await page.getByRole('button', { name: new RegExp(`^full credit, .* to ${team}`) }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

/** Classic Final: a team with no points is not eligible and gets no wager field. */
async function toFinalWithWagers(page: Page, wagers: { granite: string; nimbus?: string }) {
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  const confirm = page.getByRole('button', { name: 'Go to the Final now' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()
  await page.getByRole('button', { name: 'Begin Final' }).click()
  const wagersGroup = page.getByRole('group', { name: 'Team wagers' })
  const inputs = wagersGroup.getByRole('spinbutton')
  await inputs.nth(0).fill(wagers.granite)
  await wagersGroup.getByRole('button', { name: 'Save wager' }).first().click()
  if (wagers.nimbus !== undefined) {
    await inputs.nth(1).fill(wagers.nimbus)
    await wagersGroup.getByRole('button', { name: 'Save wager' }).first().click()
  }
  await page.getByRole('button', { name: 'Lock all wagers' }).click()
}

async function finalQuestionToReveal(page: Page) {
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()
  const responses = page.getByRole('group', { name: 'Team responses' })
  const answered = responses.getByRole('button', { name: 'Answered (no wording)' })
  const eligible = await answered.count()
  await answered.first().click()
  if (eligible > 1) await answered.last().click()
  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()
}

async function revealAndJudge(page: Page, team: 'Granite' | 'Nimbus', verdict: 'Correct' | 'Incorrect') {
  await page.getByRole('button', { name: new RegExp(`^Reveal ${team}`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${verdict} \\(`) }).click()
}

test('[CBJ-01] Import the game file and reach Class Setup', async ({ page }) => {
  await importGameFile(page)
  await playToClassSetup(page)
})

test('[CBJ-02] Import the filled spreadsheet and reach Class Setup', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import spreadsheet' }).click()
  await (await chooser).setFiles(SPREADSHEET)
  await expect(page.getByRole('region', { name: 'Import quality' })).toContainText('accepted')
  await playToClassSetup(page)
  // The fixture's teams arrive from the spreadsheet. (That the spreadsheet carries
  // the same Final is proven by the vitest guard, which imports it in full.)
  await page.getByRole('region', { name: 'Class setup' }).getByRole('button', { name: /^Names/ }).click()
  await expect(page.getByRole('region', { name: 'Class setup' })).toContainText('Team Granite')
})

test('[CBJ-03] Names, Display and Start Game', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  // The typed names, not the fixture defaults, reach the Display.
  await expect(display.locator('body')).toContainText('Granite')
  await expect(display.locator('body')).toContainText('Nimbus')
  await expect(display.locator('body')).not.toContainText('Team Granite')
})

test('[CBJ-04] Board clue: prompt, score, answer, Undo', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await page.getByRole('button', { name: 'Rocks, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await expect(display.locator('body')).toContainText('Synthetic prompt R1')
  await expect(display.locator('body')).not.toContainText('never projected')
  await page.getByRole('radio', { name: /^Granite/ }).check()
  await page.getByRole('button', { name: /^full credit, .* to Granite/ }).click()
  await expect(scores(page)).toHaveText(/Granite\s*100\s*Nimbus\s*0/)
  await page.getByRole('button', { name: 'Undo last score change' }).click()
  await expect(scores(page)).toHaveText(/Granite\s*0\s*Nimbus\s*0/)
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await expect(display.locator('body')).toContainText('Igneous')
})

test('[CBJ-05] Final: wagers, question, responses, reveal, settlement, winner', async ({
  page,
  context,
}) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await toFinalWithWagers(page, { granite: '100', nimbus: '50' })
  await finalQuestionToReveal(page)
  await expect(display.locator('body')).toContainText('Mantle convection')
  await revealAndJudge(page, 'Nimbus', 'Correct')
  await revealAndJudge(page, 'Granite', 'Incorrect')
  await expect(scores(page)).toHaveText(/Granite\s*100\s*Nimbus\s*150/)
  await page.getByRole('button', { name: 'End the game session' }).click()
  await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
  await expect(display.locator('body')).toContainText(/WINNER/i)
  await expect(display.locator('body')).toContainText(/NIMBUS/i)
})

test('[CBJ-06] Final tie: tied-finish completion', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  const display = await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 100 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')
  await toFinalWithWagers(page, { granite: '0', nimbus: '0' })
  await finalQuestionToReveal(page)
  await revealAndJudge(page, 'Granite', 'Correct')
  await revealAndJudge(page, 'Nimbus', 'Correct')
  await page.getByRole('button', { name: 'Accept the tie' }).click()
  await page.getByRole('button', { name: /^Accept the tie and end the game/ }).click()
  await expect(display.locator('body')).toContainText(/a tie/i)
})

/**
 * CBJ-08: the image clue arrives in a portable pack, so the route runs through
 * the Host console's pack import under **More** — the only place the product
 * accepts a pack. Reached entirely by clicking from Home (Import Game → Play →
 * More → Choose pack file); no typed route, no test id, no state injection.
 * `<summary>` has no mapped ARIA role, so "More" is addressed by its visible
 * text, which is what a teacher clicks.
 */
async function importImageCluePack(page: Page) {
  const more = page.getByText('More', { exact: true }).first()
  if (!(await more.isVisible().catch(() => false))) {
    throw new Error('CBJ-08: the Host "More" disclosure was not visible')
  }
  if ((await page.getByLabel('Choose pack file').isVisible().catch(() => false)) === false) {
    await more.click()
  }
  await expect(page.getByLabel('Choose pack file')).toBeVisible()
  await page.getByLabel('Choose pack file').setInputFiles(IMAGE_CLUE_PACK)
  await expect(page.getByText(/pack import succeeded/i).first()).toBeVisible({ timeout: 30_000 })
}

/**
 * Every `src` any `<img>` on the projector has held since this call, in order.
 *
 * The defect CBJ-08 exists to catch is transient: the wrong image paints from
 * the hosted build asset and is then REPLACED by the pack blob, so a single
 * read after the fact sees the correct final state and the journey passes while
 * a class watched the wrong diagram. Recording every src instead of sampling
 * one is what makes the assertion honest. (The same single-read race is on
 * record as a test-trust gap in portable-packs.spec.ts, 2026-10-17.)
 *
 * This observes the projector's own DOM. It injects no product state and
 * changes no behaviour.
 */
async function recordProjectorImageSources(display: Page) {
  await display.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { __cqsCbj08Sources: string[] }).__cqsCbj08Sources = seen
    const record = () => {
      for (const img of document.querySelectorAll('img')) {
        const src = img.getAttribute('src')
        if (src !== null && src !== '' && !seen.includes(src)) seen.push(src)
      }
    }
    record()
    new MutationObserver(record).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src'],
    })
  })
}

async function projectorImageSources(display: Page): Promise<string[]> {
  return display.evaluate(
    () => (window as unknown as { __cqsCbj08Sources?: string[] }).__cqsCbj08Sources ?? [],
  )
}

test('[CBJ-08] Image clue from a portable pack: the projector shows the pack\'s image', async ({
  page,
  context,
}) => {
  // Ordinary start: a game from Home, so the Host console is reached by clicking.
  await importGameFile(page)
  await playToClassSetup(page)
  await importImageCluePack(page)
  // The pack's own game is now the active game.
  await expect(page.getByText(IMAGE_CLUE_TITLE).first()).toBeVisible()

  const display = await namesDisplayStart(page, context)
  await recordProjectorImageSources(display)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await page.getByRole('button', { name: 'Diagrams, 100 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()

  // The settled projector image is the PACK's image, delivered as a blob.
  const projected = display.getByRole('img', { name: IMAGE_CLUE_ALT })
  await expect(projected).toBeVisible({ timeout: 30_000 })
  await expect(projected).toHaveAttribute('src', /^blob:/, { timeout: 30_000 })

  // ...and it is the pack's picture, not the shipped asset that sits at the same
  // authored path. Dimensions are an independent discriminator from the scheme.
  const size = await projected.evaluate((img) => ({
    width: (img as HTMLImageElement).naturalWidth,
    height: (img as HTMLImageElement).naturalHeight,
  }))
  expect(size, 'the projector must show the pack image (48x16), not the hosted asset (960x540)').toEqual(
    { width: PACK_IMAGE_WIDTH, height: PACK_IMAGE_HEIGHT },
  )

  // The hosted build asset at the colliding path must NEVER have painted.
  const sources = await projectorImageSources(display)
  expect(sources.length, 'the projector should have painted at least one image').toBeGreaterThan(0)
  expect(
    sources.filter((src) => src.includes(COLLIDING_ASSET_PATH)),
    `the projector painted the hosted build asset before pack media hydrated; sources seen: ${JSON.stringify(sources)}`,
  ).toEqual([])
  expect(sources.every((src) => src.startsWith('blob:'))).toBe(true)
})

/**
 * CBJ-09: the Final response window must genuinely RUN OUT before settlement,
 * then settlement and Undo must still work and the game must still complete.
 *
 * No state injection and no manufactured Final: the ordinary UI opens the
 * window, and only then is the page clock advanced past the 30 seconds the
 * fixture authors. A blind tester reaches the same state by waiting.
 *
 * Display-free on purpose: `page.clock.install()` plus a second page is the
 * known rAF-stall shape in this suite, and nothing this journey asserts is
 * projector-side.
 */
test('[CBJ-09] Final response window runs out, then settlement and Undo still work', async ({
  page,
}) => {
  await page.clock.install()
  await importGameFile(page)
  await playToClassSetup(page)
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Granite')
  await fields.nth(0).press('Enter')
  await fields.nth(1).fill('Nimbus')
  await fields.nth(1).press('Enter')
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await scoreTile(page, 'Skies, 100 points', 'Nimbus')

  await toFinalWithWagers(page, { granite: '100', nimbus: '50' })
  await page.getByRole('radio', { name: 'Adjudicate without capturing wording' }).check()
  await page.getByRole('button', { name: 'Show the question and start the response window' }).click()

  // The window is RUNNING: the panel must not already claim time is up.
  const finalPanel = page.getByRole('region', { name: 'Final wager' })
  await expect(finalPanel).not.toContainText('time up')

  /*
    Both teams answer while the window is still open, as they would in a class.
    This is required, not decorative: "Lock all responses" stays disabled until
    responses exist, so a journey that expired the window with nothing recorded
    would stall at the lock rather than reach settlement. (Observed: the first
    run of this journey timed out on exactly that disabled control.)
  */
  const responses = page.getByRole('group', { name: 'Team responses' })
  await responses.getByRole('button', { name: 'Answered (no wording)' }).first().click()
  await responses.getByRole('button', { name: 'Answered (no wording)' }).last().click()

  /*
    ORDER MATTERS, and getting it wrong makes this journey prove nothing.

    The defect class (CBN-2 / NEW-1) is a reversible expiry sitting ON TOP of
    latest-only Undo, burying the settlement underneath an inert "Undo time up".
    That can only happen when the window expires AFTER a team is settled.

    The first version of this journey expired the window first and settled
    afterwards, which leaves the settlement on top of the stack. It passed
    against a seeded reversible-expiry mutant — a vacuous pass. So the team is
    settled while the window is still running, and only then is the clock
    advanced past the deadline.

    (The reverse order — expiry before settlement — is already covered by
    tests/e2e/court-b-c-final-undo-integrity.spec.ts.)
  */
  /*
    The window is still live when responses are locked.

    This is a real liveness assertion — it is what makes "the window was
    running, then it ran out" true rather than assumed. It is NOT an ordering
    guard: I tried to use it as one and measured that it fails to be one. An
    expiry moved up can simply be inserted BELOW this line and above the lock,
    and the journey passes again. Position-based assertions cannot constrain
    where a later line is inserted; see the note on the clock advance below.
  */
  await expect(
    finalPanel,
    'CBJ-09 requires the response window to be live when responses are locked',
  ).not.toContainText('time up')

  await page.getByRole('button', { name: 'Lock all responses' }).click()
  await page.getByRole('button', { name: 'Reveal the answer' }).click()
  await revealAndJudge(page, 'Nimbus', 'Correct')
  await expect(scores(page)).toHaveText(/Granite\s*200\s*Nimbus\s*150/)

  /*
    The window now EXPIRES, through the ordinary passage of time.

    There is no "time up" banner to read at this point — after a settlement the
    Final panel has moved to revealing/judging — so the expiry is proven by its
    CONSEQUENCES below, not by a label. This matters: if `fastForward` ever
    stopped firing the expiry, a journey that only read labels would keep
    passing. The end-of-game summary therefore has to report an expiry, and the
    Undo stack has to be unaffected by it.
  */
  /*
    PRECONDITION, PAIRED WITH THE LINE BELOW — DO NOT SEPARATE THEM.

    This journey only catches a reversible expiry while the settlement is
    ALREADY in history when the window expires. Independent review confirmed
    that moving the clock advance above the settlement makes this journey pass
    with the defect present (review F2).

    So the requirement is executable, not just described: the settlement must be
    the current Undo target at the moment the clock is advanced. If the two
    lines below are moved above the settlement together, this assertion fails
    instead of the journey quietly going vacuous.

    HONEST LIMIT, measured rather than assumed. This catches the refactor that
    moves these two lines together, and nothing more. Moving the `fastForward`
    line ALONE — leaving this assertion behind, inserting the advance lower
    down — still passes with a reversible expiry present. Two independent
    reviews and one attempt of my own to close it agree on this. A UI-level
    journey cannot observe event ORDER, and no assertion at a fixed source
    position can stop a line being inserted after it, so this is not fixable
    here; claiming otherwise would be worse than recording it.

    What this defect class actually rests on, in order of strength:
      1. the product's own type, `FinalWindowExpiryEventBase.reversible: false`
         — a single-site mutation does not compile at all;
      2. `src/state/finalUndoIntegrity.test.ts`, which asserts the expiry is
         irreversible at the event layer, independent of any journey ordering;
      3. this journey, which is the only end-to-end check and is ordering
         sensitive.
  */
  await expect(
    page.getByRole('group', { name: 'Live game actions' }).getByRole('button').first(),
    'CBJ-09 requires the settlement to be in history BEFORE the window expires; it is not, so the steps have been reordered and this journey would no longer catch a reversible expiry',
  ).toHaveText('Undo Final correct (Nimbus)')
  await page.clock.fastForward('00:31')

  /*
    The expiry must not become the undo target. Both halves are asserted: the
    offered action NAMES the settlement, and it is not an expiry undo. A label
    check alone would still pass if the control were inert, so the click's
    visible score effect is asserted too.
  */
  const liveUndo = page.getByRole('group', { name: 'Live game actions' }).getByRole('button').first()
  await expect(liveUndo).not.toHaveText(/time up/i)
  await expect(liveUndo).toHaveText('Undo Final correct (Nimbus)')
  await liveUndo.click()
  await expect(scores(page)).toHaveText(/Granite\s*200\s*Nimbus\s*100/)

  // Continuation: the class can finish the Final and end the game.
  await finalPanel.getByRole('button', { name: /^Correct \(/ }).click()
  await expect(scores(page)).toHaveText(/Granite\s*200\s*Nimbus\s*150/)
  await revealAndJudge(page, 'Granite', 'Incorrect')
  await expect(scores(page)).toHaveText(/Granite\s*100\s*Nimbus\s*150/)
  await page.getByRole('button', { name: 'End the game session' }).click()
  await page.getByRole('button', { name: 'End the game — this cannot be undone' }).click()
  await expect(page.getByRole('heading', { name: 'Session summary' })).toBeVisible()

  /*
    POSITIVE PROOF THE WINDOW REALLY EXPIRED.

    Everything above this point is about what the expiry must NOT do, and all of
    it would still hold if the expiry had never fired at all — a `fastForward`
    that silently stopped firing the timer would leave this journey green while
    testing nothing. So the recorded fact is read back.

    Read from the Final section's own response-window counter, not the
    "Timer and buzz activity" total: that total sums board timer, Final wager
    window and Final response window expirations into one number, so it would
    also be satisfied by some OTHER window expiring (review F3). This counter is
    specific to the window this journey is about.
  */
  const finalSection = page.getByRole('region', { name: 'Final Wager', exact: true })
  await expect(finalSection).toBeVisible()
  const responseWindow = /Response-window transitions[^\n]*\n?\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/.exec(
    await finalSection.innerText(),
  )
  expect(responseWindow, 'the summary must report the Final response-window transitions').not.toBeNull()
  expect(
    Number(responseWindow?.[4] ?? 'NaN'),
    'the Final response window must actually have expired; the summary recorded no expiry for it',
  ).toBeGreaterThanOrEqual(1)
})

/**
 * CBJ-10: the simulated Sony receiver at the platform boundary.
 *
 * SIMULATION IS NOT PHYSICAL EVIDENCE (brief rule 6). What this proves is the
 * teacher-visible contract either side of the boundary: the exact supported
 * profile reaches a connected state, and a Sony device that is NOT the
 * supported profile is refused instead of silently adopted.
 *
 * The boundary is installed through the repository's proven mechanism
 * (`installWbuzzHardwareSimulator`: `page.addInitScript` plus
 * `Object.defineProperty(navigator, 'hid', ...)`), and the journey asserts the
 * boundary is really installed and that the PRODUCT read it — so a broken fake
 * fails loudly rather than passing quietly.
 */
async function reachBuzzerSetup(page: Page) {
  await importGameFile(page)
  await playToClassSetup(page)
  const setup = page.getByRole('region', { name: 'Class setup' })
  const show = setup.getByRole('button', { name: 'Show buzzer setup' })
  if (await show.isVisible().catch(() => false)) {
    await show.click()
  } else {
    await page.getByRole('button', { name: 'Check buzzers' }).first().click()
  }
}

test('[CBJ-10] Simulated Sony receiver: the supported profile connects', async ({
  page,
}) => {
  await installWbuzzHardwareSimulator(page, 'ready')
  await reachBuzzerSetup(page)
  // The fake must really be installed before anything is claimed about it.
  await assertWbuzzBoundaryInstalled(page)

  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByRole('button', { name: 'Buzzers connected' })).toBeVisible({
    timeout: 15_000,
  })
  // The product read the boundary, and honoured the receiver's framing contract.
  await assertProductReadBoundary(page)
})

test('[CBJ-11] Simulated Sony receiver: a device that is not the supported profile is refused', async ({
  page,
}) => {
  await installWbuzzHardwareSimulator(page, 'unsupported-pid')
  await reachBuzzerSetup(page)
  await assertWbuzzBoundaryInstalled(page)

  /*
    There must be something to refuse.

    Everything below is about the product NOT adopting a non-supported device,
    and all of it holds just as well when the simulator offers no device at all
    — same counts, same UI. So a refusal journey has to assert the wrong device
    is genuinely on offer first, or it cannot tell a working refusal from an
    empty one. (Found by independent review: with `unsupported-pid` granting
    nothing, every later assertion here still passed.)
  */
  expect(
    (await getHidSimSnapshot(page)).grantedProductIds,
    'the simulator must be offering the non-supported device, or this journey proves nothing',
  ).toEqual([UNSUPPORTED_HID_PRODUCT_ID])

  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  // Refused: the teacher is never told the receiver is connected.
  await expect(page.getByRole('button', { name: 'Buzzers connected' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeVisible()
  /*
    The refusal came from the product's own filter, not from an absent boundary.

    These assertions are calibrated against the OBSERVED behaviour of a seeded
    wrong-PID-acceptance mutant, because a plausible-looking weaker set did not
    catch it. With the mutant, the product adopts the already-granted wrong
    device, never asks for permission, and the teacher is told "Failed to
    reconnect". Clean, it refuses that device, therefore has no receiver, and so
    HAS to ask — requestCalls rises and the teacher is told permission is
    needed.

    So `requestCalls > 0` is the load-bearing claim: it is only true of a
    product that declined the granted device. (An earlier revision replaced it
    with `requestCalls + getDevicesCalls > 0`, reasoning that either entry point
    should count; that is true in general but it let the mutant through, because
    the mutant's whole behaviour is to be satisfied by `getDevices` alone.)
  */
  const snapshot = await getHidSimSnapshot(page)
  expect(snapshot.getDevicesCalls, 'the product must have consulted the boundary').toBeGreaterThan(0)
  expect(
    snapshot.requestCalls,
    'the product must not adopt the granted non-supported device — with no receiver it has to ask',
  ).toBeGreaterThan(0)
  expect(snapshot.openCalls, 'a non-supported device must never be opened').toBe(0)
  expect(snapshot.violations).toEqual([])
  // Teacher-visible: never the "we had it and lost it" story about a device
  // that was never the receiver.
  await expect(page.getByText(/Failed to reconnect/i)).toHaveCount(0)
})

test('[CBJ-07] Host reload + Resume during the Final', async ({ page, context }) => {
  await importGameFile(page)
  await playToClassSetup(page)
  await namesDisplayStart(page, context)
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await scoreTile(page, 'Rocks, 200 points', 'Granite')
  await toFinalWithWagers(page, { granite: '50' })
  await expect(page.getByRole('region', { name: 'Final wager' })).toContainText('Wagers locked')
  await waitUntilSavedOnThisDevice(page)
  await page.reload()
  await page.getByRole('button', { name: 'Resume class' }).click()
  const finalPanel = page.getByRole('region', { name: 'Final wager' })
  await expect(finalPanel).toContainText('Wagers locked')
  await finalQuestionToReveal(page)
  await revealAndJudge(page, 'Granite', 'Correct')
  await expect(scores(page)).toHaveText(/Granite\s*250/)
})
