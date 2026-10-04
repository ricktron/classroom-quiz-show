/**
 * Q3 core gameplay golden-path helpers.
 * Authentic Home→Class Setup→Start journeys only (not bare `#/host` seeds).
 */

import { expect, type BrowserContext, type Page } from '@playwright/test'
import { fillAllTeamNames } from './menusClassSetup'
import { importMenusJsonAndPlay, menusBoardPlusFinalGameJson } from './menusGameJson'
import { FORBIDDEN_DISPLAY_LABELS } from '../../../src/test/leakLabels'

/** Private strings from the Q3 smallest complete Game — must never reach Display. */
export const Q3_PRIVATE_CONTENT = [
  'Q3 host-only teaching note',
  'Q3 final host-only note',
  'H2O liquid',
  'Convection currents',
] as const

export const Q3_TEAM_ALPHA = 'alpha'
export const Q3_TEAM_BRAVO = 'bravo'
/** Authored Game names — fallback only when Session names are not chosen. */
export const Q3_AUTHORED_NAME_ALPHA = 'Alpha Rockets'
export const Q3_AUTHORED_NAME_BRAVO = 'Bravo Comets'
/** Session names after Class Setup keyboard fill (`fillAllTeamNames`). */
export const Q3_SESSION_NAME_ALPHA = 'Team 1'
export const Q3_SESSION_NAME_BRAVO = 'Team 2'

export function q3CompleteGameJson(suffix: string): string {
  return menusBoardPlusFinalGameJson({
    id: `q3-golden-${suffix}`,
    title: `Q3 Golden Path ${suffix}`,
  })
}

/** Home JSON import → Play → Class Setup (`?play=`). */
export async function importQ3GameToClassSetup(page: Page, suffix: string): Promise<void> {
  await importMenusJsonAndPlay(page, q3CompleteGameJson(suffix))
  await expect(page).toHaveURL(/[?&]play=/)
  await expect(page.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
}

/** Keyboard Names → Ready → Start Game → focused Host play posture. */
export async function keyboardNamesReadyStart(page: Page): Promise<void> {
  const skipBuzzers = page.getByTestId('setup-skip-buzzers')
  if (await skipBuzzers.isVisible().catch(() => false)) {
    await skipBuzzers.click()
  }
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('tsp-scoreboard')).toBeVisible()
  // Authentic Play Session (Host with ?play=) — not a bare harness seed.
  await expect(page).toHaveURL(/[?&]play=/)
  // R1: Session names must already appear on Host Team Scoring after Start.
  await expect(page.getByTestId(`tsp-team-${Q3_TEAM_ALPHA}`)).toContainText(Q3_SESSION_NAME_ALPHA)
  await expect(page.getByTestId(`tsp-team-${Q3_TEAM_BRAVO}`)).toContainText(Q3_SESSION_NAME_BRAVO)
  await expect(page.getByTestId('tsp-scoreboard')).not.toContainText(Q3_AUTHORED_NAME_ALPHA)
  await expect(page.getByTestId('tsp-scoreboard')).not.toContainText(Q3_AUTHORED_NAME_BRAVO)
}

/**
 * Open Audience Display via Host chrome (`window.open`) when possible;
 * fall back to a same-context `#/display` tab (still real BroadcastChannel).
 */
export async function openAudienceFromHost(
  context: BrowserContext,
  host: Page,
): Promise<Page> {
  const popupPromise = context.waitForEvent('page', { timeout: 5_000 }).catch(() => null)
  await host.getByTestId('host-chrome-display').click()
  const popup = await popupPromise
  if (popup) {
    await popup.waitForLoadState('domcontentloaded')
    await expect(popup.getByRole('heading', { name: /game display ready/i })).toBeVisible({
      timeout: 20_000,
    })
    return popup
  }
  const display = await context.newPage()
  await display.goto('#/display')
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible()
  return display
}

/**
 * Q6-RP-1 (G1): ordinary round progression must never depend on More →
 * Advanced diagnostics. Asserts the diagnostics disclosure stayed closed.
 */
