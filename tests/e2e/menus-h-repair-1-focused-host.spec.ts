import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS H-REPAIR-1 — focused Host ordinary-lane semantic viewport proof.
 *
 * After authentic Start Game, concrete gameplay (e.g. tsp-scoreboard) must
 * intersect the first viewport at 1280×720, 1366×768, and sim125 (~1093×542)
 * without scrolling into view first. Controllers detail and large healthy
 * persistence must not precede gameplay. Active category-board separately
 * proves real cbh-grid (not host-gameplay substitution).
 */

test.describe.configure({ mode: 'serial' })

const VIEWPORTS = [
  { label: '1280×720', width: 1280, height: 720 },
  { label: '1366×768', width: 1366, height: 768 },
  { label: 'sim125 (~1093×542)', width: 1093, height: 542 },
] as const

/** Teacher-visible Slice-number / Slices-range implementation labels. */
const SLICE_NUMBER_COPY = /Slices?\s+\d/i

type Box = { top: number; bottom: number; height: number }

type PostStartReport = {
  posture: string | null
  setupCount: number
  gameplay: Box | null
  scoreboard: Box | null
  boardGridCount: number
  controllersDetailOpen: boolean | null
  controllersTop: number | null
  persistenceCompact: boolean | null
  persistenceHeight: number | null
  recoveryFieldsetCount: number
  mute: Box | null
  display: Box | null
  back: Box | null
  sliceNumberCopy: boolean
  viewportHeight: number
  gihPresent: boolean
}

type CategoryBoardReport = {
  posture: string | null
  board: Box | null
  boardTileCount: number
  boardCategoryCount: number
  controllersTop: number | null
  controllersDetailOpen: boolean | null
  sliceNumberCopy: boolean
  viewportHeight: number
}

async function startAuthenticPlay(page: Page): Promise<void> {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
}

async function measurePostStartViewport(page: Page): Promise<PostStartReport> {
  return page.evaluate(() => {
    const box = (el: Element | null): Box | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    }
    const foundation = document.querySelector('[data-testid="host-foundation"]')
    const gameplay = document.querySelector('[data-testid="host-gameplay"]')
    const scoreboard = document.querySelector('[data-testid="tsp-scoreboard"]')
    const controllersDetail = document.querySelector('[data-testid="gih-advanced-generic"]')
    const gih =
      document.querySelector('.gih') ?? document.querySelector('[data-testid="gih-summary"]')?.closest('section')
    const persistence = document.querySelector('[data-testid="persistence-recovery-chrome"]')
    const bodyText = document.body.innerText ?? ''
    return {
      posture: foundation?.getAttribute('data-posture') ?? null,
      setupCount: document.querySelectorAll('[data-testid="classroom-setup"]').length,
      gameplay: box(gameplay),
      scoreboard: box(scoreboard),
      boardGridCount: document.querySelectorAll('[data-testid="cbh-grid"]').length,
      controllersDetailOpen: controllersDetail
        ? (controllersDetail as HTMLDetailsElement).open
        : null,
      controllersTop: gih ? gih.getBoundingClientRect().top : null,
      persistenceCompact: persistence?.getAttribute('data-compact') === 'true',
      persistenceHeight: persistence ? persistence.getBoundingClientRect().height : null,
      recoveryFieldsetCount: document.querySelectorAll('[data-testid="persistence-recovery"]').length,
      mute: box(document.querySelector('[data-testid="host-chrome-mute"]')),
      display: box(document.querySelector('[data-testid="host-chrome-display"]')),
      back: box(document.querySelector('[data-testid="setup-play"]')),
      sliceNumberCopy: /Slices?\s+\d/i.test(bodyText),
      viewportHeight: window.innerHeight,
      gihPresent: Boolean(gih),
    }
  })
}

async function measureCategoryBoardViewport(page: Page): Promise<CategoryBoardReport> {
  return page.evaluate(() => {
    const box = (el: Element | null): Box | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    }
    const foundation = document.querySelector('[data-testid="host-foundation"]')
    // Real board only — never fall back to host-gameplay.
    const board = document.querySelector('[data-testid="cbh-grid"]')
    const gih =
      document.querySelector('.gih') ?? document.querySelector('[data-testid="gih-summary"]')?.closest('section')
    const controllersDetail = document.querySelector('[data-testid="gih-advanced-generic"]')
    const gameplayRoot = document.querySelector('[data-testid="host-gameplay"]')
    const ordinaryText = gameplayRoot
      ? (gameplayRoot as HTMLElement).innerText ?? ''
      : document.body.innerText ?? ''
    return {
      posture: foundation?.getAttribute('data-posture') ?? null,
      board: box(board),
      boardTileCount: document.querySelectorAll('[data-testid^="cbh-tile-"]').length,
      boardCategoryCount: document.querySelectorAll('.cbh__category').length,
      controllersTop: gih ? gih.getBoundingClientRect().top : null,
      controllersDetailOpen: controllersDetail
        ? (controllersDetail as HTMLDetailsElement).open
        : null,
      sliceNumberCopy: /Slices?\s+\d/i.test(ordinaryText),
      viewportHeight: window.innerHeight,
    }
  })
}

