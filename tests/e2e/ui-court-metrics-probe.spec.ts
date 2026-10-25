/**
 * UI/DESIGN QUALIFICATION — objective rendered-metrics probe.
 *
 * Gate: CQS_UI_COURT_CAPTURE=1
 * Output: CQS_UI_COURT_OUT/metrics/*.json
 *
 * Measures facts a human reviewer cannot read off a screenshot, from the REAL
 * rendered DOM at the frozen candidate: text contrast against the actually
 * painted backdrop, interactive target sizes, focus-indicator visibility, and
 * projector type scale. It asserts nothing and changes nothing — it produces
 * evidence for the accessibility and legibility benches.
 *
 * These numbers supplement human reasoning; they do not replace it.
 */

import { test, expect, type Browser, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { prepareDeterministicCapture } from './helpers/visualHistoryCapture'
import { fillAllTeamNames } from './helpers/menusClassSetup'
import { advanceToNextRound, openAudienceFromHost } from './helpers/menusQ3'

import { CAPTURE_ON, OUT_ROOT, VP, uiCourtGame, type Vp } from './helpers/uiCourtCapture'

/**
 * Browser-side probe. Runs in the page so every value is the painted truth:
 * resolved colours, real box sizes, real computed focus styles.
 */
const PROBE = `(() => {
  const parseColor = (value) => {
    const m = String(value).match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const la = lum(a)
    const lb = lum(b)
    const hi = Math.max(la, lb)
    const lo = Math.min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
  }
  /** Walk ancestors until an opaque-enough backdrop is found, compositing as we go. */
  const backdrop = (el) => {
    let acc = null
    let node = el
    while (node && node !== document.documentElement.parentNode) {
      const bg = parseColor(getComputedStyle(node).backgroundColor)
      if (bg && bg.a > 0) {
        acc = acc ? over(acc, bg) : bg
        if (acc.a >= 0.999) return acc
      }
      node = node.parentElement
    }
    const white = { r: 255, g: 255, b: 255, a: 1 }
    return acc ? over(acc, white) : white
  }
  /**
   * Real rendered visibility. checkVisibility is what correctly excludes a
   * subtree Chromium has skipped — notably the contents of a CLOSED <details>,
   * whose descendants still report a non-zero bounding box but are not painted
   * and have empty innerText. Measuring those produced a false "43 buttons
   * have no accessible name" result before this was corrected.
   */
  const visible = (el) => {
    if (typeof el.checkVisibility === 'function') {
      if (
        !el.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
          contentVisibilityAuto: true,
        })
      ) {
        return false
      }
    }
    if (el.closest('details:not([open])')) return false
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const ownText = (el) => {
    let t = ''
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent
    return t.replace(/\\s+/g, ' ').trim()
  }
  const label = (el) => {
    const id = el.getAttribute('data-testid')
    const text = (el.innerText || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()
    return { testid: id, text: text.slice(0, 70), tag: el.tagName.toLowerCase() }
  }

  // ── text contrast ────────────────────────────────────────────────────────
  const textFindings = []
  for (const el of document.querySelectorAll('body *')) {
    const text = ownText(el)
    if (text.length < 2) continue
    if (!visible(el)) continue
    const s = getComputedStyle(el)
    const fg = parseColor(s.color)
    if (!fg) continue
    const bg = backdrop(el)
    const composited = fg.a < 1 ? over(fg, bg) : fg
    const px = parseFloat(s.fontSize) || 16
    const weight = Number(s.fontWeight) || 400
    const large = px >= 24 || (px >= 18.66 && weight >= 700)
    const r = ratio(composited, bg)
    const required = large ? 3 : 4.5
    textFindings.push({
      ...label(el),
      snippet: text.slice(0, 70),
      fontPx: Math.round(px * 10) / 10,
      fontWeight: weight,
      large,
      ratio: Math.round(r * 100) / 100,
      requiredAA: required,
      passAA: r >= required - 0.005,
    })
  }

  // ── interactive target sizes ─────────────────────────────────────────────
  const targets = []
  const sel = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])'
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    const type = el.getAttribute('type')
    targets.push({
      ...label(el),
      type,
      width: Math.round(r.width),
      height: Math.round(r.height),
      min: Math.round(Math.min(r.width, r.height)),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
    })
  }

  // ── accessible-name gaps on interactive controls ─────────────────────────
  const unnamed = []
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue
    const txt = (el.innerText || '').trim()
    const aria = el.getAttribute('aria-label')
    const labelledby = el.getAttribute('aria-labelledby')
    const title = el.getAttribute('title')
    const id = el.getAttribute('id')
    const forLabel = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null
    const wrapped = el.closest('label')
    if (!txt && !aria && !labelledby && !title && !forLabel && !wrapped) {
      unnamed.push(label(el))
    }
  }

  // ── projector type scale ─────────────────────────────────────────────────
  const typeScale = []
  for (const el of document.querySelectorAll('body *')) {
    const text = ownText(el)
    if (text.length < 2 || !visible(el)) continue
    const s = getComputedStyle(el)
    typeScale.push({
      ...label(el),
      snippet: text.slice(0, 50),
      fontPx: Math.round((parseFloat(s.fontSize) || 0) * 10) / 10,
      lineHeightPx: Math.round((parseFloat(s.lineHeight) || 0) * 10) / 10,
      weight: Number(s.fontWeight) || 400,
      letterSpacing: s.letterSpacing,
    })
  }

  // ── horizontal overflow ──────────────────────────────────────────────────
  const docOverflow = {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }

  return { textFindings, targets, unnamed, typeScale, docOverflow }
})()`

const FOCUS_PROBE = `(() => {
  const el = document.activeElement
  if (!el || el === document.body) return { focused: null }
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    focused: {
      testid: el.getAttribute('data-testid'),
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineColor: s.outlineColor,
      outlineOffset: s.outlineOffset,
      boxShadow: s.boxShadow,
      width: Math.round(r.width),
      height: Math.round(r.height),
    },
  }
})()`

type Report = Record<string, unknown>
const reports: Record<string, Report> = {}

async function probe(page: Page, key: string, vp: Vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await prepareDeterministicCapture(page)
  await page.waitForTimeout(200)
  const data = (await page.evaluate(PROBE)) as Report
  reports[`${key}@${vp.label}`] = { ...data, url: page.url(), viewport: vp.label }
}

/** Tab through the surface and record what focus looks like at each stop. */
async function focusWalk(page: Page, key: string, stops = 14) {
  const walk: unknown[] = []
  await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => undefined)
  for (let i = 0; i < stops; i += 1) {
    await page.keyboard.press('Tab')
    walk.push(await page.evaluate(FOCUS_PROBE))
  }
  reports[`${key}@focus-walk`] = { walk }
}

