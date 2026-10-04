/**
 * Shared Electron launch helpers for DESKTOP E2E (Q5).
 * Does not use the GitHub Pages preview server.
 */

import { expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

export function resolveExactHeadSha(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()
}

export function makeUserDataDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

export async function launchDesktop(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    cwd: repoRoot,
    args: [repoRoot],
    env: {
      ...process.env,
      CQS_USER_DATA: userDataDir,
    },
    timeout: 60_000,
  })
}

export async function hostWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow()
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible({
    timeout: 30_000,
  })
  return page
}

/** Open Audience Display from Home via the Electron second-window path. */
export async function openDisplayFromHome(
  app: ElectronApplication,
  host: Page,
): Promise<Page> {
  const displayPromise = app.waitForEvent('window')
  await host.getByTestId('home-open-display').click()
  const display = await displayPromise
  await expect(display.getByTestId('display-route')).toBeVisible({ timeout: 20_000 })
  return display
}

/** Open Audience Display from focused Host chrome (Electron second window). */
export async function openDisplayFromHostChrome(
  app: ElectronApplication,
  host: Page,
): Promise<Page> {
  const displayPromise = app.waitForEvent('window')
  await host.getByTestId('host-chrome-display').click()
  const display = await displayPromise
  await expect(display.getByTestId('display-route')).toBeVisible({ timeout: 20_000 })
  return display
}
