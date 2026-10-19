/**
 * Q7 ordinary teacher buzzer journey helpers — visible/accessibility UI only.
 * Helpers perform user-visible actions; they do not inject Session/Game state.
 */

import { expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './menusClassSetup'
import { waitForSessionSaved } from './menusSession'
import { expectShowBuzzerSetupTeacherEffect } from './viewportDiscoverability'
import {
  exposeSimulatedWbuzzGamepad,
  getHidSimSnapshot,
  pressWbuzzButton,
} from './simulatedWbuzzHardware'
import { buttonIndexForSlotColor } from '../../../src/input/sonyBuzzSupportedProfile'

export async function openOptionalBuzzers(page: Page): Promise<void> {
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  if (!(await page.getByTestId('setup-buzzers-task').isVisible().catch(() => false))) {
    await page.getByTestId('readiness-sony').click()
  }
  await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
}

export async function clickShowBuzzerSetup(page: Page): Promise<void> {
  const show = page.getByRole('button', { name: 'Show buzzer setup' })
  if (await show.isVisible().catch(() => false)) {
    await show.click()
  } else {
    await page.getByRole('button', { name: 'Check buzzers' }).first().click()
  }
  await expectShowBuzzerSetupTeacherEffect(page)
}

export async function connectSimulatedReceiver(page: Page): Promise<void> {
  const connect = page.getByRole('button', { name: 'Connect buzzers' })
  await expect(connect).toBeVisible()
  await connect.click()

  await expect
    .poll(async () => (await getHidSimSnapshot(page)).requestCalls, { timeout: 10_000 })
    .toBeGreaterThan(0)
  await expect
    .poll(async () => (await getHidSimSnapshot(page)).openCalls, { timeout: 10_000 })
    .toBeGreaterThan(0)

  await expect
    .poll(async () => {
      const snap = await getHidSimSnapshot(page)
      const first = snap.sendCalls[0]
      return first && first.reportId === 0 && first.bytes.length === 7 && first.bytes.every((b) => b === 0)
    }, { timeout: 10_000 })
    .toBeTruthy()

  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, {
    timeout: 10_000,
  })
  await expect(page.getByRole('button', { name: 'Buzzers connected' })).toBeVisible()
  // Simulator enforces the exact filter and reportId 0 / 7-byte contract.
  expect((await getHidSimSnapshot(page)).violations).toEqual([])
}

export async function waitForKeepAliveContinuation(page: Page): Promise<void> {
  await expect
    .poll(async () => (await getHidSimSnapshot(page)).sendCalls.length, {
      timeout: 8_000,
      intervals: [500, 1000, 1500, 2000],
    })
    .toBeGreaterThanOrEqual(2)
}

export async function exposeGamepadAndExpectBuzzersStatus(page: Page): Promise<void> {
  // Before exposure: receiver may be healthy; Buzzers must not claim ready presses.
  await expect(page.getByTestId('sbs-controller-layer')).not.toContainText(/responding/i)

  await exposeSimulatedWbuzzGamepad(page)
  // Presence alone may not say "responding" until a press — but Wbuzz id should be known.
  await expect(page.getByTestId('sbs-supported-profile')).toBeVisible()
}

/** Demo game (Home → Import demo game) authored team names, slot order. */
export const DEMO_AUTHORED_TEAM_NAMES = ['Blue Basalts', 'Red Rhyolites'] as const

/**
 * RED on slots 1–4 in Buzzer Check. Each press must name the team that slot is
 * assigned to (`slotTeamLabels[i]` for slot i+1), or "no team yet"
 * for a slot with no team — slot→team identity, not just "something responded".
 */
export async function runFourHandsetRedCheck(
  page: Page,
  slotTeamLabels: readonly string[] = DEMO_AUTHORED_TEAM_NAMES,
): Promise<void> {
  // Ensure Buzzer Check is on (Show already arms it; re-enter if needed).
  const testMode = page.getByTestId('sbs-test-mode')
  if ((await testMode.getAttribute('aria-pressed')) !== 'true') {
    await testMode.click()
  }
  await expect(testMode).toHaveAttribute('aria-pressed', 'true')

  for (const slot of [1, 2, 3, 4] as const) {
    const buttonIndex = buttonIndexForSlotColor(slot, 'red')
    await pressWbuzzButton(page, buttonIndex)
    const label = slotTeamLabels[slot - 1] ?? 'no team yet'
    await expect(page.getByTestId('sbs-test-outcome')).toHaveText(
      // CB-04 canonical label: the same "Buzzer N" the mapping list shows.
      `Buzzer Check: Buzzer ${slot} · Red · ${label}`,
      { timeout: 10_000 },
    )
    await expect(page.getByTestId('sbs-controller-layer')).toHaveText(
      slot === 1 ? '1 buzzer responding' : `${slot} buzzers responding`,
    )
  }
}

