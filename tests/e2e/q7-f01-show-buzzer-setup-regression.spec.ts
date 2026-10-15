import { test, expect } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import {
  expectMostlyInViewport,
  expectShowBuzzerSetupTeacherEffect,
  TEACHER_VIEWPORTS,
} from './helpers/viewportDiscoverability'

/**
 * Q7-F01 failure-first regression — Show buzzer setup must produce an
 * understandable teacher-visible effect from the ordinary Class Setup route.
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-SIMULATION-REPAIR-QUALIFICATION-1
 *
 * On unmodified main `78304319…` this suite MUST FAIL for the same class of
 * reason the owner experienced: click succeeds but no clear in-viewport effect /
 * continuation. Do not call scrollIntoView before asserting discoverability.
 *
 * Not physical Sony evidence. Not Q7-F02 root cause.
 */

test.describe.configure({ mode: 'serial' })

/** Class Setup reveal control — not the separate SBS "Check buzzers" button. */
function classSetupShowBuzzerSetup(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: 'Show buzzer setup' })
}

async function openBuzzersTask(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  const task = page.getByTestId('setup-buzzers-task')
  if ((await task.count()) === 0 || !(await task.isVisible())) {
    await page.getByTestId('readiness-sony').click()
  }
  await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
  await expect(classSetupShowBuzzerSetup(page)).toBeVisible()
}

for (const vp of TEACHER_VIEWPORTS) {
  test(`Q7-F01 ${vp.label}: Show buzzer setup → teacher-visible effect (pointer)`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'teacher viewport matrix on projector-720p')

    await page.setViewportSize({ width: vp.width, height: vp.height })
    await importDemoAndPlay(page)
    await openBuzzersTask(page)

    // BEFORE: no reveal status; Buzzer Check off if SBS present.
    await expect(page.getByTestId('setup-buzzer-reveal-status')).toHaveCount(0)
    if ((await page.getByTestId('sbs-test-mode').count()) > 0) {
      await expect(page.getByTestId('sbs-test-mode')).toHaveAttribute('aria-pressed', 'false')
    }

    // INTENT / ACT — ordinary Class Setup control (accessible name).
    // Reach: control is findable; teacher may scroll Class Setup on short viewports.
    // Do not scrollIntoView the Effect/Connect target before Effect assertions.
    const show = classSetupShowBuzzerSetup(page)
    await expect(show).toBeVisible()
    await show.scrollIntoViewIfNeeded()
    await expectMostlyInViewport(show, `${vp.label}: Show buzzer setup must be reachable after ordinary scroll`)
    await show.click()

    // EFFECT — must be understandable without hunting / Advanced diagnostics.
    await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
    await expect(page.getByTestId('host-advanced')).toBeHidden()
    await expectShowBuzzerSetupTeacherEffect(page)
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/WebHID|054c:1000|navigator\.hid|preload|poll owner/i)
  })
}

test('Q7-F01 1280×720: Show buzzer setup keyboard semantic activation', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'keyboard F01 on projector-720p')
  await page.setViewportSize({ width: 1280, height: 720 })
  await importDemoAndPlay(page)
  await openBuzzersTask(page)

  const show = classSetupShowBuzzerSetup(page)
  await show.focus()
  await expect(show).toBeFocused()
  await page.keyboard.press('Enter')

  await expectShowBuzzerSetupTeacherEffect(page)
  // Meaningful focus after activation — not lost into collapsed/hidden content.
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  const focusTestId = await focused.getAttribute('data-testid')
  expect(
    focusTestId === 'sbs-connect' ||
      focusTestId === 'setup-buzzer-reveal-status' ||
      focusTestId === 'sbs-test-mode' ||
      focusTestId === 'sbs-supported-profile' ||
      focusTestId === 'gih',
    `expected meaningful focus after Show; got ${focusTestId ?? '(none)'}`,
  ).toBe(true)
})
