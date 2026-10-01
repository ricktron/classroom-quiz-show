import { test, expect } from '@playwright/test'
import { importDemoAndPlay, fillEmptyTeamNames } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'
import { expectClassSetup, resumeAfterHostReload } from './helpers/menusQ2'

/**
 * Q2-M — Mid-setup refresh / Resume (CS-16 NEW).
 * Incomplete names → refresh → Resume → setup posture; names restored; no fabricated play.
 */

test.describe.configure({ mode: 'serial' })

test('Q2-M: incomplete mid-setup refresh Resume restores names in setup (no fabricated play)', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')

  await page.getByTestId('readiness-names').click()
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  await manuals.first().waitFor({ state: 'visible' })
  await manuals.first().fill('MidSetup Alpha')
  await manuals.first().blur()
  await waitForSessionSaved(page)
  await expect(page.getByTestId('setup-ready-heading')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  await resumeAfterHostReload(page)

  await expectClassSetup(page)
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toHaveValue('MidSetup Alpha')
  await expect(page.getByTestId('host-play-status')).toHaveCount(0)

  await fillEmptyTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
})