/** A Sony Buzz handset slot, as the teacher-facing Buzzer setup numbers them. */
export type SonyBuzzSlot = 1 | 2 | 3 | 4

/** The visible label of a slot's team select. Buzzer 4 is the optional fourth. */
export function sonyBuzzSlotLabel(slot: SonyBuzzSlot): string {
  return slot === 4 ? 'Buzzer 4 (optional fourth)' : `Buzzer ${slot}`
}

/**
 * Natural route to a SAVED supported-profile Buzzer mapping.
 *
 * Home demo import -> Play -> optional Buzzers -> Show buzzer setup -> connect
 * the simulated receiver -> expose the pad -> four-handset RED check -> assign
 * the named slots -> Save team mapping. Shared by every spec that needs a saved
 * mapping as a precondition, so the journey has ONE definition: it was copied
 * between specs, and a route that drifts between copies stops proving the same
 * thing in each.
 */
export async function setUpSavedBuzzerMapping(
  page: Page,
  assign: Partial<Record<SonyBuzzSlot, string>>,
): Promise<void> {
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
  await connectSimulatedReceiver(page)
  await exposeGamepadAndExpectBuzzersStatus(page)
  await runFourHandsetRedCheck(page)
  for (const [slot, team] of Object.entries(assign)) {
    await page
      .getByLabel(sonyBuzzSlotLabel(Number(slot) as SonyBuzzSlot), { exact: true })
      .selectOption({ label: team })
  }
  await page.getByRole('button', { name: 'Save team mapping' }).click()
}

/**
 * Names -> Start Game -> Start Round 1 -> board, from the buzzer-setup posture.
 *
 * Deliberately NOT `startRound1Ordinary`: that one additionally asserts Host
 * More is closed, which is not true on a route that went through Show buzzer
 * setup.
 */
export async function startGameToBoardAfterBuzzerSetup(page: Page): Promise<void> {
  await fillAllTeamNames(page)
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
}

export async function namesReadyStartGame(page: Page): Promise<void> {
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByRole('button', { name: /start game/i })).toBeEnabled()
  await page.getByRole('button', { name: /start game/i }).click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-gameplay')).toBeVisible()
  await expect(page.getByTestId('gih')).toHaveCount(1)
}

export async function startRound1Ordinary(page: Page): Promise<void> {
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await page.getByTestId('rph-start').click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
}

export async function openFirstClueAndArm(page: Page): Promise<void> {
  const tile = page.locator('[data-testid^="cbh-tile-"]').first()
  await tile.click()
  await expect(page.getByTestId('cbh-prompt')).toBeVisible()
  // Arm + start timer via ordinary Host controls when present.
  const arm = page.getByTestId('rth-arm')
  if (await arm.isVisible().catch(() => false)) {
    await arm.click()
  }
  const start = page.getByTestId('rth-start')
  if (await start.isVisible().catch(() => false)) {
    await start.click()
  }
}

export async function gameplayWbuzzRedClaim(page: Page, slot: 1 | 2 | 3 | 4 = 1): Promise<void> {
  const buttonIndex = buttonIndexForSlotColor(slot, 'red')
  await pressWbuzzButton(page, buttonIndex)
  await expect(page.getByTestId('lih-active')).toBeVisible({ timeout: 10_000 })
}

export async function attemptSecondTeamBuzzWhileClaimed(page: Page): Promise<void> {
  await pressWbuzzButton(page, buttonIndexForSlotColor(2, 'red'))
  // Lockout: first claim remains authoritative.
  await expect(page.getByTestId('lih-active')).toBeVisible()
}

export async function adjudicateCorrectOrdinary(page: Page): Promise<void> {
  await page.getByTestId('lih-correct').click()
  await expect(page.getByTestId('lih-active')).toHaveCount(0)
}

export async function backToSetupOrdinary(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back to setup' }).click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('gih')).toHaveCount(1)
}

/**
 * Create an unfinished class through ordinary UI, leave to Home, Resume class.
 * Does not seed Host/Class Setup posture directly.
 */
export async function createUnfinishedThenHomeResume(page: Page): Promise<void> {
  await importDemoAndPlay(page)
  await waitForSessionSaved(page)
  await page.getByRole('link', { name: /back to home/i }).click()
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expect(page.getByTestId('home-resume-session')).toBeVisible()
  await page.getByRole('button', { name: /resume class/i }).click()
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}
