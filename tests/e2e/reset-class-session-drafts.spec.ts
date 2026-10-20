import { test, expect, type Page } from '@playwright/test'
import { importPlayNamesDisplayStartRound1 } from './helpers/courtQualificationJourney'
import { ensureHostMoreOpen } from './helpers/hostMore'
import {
  installSimulatedSupportedWbuzz,
  pressSimulatedGamepadButton,
  settleGamepadPolls,
} from './helpers/simulatedGamepad'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'

/**
 * CBN-NEW-1, second artifact class: the Host's own unsaved drafts must not cross
 * a class reset.
 *
 * The score ledger was the reported symptom, but the gameplay panels also hold
 * per-class state React-side — typed Final wagers and responses, a typed manual
 * correction, and the explicit confirmation that unlocks a large or negative
 * one. Those panels were mounted unkeyed, so a reset left them mounted and the
 * next class found another class's numbers already in the inputs with Save
 * enabled. `ClassroomSetupPanel` was already keyed on the session id one
 * component away; the gameplay panels were not.
 *
 * Natural route only. No state injection, no testid navigation.
 */

const wagers = (page: Page) => page.getByRole('group', { name: 'Team wagers' })

/**
 * The Final panel must be the ONLY one in the document.
 *
 * Keying two siblings on the same value orphans one panel's `<section>` with
 * duplicate element ids; `.first()` would quietly pass against that, and this is
 * the panel the whole key-collision analysis came from, so it gets the explicit
 * check rather than relying on it.
 */
async function expectExactlyOneFinalPanel(page: Page): Promise<void> {
  await expect(page.locator('section.fwh')).toHaveCount(1)
  await expect(page.locator('#fwh-title')).toHaveCount(1)
}

async function awardRocks200(page: Page, teamName: string): Promise<void> {
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByRole('button', { name: 'Show answer on display' }).click()
  await page.getByTestId('tsp-target-granite').check()
  await page
    .getByRole('button', { name: new RegExp(`^full credit, \\+200 points, to ${teamName},`, 'i') })
    .click()
  await page.getByRole('button', { name: 'Return to board' }).click()
}

async function beginFinal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Go to the Final' }).click()
  await page.getByRole('button', { name: 'Go to the Final now' }).click()
  await page.getByRole('button', { name: 'Begin Final' }).click()
}

async function resetClassSession(page: Page): Promise<void> {
  await ensureHostMoreOpen(page)
  const reset = page.getByRole('button', { name: /^Reset this class session$/i })
  await reset.scrollIntoViewIfNeeded()
  await reset.click()
  await page.getByRole('button', { name: /^Confirm reset this class session$/i }).click()
}

test('a reset class does not inherit the previous class\'s typed Final wager', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'Final journey runs once (1080p)')
  await importPlayNamesDisplayStartRound1(page, context)

  // First class: score, reach the Final, and TYPE a wager without saving it.
  await awardRocks200(page, 'Granite')
  await beginFinal(page)
  await expectExactlyOneFinalPanel(page)
  const firstWager = wagers(page).getByRole('spinbutton', { name: /^Wager \(0–200\)$/ }).first()
  await firstWager.fill('50')
  await expect(firstWager).toHaveValue('50')

  await resetClassSession(page)

  // Second class: the same route back to the Final.
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await awardRocks200(page, 'Team Granite')
  await beginFinal(page)

  // Nothing of the previous class may be sitting in this class's input, and the
  // remount must not have left the previous class's panel behind.
  await expectExactlyOneFinalPanel(page)
  const secondWager = wagers(page).getByRole('spinbutton', { name: /^Wager \(0–200\)$/ }).first()
  await expect(secondWager).toHaveValue('')
})

test('a reset class does not inherit a typed manual correction or its confirmation', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'scoring journey runs once (1080p)')
  await importPlayNamesDisplayStartRound1(page, context)

  // First class: arm a large manual correction — type it AND tick the explicit
  // confirmation that unlocks it — but never apply it.
  await page.getByTestId('tsp-target-granite').check()
  await page.getByTestId('tsp-manual-input').fill('-500')
  await page.getByTestId('tsp-confirm').check()
  await expect(page.getByTestId('tsp-confirm')).toBeChecked()

  await resetClassSession(page)

  // The next class must not find another class's amount already typed, and must
  // not find the confirmation already given on its behalf. With the amount gone
  // no confirmation is required, so the control may legitimately be absent —
  // what must never exist is a CHECKED one.
  await expect(page.getByTestId('tsp-manual-input')).toHaveValue('')
  await expect(page.locator('[data-testid="tsp-confirm"]:checked')).toHaveCount(0)
})