export async function expectAdvancedDiagnosticsUnused(host: Page): Promise<void> {
  await expect(host.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await expect(host.getByTestId('host-advanced')).toBeHidden()
}

/**
 * Teacher Advance through the ORDINARY Host control (`rph-*`) — never via
 * Advanced diagnostics, never by mutating roundIndex. Confirms when the
 * product asks (clues still unplayed).
 */
export async function advanceToNextRound(host: Page): Promise<void> {
  await expectAdvancedDiagnosticsUnused(host)
  const start = host.getByTestId('rph-start')
  if (await start.isVisible().catch(() => false)) {
    await start.click()
  } else {
    await host.getByTestId('rph-next').click()
    const confirm = host.getByTestId('rph-next-confirm')
    if (await confirm.isVisible().catch(() => false)) await confirm.click()
  }
  await expectAdvancedDiagnosticsUnused(host)
}

export async function advanceToBoard(host: Page): Promise<void> {
  await expect(host.getByTestId('rph-start')).toBeVisible()
  await advanceToNextRound(host)
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
  await expect(host.getByTestId('cbh-tile-science-100')).toBeVisible()
}

export async function advanceToFinal(host: Page): Promise<void> {
  await expect(host.getByTestId('rph-next')).toBeVisible()
  await advanceToNextRound(host)
  await expect(host.getByRole('heading', { name: /^final wager$/i })).toBeVisible()
}

export async function expectDisplayPrivate(
  display: Page,
  extras: readonly string[] = Q3_PRIVATE_CONTENT,
): Promise<void> {
  const html = (await display.content()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(html, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  for (const secret of extras) {
    expect(html, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  for (const internal of ['final-wager', 'preFinalScore', 'maxWager', 'teamNameBank']) {
    expect(html, `DOM must not contain "${internal}"`).not.toContain(internal.toLowerCase())
  }
}

/** Select tile → reveal prompt (Host private answer still held). */
export async function openBoardClue(host: Page): Promise<void> {
  await host.getByTestId('cbh-tile-science-100').click()
  await expect(host.getByTestId('cbh-prompt')).toContainText(/what is H2O/i)
  await expect(host.getByTestId('cbh-answer')).toContainText('Water')
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(host.getByTestId('lih-open')).toContainText('Open')
}

export async function armAndStartTimer(host: Page): Promise<void> {
  await host.getByTestId('rth-arm').click()
  await expect(host.getByTestId('lih-armed')).toContainText('Armed')
  await host.getByTestId('rth-duration').selectOption('120')
  await host.getByTestId('rth-start').click()
}

/**
 * Real board adjudication: Mark correct via Host UI, assert public board outcome,
 * then Team Scoring +100 (OG-6 deferred — scoring stays separate).
 * Never injects RESOLVE_ACTIVE_RESPONSE.
 */
export async function adjudicateAlphaFullHundred(
  host: Page,
  display: Page,
): Promise<void> {
  // Mark correct while still at prompt stage (answer reveal closes resolve controls).
  await expect(host.getByTestId('lih-correct')).toBeEnabled()
  await host.getByTestId('lih-correct').click()
  await expect(host.getByTestId('lih-board-outcome')).toContainText(
    `${Q3_SESSION_NAME_ALPHA} — Correct`,
  )
  await expect(host.getByTestId('lih-active')).toContainText(
    `Closed — ${Q3_SESSION_NAME_ALPHA} marked correct`,
  )
  await expect(display.getByTestId('board-outcome')).toContainText(/Correct/i)
  await expect(display.getByTestId('board-outcome')).toContainText(Q3_SESSION_NAME_ALPHA)

  // Reveal answer after adjudication when appropriate; scoring stays separate (OG-6).
  await host.getByTestId('cbh-reveal-answer').click()
  await host.getByTestId(`tsp-target-${Q3_TEAM_ALPHA}`).click()
  await expect(host.getByTestId('tsp-selected-team')).toContainText(Q3_SESSION_NAME_ALPHA)
  await host.getByTestId('tsp-award-full').click()
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('100')
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_BRAVO}`)).toHaveText('0')
  await expect(display.getByTestId('display-scores')).toContainText('100')
  await expect(display.getByTestId('display-scores')).toContainText('0')
  await host.getByTestId('cbh-return').click()
  // Tile consumed after return (Used) before Final.
  await expect(host.getByTestId('cbh-tile-science-100')).toBeDisabled()
  await expect(host.getByTestId('cbh-tile-science-100')).toContainText(/Used/i)
}

/** Classic Final for the sole positive-score team → correct +50 → complete. */
export async function runClassicFinalToCompletion(
  host: Page,
  display: Page,
): Promise<void> {
  await expect(host.getByTestId('fwh-mode-classic')).toBeChecked()
  await host.getByTestId('fwh-begin').click()
  await expect(display.getByTestId('fwd-wager-entry')).toBeVisible()
  await expect(host.getByTestId(`fwh-cap-${Q3_TEAM_ALPHA}`)).toBeVisible()
  await expect(host.getByTestId(`fwh-cap-${Q3_TEAM_BRAVO}`)).toHaveCount(0)
  // R1: Final Host uses Session names.
  await expect(host.locator('.fwh__team-name').first()).toContainText(Q3_SESSION_NAME_ALPHA)
  await expect(host.locator('.fwh')).not.toContainText(Q3_AUTHORED_NAME_ALPHA)

  await host.getByTestId(`fwh-wager-input-${Q3_TEAM_ALPHA}`).fill('50')
  await host.getByTestId(`fwh-save-wager-${Q3_TEAM_ALPHA}`).click()
  await expect(host.getByTestId(`fwh-committed-wager-${Q3_TEAM_ALPHA}`)).toContainText('Saved: 50')
  expect((await display.content()).toLowerCase()).not.toContain('50')

  await host.getByTestId('fwh-lock-wagers').click()
  await expect(display.getByTestId('fwd-wagers-locked')).toBeVisible()
  await expectDisplayPrivate(display)

  const finalPrompt = 'name the process that moves heat in the mantle'
  expect(await display.content()).not.toContain(finalPrompt)
  await host.getByTestId('fwh-capture-exact-text').check()
  await host.getByTestId('fwh-start-response').click()
  await expect(display.getByTestId('fwd-prompt')).toContainText(finalPrompt)
  expect((await display.content()).toLowerCase()).not.toContain('mantle convection')

  await host.getByTestId(`fwh-response-input-${Q3_TEAM_ALPHA}`).fill('Mantle convection')
  await host.getByTestId(`fwh-save-exact-${Q3_TEAM_ALPHA}`).click()
  await host.getByTestId('fwh-lock-responses').click()
  await host.getByTestId('fwh-reveal-answer').click()
  await expect(display.getByTestId('fwd-answer')).toContainText('Mantle convection')

  await host.getByTestId(`fwh-reveal-${Q3_TEAM_ALPHA}`).click()
  await expect(display.getByTestId('fwd-reveal-wager')).toContainText('50')
  await expect(display.getByTestId('fwd-reveal-outcome')).toHaveCount(0)
  await expect(host.getByTestId('fwh-active-reveal')).toContainText(Q3_SESSION_NAME_ALPHA)

  // R6: before completion — no winner yet.
  await expect(display.getByTestId('fwd-winner')).toHaveCount(0)

  await host.getByTestId('fwh-settle-correct').click()
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText(/correct/i)
  await expect(display.getByTestId('fwd-reveal-outcome')).toContainText('+50')
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('150')
  await expect(display.getByTestId('display-scores')).toContainText('150')

  await expect(display.getByTestId('fwd-winner')).toHaveCount(0)
  await host.getByTestId('fwh-complete').click()
  await host.getByTestId('fwh-complete-confirm').click()
  await expect(display.getByTestId('fwd-complete')).toBeVisible()
  await expect(display.getByTestId('fwd-winner')).toBeVisible()
  // R4/R6: winner must be Session name + 150 — no authored-name tolerance.
  await expect(display.getByTestId('fwd-winner')).toContainText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('fwd-winner-score')).toHaveText('150')
  await expect(display.getByTestId('fwd-winner')).not.toContainText(Q3_AUTHORED_NAME_ALPHA)
  await expectDisplayPrivate(display)
}