function assertPostStartViewport(report: PostStartReport, label: string): void {
  expect(report.posture, `${label} posture`).toBe('play')
  expect(report.setupCount, `${label} setup absent`).toBe(0)

  // Concrete gameplay — scoreboard, not merely host-gameplay shell.
  expect(report.scoreboard, `${label} tsp-scoreboard present`).not.toBeNull()
  expect(report.scoreboard!.height, `${label} tsp-scoreboard has height`).toBeGreaterThan(8)
  expect(report.scoreboard!.top, `${label} tsp-scoreboard intersects viewport top`).toBeLessThan(
    report.viewportHeight,
  )
  expect(report.scoreboard!.bottom, `${label} tsp-scoreboard intersects viewport bottom`).toBeGreaterThan(
    0,
  )

  expect(report.controllersDetailOpen, `${label} Controllers detail collapsed`).toBe(false)
  expect(report.controllersTop, `${label} Controllers mounted`).not.toBeNull()
  expect(report.controllersTop!, `${label} Controllers after scoreboard`).toBeGreaterThanOrEqual(
    report.scoreboard!.top - 0.5,
  )

  expect(report.recoveryFieldsetCount, `${label} no recovery fieldset on healthy path`).toBe(0)
  expect(report.persistenceCompact, `${label} healthy persistence compact`).toBe(true)
  expect(report.persistenceHeight, `${label} healthy persistence height`).not.toBeNull()
  expect(report.persistenceHeight!, `${label} healthy persistence not large card`).toBeLessThan(120)

  const inViewport = (b: Box | null, name: string) => {
    expect(b, `${label} ${name} present`).not.toBeNull()
    expect(b!.top, `${label} ${name} in viewport`).toBeLessThan(report.viewportHeight)
    expect(b!.bottom, `${label} ${name} reaches viewport`).toBeGreaterThan(0)
  }
  inViewport(report.mute, 'Mute')
  inViewport(report.display, 'Display')
  inViewport(report.back, 'Back to setup')

  expect(report.sliceNumberCopy, `${label} no teacher-visible Slice-number copy`).toBe(false)
  expect(report.gihPresent, `${label} Gamepad panel mounted`).toBe(true)
}

function assertCategoryBoardViewport(report: CategoryBoardReport, label: string): void {
  expect(report.posture, `${label} posture`).toBe('play')
  expect(report.board, `${label} real cbh-grid present (not host-gameplay)`).not.toBeNull()
  expect(report.board!.height, `${label} cbh-grid has height`).toBeGreaterThan(8)
  expect(report.board!.top, `${label} cbh-grid intersects viewport`).toBeLessThan(report.viewportHeight)
  expect(report.board!.bottom, `${label} cbh-grid reaches viewport`).toBeGreaterThan(0)

  expect(report.boardCategoryCount, `${label} board categories visible`).toBeGreaterThan(0)
  expect(report.boardTileCount, `${label} board tiles reachable`).toBeGreaterThan(0)

  expect(report.controllersDetailOpen, `${label} Controllers detail collapsed`).toBe(false)
  expect(report.controllersTop, `${label} Controllers mounted`).not.toBeNull()
  expect(report.controllersTop!, `${label} Controllers after cbh-grid`).toBeGreaterThanOrEqual(
    report.board!.top - 0.5,
  )

  expect(report.sliceNumberCopy, `${label} no teacher-visible Slice-number in gameplay`).toBe(false)
}

