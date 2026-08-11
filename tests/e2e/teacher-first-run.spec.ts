import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Slice 23 teacher first-run repair — clean-teacher path.
 *
 * Starts from a fresh browser context with no injected session/store state and
 * uses only teacher-visible labels. Must not depend on Advanced diagnostics
 * controls such as Initialize / reset session.
 */

test.describe.configure({ mode: 'serial' })

async function openFreshHost(page: Page) {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /choose a screen/i })).toBeVisible()
  await page.getByRole('link', { name: /open host/i }).click()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

test('clean teacher can load a sample game without hidden session initialize', async ({
  page,
}) => {
  await openFreshHost(page)

  const body = (await page.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('arrive in a later slice')
  expect(body).not.toContain('foundation / testing controls — not gameplay')
  expect(body).not.toContain('they are diagnostics, not a game')

  await expect(page.getByRole('heading', { name: /ready to run class/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /load a game/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /classroom controls/i })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /open display in new window/i }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /start new game session/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /advanced diagnostics/i })).toBeVisible()

  // Content entry must appear before advanced diagnostics in document order.
  const loadGameBox = await page.getByRole('heading', { name: /load a game/i }).boundingBox()
  const diagnosticsBox = await page
    .getByRole('heading', { name: /advanced diagnostics/i })
    .boundingBox()
  expect(loadGameBox).toBeTruthy()
  expect(diagnosticsBox).toBeTruthy()
  expect((loadGameBox?.y ?? 0) < (diagnosticsBox?.y ?? 0)).toBe(true)

  await page.getByRole('button', { name: /load category-board sample file/i }).click()
  await page.getByTestId('import-run').click()

  const result = page.getByTestId('import-result')
  await expect(result).toContainText(/import succeeded — game loaded/i)
  await expect(result).not.toContainText(/initialize a session first/i)
  await expect(page.getByTestId('game-title')).toBeVisible()
  await expect(page.getByTestId('import-active-game')).not.toHaveText('none')
  await expect(
    page.getByRole('button', { name: /open display in new window/i }),
  ).toBeVisible()
})

test('teacher quick-start documents the supported MVP host path', async () => {
  const quickStart = readFileSync(
    resolve(process.cwd(), 'docs/teacher/QUICK_START.md'),
    'utf8',
  )
  expect(quickStart).toMatch(/Open Host/i)
  expect(quickStart).toMatch(/Load a game/i)
  expect(quickStart).toMatch(/Open display/i)
  expect(quickStart).toMatch(/resume/i)
  expect(quickStart).not.toMatch(/arrive in a later slice/i)
  expect(quickStart).not.toMatch(/foundation \/ testing controls/i)
})
