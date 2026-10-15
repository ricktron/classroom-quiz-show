import { test, expect, type Page } from '@playwright/test'

/**
 * Q7 R1 blocker 7 — startup writer-lease false read-only.
 *
 * Authorization: AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-REPAIR-R1-CERTIFICATION-BLOCKERS-1
 *
 * A reload of the SAME window must reclaim its own saving responsibility
 * immediately (well under the 4 s lease TTL). A genuinely second live window
 * must stay read-only, and its blocked Home controls must be disabled with
 * truthful copy instead of enabled-but-inert.
 *
 * Natural route only: start at Home, visible controls, role/name locators.
 */

const DEMO_TITLE = 'Earth & Space Science Board'
const FOLLOWER_COPY = /another classroom quiz show window is currently responsible for saving/i
/** Far below HOST_WRITER_LEASE_TTL_MS (4000 ms): proves no wait-for-expiry. */
const PROMPT_MS = 1500

async function importDemoFromHome(page: Page): Promise<void> {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('button', { name: 'Import demo game' }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true }).first()).toBeVisible()
}

/** Home → Play → Class Setup → back to Home leaves an unfinished class on this device. */
async function leaveUnfinishedClass(page: Page): Promise<void> {
  await importDemoFromHome(page)
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Class setup' })).toBeVisible()
  await page.getByRole('link', { name: 'Change game' }).click()
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume class' })).toBeVisible()
}

/** Instant (non-retrying) absence check: a retrying toHaveCount(0) could wait out the TTL. */
async function expectNoFollowerCopyNow(page: Page): Promise<void> {
  expect(await page.getByText(FOLLOWER_COPY).count()).toBe(0)
  expect(await page.getByText(/read-only/i).count()).toBe(0)
}

function yourGames(page: Page) {
  return page.getByRole('list', { name: 'Your Games' })
}

test.describe('Q7 R1 writer lease — same-window reload and second window', () => {
  test('same-window reload reclaims saving immediately: Resume and delete work at once', async ({
    page,
  }) => {
    await leaveUnfinishedClass(page)
    await expectNoFollowerCopyNow(page)

    await page.reload()
    const reloadedAt = Date.now()

    // Recovery renders only after this window's lease decision, so the decision
    // is already made when Resume appears: it must be ours, not another window's.
    const resume = page.getByRole('button', { name: 'Resume class' })
    await expect(resume).toBeVisible({ timeout: PROMPT_MS })
    await expectNoFollowerCopyNow(page)
    expect(await resume.isEnabled()).toBe(true)

    // Delete confirm must really delete right after reload (not enabled-but-inert).
    const games = yourGames(page)
    await expect(games.getByText(DEMO_TITLE)).toBeVisible({ timeout: PROMPT_MS })
    await games.getByText('More', { exact: true }).click()
    await games.getByRole('button', { name: 'Delete' }).click()
    await games.getByRole('button', { name: 'Confirm delete game' }).click()
    await expect(page.getByText('Game deleted. Your other games are unchanged.')).toBeVisible({
      timeout: PROMPT_MS,
    })
    await expect(page.getByRole('list', { name: 'Your Games' })).toHaveCount(0, {
      timeout: PROMPT_MS,
    })
    await expectNoFollowerCopyNow(page)
    // Everything above happened well inside the old 4 s stale-lease window.
    expect(Date.now() - reloadedAt).toBeLessThan(3_500)

    // Still the saving window well past the old TTL window (no late flip).
    await page.waitForTimeout(4_500)
    await expectNoFollowerCopyNow(page)
    expect(await resume.isEnabled()).toBe(true)
  })

  test('a genuinely second live window stays read-only with disabled, truthful controls', async ({
    context,
  }) => {
    const first = await context.newPage()
    await leaveUnfinishedClass(first)

    const second = await context.newPage()
    await second.goto('./')
    await expect(second.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
    await expect(second.getByText(FOLLOWER_COPY).first()).toBeVisible({ timeout: PROMPT_MS })

    const resume = second.getByRole('button', { name: 'Resume class' })
    await expect(resume).toBeVisible()
    await expect(resume).toBeDisabled()
    await expect(second.getByRole('button', { name: 'Start fresh' })).toBeDisabled()
    await expect(second.getByRole('button', { name: 'New Game' })).toBeDisabled()
    const games = yourGames(second)
    await games.getByText('More', { exact: true }).click()
    await expect(games.getByRole('button', { name: 'Delete' })).toBeDisabled()
    await expect(games.getByRole('button', { name: 'Duplicate' })).toBeDisabled()
    await expect(games.getByRole('button', { name: 'Rename' })).toBeDisabled()
    await expect(second.getByText(/this window is read-only/i).first()).toBeVisible()

    // The first window keeps saving; protection holds past the lease TTL.
    await second.waitForTimeout(5_000)
    await expect(second.getByText(FOLLOWER_COPY).first()).toBeVisible()
    await expect(resume).toBeDisabled()
    await expectNoFollowerCopyNow(first)
    expect(await first.getByRole('button', { name: 'Resume class' }).isEnabled()).toBe(true)

    // Closing the saving window hands saving to the remaining window promptly.
    await first.close({ runBeforeUnload: true })
    await expect(resume).toBeEnabled({ timeout: PROMPT_MS })
    await expectNoFollowerCopyNow(second)
  })
})
