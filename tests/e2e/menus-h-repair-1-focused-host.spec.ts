import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * MENUS H-REPAIR-1 — focused Host ordinary-lane semantic viewport proof.
 *
 * After authentic Start Game, gameplay must intersect the first viewport at
 * 1280×720, 1366×768, and sim125 (~1093×542) without scrolling into view first.
 * Controllers detail and large healthy persistence must not precede gameplay.
 */

test.describe.configure({ mode: 'serial' })

const VIEWPORTS = [
  { label: '1280×720', width: 1280, height: 720 },
  { label: '1366×768', width: 1366, height: 768 },
  { label: 'sim125 (~1093×542)', width: 1093, height: 542 },
] as const

type ViewportReport = {
  posture: string | null
  setupCount: number
  gameplay: { top: number; bottom: number; height: number } | null
  board: { top: number; bottom: number; height: number } | null
  controllersDetailOpen: boolean | null
  controllersTop: number | null
  persistenceCompact: boolean | null
  persistenceHeight: number | null
  recoveryFieldsetCount: number
  mute: { top: number; bottom: number } | null
  display: { top: number; bottom: number } | null
  back: { top: number; bottom: number } | null
  slicesCopy: boolean
  viewportHeight: number
  gihPresent: boolean
}

async function startAuthenticPlay(page: Page): Promise<void> {
  await importDemoAndPlay(page)
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
}

async function measurePlayViewport(page: Page): Promise<ViewportReport> {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    }
    const foundation = document.querySelector('[data-testid="host-foundation"]')
    const gameplay = document.querySelector('[data-testid="host-gameplay"]')
    const board =
      document.querySelector('[data-testid="cbh-grid"]') ??
      document.querySelector('[data-testid="host-gameplay"]')
    const controllersDetail = document.querySelector('[data-testid="gih-advanced-generic"]')
    const gih =
      document.querySelector('.gih') ?? document.querySelector('[data-testid="gih-summary"]')?.closest('section')
    const persistence = document.querySelector('[data-testid="persistence-recovery-chrome"]')
    const bodyText = document.body.innerText ?? ''
    return {
      posture: foundation?.getAttribute('data-posture') ?? null,
      setupCount: document.querySelectorAll('[data-testid="classroom-setup"]').length,
      gameplay: box(gameplay),
      board: box(board),
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
      slicesCopy: /Slices\s*9\s*[–-]\s*21/i.test(bodyText),
      viewportHeight: window.innerHeight,
      gihPresent: Boolean(gih),
    }
  })
}

function assertPlayViewport(report: ViewportReport, label: string): void {
  expect(report.posture, `${label} posture`).toBe('play')
  expect(report.setupCount, `${label} setup absent`).toBe(0)
  expect(report.gameplay, `${label} gameplay present`).not.toBeNull()
  expect(report.board, `${label} board/gameplay surface present`).not.toBeNull()

  const surface = report.board!
  expect(surface.height, `${label} gameplay has height`).toBeGreaterThan(8)
  expect(surface.top, `${label} gameplay intersects viewport top`).toBeLessThan(report.viewportHeight)
  expect(surface.bottom, `${label} gameplay intersects viewport bottom`).toBeGreaterThan(0)

  expect(report.controllersDetailOpen, `${label} Controllers detail collapsed`).toBe(false)
  expect(report.controllersTop, `${label} Controllers mounted`).not.toBeNull()
  expect(report.controllersTop!, `${label} Controllers after gameplay`).toBeGreaterThanOrEqual(
    report.gameplay!.top - 0.5,
  )

  expect(report.recoveryFieldsetCount, `${label} no recovery fieldset on healthy path`).toBe(0)
  expect(report.persistenceCompact, `${label} healthy persistence compact`).toBe(true)
  expect(report.persistenceHeight, `${label} healthy persistence height`).not.toBeNull()
  expect(report.persistenceHeight!, `${label} healthy persistence not large card`).toBeLessThan(120)

  const inViewport = (b: { top: number; bottom: number } | null, name: string) => {
    expect(b, `${label} ${name} present`).not.toBeNull()
    expect(b!.top, `${label} ${name} in viewport`).toBeLessThan(report.viewportHeight)
    expect(b!.bottom, `${label} ${name} reaches viewport`).toBeGreaterThan(0)
  }
  inViewport(report.mute, 'Mute')
  inViewport(report.display, 'Display')
  inViewport(report.back, 'Back to setup')

  expect(report.slicesCopy, `${label} no Slices 9–21 copy`).toBe(false)
  expect(report.gihPresent, `${label} Gamepad panel mounted`).toBe(true)
}

for (const vp of VIEWPORTS) {
  test(`${vp.label} Start → gameplay-first focused Host (no scroll-before-assert)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await startAuthenticPlay(page)
    // Intentionally no page.mouse.wheel / scrollIntoView before measure.
    const report = await measurePlayViewport(page)
    assertPlayViewport(report, vp.label)
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
