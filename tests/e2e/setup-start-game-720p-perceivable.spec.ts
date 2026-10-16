import { test, expect, type Page } from '@playwright/test'
import { fillAllTeamNames, importDemoAndPlay } from './helpers/menusClassSetup'

/**
 * Class Setup Start Game is perceivable at 1280×720 Ready (VP-HIDDEN / M48),
 * in Court order: REACH → ACT → VISIBLE EFFECT → CONTINUATION.
 *
 * - REACH: the teacher's natural Class Setup posture, exactly as the setup
 *   actions left it. No scrollIntoView, no scrollTo, no locator action on
 *   Start Game before the assertion. Start Game must be in the viewport,
 *   effectively opaque (self × every ancestor), and the topmost hit target.
 * - ACT: a pointer click at the measured on-screen point (page.mouse, which
 *   does not scroll), or Tab then Enter for the keyboard path.
 * - VISIBLE EFFECT: Host leaves setup for play posture.
 * - CONTINUATION: the ordinary round control opens the board.
 *
 * Both Ready paths are covered: default buzzers-first (Buzzers task shown
 * first, then Names) and Skip buzzers.
 *
 * 1280×720 is a Playwright CSS viewport, not physical projector qualification.
 */

const PROJECTOR_720P = { width: 1280, height: 720 } as const

type ReadyPath = 'buzzers-first' | 'skip-buzzers'

async function readyAt720p(page: Page, path: ReadyPath): Promise<void> {
  await page.setViewportSize(PROJECTOR_720P)
  await importDemoAndPlay(page)
  if (path === 'skip-buzzers') {
    await page.getByTestId('setup-skip-buzzers').first().click()
  }
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await expect(page.getByTestId('setup-play')).toHaveText(/start game/i)
}

type Perceivability = {
  scrollY: number
  opacity: number
  hiddenBy: string | null
  width: number
  height: number
  top: number
  bottom: number
  left: number
  right: number
  viewportWidth: number
  viewportHeight: number
  center: { x: number; y: number }
  topmostAt: string[]
}

/** Measures Start Game where it is now. Never scrolls. */
async function measureStartGame(page: Page): Promise<Perceivability> {
  return page.evaluate(() => {
    const play = document.querySelector('[data-testid="classroom-setup"] [data-testid="setup-play"]')
    if (!(play instanceof HTMLElement)) throw new Error('setup-play not found in Class Setup')
    let opacity = 1
    let hiddenBy: string | null = null
    for (let el: Element | null = play; el; el = el.parentElement) {
      const style = getComputedStyle(el)
      opacity *= Number.parseFloat(style.opacity)
      if (!hiddenBy && (style.visibility !== 'visible' || style.display === 'none')) {
        hiddenBy = `${el.tagName.toLowerCase()} visibility=${style.visibility} display=${style.display}`
      }
    }
    const rect = play.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const inset = 4
    const points = [
      center,
      { x: rect.left + inset, y: rect.top + inset },
      { x: rect.right - inset, y: rect.top + inset },
      { x: rect.left + inset, y: rect.bottom - inset },
      { x: rect.right - inset, y: rect.bottom - inset },
    ]
    const topmostAt = points.map(({ x, y }) => {
      const hit = document.elementFromPoint(x, y)
      if (hit && (hit === play || play.contains(hit))) return 'setup-play'
      if (!hit) return 'nothing'
      return hit.getAttribute('data-testid') ?? hit.tagName.toLowerCase()
    })
    return {
      scrollY: window.scrollY,
      opacity,
      hiddenBy,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      center,
      topmostAt,
    }
  })
}

function expectPerceivable(m: Perceivability): void {
  const where = `rect top=${Math.round(m.top)} bottom=${Math.round(m.bottom)} in ${m.viewportWidth}×${m.viewportHeight}, scrollY=${Math.round(m.scrollY)}`
  expect(m.hiddenBy, 'Start Game or an ancestor is hidden').toBeNull()
  expect(m.opacity, 'Start Game effective opacity (self × ancestors)').toBeGreaterThanOrEqual(0.95)
  expect(m.width, 'Start Game width').toBeGreaterThan(0)
  expect(m.height, 'Start Game height').toBeGreaterThan(0)
  expect(m.top >= 0 && m.left >= 0, `Start Game starts inside the viewport (${where})`).toBe(true)
  expect(
    m.bottom <= m.viewportHeight && m.right <= m.viewportWidth,
    `Start Game ends inside the viewport (${where})`,
  ).toBe(true)
  expect(m.topmostAt, `Start Game is the topmost hit target (${where})`).toEqual(
    Array(m.topmostAt.length).fill('setup-play'),
  )
}

