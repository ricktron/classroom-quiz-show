import { test, expect, type Page, type Locator } from '@playwright/test'
import type { PublicState } from '../../src/state/publicState'
import {
  visualStressAnswerRevealSnapshot,
  visualStressBoardSnapshot,
  visualStressImagePromptSnapshot,
  visualStressLongPromptSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import {
  VISUAL_STRESS_IMAGE_PATH,
  visualStressLongAnswer,
  visualStressLongPrompt,
} from '../../src/test/visualStressFixtures'

/**
 * S05-F1 — core Display readability + visual stress (Board / Clue).
 *
 * Injects sanitizer-derived public-state snapshots from the canonical visual
 * stress Game fixture. Does not claim physical projector or Windows scaling
 * qualification (S06).
 */

const CHANNEL_NAME = 'classroom-quiz-show:sync'
const VIEWPORT_TOLERANCE_PX = 2

test.describe.configure({ mode: 'serial' })

async function openDisplay(page: Page, theme?: 'default' | 'high-contrast') {
  const q = theme ? `?theme=${theme}` : ''
  await page.goto(`#/display${q}`)
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function injectPublicState(page: Page, payload: PublicState) {
  const accepted = await page.evaluate(
    ({ name, payload: p }) => {
      const ch = new BroadcastChannel(name)
      ch.postMessage({
        protocol: 'classroom-quiz-show/sync',
        schemaVersion: 2,
        message: {
          type: 'public-state',
          revision: p.revision,
          sentAt: Date.now(),
          payload: p,
        },
      })
      ch.close()
      return true
    },
    { name: CHANNEL_NAME, payload },
  )
  expect(accepted).toBe(true)
}

type GeometryReport = {
  overflowX: number
  overflowY: number
  viewport: { width: number; height: number }
  board: { top: number; bottom: number; left: number; right: number } | null
  open: { top: number; bottom: number; left: number; right: number } | null
  prompt: { top: number; bottom: number; left: number; right: number } | null
  answer: { top: number; bottom: number; left: number; right: number } | null
  scores: { top: number; bottom: number; left: number; right: number } | null
  image: {
    top: number
    bottom: number
    left: number
    right: number
    naturalWidth: number
    naturalHeight: number
    clientWidth: number
    clientHeight: number
  } | null
}

async function measureDisplayGeometry(page: Page): Promise<GeometryReport> {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
    }
    const img = document.querySelector('[data-testid="mcd-img"]') as HTMLImageElement | null
    const imgBox = box(img)
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      board: box(document.querySelector('[data-testid="cbd-board"]')),
      open: box(document.querySelector('[data-testid="cbd-open"]')),
      prompt: box(document.querySelector('[data-testid="cbd-prompt"]')),
      answer: box(document.querySelector('[data-testid="cbd-answer"]')),
      scores: box(document.querySelector('[data-testid="display-scores"]')),
      image: img && imgBox
        ? {
            ...imgBox,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            clientWidth: img.clientWidth,
            clientHeight: img.clientHeight,
          }
        : null,
    }
  })
}

function expectRectInViewport(
  label: string,
  rect: { top: number; bottom: number; left: number; right: number } | null,
  viewport: { width: number; height: number },
) {
  expect(rect, `${label} present`).not.toBeNull()
  if (!rect) return
  expect(rect.top, `${label} top`).toBeGreaterThanOrEqual(-VIEWPORT_TOLERANCE_PX)
  expect(rect.left, `${label} left`).toBeGreaterThanOrEqual(-VIEWPORT_TOLERANCE_PX)
  expect(rect.bottom, `${label} bottom`).toBeLessThanOrEqual(
    viewport.height + VIEWPORT_TOLERANCE_PX,
  )
  expect(rect.right, `${label} right`).toBeLessThanOrEqual(viewport.width + VIEWPORT_TOLERANCE_PX)
}

async function assertDisplayFitsViewport(
  page: Page,
  options: {
    expectBoard?: boolean
    expectOpen?: boolean
    expectPrompt?: boolean
    expectAnswer?: boolean
    expectScores?: boolean
    expectImage?: boolean
  } = {},
) {
  const geometry = await measureDisplayGeometry(page)
  expect(geometry.overflowX, 'horizontal overflow').toBeLessThanOrEqual(1)
  expect(geometry.overflowY, 'vertical overflow / page scroll').toBeLessThanOrEqual(
    VIEWPORT_TOLERANCE_PX,
  )

  if (options.expectBoard) expectRectInViewport('board', geometry.board, geometry.viewport)
  if (options.expectOpen) expectRectInViewport('open clue', geometry.open, geometry.viewport)
  if (options.expectPrompt) expectRectInViewport('prompt', geometry.prompt, geometry.viewport)
  if (options.expectAnswer) expectRectInViewport('answer', geometry.answer, geometry.viewport)
  if (options.expectScores) expectRectInViewport('score deck', geometry.scores, geometry.viewport)
  if (options.expectImage) {
    expect(geometry.image, 'image present').not.toBeNull()
    if (geometry.image) {
      expectRectInViewport('image', geometry.image, geometry.viewport)
      expect(geometry.image.naturalWidth, 'image naturalWidth').toBeGreaterThan(8)
      expect(geometry.image.naturalHeight, 'image naturalHeight').toBeGreaterThan(8)
      expect(geometry.image.clientWidth, 'image clientWidth').toBeGreaterThan(64)
      expect(geometry.image.clientHeight, 'image clientHeight').toBeGreaterThan(36)
      const ratio = geometry.image.clientWidth / geometry.image.clientHeight
      const naturalRatio = geometry.image.naturalWidth / geometry.image.naturalHeight
      expect(Math.abs(ratio - naturalRatio), 'aspect ratio preserved').toBeLessThan(0.08)
    }
  }

  return geometry
}

