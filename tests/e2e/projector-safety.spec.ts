import { test, expect } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'

/**
 * The permanent projector-leak suite. It asserts the public display exposes no
 * private/host/answer content. This is a BASELINE (string + control checks),
 * not the final proof of the sanitizer boundary — see
 * docs/architecture/GAME-ENGINE-BOUNDARIES.md.
 */

test('display contains none of the forbidden host/answer labels', async ({ page }) => {
  await page.goto('#/display')
  const body = (await page.locator('body').innerText()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(body, `display must not contain "${label}"`).not.toContain(
      label.toLowerCase(),
    )
  }
})

test('display exposes no teacher-only controls', async ({ page }) => {
  await page.goto('#/display')
  await expect(page.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByRole('link')).toHaveCount(0)
})

test('display shows no answer or teacher-note placeholders', async ({ page }) => {
  await page.goto('#/display')
  const body = (await page.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('answer')
  expect(body).not.toContain('note')
  expect(body).not.toContain('score')
  expect(body).not.toContain('wager')
})
