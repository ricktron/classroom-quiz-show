import { test, expect } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'
import {
  installSimulatedSupportedWbuzz,
  settleGamepadPolls,
} from './helpers/simulatedGamepad'

/**
 * I-REPAIR-1 — Scenario D Class Setup functional convergence (semantic e2e).
 * SIMULATED Wbuzz only. Not physical Sony / owner acceptance / Slice I gate.
 */

test.describe.configure({ mode: 'serial' })

test('Scenario D: Buzzers→Teams→Names order, selection grammar, Wbuzz check, Ready', async ({
  page,
}) => {
  await installSimulatedSupportedWbuzz(page)
  await importDemoAndPlay(page)
  await settleGamepadPolls(page, 12)

  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')

  const rowIds = await page.locator('[data-testid^="setup-row-"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('data-testid')),
  )
  expect(rowIds).toEqual([
    'setup-row-buzzers',
    'setup-row-teams',
    'setup-row-names',
    'setup-row-display',
    'setup-row-sound',
  ])

  // Workflow initially opens Buzzers; required Start blocker remains Names.
  await expect(page.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'buzzers')
  await expect(page.getByTestId('setup-row-buzzers')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-row-names')).toHaveAttribute('data-emphasized', 'true')
  await expect(page.getByTestId('setup-play')).toBeDisabled()
  await expect(page.getByTestId('setup-play-blocker')).toContainText(/name/i)
  await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
  await expect(page.getByTestId('setup-reveal-buzzers')).toBeVisible()
  // Supported hardware present → Skip must not be the only / primary affordance.
  await expect(page.getByTestId('setup-skip-buzzers')).toHaveCount(0)
  await expect(page.getByTestId('sbs-supported-profile')).toHaveCount(1)
  await expect(page.getByTestId('gih')).toHaveCount(1)
  const buzzersBody = await page.getByTestId('setup-buzzers-task').innerText()
  expect(buzzersBody).not.toMatch(/remount|component|Gamepad|detector|poller|architecture/i)

  // Re-click keeps body open (no disappearing selected body).
  await page.getByTestId('readiness-sony').click()
  await expect(page.getByTestId('setup-buzzers-task')).toBeVisible()
  await expect(page.getByTestId('setup-row-buzzers')).toHaveAttribute('data-selected', 'true')

  await page.getByTestId('setup-reveal-buzzers').click()
  await expect(page.getByTestId('sbs-supported-profile')).toBeVisible()

  await page.getByTestId('readiness-teams').click()
  await expect(page.getByTestId('setup-row-teams')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-teams-task')).toBeVisible()
  await expect(page.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'complete')
  await expect(page.getByTestId('setup-teams-copy')).not.toContainText(/finish teams/i)

  await page.getByTestId('readiness-names').click()
  await expect(page.getByTestId('setup-row-names')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('setup-row-teams')).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('setup-names-task')).toBeVisible()
  await expect(page.getByTestId('setup-sony-copy')).toBeVisible()
  await expect(page.getByTestId('setup-names-blocked-copy')).toHaveCount(0)

  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  // Names complete → Start enables while Buzzers remain optional/unresolved for Start.
  await expect(page.getByTestId('readiness-sony')).toContainText(/optional|complete|skipped/i)

  // Buzzers remain optional for Start.
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
})
