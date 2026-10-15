/**
 * Q7 R1 blocker 7 — Electron quit -> relaunch must not open as a false
 * read-only window.
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-REPAIR-R1-CERTIFICATION-BLOCKERS-1
 *
 * The previous process's writer lease used to stay live in IndexedDB for up to
 * HOST_WRITER_LEASE_TTL_MS (4 s) after quit, so a prompt relaunch showed
 * "Another Classroom Quiz Show window is ... saving" and Home controls were
 * inert. The saving window now releases synchronously on pagehide.
 *
 * Does not claim Windows, packaged/signed builds, or crash (non-clean) exits:
 * after a crash the TTL remains the backstop.
 */

import { expect, test, type ElectronApplication } from '@playwright/test'
import { hostWindow, launchDesktop, makeUserDataDir } from './helpers/desktopLaunch'

const FOLLOWER_COPY = /another classroom quiz show window is currently responsible for saving/i
const PROMPT_MS = 1500

test('Q7-R1-7: quit -> relaunch opens Home as the saving window with Resume enabled promptly', async () => {
  test.slow()
  const userData = makeUserDataDir('cqs-q7-r1-lease-')
  let app: ElectronApplication = await launchDesktop(userData)

  try {
    const host = await hostWindow(app)
    await host.getByRole('button', { name: 'Import Game' }).click()
    await host.getByRole('button', { name: 'Import demo game' }).click()
    await host.getByRole('button', { name: 'Play', exact: true }).first().click()
    await expect(host.getByRole('heading', { name: 'Class setup' })).toBeVisible({
      timeout: 20_000,
    })
    await host.getByRole('link', { name: 'Change game' }).click()
    await expect(host.getByRole('button', { name: 'Resume class' })).toBeEnabled()
    expect(await host.getByText(FOLLOWER_COPY).count()).toBe(0)
  } finally {
    await app.close()
  }

  const quitAt = Date.now()
  app = await launchDesktop(userData)
  try {
    const host = await hostWindow(app)
    const homeVisibleAfterQuitMs = Date.now() - quitAt
    const resume = host.getByRole('button', { name: 'Resume class' })
    await expect(resume).toBeVisible({ timeout: PROMPT_MS })
    // Recovery renders after the lease decision: it must already be this window's.
    expect(await host.getByText(FOLLOWER_COPY).count()).toBe(0)
    expect(await resume.isEnabled()).toBe(true)
    const resumeReadyAfterQuitMs = Date.now() - quitAt
    test.info().annotations.push({
      type: 'timing',
      description: `home visible ${homeVisibleAfterQuitMs} ms, resume enabled ${resumeReadyAfterQuitMs} ms after quit`,
    })

    await resume.click()
    await expect(host.getByRole('heading', { name: 'Class setup' })).toBeVisible({
      timeout: 20_000,
    })
    expect(await host.getByText(FOLLOWER_COPY).count()).toBe(0)
  } finally {
    await app.close()
  }
})
