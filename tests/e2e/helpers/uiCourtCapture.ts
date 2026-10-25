/**
 * Shared instruments for the UI/design qualification baseline.
 *
 * These helpers only OBSERVE: they capture rendered states and record whether
 * each intended state was reachable. Nothing here asserts product behaviour,
 * and nothing here is used by ordinary functional specs.
 *
 * Gate: CQS_UI_COURT_CAPTURE=1, output root CQS_UI_COURT_OUT.
 */

import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { prepareDeterministicCapture } from './visualHistoryCapture'
import { fillAllTeamNames } from './menusClassSetup'

export const CAPTURE_ON = process.env.CQS_UI_COURT_CAPTURE === '1'
export const OUT_ROOT = process.env.CQS_UI_COURT_OUT ?? ''

export type Vp = { readonly width: number; readonly height: number; readonly label: string }

/**
 * Repo-canonical viewports only: the two `playwright.config.ts` projects
 * (1920x1080, 1280x720) and the historian's teacher-laptop box (1366x768).
 */
export const VP = {
  laptop: { width: 1366, height: 768, label: 'laptop-1366x768' },
  proj1080: { width: 1920, height: 1080, label: 'projector-1920x1080' },
  proj720: { width: 1280, height: 720, label: 'projector-1280x720' },
} as const satisfies Record<string, Vp>

export const ACCENTS = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
] as const

export type ManifestRow = {
  readonly id: string
  readonly surface: string
  readonly state: string
  readonly viewport: string
  readonly file: string | null
  readonly status: 'CAPTURED' | 'MISSING'
  readonly note?: string
}

const pending: ManifestRow[] = []

function manifestPath() {
  return path.join(OUT_ROOT, 'manifest.json')
}

export function flushManifest() {
  if (!OUT_ROOT) return
  fs.mkdirSync(OUT_ROOT, { recursive: true })
  let existing: ManifestRow[] = []
  try {
    existing = JSON.parse(fs.readFileSync(manifestPath(), 'utf8')) as ManifestRow[]
  } catch {
    existing = []
  }
  const byId = new Map<string, ManifestRow>()
  for (const row of [...existing, ...pending]) byId.set(`${row.id}@${row.viewport}`, row)
  fs.writeFileSync(manifestPath(), `${JSON.stringify([...byId.values()], null, 2)}\n`)
}

export function record(row: ManifestRow) {
  pending.push(row)
  flushManifest()
}

/** Capture one state; a state this build cannot reach is recorded MISSING. */
export async function shot(
  page: Page,
  opts: {
    readonly id: string
    readonly surface: string
    readonly state: string
    readonly vp: Vp
    readonly waitFor?: () => Promise<void>
    readonly scrollTestId?: string
    readonly scroll?: () => Promise<void>
    readonly fullPage?: boolean
  },
): Promise<boolean> {
  const folder = path.join(OUT_ROOT, opts.surface)
  const basename = `${opts.id}--${opts.vp.label}.png`
  const file = path.join(folder, basename)
  try {
    await page.setViewportSize({ width: opts.vp.width, height: opts.vp.height })
    await prepareDeterministicCapture(page)
    if (opts.waitFor) await opts.waitFor()
    if (opts.scrollTestId) await page.getByTestId(opts.scrollTestId).scrollIntoViewIfNeeded()
    else if (opts.scroll) await opts.scroll()
    else if (!opts.fullPage) {
      // A viewport-clipped shot with no explicit scroll target means "the top
      // of this surface". Without this the shot inherits whatever scroll the
      // preceding interaction left behind, and an "above the fold" label would
      // be false.
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    await page.waitForTimeout(150)
    fs.mkdirSync(folder, { recursive: true })
    await page.screenshot({ path: file, fullPage: opts.fullPage ?? false })
    record({
      id: opts.id,
      surface: opts.surface,
      state: opts.state,
      viewport: opts.vp.label,
      file: path.relative(OUT_ROOT, file),
      status: 'CAPTURED',
    })
    return true
  } catch (error) {
    record({
      id: opts.id,
      surface: opts.surface,
      state: opts.state,
      viewport: opts.vp.label,
      file: null,
      status: 'MISSING',
      note: String(error).slice(0, 240).replace(/\s+/g, ' '),
    })
    return false
  }
}

/**
 * Run one journey step without letting it abort the rest of the baseline. A
 * step that cannot complete becomes its own MISSING row, so the manifest says
 * which route broke instead of the run simply ending early.
 */
export async function step(
  name: string,
  surface: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (error) {
    record({
      id: `step:${name}`,
      surface,
      state: 'journey step could not complete',
      viewport: 'n/a',
      file: null,
      status: 'MISSING',
      note: String(error).slice(0, 240).replace(/\s+/g, ' '),
    })
    return false
  }
}

/** `step` for a setup step whose value later shots need (typically a Page). */
export async function stepValue<T>(
  name: string,
  surface: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    record({
      id: `step:${name}`,
      surface,
      state: 'journey step could not complete',
      viewport: 'n/a',
      file: null,
      status: 'MISSING',
      note: String(error).slice(0, 240).replace(/\s+/g, ' '),
    })
    return null
  }
}

