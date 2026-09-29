import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoToReady } from './helpers/menusClassSetup'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * MENUS B+F — bounded viewport / stress evidence (browser automation).
 *
 * - 1280×720 / 1366×768 / SIMULATED 125% are Playwright CSS viewports.
 * - They are NOT physical Windows / projector / OS-zoom qualification.
 * - Eight-team stress uses the authentic Home import → Class Setup path
 *   (Game definition already has 8 teams; Class Setup does not invent team count).
 */

test.describe.configure({ mode: 'serial' })

async function assertReadySetupFitsViewport(page: import('@playwright/test').Page): Promise<void> {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const setup = document.querySelector('[data-testid="classroom-setup"]')
    const outcome = document.querySelector('[data-testid="setup-outcome-strip"]')
    const ready = document.querySelector('[data-testid="setup-ready-heading"]')
    const play = document.querySelector('[data-testid="setup-play"]')
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      setupWidth: setup?.getBoundingClientRect().width ?? null,
      outcomeVisible: Boolean(outcome && (outcome as HTMLElement).offsetParent !== null),
      readyVisible: Boolean(ready && (ready as HTMLElement).offsetParent !== null),
      playEnabled: play instanceof HTMLButtonElement ? !play.disabled : false,
      playDominant:
        play instanceof HTMLElement && play.classList.contains('classroom-setup__play--dominant'),
    }
  })
  expect(report.scrollWidth, 'document horizontal scroll').toBeLessThanOrEqual(report.clientWidth + 1)
  expect(report.setupWidth, 'classroom-setup width').not.toBeNull()
  expect(report.setupWidth!).toBeLessThanOrEqual(report.clientWidth + 1)
  expect(report.readyVisible).toBe(true)
  expect(report.outcomeVisible).toBe(true)
  expect(report.playEnabled).toBe(true)
  expect(report.playDominant).toBe(true)
}

const VIEWPORTS = [
  { label: '1280×720', width: 1280, height: 720 },
  { label: '1366×768', width: 1366, height: 768 },
  {
    label: 'SIMULATED browser approx: 1366×768 at 125% (CSS ~1093×614)',
    width: 1093,
    height: 614,
  },
] as const

for (const vp of VIEWPORTS) {
  test(`${vp.label} Class Setup Ready remains usable without destructive overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await importDemoToReady(page)
    await assertReadySetupFitsViewport(page)
    if (vp.width === 1093) {
      await expect(page.getByTestId('setup-play')).toBeVisible()
      await expect(page.getByTestId('classroom-readiness')).toBeVisible()
    }
  })
}

test('eight-team Class Setup via authentic Home import stays Ready-usable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({
      id: 'menus-bf-eight-team-stress',
      title: 'B+F Eight-Team Stress Board',
      teamCount: 8,
      teamIdStart: 0,
    }),
  )
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toContainText(/8 teams/i)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await assertReadySetupFitsViewport(page)
  await expect(page.locator('[data-testid^="tnsb-manual-"]')).toHaveCount(0)
  await expect(page.getByTestId('setup-names-summary')).toContainText(/Team 8/)
})
