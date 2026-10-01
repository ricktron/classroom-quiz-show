import { test, expect } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import { waitForSessionSaved } from './helpers/menusSession'
import { resumeAfterHostReload } from './helpers/menusQ2'

/**
 * Q2-M — Mid-setup refresh / Resume (CS-16 NEW).
 * Incomplete names → refresh → Resume → setup posture; names restored; no fabricated play.
 * Session recovery ≠ setup-draft store. Skip/ephemeral UI may reset (honest).
 */

test.describe.configure({ mode: 'serial' })

test('Q2-M: incomplete mid-setup refresh Resume restores names in setup (no fabricated play)', async ({
  page,
}) => {
  await importDemoAndPlay(page)
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')

  // BEFORE: partial Names only (not complete Ready).
  await page.getByTestId('readiness-names').click()
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  await manuals.first().waitFor({ state: 'visible' })
  await manuals.first().fill('MidSetup Alpha')
  await manuals.first().blur()
  await waitForSessionSaved(page)
  await expect(page.getByTestId('setup-ready-heading')).toHaveCount(0)
  await expect(page.getByTestId('setup-play')).toBeDisabled()

  // INTENT/ACTION: refresh Host mid-setup → Resume.
  await resumeAfterHostReload(page)

  // EFFECT: setup posture; Start still blocked; partial name durable on Names board.
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await page.getByTestId('readiness-names').click()
  await expect(page.locator('[data-testid^="tnsb-manual-"]').first()).toHaveValue('MidSetup Alpha')
  // No fabricated play posture.
  await expect(page.getByTestId('host-play-status')).toHaveCount(0)

  // CONTINUATION: finish names → Ready still reachable.
  await fillRemainingNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
})

async function fillRemainingNames(page: import('@playwright/test').Page): Promise<void> {
  const manuals = page.locator('[data-testid^="tnsb-manual-"]')
  if ((await manuals.count()) === 0) {
    await page.getByTestId('readiness-names').click()
  } else if (!(await manuals.first().isVisible())) {
    await page.getByTestId('readiness-names').click()
  }
  await manuals.first().waitFor({ state: 'visible' })
  const count = await manuals.count()
  for (let i = 0; i < count; i += 1) {
    const input = manuals.nth(i)
    const value = await input.inputValue()
    if (!value.trim()) {
      await input.fill(`Team ${i + 1}`)
      await input.blur()
    }
  }
}
