import { test, expect } from '@playwright/test'
import {
  installSimulatedSupportedWbuzz,
  pressSimulatedGamepadButton,
  settleGamepadPolls,
} from './helpers/simulatedGamepad'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'
import {
  adjudicateAlphaFullHundred,
  advanceToBoard,
  advanceToFinal,
  armAndStartTimer,
  expectAdvancedDiagnosticsUnused,
  expectDisplayPrivate,
  importQ3GameToClassSetup,
  keyboardNamesReadyStart,
  openAudienceFromHost,
  openBoardClue,
  Q3_AUTHORED_NAME_ALPHA,
  Q3_PRIVATE_CONTENT,
  Q3_SESSION_NAME_ALPHA,
  Q3_SESSION_NAME_BRAVO,
  Q3_TEAM_ALPHA,
  runClassicFinalToCompletion,
} from './helpers/menusQ3'

/**
 * Pre-owner Q3 — Core gameplay golden paths (Finding C / HG-12).
 *
 * Authorization: AUTHORIZE-CQS-PRE-OWNER-Q3-CORE-GAMEPLAY-GOLDEN-PATHS-1
 * Semantic repair: Q3-R1…R6 (Session names + real adjudication).
 *
 * Composes Home → Class Setup → Start → board → Final → completion on one
 * proven served build (Playwright webServer = build + preview). Not Q4.
 * SIMULATED Sony labeled; physical Sony NOT RUN.
 */

test.describe.configure({ mode: 'serial' })

test('Q3-A…F: keyboard golden path Home→board→Final→completion with Host/Display privacy', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await importQ3GameToClassSetup(host, 'keyboard')
  await keyboardNamesReadyStart(host)

  const display = await openAudienceFromHost(context, host)
  await expectDisplayPrivate(display)
  await expect(display.getByTestId('display-scores')).toContainText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('display-scores')).toContainText(Q3_SESSION_NAME_BRAVO)

  // Q3-B: real round advance via teacher UI (no roundIndex injection).
  await advanceToBoard(host)
  await expect(display.getByTestId('cbd-board')).toBeVisible()
  await expect(display.getByTestId('cbd-board')).toContainText('Science')
  await expectDisplayPrivate(display)

  // HG-04: select / reveal — Host private, Display public stages only.
  await openBoardClue(host)
  await expect(display.getByTestId('cbd-prompt')).toContainText(/what is H2O/i)
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  expect((await display.content()).toLowerCase()).not.toContain('water')
  await expectDisplayPrivate(display)
  // Q6-RP-1 (G2): public status is truthful mid-round (real Host publish).
  await expect(display.getByTestId('nexus-detail')).toHaveText('Playing')
  await expect(display.locator('body')).not.toContainText('Waiting for the first round')

  // HG-07 / HG-08: arm + timer + keyboard buzz (usable without controllers).
  await armAndStartTimer(host)
  await expect(display.getByTestId('signal-rail-status')).toHaveText('Waiting for a buzz')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'running')
  await host.keyboard.press('Digit1')
  // R1/R4: Host and Display both use Session names — no authored-name tolerance.
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(host.getByTestId('lih-active')).not.toHaveText(Q3_AUTHORED_NAME_ALPHA)
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'interrupted')

  // R2: real lih-correct adjudication before Team Scoring +100.
  await adjudicateAlphaFullHundred(host, display)
  await expectDisplayPrivate(display)

  // Q3-C / Q3-D / DP-05: Final lifecycle + completion-only winner.
  await advanceToFinal(host)
  await expect(display.getByTestId('fwd-setup')).toBeVisible()
  await expectDisplayPrivate(display, Q3_PRIVATE_CONTENT)
  await runClassicFinalToCompletion(host, display)
  // Q6-RP-1 (G2): completion status is truthful; G1: no Advanced diagnostics used.
  await expect(display.getByTestId('nexus-stage')).toHaveText('Game complete')
  await expect(display.locator('body')).not.toContainText('Waiting for the first round')
  await expectAdvancedDiagnosticsUnused(host)

  // R5: Host session summary with Session standings; Display sanitized.
  await expect(host.getByTestId('session-summary-panel')).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Session summary' })).toBeVisible()
  await expect(host.getByRole('heading', { name: 'Final standings' })).toBeVisible()
  await expect(host.getByTestId('ssp-game-title')).toContainText(/Q3 Golden Path keyboard/i)
  await expect(host.getByTestId('ssp-current-session-warning')).toContainText(/saved locally/i)
  const standings = host.getByTestId('ssp-standings')
  await expect(standings).toContainText(Q3_SESSION_NAME_ALPHA)
  await expect(standings).toContainText('150')
  await expect(standings).toContainText(Q3_SESSION_NAME_BRAVO)
  await expect(standings).toContainText('0')
  await expect(standings).not.toContainText(Q3_AUTHORED_NAME_ALPHA)
  // Unique-winner Final path evidence on Host summary.
  await expect(host.getByTestId('ssp-terminal-path')).toContainText(/Final unique-winner/i)

  const displayText = (await display.locator('body').innerText()).toLowerCase()
  expect(displayText).not.toContain('session summary')
  expect(displayText).not.toContain('current-session-only')
  await expect(display.getByTestId('session-summary-panel')).toHaveCount(0)

  await host.close()
  await display.close()
})