for (const vp of VIEWPORTS) {
  test(`${vp.label} Start → concrete gameplay-first focused Host (no scroll-before-assert)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await startAuthenticPlay(page)
    // Intentionally no page.mouse.wheel / scrollIntoView before measure.
    const report = await measurePostStartViewport(page)
    assertPostStartViewport(report, vp.label)
  })
}

for (const vp of VIEWPORTS) {
  test(`${vp.label} active category-board → real cbh-grid precedes Controllers`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await startAuthenticPlay(page)

    // Legitimate round-advance path (More → Advance). Do not auto-select a round.
    await ensureHostMoreOpen(page)
    await page.getByRole('button', { name: /advance to next round/i }).click()
    await expect(page.getByTestId('cbh-grid')).toBeVisible()
    // Close More so ordinary focused Host is the measured surface again.
    const more = page.getByTestId('host-more')
    if ((await more.getAttribute('open')) !== null) {
      await more.locator(':scope > summary').click()
    }
    await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
    await page.evaluate(() => window.scrollTo(0, 0))

    const report = await measureCategoryBoardViewport(page)
    assertCategoryBoardViewport(report, vp.label)

    // Meaningful board content reachable without substituting host-gameplay.
    const firstTile = page.locator('[data-testid^="cbh-tile-"]').first()
    await expect(firstTile).toBeVisible()
    const tileBox = await firstTile.boundingBox()
    expect(tileBox, `${vp.label} board tile has box`).not.toBeNull()
  })
}

test('lifecycle: Gamepad owner stays mounted across Start and Back; keyboard path live', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)

  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  // Setup Buzzers panel is mounted (selection mode).
  await expect(page.locator('#gih-title')).toHaveText(/^Buzzers$/i)
  await page.locator('.gih').first().evaluate((el) => {
    el.setAttribute('data-h-repair-lifecycle', 'mounted')
  })

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-gameplay')).toBeVisible()
  await expect(page.getByTestId('tsp-scoreboard')).toBeVisible()
  await expect(page.locator('#gih-title')).toHaveText(/^Controllers$/i)
  await expect(page.getByTestId('gih-advanced-generic')).not.toHaveAttribute('open', '')

  // Same GIH section node (no remount from sibling-order flip).
  await expect(
    page.locator('.gih[data-h-repair-lifecycle="mounted"]'),
    'GamepadInputHostPanel DOM node stable across Start',
  ).toHaveCount(1)

  // Demoted lifecycle owners remain in DOM under closed More.
  await expect(page.getByTestId('host-more')).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('host-advanced')).toBeAttached()
  await expect(page.getByTestId('persistence-library')).toBeAttached()

  // Keyboard LocalInput mounts with an active board round (round advance lives
  // under More; Controllers demotion must not unmount keyboard when round is live).
  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /advance to next round/i }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  await expect(page.getByTestId('lih-summary')).toBeAttached()
  await expect(
    page.locator('.gih[data-h-repair-lifecycle="mounted"]'),
    'Gamepad owner still mounted after round advance',
  ).toHaveCount(1)

  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
  await expect(page.getByTestId('classroom-setup')).toBeVisible()
  await expect(page.locator('#gih-title')).toHaveText(/^Buzzers$/i)
  await expect(
    page.locator('.gih[data-h-repair-lifecycle="mounted"]'),
    'GamepadInputHostPanel DOM node stable across Back',
  ).toHaveCount(1)
})

test('healthy persistence stays compact; recovery stays prominent', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await startAuthenticPlay(page)
  await expect(page.getByTestId('persistence-recovery-chrome')).toHaveAttribute('data-compact', 'true')
  await expect(page.getByTestId('persistence-recovery')).toHaveCount(0)
  await expect(page.getByTestId('persistence-status')).toBeVisible()

  await expect(page.getByTestId('persistence-status')).toHaveText(
    /saved on this device|ready to save|Saving this class session/i,
  )
  await page.reload()
  await expect(page.getByTestId('persistence-recovery')).toBeVisible()
  await expect(page.getByTestId('persistence-recovery-chrome')).not.toHaveAttribute(
    'data-compact',
    'true',
  )
  await expect(page.getByTestId('persistence-resume')).toBeVisible()
})

test('ordinary play DOM has no teacher-visible Slice-number labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await startAuthenticPlay(page)
  await expect(page.getByTestId('tsp-scoreboard')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(SLICE_NUMBER_COPY)

  await ensureHostMoreOpen(page)
  await page.getByRole('button', { name: /advance to next round/i }).click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  // Scope to ordinary gameplay lane (not More/ledger advanced surfaces).
  await expect(page.getByTestId('host-gameplay')).not.toContainText(SLICE_NUMBER_COPY)
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
  await expect(page.locator('.cbh .foundation__tag')).toHaveText(
    /Category board — host controls, private/i,
  )
})
