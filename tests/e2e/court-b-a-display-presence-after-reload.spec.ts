import { test, expect, type Page } from '@playwright/test'

/**
 * Court B repair A (CB-01) — Host truth about a live Display after Host reload.
 *
 * Natural route, ordinary visible controls only (no diagnostics, no state
 * injection): Home → Import demo → Play → Class Setup → Open display →
 * Start Game → play state on the Display → reload Host → Resume class →
 * Host reports "Display open" → the SAME Display keeps receiving state →
 * close the Display → Host reports "Display not open".
 *
 * Fail-first on beeacd33: after reload the Host said "Display not open" while
 * the Display stayed open and live, because the Host derived the fact only from
 * its own document's window.open handle.
 */

// Bounded interval for presence to converge (contract: "within a bounded interval").
const PRESENCE_BOUND_MS = 8_000

function hostStatus(host: Page) {
  return host.getByRole('status').filter({ hasText: /Display (not )?open/ }).first()
}

test('CB-01: Host reports a live Display as open after reload + Resume, and not open once it closes', async ({
  page: host,
  context,
}, info) => {
  test.skip(info.project.name === 'mobile-host', 'projector/laptop projects only')

  // REACH: Home → Import Game → demo → Play.
  await host.goto('./')
  await host.getByRole('button', { name: 'Import Game' }).click()
  await host.getByRole('button', { name: 'Import demo game' }).click()
  await host.getByRole('button', { name: 'Play', exact: true }).click()
  const setup = host.getByRole('region', { name: 'Class setup' })
  await expect(setup).toBeVisible()

  // Names (keyboard Enter commits each typed name).
  await setup.getByRole('button', { name: /^Names/ }).click()
  const names = host.getByRole('textbox', { name: 'Type a name' })
  await names.nth(0).fill('Comets')
  await names.nth(0).press('Enter')
  await names.nth(1).fill('Magma')
  await names.nth(1).press('Enter')

  // ACT: Open display from Class Setup.
  const popupPromise = context.waitForEvent('page')
  await setup.getByRole('button', { name: 'Open display' }).first().click()
  const display = await popupPromise
  await display.waitForLoadState('domcontentloaded')
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({
    timeout: 20_000,
  })

  await host.getByRole('button', { name: 'Start Game' }).click()
  await expect(hostStatus(host)).toContainText('Display open')
  await host.getByRole('button', { name: 'Start Round 1' }).click()
  await host.getByRole('button', { name: 'Earth Structure, 100 points' }).click()
  await host.getByRole('button', { name: 'Show prompt on display' }).click()
  await expect(display.locator('body')).toContainText(
    'Which layer of the Earth lies directly beneath the crust?',
  )
  const displayOrigin = await display.evaluate(() => performance.timeOrigin)

  // Reload the Host only; the Display window is untouched.
  await host.reload()
  await host.getByRole('button', { name: 'Resume class' }).click()

  // VISIBLE EFFECT: the Host tells the truth about the still-live Display.
  await expect(hostStatus(host)).toContainText('Display open', { timeout: PRESENCE_BOUND_MS })
  await expect(
    host.getByRole('group', { name: 'Host controls' }).getByRole('button', { name: 'Focus display' }),
  ).toBeVisible()

  // CONTINUATION: the same Display (never reloaded) keeps receiving state.
  await host.getByRole('button', { name: 'Show answer on display' }).click()
  await expect(display.locator('body')).toContainText('The mantle')
  expect(await display.evaluate(() => performance.timeOrigin)).toBe(displayOrigin)

  // Focus display targets the existing named Display: no second window, no reload.
  const pagesBefore = context.pages().length
  await host
    .getByRole('group', { name: 'Host controls' })
    .getByRole('button', { name: 'Focus display' })
    .click()
  await expect(hostStatus(host)).toContainText('Display open')
  expect(context.pages().length).toBe(pagesBefore)
  expect(await display.evaluate(() => performance.timeOrigin)).toBe(displayOrigin)

  // Close the Display → the Host reports it is not open within the bound.
  await display.close()
  await expect(hostStatus(host)).toContainText('Display not open', { timeout: PRESENCE_BOUND_MS })
  await expect(
    host.getByRole('group', { name: 'Host controls' }).getByRole('button', { name: 'Open display' }),
  ).toBeVisible()
})

test('CB-01: a Display that closes while the Host has no window handle is reported not open', async ({
  page: host,
  context,
}, info) => {
  test.skip(info.project.name === 'mobile-host', 'projector/laptop projects only')

  await host.goto('./')
  await host.getByRole('button', { name: 'Import Game' }).click()
  await host.getByRole('button', { name: 'Import demo game' }).click()
  await host.getByRole('button', { name: 'Play', exact: true }).click()
  const setup = host.getByRole('region', { name: 'Class setup' })
  await setup.getByRole('button', { name: /^Names/ }).click()
  const names = host.getByRole('textbox', { name: 'Type a name' })
  await names.nth(0).fill('Comets')
  await names.nth(0).press('Enter')
  await names.nth(1).fill('Magma')
  await names.nth(1).press('Enter')
  const popupPromise = context.waitForEvent('page')
  await setup.getByRole('button', { name: 'Open display' }).first().click()
  const display = await popupPromise
  await expect(display.getByRole('heading', { name: /game display ready/i })).toBeVisible({
    timeout: 20_000,
  })
  await host.getByRole('button', { name: 'Start Game' }).click()
  await host.getByRole('button', { name: 'Start Round 1' }).click()
  await expect(display.locator('body')).toContainText('Round 1 of 1')

  await host.reload()
  await host.getByRole('button', { name: 'Resume class' }).click()
  await expect(hostStatus(host)).toContainText('Display open', { timeout: PRESENCE_BOUND_MS })

  // The reloaded Host never re-acquired a handle; closing must still be noticed.
  await display.close()
  await expect(hostStatus(host)).toContainText('Display not open', { timeout: PRESENCE_BOUND_MS })
})