export async function newPage(
  browser: Browser,
  info: { project: { use: { baseURL?: string } } },
  vp: Vp,
): Promise<{ context: BrowserContext; page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    baseURL: info.project.use.baseURL,
  })
  const page = await context.newPage()
  return { context, page, close: async () => void (await context.close().catch(() => undefined)) }
}

/** Open Home's import panel whether or not the control toggles it. */
export async function openImportPanel(page: Page): Promise<void> {
  const field = page.locator('#home-import-json')
  if (await field.isVisible().catch(() => false)) return
  await page.getByTestId('home-import-game').click()
  await field.waitFor({ state: 'visible', timeout: 10_000 })
}

/**
 * A board-plus-Final game in the same canonical file shape the repo's own
 * `menusGameJson` fixtures use, with enough tiles for the correct path, the
 * incorrect path and a timer expiry.
 */
export function uiCourtGame(options: {
  readonly id: string
  readonly title: string
  readonly teamCount?: number
  readonly responseSeconds?: number
  readonly longText?: boolean
}): string {
  const teamCount = options.teamCount ?? 2
  const long = options.longText === true
  const promptText = (label: string) =>
    long
      ? `${label}: describe, in as much detail as you can manage, the complete sequence of processes by which heat generated deep inside the Earth is carried upward through the mantle, drives the slow movement of the overlying tectonic plates, and ultimately produces the mountain belts, ocean trenches and volcanic arcs that we can observe at the surface today.`
      : `${label}: what is H2O?`
  const tile = (category: string, value: number) => ({
    id: `${category}-${value}`,
    value,
    prompt: promptText(`${category} ${value}`),
    answer: long
      ? 'Mantle convection carries heat upward, drags the plates, and builds mountains, trenches and volcanic arcs at the boundaries.'
      : 'Water',
    alternates: ['H2O liquid'],
    notes: 'Host-only teaching note — never project',
  })
  return JSON.stringify({
    format: 'classroom-quiz-show/game',
    schemaVersion: 1,
    id: options.id,
    title: options.title,
    timer: { responseSeconds: options.responseSeconds ?? 45 },
    teams: Array.from({ length: teamCount }, (_, i) => ({
      id: `team${i + 1}`,
      name: long ? `The Extremely Verbose Team Number ${i + 1}` : `Authored Team ${i + 1}`,
      accent: ACCENTS[i % ACCENTS.length],
    })),
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Board',
        config: {
          categories: [
            {
              id: 'science',
              title: long ? 'Processes of the Deep Earth and Their Surface Expression' : 'Science',
              tiles: [tile('science', 100), tile('science', 200), tile('science', 300)],
            },
            {
              id: 'history',
              title: long ? 'The Long History of Scientific Measurement' : 'History',
              tiles: [tile('history', 100), tile('history', 200), tile('history', 300)],
            },
          ],
        },
      },
      {
        id: 'final-round',
        type: 'final-wager',
        title: 'Final Wager',
        config: {
          prompt: promptText('Final'),
          answer: 'Mantle convection',
          alternates: ['Convection currents'],
          notes: 'Final host-only note — never project',
        },
      },
    ],
  })
}

/**
 * Ordinary Class Setup -> Start Game for this lane's own fixtures.
 * `menusQ3.keyboardNamesReadyStart` is pinned to the `alpha`/`bravo` fixture
 * ids, so it cannot drive these games.
 */
export async function readyAndStart(page: Page): Promise<void> {
  const skip = page.getByTestId('setup-skip-buzzers')
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await fillAllTeamNames(page)
  await expect(page.getByTestId('setup-ready-heading')).toBeVisible()
  await expect(page.getByTestId('setup-play')).toBeEnabled()
  await page.getByTestId('setup-play').click()
  await expect(page.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  await expect(page.getByTestId('tsp-scoreboard')).toBeVisible()
}

/** Pick the shortest timer preset the Host offers, so expiry is observable. */
export async function selectShortestDuration(host: Page): Promise<number | null> {
  const values = await host
    .getByTestId('rth-duration')
    .locator('option')
    .evaluateAll((nodes) => nodes.map((n) => Number((n as HTMLOptionElement).value)))
    .catch(() => [] as number[])
  const usable = values.filter((v) => Number.isFinite(v) && v > 0)
  if (usable.length === 0) return null
  const shortest = Math.min(...usable)
  await host.getByTestId('rth-duration').selectOption(String(shortest))
  return shortest
}
