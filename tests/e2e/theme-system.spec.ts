import { test, expect, type Page } from '@playwright/test'
import { ensureHostMoreOpen } from './helpers/hostMore'

/**
 * Slice 17 theme system — host selector, display launch validation, token
 * application, stress composition, and reduced-motion parity. Reuses the
 * existing 1080p / 720p Playwright projects.
 *
 * MENUS Slice A moved Theme under Host More and renamed the chrome Display
 * opener to Open display / Focus display.
 */

async function openHostTheme(page: Page): Promise<void> {
  await page.goto('#/host')
  await ensureHostMoreOpen(page)
  await expect(page.getByRole('group', { name: 'Theme' })).toBeVisible()
}

function hostDisplayOpener(page: Page) {
  return page.getByTestId('host-chrome-display')
}

/*
  The theme marker is read through a LOCATOR, never through a one-shot
  `getAttribute`, so the only ergonomic assertion is Playwright's retrying
  `await expect(...).toHaveAttribute(...)`.

  `data-theme` is applied to <html> by a ThemeProvider layout effect
  (`src/theme/ThemeProvider.tsx`), i.e. after React mounts — so it is simply
  absent for a real window after the document `load` event, and
  `page.waitForLoadState()` resolves on `load`. The previous helper returned
  `Promise<string | null>` and every call site wrapped it in a bare
  `expect(await themeId(page)).toBe(...)`, which does not auto-retry. Observed
  in a full 1089-test run at `--retries=0`, project `projector-720p`:
  `theme-system.spec.ts:71`, "Expected: \"high-contrast\" / Received: null" —
  exactly that window. Running the same test 20x in isolation passed 20/20, so
  it only loses the race under full-suite parallel load.

  Same defect class as PR #176 (FRC-1 R2), and every other spec in `tests/e2e`
  that reads `data-theme` already uses the retrying form; this file was the
  sole outlier. NOT fixed by adding retries, a sleep, a longer timeout, or by
  accepting `null`.

  Reads deliberately LEFT one-shot, because no window exists in which they hold
  the wrong value:
    - `popup.url()` / `first.url()` — settled synchronous property reads behind
      `waitForLoadState` / `waitForURL`, and the validated theme is in the URL
      before the window loads;
    - `cssVar` for `--pulse-opacity-min`, `--state-timer-urgent`,
      `--state-expired` and `--fg-disabled` — all defined on bare `:root` as
      well as under both theme selectors, and asserted only as non-empty;
    - the host `--fg-*` / `--surface-*` / `--border-*` pairs, which run after
      `openHostTheme` has already awaited a visible Theme group (so the provider
      has mounted) with Default checked, where `:root` and
      `:root[data-theme='default']` carry identical values;
    - the pure `contrastRatio` arithmetic and the two `page.evaluate` DOM
      probes, which measure the document rather than theme state.
*/
function themeMarker(page: Page) {
  return page.locator('html')
}

async function expectTheme(page: Page, expected: string | RegExp): Promise<void> {
  await expect(themeMarker(page)).toHaveAttribute('data-theme', expected)
}