async function expectVisible(locator: Locator) {
  await expect(locator).toBeVisible()
}

test.describe('S05-F1 board stress', () => {
  test('1080p default stress board keeps Board and 8-team deck inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    await openDisplay(page, 'default')
    await injectPublicState(page, visualStressBoardSnapshot(101))
    await expectVisible(page.getByTestId('cbd-board'))
    await expect(page.getByTestId('cbd-tile-c0t0')).toHaveText(/used/i)
    await expect(page.getByTestId('cbd-tile-c0t1')).toHaveText('200')
    await expect(page.getByTestId('cbd-category-c0')).toContainText('ALPHA')
    await expect(page.getByTestId('tsb-score-t0')).toHaveText('-999999')
    await expect(page.getByTestId('tsb-score-t7')).toHaveText('100007')
    await assertDisplayFitsViewport(page, { expectBoard: true, expectScores: true })
  })

  test('720p high-contrast stress board keeps Board and 8-team deck inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'high-contrast')
    await injectPublicState(page, visualStressBoardSnapshot(102))
    await expectVisible(page.getByTestId('cbd-board'))
    await expect(page.getByTestId('cbd-tile-c0t0')).toHaveText(/used/i)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await assertDisplayFitsViewport(page, { expectBoard: true, expectScores: true })
  })
})

test.describe('S05-F1 clue stress', () => {
  test('1080p schema-max prompt coexists with 8-team deck and timer inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    await openDisplay(page, 'default')
    await injectPublicState(page, visualStressLongPromptSnapshot(110))
    await expectVisible(page.getByTestId('cbd-open'))
    await expect(page.getByTestId('cbd-prompt')).toContainText(visualStressLongPrompt().slice(0, 48))
    await expect(page.getByTestId('mcd-text')).toHaveAttribute('data-length', 'long')
    await expect(page.getByTestId('cbd-answer')).toHaveCount(0)
    await expect(page.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'deck')
    await expectVisible(page.getByTestId('nexus-timer'))
    await assertDisplayFitsViewport(page, {
      expectOpen: true,
      expectPrompt: true,
      expectScores: true,
    })
  })

  test('720p schema-max prompt coexists with 8-team deck inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'default')
    await injectPublicState(page, visualStressLongPromptSnapshot(112))
    await expectVisible(page.getByTestId('cbd-open'))
    await expect(page.getByTestId('cbd-prompt')).toContainText('Interpret')
    await assertDisplayFitsViewport(page, {
      expectOpen: true,
      expectPrompt: true,
      expectScores: true,
    })
  })

  test('1080p schema-max answer reveal keeps prompt and answer inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop-1080p', '1080p project only')
    await openDisplay(page, 'default')
    await injectPublicState(page, visualStressAnswerRevealSnapshot(120))
    await expect(page.getByTestId('cbd-open')).toHaveAttribute('data-answer-revealed', 'true')
    await expect(page.getByTestId('cbd-prompt')).toContainText(visualStressLongPrompt().slice(0, 32))
    await expect(page.getByTestId('cbd-answer')).toContainText(/answer/i)
    await expect(page.getByTestId('cbd-answer')).toContainText(visualStressLongAnswer().slice(0, 32))
    await assertDisplayFitsViewport(page, {
      expectOpen: true,
      expectPrompt: true,
      expectAnswer: true,
      expectScores: true,
    })
  })

  test('720p high-contrast answer reveal keeps prompt and answer inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await openDisplay(page, 'high-contrast')
    await injectPublicState(page, visualStressAnswerRevealSnapshot(121))
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast')
    await expectVisible(page.getByTestId('cbd-answer'))
    await expect(page.getByTestId('cbd-category')).toBeVisible()
    await expect(page.getByTestId('cbd-value')).toBeVisible()
    await assertDisplayFitsViewport(page, {
      expectOpen: true,
      expectPrompt: true,
      expectAnswer: true,
      expectScores: true,
    })
  })

  test('720p reduced-motion image clue loads useful media and stays inside the viewport', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', '720p project only')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplay(page, 'default')
    await injectPublicState(page, visualStressImagePromptSnapshot(111))
    await expectVisible(page.getByTestId('cbd-open'))
    await expectVisible(page.getByTestId('mcd-image'))
    await expect(page.getByTestId('mcd-img')).toHaveAttribute(
      'src',
      new RegExp(VISUAL_STRESS_IMAGE_PATH.replace(/\//g, '\\/')),
    )
    await expect(page.getByTestId('mcd-caption')).toContainText(/secondary/i)
    await expect(page.getByTestId('tsb-score-t0')).toHaveText('-999999')
    await assertDisplayFitsViewport(page, {
      expectOpen: true,
      expectScores: true,
      expectImage: true,
    })
  })
})
