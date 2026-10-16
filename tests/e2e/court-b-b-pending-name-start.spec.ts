import { test, expect, type Locator, type Page } from '@playwright/test'
import { importMenusJsonAndPlay, menusBoardGameJson } from './helpers/menusGameJson'

/**
 * Court B repair B (CB-03) — a typed team name counts as typed, and one ordinary
 * activation of Start Game commits it and starts the game.
 *
 * Fail-first on beeacd33: the last typed name was committed only on blur/Enter.
 * The pointerdown on Start Game blurred the field, the commit re-laid out Class
 * Setup, Start Game moved out from under the pointer, and the first click did
 * nothing (1280x720: +88 px; 1920x1080: +23 px, inert in the button's top edge).
 */

/** Human-like pointer click (separate down/up with a dwell), not a synthetic click. */
async function pointerClick(page: Page, target: Locator, opts: { readonly topEdge?: boolean } = {}) {
  await target.scrollIntoViewIfNeeded()
  const before = await target.boundingBox()
  if (!before) throw new Error('target not rendered')
  const x = before.x + before.width / 2
  // Top-edge click: the region a +23 px shift used to vacate at 1920x1080.
  const y = opts.topEdge ? before.y + 6 : before.y + before.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  const duringPress = await target.boundingBox().catch(() => null)
  await page.waitForTimeout(90)
  await page.mouse.up()
  return { before, duringPress }
}

async function openNames(page: Page): Promise<Locator> {
  const setup = page.getByRole('region', { name: 'Class setup' })
  await expect(setup).toBeVisible()
  await setup.getByRole('button', { name: /^Names/ }).click()
  return setup
}

async function importDemoToSetup(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Import Game' }).click()
  await page.getByRole('button', { name: 'Import demo game' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
}

const startGame = (page: Page) => page.getByRole('button', { name: 'Start Game' })

async function expectGameStarted(page: Page, names: readonly string[]) {
  await expect(page.getByRole('region', { name: 'Class setup' })).toHaveCount(0)
  await expect(
    page.getByRole('status').filter({ hasText: /^Names ready/ }).first(),
  ).toBeVisible()
  const scoring = page.getByRole('region', { name: 'Teams & scoring' })
  for (const name of names) await expect(scoring.getByText(name, { exact: true }).first()).toBeVisible()
}

for (const topEdge of [false, true]) {
  test(`CB-03: one pointer click on Start Game starts with a typed, uncommitted last name (${
    topEdge ? 'top edge' : 'centre'
  })`, async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-host', 'pointer laptop/projector projects only')
    await importDemoToSetup(page)
    const setup = await openNames(page)
    const fields = setup.getByRole('textbox', { name: 'Type a name' })

    await fields.nth(0).fill('Comets')
    await fields.nth(0).press('Enter')
    await fields.nth(1).click()
    await page.keyboard.type('Magma')
    await expect(fields.nth(1)).toBeFocused()

    // Honest Ready state while the name is visibly typed (not "still needs a name").
    await expect(startGame(page)).toBeEnabled()
    await expect(setup.getByText(/still needs? (a )?names?\./)).toHaveCount(0)
    await expect(setup.getByRole('status').filter({ hasText: '✓ Ready' })).toBeVisible()

    const { before, duringPress } = await pointerClick(page, startGame(page), { topEdge })
    // The press itself must not move the action out from under the pointer.
    expect(duringPress?.y).toBe(before.y)

    await expectGameStarted(page, ['Comets', 'Magma'])
  })
}

test('CB-03: duplicate typed name blocks truthfully, then a fixed name starts in one click', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile-host', 'pointer laptop/projector projects only')
  await importDemoToSetup(page)
  const setup = await openNames(page)
  const fields = setup.getByRole('textbox', { name: 'Type a name' })

  await fields.nth(0).fill('Comets')
  await fields.nth(0).press('Enter')
  await fields.nth(1).click()
  await page.keyboard.type('  comets ')
  await expect(startGame(page)).toBeDisabled()
  await expect(setup.getByText('Each team needs a different name.')).toBeVisible()

  await fields.nth(1).fill('Magma')
  await expect(startGame(page)).toBeEnabled()
  await pointerClick(page, startGame(page))
  await expectGameStarted(page, ['Comets', 'Magma'])
})

test('CB-03: keyboard path still works (Enter commits; Tab to Start Game; Enter starts)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile-host', 'pointer laptop/projector projects only')
  await importDemoToSetup(page)
  const setup = await openNames(page)
  const fields = setup.getByRole('textbox', { name: 'Type a name' })

  await fields.nth(0).fill('Comets')
  await fields.nth(0).press('Enter')
  await expect(setup.getByText('Selected: Comets')).toBeVisible()
  await fields.nth(1).fill('Magma')
  await fields.nth(1).press('Enter')
  await expect(startGame(page)).toBeEnabled()

  let reached = false
  for (let i = 0; i < 40 && !reached; i += 1) {
    await page.keyboard.press('Tab')
    reached = await startGame(page).evaluate((el) => el === document.activeElement)
  }
  expect(reached).toBe(true)
  await page.keyboard.press('Enter')
  await expectGameStarted(page, ['Comets', 'Magma'])
})

test('CB-03: keyboard Tab from a typed, uncommitted last name commits it and Enter starts', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile-host', 'pointer laptop/projector projects only')
  await importDemoToSetup(page)
  const setup = await openNames(page)
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  await fields.nth(0).fill('Comets')
  await fields.nth(0).press('Enter')
  await fields.nth(1).click()
  await page.keyboard.type('Magma')

  let reached = false
  for (let i = 0; i < 40 && !reached; i += 1) {
    await page.keyboard.press('Tab')
    reached = await startGame(page).evaluate((el) => el === document.activeElement)
  }
  expect(reached).toBe(true)
  await page.keyboard.press('Enter')
  await expectGameStarted(page, ['Comets', 'Magma'])
})

test('CB-03: dense 8-team class starts in one click with the last name still typed', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'projector-720p', 'dense case runs at 1280x720')
  await importMenusJsonAndPlay(
    page,
    menusBoardGameJson({ id: 'cb03-dense-8', title: 'CB-03 Dense Eight', teamCount: 8 }),
  )
  const setup = await openNames(page)
  const fields = setup.getByRole('textbox', { name: 'Type a name' })
  const names = ['Ash', 'Basalt', 'Chert', 'Dolomite', 'Eclogite', 'Flint', 'Gneiss', 'Halite']
  for (let i = 0; i < 7; i += 1) {
    await fields.nth(i).fill(names[i]!)
    await fields.nth(i).press('Enter')
  }
  await fields.nth(7).click()
  await page.keyboard.type(names[7]!)
  await expect(startGame(page)).toBeEnabled()

  const { before, duringPress } = await pointerClick(page, startGame(page), { topEdge: true })
  expect(duringPress?.y).toBe(before.y)
  await expectGameStarted(page, names)
})
