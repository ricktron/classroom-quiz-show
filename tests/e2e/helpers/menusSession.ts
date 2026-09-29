import { expect, type Page } from '@playwright/test'

/** Shared MENUS wait: Host persistence status shows a saved/ready line. */
export async function waitForSessionSaved(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  await expect(page.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|saved locally|ready/i,
    options?.timeout !== undefined ? { timeout: options.timeout } : undefined,
  )
}