/** Keyboard REACH: Tab alone. */
async function tabToStartGame(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const stops: string[] = []
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (el?.dataset.testid === 'setup-play' && el.closest('[data-testid="classroom-setup"]')) {
        return 'setup-play'
      }
      return el?.dataset.testid ?? el?.textContent?.trim().slice(0, 30) ?? ''
    })
    if (focused === 'setup-play') return
    if (stops.length > 0 && focused === stops[0]) break
    stops.push(focused)
  }
  throw new Error(`Start Game was not reachable with Tab; one focus cycle: ${stops.join(' | ')}`)
}

async function expectPlayContinues(page: Page): Promise<void> {
  // VISIBLE EFFECT
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('classroom-setup')).toHaveCount(0)
  await expect(page.getByTestId('host-play-status')).toBeVisible()
  // CONTINUATION: the ordinary round control opens the board.
  await page.getByTestId('rph-start').click()
  await expect(page.getByTestId('cbh-grid')).toBeVisible()
}

for (const path of ['buzzers-first', 'skip-buzzers'] as const) {
  test(`${path}: Start Game is perceivable at natural 1280×720 Ready posture; pointer starts the game`, async ({
    page,
  }) => {
    await readyAt720p(page, path)

    // REACH: as the setup actions left the page. Nothing scrolls before this.
    const before = await measureStartGame(page)
    expectPerceivable(before)

    // ACT: pointer at the measured visible point (page.mouse never scrolls).
    await page.mouse.click(before.center.x, before.center.y)

    await expectPlayContinues(page)
  })

  test(`${path}: Tab reaches a perceivable Start Game at 1280×720; Enter starts the game`, async ({
    page,
  }) => {
    await readyAt720p(page, path)

    // REACH
    await tabToStartGame(page)
    await expect(page.getByTestId('setup-play')).toBeFocused()
    expectPerceivable(await measureStartGame(page))

    // ACT
    await page.keyboard.press('Enter')

    await expectPlayContinues(page)
  })

  test(`${path}: no focused Class Setup control is hidden under the Ready strip at 1280×720`, async ({
    page,
  }) => {
    await readyAt720p(page, path)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

    const obscured: string[] = []
    const seen = new Set<string>()
    let first: string | null = null
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab')
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        const strip = document.querySelector('[data-testid="setup-outcome-strip"]')
        if (!el || el === document.body) return null
        const id = el.dataset.testid ?? el.textContent?.trim().slice(0, 30) ?? el.tagName
        if (!strip || strip.contains(el) || !el.closest('[data-testid="classroom-setup"]')) {
          return { id, inSetupOutsideStrip: false, overlap: false, detail: '' }
        }
        const a = el.getBoundingClientRect()
        const s = strip.getBoundingClientRect()
        const overlap = a.bottom > s.top && a.top < s.bottom && a.right > s.left && a.left < s.right
        return {
          id,
          inSetupOutsideStrip: true,
          overlap,
          detail: `${id} [${Math.round(a.top)}–${Math.round(a.bottom)}] vs strip [${Math.round(s.top)}–${Math.round(s.bottom)}]`,
        }
      })
      if (!r) continue
      if (first === null) first = r.id
      else if (r.id === first) break
      if (r.inSetupOutsideStrip) seen.add(r.id)
      if (r.overlap) obscured.push(r.detail)
    }
    // Positive control: the sweep actually visited the readiness rail.
    expect([...seen], 'Tab sweep visited Class Setup readiness rows').toEqual(
      expect.arrayContaining(['readiness-teams', 'readiness-names']),
    )
    expect(obscured, 'focused controls hidden under the Ready strip').toEqual([])
  })
}
