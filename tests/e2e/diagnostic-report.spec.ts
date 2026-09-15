import { test, expect } from '@playwright/test'

/**
 * S04C-H2 — Copy Diagnostic Report Host flow.
 *
 * Local copy only. Asserts progressive disclosure, visible report, copy
 * success wording, and hostile classroom markers absent from the report.
 */

const HOSTILE_MARKERS = [
  'STUDENT_SECRET_ALICE',
  'CLASS_SECRET_PERIOD_3',
  'QUESTION_SECRET_WHAT_IS_LAVA',
  'ANSWER_SECRET_MOLTEN_ROCK',
  'TEAM_SECRET_RED_DRAGONS',
  'IMPORT_FILE_SECRET_volcanoes.xlsx',
  'TEACHER_NOTE_SECRET_give_hint',
  'PII_MARKER_SSN_000-00-0000',
] as const

test.describe('S04C-H2 sanitized diagnostic report', () => {
  test('teacher can expand, inspect, and copy a sanitized report', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('./')
    await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
    await page.getByRole('link', { name: /open classroom controls/i }).click()
    await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()

    // Seed hostile markers into Host private UI paths that must not appear in
    // the diagnostic report text.
    await page.evaluate((markers) => {
      const root = document.querySelector('.foundation') ?? document.body
      const probe = document.createElement('div')
      probe.setAttribute('data-testid', 'hostile-privacy-probe')
      probe.hidden = true
      probe.textContent = markers.join(' | ')
      root.appendChild(probe)
    }, [...HOSTILE_MARKERS])

    const details = page.getByTestId('diagnostic-report')
    await expect(details).toBeVisible()
    await expect(details).not.toHaveAttribute('open', '')

    await details.locator('summary').click()
    await expect(details).toHaveAttribute('open', '')

    const report = page.getByTestId('diagnostic-report-text')
    await expect(report).toBeVisible()
    const reportText = await report.inputValue()
    expect(reportText).toContain('Classroom Quiz Show — Diagnostic Report')
    expect(reportText).toContain('nothing is sent automatically')
    expect(reportText).toContain('keyboardFallback: available')
    for (const marker of HOSTILE_MARKERS) {
      expect(reportText).not.toContain(marker)
    }

    await page.getByTestId('diagnostic-report-copy').click()
    await expect(page.getByTestId('diagnostic-report-status')).toContainText(
      /copied to clipboard\. nothing was sent/i,
    )

    const clipboard = await page.evaluate(async () => navigator.clipboard.readText())
    expect(clipboard).toBe(reportText)
    for (const marker of HOSTILE_MARKERS) {
      expect(clipboard).not.toContain(marker)
    }
  })

  test('clipboard failure keeps selectable report and does not claim success', async ({
    page,
  }) => {
    await page.goto('./')
    await page.getByRole('link', { name: /open classroom controls/i }).click()
    await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()

    await page.getByTestId('diagnostic-report').locator('summary').click()
    // Force the complete copy chain to fail: Clipboard API reject AND
    // execCommand fallback false. Stubbing only writeText lets the production
    // fallback succeed in Chromium and incorrectly claim copy success.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('denied')
          },
        },
      })
      Document.prototype.execCommand = () => false
    })

    await page.getByTestId('diagnostic-report-copy').click()
    await expect(page.getByTestId('diagnostic-report-status')).toContainText(
      /clipboard copy failed/i,
    )
    await expect(page.getByTestId('diagnostic-report-status')).not.toContainText(
      /copied to clipboard/i,
    )
    const report = page.getByTestId('diagnostic-report-text')
    await expect(report).toBeVisible()
    // Manual-copy recovery: textarea stays selectable after honest failure.
    await report.click()
    await expect(report).toBeFocused()
  })
})