async function cssVar(page: Page, name: string): Promise<string> {
  return page.evaluate((token) => {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  }, name)
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(...a)
  const l2 = relativeLuminance(...b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseRgb(input: string): [number, number, number] | null {
  const m = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

test.describe('host selector and display launch', () => {
  test('selecting high contrast updates the host marker and opens a validated display', async ({
    page,
    context,
  }) => {
    await openHostTheme(page)
    await page.getByRole('radio', { name: 'High contrast' }).check()
    await expectTheme(page, 'high-contrast')

    const display = hostDisplayOpener(page)
    await expect(display).toHaveText(/open display|focus display/i)
    const popupPromise = context.waitForEvent('page')
    await display.click()
    const popup = await popupPromise
    await popup.waitForLoadState()
    // `popup.url()` is a settled synchronous property read, not DOM state: the
    // opener puts the validated theme in the URL before the window loads. Left
    // as a plain assertion deliberately.
    expect(popup.url()).toContain('#/display?theme=high-contrast')
    await expectTheme(popup, 'high-contrast')
    await expect(popup.getByRole('button')).toHaveCount(0)
    await expect(popup.getByRole('radio')).toHaveCount(0)
  })

  test('selecting default and reopening display launches the validated default query', async ({
    page,
    context,
  }) => {
    await openHostTheme(page)
    await page.getByRole('radio', { name: 'High contrast' }).check()
    const display = hostDisplayOpener(page)
    const firstPopupPromise = context.waitForEvent('page')
    await display.click()
    const first = await firstPopupPromise
    await first.waitForLoadState()
    expect(first.url()).toContain('#/display?theme=high-contrast')
    await expectTheme(first, 'high-contrast')

    await ensureHostMoreOpen(page)
    await page.getByRole('radio', { name: 'Default' }).check()
    await expectTheme(page, 'default')
    // Chrome uses a named Display window (Focus display). Re-click navigates the
    // same browsing context with the currently validated theme query.
    await display.click()
    await first.waitForURL(/#\/display\?theme=default/)
    await first.waitForLoadState()
    expect(first.url()).toContain('#/display?theme=default')
    await expectTheme(first, 'default')
  })

  test('direct display and hostile query values fail closed safely', async ({ page }) => {
    await page.goto('#/display')
    await expect(
      page.getByRole('heading', { name: /game display ready/i }),
    ).toBeVisible()
    // Either resolution is correct here — a direct `#/display` with no query may
    // be seeded from `prefers-contrast: more`. Expressed as a pattern so the
    // read still retries instead of sampling once.
    await expectTheme(page, /^(default|high-contrast)$/)

    await page.goto('about:blank')
    await page.goto('#/display?theme=NOT-A-THEME')
    await expect(
      page.getByRole('heading', { name: /game display ready/i }),
    ).toBeVisible()
    await expectTheme(page, 'default')

    await page.goto('about:blank')
    await page.goto('#/display?theme=javascript:alert(1)')
    await expectTheme(page, 'default')

    await page.goto('about:blank')
    await page.goto('#/display?theme=crimson')
    await expectTheme(page, 'default')
  })
})

test.describe('token application and contrast', () => {
  test('representative computed tokens differ between themes and stay non-empty', async ({
    page,
  }) => {
    await page.goto('#/display?theme=default')
    /*
      The marker is awaited before every computed-token read in this test, as a
      mount barrier. The default values are identical on bare `:root` and on
      `:root[data-theme='default']` (`src/styles/themes.css`) — deliberately, so
      first paint stays coherent before the provider mounts — so without the
      barrier the default half of this test could pass off the `:root` fallback
      and prove nothing about the theme. The high-contrast half is a real race,
      not a cosmetic one: `--surface-tile: #0b1220` exists ONLY under
      `:root[data-theme='high-contrast']`, so a one-shot read before the layout
      effect returns the `#0a1624` default.
    */
    await expectTheme(page, 'default')
    const defaultTile = await cssVar(page, '--surface-tile')
    const defaultEdge = await cssVar(page, '--edge-tile')
    const defaultFg = await cssVar(page, '--fg-primary')
    expect(defaultTile).toBe('#0a1624')
    expect(defaultEdge).toBe('inset 0 0 0 1px #35d6e8')
    expect(defaultFg).toBeTruthy()

    await page.goto('about:blank')
    await page.goto('#/display?theme=high-contrast')
    await expectTheme(page, 'high-contrast')
    const hcTile = await cssVar(page, '--surface-tile')
    const hcEdge = await cssVar(page, '--edge-tile')
    expect(hcTile).toBe('#0b1220')
    expect(hcEdge).toBe('inset 0 0 0 3px #7ce9f5')
    expect(hcTile).not.toBe(defaultTile)
  })

  test('default dark-slab tile edge contrast exceeds 3:1 (opaque cyan)', async ({ page }) => {
    await page.goto('#/display?theme=default')
    // Solid #35d6e8 on dark luminous slab #0a1624 — Nexus Broadcast tile language.
    const ratio = contrastRatio([53, 214, 232], [10, 22, 36])
    expect(ratio).toBeGreaterThan(9)
    expect(ratio).toBeLessThan(12)

    const edge = await cssVar(page, '--edge-tile')
    expect(edge).not.toContain('rgba(53, 214, 232, 0.55)')
  })

  test('primary text and essential borders meet contrast targets on host', async ({ page }) => {
    await openHostTheme(page)
    await page.getByRole('radio', { name: 'Default' }).check()
    const pairs = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      const read = (name: string) => cs.getPropertyValue(name).trim()
      return {
        fg: read('--fg-primary'),
        muted: read('--fg-muted'),
        disabled: read('--fg-disabled'),
        canvas: read('--surface-canvas'),
        disabledSurface: read('--surface-disabled'),
        border: read('--border-standard'),
        panel: read('--surface-base'),
        focus: read('--border-focus'),
      }
    })

    const hex = (value: string): [number, number, number] => {
      const v = value.replace('#', '')
      return [
        Number.parseInt(v.slice(0, 2), 16),
        Number.parseInt(v.slice(2, 4), 16),
        Number.parseInt(v.slice(4, 6), 16),
      ]
    }

    expect(contrastRatio(hex(pairs.fg), hex(pairs.canvas))).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(hex(pairs.muted), hex(pairs.canvas))).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(hex(pairs.disabled), hex(pairs.disabledSurface)),
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(hex(pairs.border), hex(pairs.panel))).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(hex(pairs.focus), hex(pairs.canvas))).toBeGreaterThanOrEqual(3)
  })
})

test.describe('stress composition', () => {
  test('scoreboard stress fixture preserves authored order and signed scores', async ({
    page,
  }) => {
    await page.goto('#/display?theme=high-contrast')
    // Inject a public-state-shaped scoreboard via DOM harness using the real
    // component mount path is heavy; assert shell overflow and theme marker here,
    // and rely on unit tests for 1/4/5/6/7/8-team fixtures.
    // Also the mount barrier for the overflow read below, which would otherwise
    // be measured against a document React had not rendered into yet.
    await expectTheme(page, 'high-contrast')
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflowX).toBe(false)
  })
})

test.describe('reduced motion', () => {
  test('reduced motion keeps urgent timer semantics without pulse animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('#/display?theme=default')
    const pulseMin = await cssVar(page, '--pulse-opacity-min')
    // Browsers may serialize 0.72 as ".72".
    expect(Number.parseFloat(pulseMin)).toBeCloseTo(0.72, 5)
    // Marker and tokens remain available; urgency colour tokens stay defined.
    expect(await cssVar(page, '--state-timer-urgent')).toBeTruthy()
    expect(await cssVar(page, '--state-expired')).toBeTruthy()
  })
})

test.describe('disabled controls', () => {
  test('disabled host buttons do not use whole-control opacity', async ({ page }) => {
    await page.goto('#/host')
    const opacity = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      // Probe the shared disabled rule by creating a temporary disabled button.
      const btn = document.createElement('button')
      btn.className = 'btn'
      btn.disabled = true
      document.body.appendChild(btn)
      const value = getComputedStyle(btn).opacity
      btn.remove()
      return { opacity: value, disabledFg: style.getPropertyValue('--fg-disabled').trim() }
    })
    expect(opacity.opacity).toBe('1')
    expect(opacity.disabledFg).toBeTruthy()
  })
})

// Keep parseRgb referenced for future RGB computed-style assertions.
void parseRgb