function writeReports() {
  const dir = path.join(OUT_ROOT, 'metrics')
  fs.mkdirSync(dir, { recursive: true })
  for (const [key, value] of Object.entries(reports)) {
    const safe = key.replace(/[^a-zA-Z0-9._@-]/g, '_')
    fs.writeFileSync(path.join(dir, `${safe}.json`), `${JSON.stringify(value, null, 2)}\n`)
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('UI Court metrics probe', () => {
  test.skip(!CAPTURE_ON, 'Set CQS_UI_COURT_CAPTURE=1')
  test.skip(!OUT_ROOT, 'Set CQS_UI_COURT_OUT')

  test.afterAll(() => writeReports())

  test('probe Home, Setup, Host and Display', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(600_000)
    const context = await (browser as Browser).newContext({
      viewport: VP.laptop,
      baseURL: info.project.use.baseURL,
    })
    const host = await context.newPage()
    try {
      // Home, empty.
      await host.goto('./')
      await expect(host.getByRole('heading', { name: /^home$/i })).toBeVisible()
      await probe(host, 'home-empty', VP.laptop)
      await focusWalk(host, 'home-empty')

      // Home, populated.
      await host.getByTestId('home-import-game').click()
      await host.locator('#home-import-json').fill(uiCourtGame({ id: 'metrics-1', title: 'Metrics Game' }))
      await host.getByTestId('home-import-json').click()
      await expect(host.getByTestId('import-quality-report')).toBeVisible()
      await probe(host, 'home-populated', VP.laptop)

      // Class Setup.
      await host.getByRole('button', { name: /^play$/i }).first().click()
      await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })
      await probe(host, 'setup-initial', VP.laptop)
      await probe(host, 'setup-initial', VP.proj720)
      await host.setViewportSize(VP.laptop)
      await focusWalk(host, 'setup-initial')

      const skip = host.getByTestId('setup-skip-buzzers')
      if (await skip.isVisible().catch(() => false)) await skip.click()
      await host.getByTestId('readiness-names').click()
      await probe(host, 'setup-names', VP.laptop)
      await fillAllTeamNames(host)
      await expect(host.getByTestId('setup-ready-heading')).toBeVisible()
      await probe(host, 'setup-ready', VP.laptop)
      await probe(host, 'setup-ready', VP.proj720)
      await host.setViewportSize(VP.laptop)

      // Host play posture.
      await host.getByTestId('setup-play').click()
      await expect(host.getByTestId('tsp-scoreboard')).toBeVisible()
      await probe(host, 'host-play-preamble', VP.laptop)
      await focusWalk(host, 'host-play-preamble', 20)

      const display = await openAudienceFromHost(context, host)
      await probe(display, 'display-waiting', VP.proj1080)
      await probe(display, 'display-waiting', VP.proj720)

      await advanceToNextRound(host)
      await expect(host.getByTestId('cbh-grid')).toBeVisible()
      await probe(host, 'host-board', VP.laptop)
      await probe(display, 'display-board', VP.proj1080)
      await probe(display, 'display-board', VP.proj720)

      await host.getByTestId('cbh-tile-science-100').click()
      await host.getByTestId('cbh-reveal-prompt').click()
      await probe(host, 'host-clue-revealed', VP.laptop)
      await probe(display, 'display-clue-revealed', VP.proj1080)
      await probe(display, 'display-clue-revealed', VP.proj720)

      await host.getByTestId('rth-arm').click()
      await host.keyboard.press('Digit1')
      await probe(host, 'host-buzz-active', VP.laptop)
      await probe(display, 'display-buzz-active', VP.proj1080)
      await probe(display, 'display-buzz-active', VP.proj720)

      await host.getByTestId('lih-correct').click()
      await host.getByTestId('tsp-target-team1').click()
      await host.getByTestId('tsp-award-full').click()
      await probe(host, 'host-score-awarded', VP.laptop)
      await probe(display, 'display-score-awarded', VP.proj1080)
      await probe(display, 'display-score-awarded', VP.proj720)
      await focusWalk(host, 'host-score-awarded', 24)

      // High-contrast theme on the same public state.
      const hc = await context.newPage()
      await hc.goto('#/display?theme=high-contrast')
      await probe(hc, 'display-high-contrast', VP.proj720)
      await hc.close().catch(() => undefined)

      await display.close().catch(() => undefined)
    } finally {
      writeReports()
      await context.close().catch(() => undefined)
    }
  })

  /**
   * High contrast on the surfaces that actually have controls.
   *
   * The first pass measured high contrast only on the Display, which has no
   * interactive controls at all — so it said nothing about focus rings,
   * disabled states or control contrast under the theme a teacher would turn
   * on precisely because they need it. The teacher reaches the theme through
   * More -> Theme, so this drives that ordinary route.
   */
  test('probe Host and Setup in high contrast', async ({ browser }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'driver project only')
    test.setTimeout(420_000)
    const context = await (browser as Browser).newContext({
      viewport: VP.laptop,
      baseURL: info.project.use.baseURL,
    })
    const host = await context.newPage()
    try {
      await host.goto('./')
      await host.getByTestId('home-import-game').click()
      await host.locator('#home-import-json').fill(uiCourtGame({ id: 'metrics-hc', title: 'High Contrast Game' }))
      await host.getByTestId('home-import-json').click()
      await expect(host.getByTestId('import-quality-report')).toBeVisible({ timeout: 15_000 })
      await host.getByRole('button', { name: /^play$/i }).first().click()
      await expect(host.getByTestId('classroom-setup')).toBeVisible({ timeout: 20_000 })

      // Turn high contrast on through the teacher's own route.
      await host.locator('details[data-testid="host-more"] > summary').click()
      await host.getByRole('radio', { name: /high contrast/i }).check()
      await expect(host.locator('html')).toHaveAttribute('data-theme', 'high-contrast', {
        timeout: 10_000,
      })
      await host.locator('details[data-testid="host-more"] > summary').click()

      await probe(host, 'hc-setup-initial', VP.laptop)
      await focusWalk(host, 'hc-setup-initial')
      await host.screenshot({
        path: `${OUT_ROOT}/system/hc-setup-initial--laptop-1366x768.png`,
        fullPage: true,
      })

      const skip = host.getByTestId('setup-skip-buzzers')
      if (await skip.isVisible().catch(() => false)) await skip.click()
      await host.getByTestId('readiness-names').click()
      await fillAllTeamNames(host)
      await expect(host.getByTestId('setup-ready-heading')).toBeVisible()
      await probe(host, 'hc-setup-ready', VP.laptop)
      await host.screenshot({
        path: `${OUT_ROOT}/system/hc-setup-ready--laptop-1366x768.png`,
        fullPage: true,
      })

      await host.getByTestId('setup-play').click()
      await expect(host.getByTestId('tsp-scoreboard')).toBeVisible()
      await advanceToNextRound(host)
      await expect(host.getByTestId('cbh-grid')).toBeVisible({ timeout: 15_000 })
      await probe(host, 'hc-host-board', VP.laptop)
      await host.screenshot({
        path: `${OUT_ROOT}/system/hc-host-board--laptop-1366x768.png`,
        fullPage: true,
      })

      await host.getByTestId('cbh-tile-science-100').click()
      await host.getByTestId('cbh-reveal-prompt').click()
      await host.getByTestId('rth-arm').click()
      await host.keyboard.press('Digit1')
      await probe(host, 'hc-host-buzz-active', VP.laptop)
      await focusWalk(host, 'hc-host-buzz-active', 20)
      await host.screenshot({
        path: `${OUT_ROOT}/system/hc-host-buzz-active--laptop-1366x768.png`,
        fullPage: true,
      })

      const display = await openAudienceFromHost(context, host)
      await probe(display, 'hc-display-buzz-active', VP.proj1080)
      await probe(display, 'hc-display-buzz-active', VP.proj720)
      await display.setViewportSize(VP.proj720)
      await display.screenshot({
        path: `${OUT_ROOT}/system/hc-display-buzz-active--projector-1280x720.png`,
      })
      await display.close().catch(() => undefined)
    } finally {
      writeReports()
      await context.close().catch(() => undefined)
    }
  })
})
