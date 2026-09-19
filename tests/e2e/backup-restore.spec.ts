import { test, expect } from '@playwright/test'

/**
 * S04C-H3 — Home Backup & restore foundations.
 *
 * Progressive disclosure, privacy warning, download + empty-library restore
 * preview path. Does not claim packaged restore smoke.
 */

test.describe('S04C-H3 backup & restore foundations', () => {
  test('Home exposes Backup & restore with privacy warning and download', async ({
    page,
  }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()

    const details = page.getByTestId('backup-restore')
    await expect(details).toBeVisible()
    await expect(details).not.toHaveAttribute('open', '')

    await details.locator('summary').click()
    await expect(details).toHaveAttribute('open', '')
    await expect(page.getByTestId('backup-restore-privacy')).toContainText(/classroom content/i)
    await expect(page.getByTestId('backup-restore-privacy')).toContainText(
      /does not include an unfinished class session/i,
    )

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('backup-download').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('classroom-quiz-show.backup.json')

    await expect(page.getByTestId('backup-restore-status')).toContainText(/Downloaded/i)
  })
})
