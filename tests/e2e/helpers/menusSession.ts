import { expect, type Page } from '@playwright/test'

/**
 * Shared MENUS wait: Host persistence status says the class session IS saved.
 * "Ready to save" is not saved (Q7-R1 test hardening), so it must not match.
 */
export async function waitForSessionSaved(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  await expect(page.getByTestId('persistence-status')).toHaveText(
    /^This class session is saved on this device\.$/,
    options?.timeout !== undefined ? { timeout: options.timeout } : undefined,
  )
}
