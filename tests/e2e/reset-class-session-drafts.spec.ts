import { test, expect, type Page } from '@playwright/test'
import { importPlayNamesDisplayStartRound1 } from './helpers/courtQualificationJourney'
import { ensureHostMoreOpen } from './helpers/hostMore'

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
  const firstWager = wagers(page).getByRole('spinbutton', { name: /^Wager \(0–200\)$/ }).first()
  await firstWager.fill('50')
  await expect(firstWager).toHaveValue('50')

  await resetClassSession(page)

  // Second class: the same route back to the Final.
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await awardRocks200(page, 'Team Granite')
  await beginFinal(page)

  // Nothing of the previous class may be sitting in this class's input.
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