test('Q3-G: SIMULATED supported-Sony gameplay claim on authentic Session (PHYSICAL NOT RUN)', async ({
  context,
}) => {
  test.slow()
  const host = await context.newPage()
  await installSimulatedSupportedWbuzz(host)
  await importQ3GameToClassSetup(host, 'sony-claim')
  await settleGamepadPolls(host, 12)
  await keyboardNamesReadyStart(host)

  const display = await openAudienceFromHost(context, host)
  await advanceToBoard(host)
  await openBoardClue(host)
  await armAndStartTimer(host)

  // Teacher enables controller buzzing (off by default in play).
  const controllers = host.getByTestId('gih-advanced-generic')
  if ((await controllers.getAttribute('open')) === null) {
    await controllers.locator(':scope > summary').click()
  }
  await expect(host.getByTestId('gih-enabled')).toHaveText('Off')
  await expect(host.getByTestId('gih-count')).not.toHaveText('None detected')
  await host.getByTestId('gih-toggle').click()
  await expect(host.getByTestId('gih-enabled')).toHaveText('On')
  // Supported-profile materialization binds slot→team (red = primary buzz).
  await expect(host.getByTestId(`gih-control-${Q3_TEAM_ALPHA}`)).toContainText(/button/i)
  await expect(host.getByTestId('gih-bindings')).toContainText(Q3_SESSION_NAME_ALPHA)

  await settleGamepadPolls(host, 12)
  await pressSimulatedGamepadButton(host, buttonIndexForSlotColor(1, 'red'))

  // R3: Sony buzz → Team 1 active on Host + Display → real adjudication.
  await expect(host.getByTestId('lih-active')).toHaveText(Q3_SESSION_NAME_ALPHA, {
    timeout: 10_000,
  })
  await expect(display.getByTestId('bqd-active')).toHaveText(Q3_SESSION_NAME_ALPHA)
  await expect(display.getByTestId('bqd')).toHaveAttribute('data-status', 'active')
  await expect(display.getByTestId('rtd')).toHaveAttribute('data-status', 'interrupted')

  // Privacy: no Sony / WebHID / mapping vocabulary on Display.
  const displayHtml = (await display.content()).toLowerCase()
  for (const absent of ['sony', '054c', '1000', 'webhid', 'handset', 'gamepad', 'controller buzzing']) {
    expect(displayHtml, `display must not contain "${absent}"`).not.toContain(absent)
  }
  await expectDisplayPrivate(display)

  // R3 continues: real adjudication UI → public board outcome → score.
  await adjudicateAlphaFullHundred(host, display)
  await expect(host.getByTestId(`tsp-score-${Q3_TEAM_ALPHA}`)).toHaveText('100')
  await expect(display.getByTestId('display-scores')).toContainText('100')

  await host.close()
  await display.close()
})
