import { test, expect, type Page } from '@playwright/test'
import { importPlayNamesDisplayStartRound1 } from './helpers/courtQualificationJourney'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * CBN-NEW-1 — "Reset this class session" must hand the next class a clean ledger.
 *
 * The teacher runs the same game for a second class period on the same laptop.
 * The ordinary control for that is "Reset this class session", whose own note
 * says it "clears scores, progress, buzzes, and wagers for this class only. It
 * does not delete the saved game."
 *
 * Replayed state was already reset correctly; what used to survive was
 * everything DERIVED from the append-only log by reading all of it. The second
 * class inherited the first class's ledger: full credit silently disabled on
 * every tile the first class had already won, the first class's award still
 * named as "Last score change" with a live Undo, and a Session summary
 * reporting the first class's figures.
 *
 * Natural route only: Home → Import Game → Play → names → Display → Start Game →
 * Start Round 1 → open a tile → show prompt → show answer → award → reset. No
 * state injection, no testid navigation, no Advanced diagnostics. The reset
 * control lives behind the ordinary Host "More" disclosure.
 *
 * Team display names matter to the assertions: a reset clears the Session names,
 * so the next class falls back to the authored Game names until it chooses its
 * own. That is the contract — a new class names its own teams — and the specs
 * name the team they expect to see at each step rather than assuming.
 */

const TILE = 'Rocks, 200 points'

/** The host's own scoreboard figure for the first team. */
const granite = (page: Page) => page.getByTestId('tsp-score-granite')

/**
 * The projector's figure for the same team. The display is sanitized, so teams
 * reach it by opaque slot key, not by the authored id.
 */
const graniteOnDisplay = (display: Page) => display.getByTestId('tsb-score-t0')

/**
 * The full-credit preset for this tile, addressed by its accessible name. The
 * name also states the resulting total, which moves as the score does, so this
 * matches the stable part: the mode, the amount and the team.
 */
const awardFull = (page: Page, teamName: string) =>
  page.getByRole('button', { name: new RegExp(`^full credit, \\+200 points, to ${teamName},`, 'i') })

/** Open a tile all the way to the public answer — the state that can be scored. */
async function openTileToAnswer(page: Page): Promise<void> {
  await page.getByRole('button', { name: TILE }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
}

/** Make the first team the scoring target, under whatever name it shows now. */
async function target(page: Page, teamName: string): Promise<void> {
  await page.getByTestId('tsp-target-granite').check()
  await expect(page.getByTestId('tsp-selected-team')).toContainText(teamName)
}

/**
 * Wait until the reset is on disk before reloading.
 *
 * The active-session write is asynchronous, so an immediate reload can simply
 * race it — losing the reset for reasons that have nothing to do with the
 * boundary this spec is about. This only READS the record the app already wrote;
 * it never injects or edits state.
 */
async function waitForResetDurable(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('classroom-quiz-show-persistence')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const record = await new Promise<{ events?: readonly { type: string }[] }>(
            (resolve, reject) => {
              const tx = db.transaction(['activeSessions'], 'readonly')
              const read = tx.objectStore('activeSessions').get('current')
              read.onsuccess = () => resolve(read.result ?? {})
              read.onerror = () => reject(read.error)
            },
          )
          return (record.events ?? []).filter((event) => event.type === 'SESSION_INITIALIZED')
            .length
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(2)
}

/** Press the ordinary reset control, including its confirmation step. */
async function resetClassSession(page: Page): Promise<void> {
  await ensureHostMoreOpen(page)
  const reset = page.getByRole('button', { name: /^Reset this class session$/i })
  await reset.scrollIntoViewIfNeeded()
  await reset.click()
  await page.getByRole('button', { name: /^Confirm reset this class session$/i }).click()
}

/** First class period: win one tile, and confirm it is public and consumed. */
async function firstClassWinsATile(page: Page, display: Page): Promise<void> {
  await openTileToAnswer(page)
  await target(page, 'Granite')
  await awardFull(page, 'Granite').click()
  await expect(granite(page)).toHaveText('200')
  await expect(graniteOnDisplay(display)).toHaveText('200')
  // Submitting it twice for the same tile is correctly refused.
  await expect(awardFull(page, 'Granite')).toBeDisabled()
  await expect(page.getByTestId('tsp-last-change')).toContainText('Granite +200')
}

/** Every claim about what the next class must NOT inherit. */
async function expectCleanLedger(page: Page, teamName: string): Promise<void> {
  await expect(granite(page)).toHaveText('0')
  await expect(page.getByTestId('tsp-last-change')).toHaveText('No score change yet.')
  await expect(page.getByTestId('tsp-undo-score')).toBeDisabled()
  await openTileToAnswer(page)
  await target(page, teamName)
  await expect(awardFull(page, teamName)).toBeEnabled()
}

test('a reset class can score the tiles the previous class already won', async ({
  page,
  context,
}) => {
  const display = await importPlayNamesDisplayStartRound1(page, context)
  await firstClassWinsATile(page, display)

  await resetClassSession(page)

  // The score is gone on both surfaces, and the saved game is still loaded.
  await expect(granite(page)).toHaveText('0')
  await expect(graniteOnDisplay(display)).toHaveText('0')

  // A reset clears the Session names, so this class shows the authored fallback
  // until it picks its own.
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expectCleanLedger(page, 'Team Granite')

  // And the award actually lands for the new class, on both surfaces.
  await awardFull(page, 'Team Granite').click()
  await expect(granite(page)).toHaveText('200')
  await expect(graniteOnDisplay(display)).toHaveText('200')
})

test('a reset keeps the saved game and an earlier class\'s completed summary', async ({
  page,
  context,
}) => {
  const display = await importPlayNamesDisplayStartRound1(page, context)
  await firstClassWinsATile(page, display)

  // Finish the first class so it is written to the completed-summary ledger —
  // a durable record of a class that is OVER, not current-session state.
  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /^End game session$/i }).click()
  const ledger = page.getByRole('table', { name: /host-private completed summary/i })
  await expect(ledger).toContainText('Court B Final Qualification')

  await resetClassSession(page)

  // Reset clears this class. It must not touch anything that outlives a class:
  // the completed summary of the class that just ended, the saved Game in the
  // Library, or the loaded Game itself.
  await expect(ledger).toContainText('Court B Final Qualification')
  await expect(page.getByTestId('persistence-library')).toContainText(
    'Court B Final Qualification',
  )
  await expect(page.getByTestId('persistence-status')).not.toContainText(/failed|unavailable/i)
  await expect(granite(page)).toHaveText('0')
})

test('a reload after the reset does not resurrect the previous class ledger', async ({
  page,
  context,
}) => {
  const display = await importPlayNamesDisplayStartRound1(page, context)
  await firstClassWinsATile(page, display)

  await resetClassSession(page)
  await expect(granite(page)).toHaveText('0')
  await waitForResetDurable(page)

  // Reload: the host rehydrates from the persisted history, which still holds
  // every pre-reset event. The boundary has to hold on that path too.
  await page.reload()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
  await expect(page.getByTestId('persistence-status')).not.toContainText(
    /loading|opening saved games/i,
  )

  // The ordinary recovery route: the reset class session is the unfinished one.
  // A reset session has no gameplay after its init, so the Host restores to
  // setup — and the next class names its own teams before it can start.
  await page.getByRole('button', { name: 'Resume class' }).click()
  const setup = page.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  for (const [index, name] of ['Basalt', 'Cirrus'].entries()) {
    await fields.nth(index).fill(name)
    await fields.nth(index).press('Enter')
  }
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()

  await expectCleanLedger(page, 'Basalt')
})
