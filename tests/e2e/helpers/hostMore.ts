import type { Page } from '@playwright/test'

/**
 * Expand Host More / Advanced so demoted power controls are visible.
 * Ordinary `?play=` preparation keeps More closed; bare `#/host` may start
 * open for harness. Call this after a game is loaded or when a prior step
 * may have closed the disclosure.
 */
export async function ensureHostMoreOpen(page: Page): Promise<void> {
  const more = page.getByTestId('host-more')
  if ((await more.count()) === 0) return
  const open = await more.getAttribute('open')
  if (open !== null) return
  // Prefer the Host More summary only — Advanced nests other <summary> nodes.
  await more.locator(':scope > summary').click()
}