test('a reset class does not inherit an armed end-the-game confirmation', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'round-progress journey runs once (1080p)')
  await importPlayNamesDisplayStartRound1(page, context)

  // First class: arm "End the game" — the confirmation step for an action the
  // app itself calls irreversible — but never confirm it.
  await page.getByTestId('rph-end-early').click()
  await expect(page.getByTestId('rph-end-confirm')).toBeVisible()

  await resetClassSession(page)
  await page.getByRole('button', { name: 'Start Round 1' }).click()

  // The new class must not open with another class's confirmation already armed:
  // one click on a control it never asked for would end its session for good.
  await expect(page.getByTestId('rph-end-confirm')).toHaveCount(0)
  await expect(page.getByTestId('rph-end-early')).toBeVisible()
})

test('a reset class does not inherit the previous class\'s last buzz line or timer choice', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'buzz journey runs once (1080p)')
  await importPlayNamesDisplayStartRound1(page, context)

  // First class: open a clue, arm the window, pick a non-default timer length,
  // and buzz in from the keyboard.
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByTestId('rth-arm').click()
  await expect(page.getByTestId('lih-armed')).toContainText('Armed')
  await page.getByTestId('rth-duration').selectOption('120')
  await page.keyboard.press('Digit1')
  await expect(page.getByTestId('lih-outcome')).toContainText('buzzed in')

  await resetClassSession(page)
  await page.getByRole('button', { name: 'Start Round 1' }).click()

  // A class that has not buzzed yet must not be told that it has — this line is
  // an aria-live region, so a screen reader announces it too. Asserted as the
  // exact empty-state copy, not as an absent substring: the latter would pass
  // just as well if the line stopped rendering at all.
  await expect(page.getByTestId('lih-outcome')).toHaveText('No buzz keys pressed yet.')

  // The other half of the contract: the teacher's DURABLE keyboard setup is
  // still there. These bindings are device truth, not this class's play.
  await expect(page.getByTestId('lih-enabled')).toHaveText('On')
  await expect(page.getByTestId('lih-key-granite')).toHaveText('1')
  await expect(page.getByTestId('lih-key-nimbus')).toHaveText('2')

  // And the response window goes back to the length this Game authored, rather
  // than the length the previous class happened to pick.
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await expect(page.getByTestId('rth-duration')).toHaveValue('30')
})

test('a reset class does not inherit the previous class\'s controller buzz line', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'controller journey runs once (1080p)')
  // Simulated handsets only — this says nothing about physical Sony/Namtai
  // hardware, which is a separate owner session.
  await installSimulatedSupportedWbuzz(page)
  await importPlayNamesDisplayStartRound1(page, context)

  // First class: open a clue, arm the window, turn controller buzzing on, and
  // buzz in from a handset.
  await page.getByRole('button', { name: 'Rocks, 200 points' }).click()
  await page.getByRole('button', { name: 'Show prompt on display' }).click()
  await page.getByTestId('rth-arm').click()

  const controllers = page.getByTestId('gih-advanced-generic')
  if ((await controllers.getAttribute('open')) === null) {
    await controllers.locator(':scope > summary').click()
  }
  await settleGamepadPolls(page, 12)
  await page.getByTestId('gih-toggle').click()
  await expect(page.getByTestId('gih-enabled')).toHaveText('On')
  await settleGamepadPolls(page, 12)
  await pressSimulatedGamepadButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('gih-outcome')).toContainText('buzzed in', { timeout: 10_000 })

  await resetClassSession(page)
  await page.getByRole('button', { name: 'Start Round 1' }).click()

  // The disclosure stays open across the reset, so this line is on screen — and
  // it is an aria-live region, so a screen reader announces it. Asserted as the
  // exact empty-state copy so it cannot pass by the line disappearing.
  await expect(page.getByTestId('gih-outcome')).toHaveText(
    'No controller buttons pressed yet.',
  )

  // And the other half: the teacher's handset setup survives the reset. The
  // handsets did not unpair because a new class walked in, so controller
  // buzzing stays on and the slot-to-team mapping stays bound.
  await expect(page.getByTestId('gih-enabled')).toHaveText('On')
  await expect(page.getByTestId('gih-control-granite')).toContainText('Buzzer 1')
  await expect(page.getByTestId('gih-count')).not.toHaveText('None detected')
})

test('a reset disarms the sibling start-new-session confirmation', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop-1080p', 'session-control journey runs once (1080p)')
  await importPlayNamesDisplayStartRound1(page, context)
  await ensureHostMoreOpen(page)

  // The teacher first reaches for "Start new game session", which arms itself,
  // then changes their mind and uses the control beside it instead.
  const start = page.getByTestId('start-new-game-session')
  await start.scrollIntoViewIfNeeded()
  await start.click()
  await expect(start).toHaveText('Confirm start new class session')

  await resetClassSession(page)

  // The sibling must not still be holding period 1's confirmation. One click on
  // it dispatches INIT_SESSION alone, which discards the class that was just
  // reset AND unloads the Game mid-lesson.
  await expect(start).toHaveText('Start new game session')
})
