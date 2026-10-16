import { test, expect, type Page } from '@playwright/test'
import { menusBoardGameJson } from './helpers/menusGameJson'
import { importHomeJsonExpectSaved } from './helpers/menusQ2'

/**
 * HL-06 (R3, teacher data loss): Library Delete removes exactly the Game the
 * teacher confirmed, through the teacher-visible route, and the result
 * survives a reload. Setup imports three Games through Home; after setup,
 * nothing touches persistence directly.
 *
 * The library is title-sorted and the hero shows the most recent Game, so the
 * target ("Bravo") is neither the first library entry nor the first Game on Home.
 */

const ALPHA = 'HL06 Alpha Keeper'
const BRAVO = 'HL06 Bravo Target'
const CHARLIE = 'HL06 Charlie Keeper'

/** The hero card or library row that shows exactly this Game title. */
function gameCard(page: Page, title: string) {
  return page
    .locator('section.home__hero, li.home__game')
    .filter({ has: page.getByText(title, { exact: true }) })
}

async function expectHomeShows(page: Page, present: readonly string[], absent: readonly string[]) {
  for (const title of present) {
    await expect(page.getByText(title, { exact: true }), `${title} present`).toBeVisible()
  }
  for (const title of absent) {
    await expect(page.getByText(title, { exact: true }), `${title} absent`).toHaveCount(0)
  }
}

test('Library Delete removes exactly the confirmed non-first Game and keeps the rest across reload', async ({
  page,
}) => {
  // Setup: three Games saved through Home import.
  await page.goto('./')
  for (const [id, title] of [
    ['hl06-alpha', ALPHA],
    ['hl06-bravo', BRAVO],
    ['hl06-charlie', CHARLIE],
  ] as const) {
    await importHomeJsonExpectSaved(page, menusBoardGameJson({ id, title, teamCount: 2 }))
    // The shared helper accepts any "Saved" status; wait for this Game's own
    // confirmation so a stale message from the previous import cannot pass.
    await expect(page.getByTestId('home-status')).toContainText(`Saved “${title}”`)
  }

  // Home, as a teacher returns to it.
  await page.reload()
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expectHomeShows(page, [ALPHA, BRAVO, CHARLIE], [])

  // Identify a Game that is not first: not first in the title-sorted library
  // (Alpha is) and not the first Game card on Home.
  const firstCardTitle = await page
    .locator('section.home__hero, li.home__game')
    .first()
    .locator('h2, strong')
    .first()
    .innerText()
  expect(firstCardTitle).not.toBe(BRAVO)
  expect([ALPHA, BRAVO, CHARLIE].sort()[0]).not.toBe(BRAVO)

  // More → Delete → Confirm, on the target's own card.
  const target = gameCard(page, BRAVO)
  await expect(target).toHaveCount(1)
  await target.getByText('More', { exact: true }).click()
  await target.getByRole('button', { name: 'Delete', exact: true }).click()
  await target.getByRole('button', { name: 'Confirm delete game' }).click()
  await expect(page.getByTestId('home-status')).toHaveText(
    'Game deleted. Your other games are unchanged.',
  )

  // Target gone, every other Game kept.
  await expectHomeShows(page, [ALPHA, CHARLIE], [BRAVO])

  // Durable: reload Home and look again.
  await page.reload()
  await expect(page.getByRole('heading', { name: /^home$/i })).toBeVisible()
  await expectHomeShows(page, [ALPHA, CHARLIE], [BRAVO])
})
