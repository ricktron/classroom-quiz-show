import { test, expect, type Page } from '@playwright/test'
import { FORBIDDEN_DISPLAY_LABELS } from '../../src/test/leakLabels'
import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../../src/import/canonicalFormat'

/**
 * Slice 11 — media contract, end to end in a real browser.
 *
 * Covers legacy string prompts, image prompts against the committed
 * same-origin fixture, stage privacy, fail-closed unsupported media, and
 * responsive viewports (Playwright projects).
 */

test.describe.configure({ mode: 'serial' })

const PRIVATE_IMAGE_CONTENT = [
  'HOST-ONLY-MEDIA-NOTE',
  'MEDIA-ALTERNATE-ONE',
  'IMAGE-ANSWER-PRIVATE',
]

const LEGACY_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'e2e-media-legacy',
  title: 'E2E Media Legacy',
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Legacy Board',
      config: {
        categories: [
          {
            id: 'text-cat',
            title: 'Text Clues',
            tiles: [
              {
                id: 'text-100',
                value: 100,
                prompt: 'Which layer lies beneath the crust?',
                answer: 'The mantle',
                notes: 'HOST-ONLY-MEDIA-NOTE',
                alternates: ['MEDIA-ALTERNATE-ONE'],
              },
            ],
          },
        ],
      },
    },
  ],
}

const IMAGE_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'e2e-media-image',
  title: 'E2E Media Image',
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Image Board',
      config: {
        categories: [
          {
            id: 'image-cat',
            title: 'Image Clues',
            tiles: [
              {
                id: 'image-100',
                value: 100,
                prompt: {
                  kind: 'image',
                  source: {
                    kind: 'same-origin-path',
                    path: 'media-fixtures/slice-11-clue.png',
                  },
                  alt: 'Teal fixture pixel for Slice 11',
                  caption: 'Fixture caption',
                  attribution: 'CI test asset',
                },
                answer: 'IMAGE-ANSWER-PRIVATE',
                notes: 'HOST-ONLY-MEDIA-NOTE',
                alternates: ['MEDIA-ALTERNATE-ONE'],
              },
            ],
          },
        ],
      },
    },
  ],
}

const UNSUPPORTED_MEDIA_GAME = {
  format: CANONICAL_GAME_FILE_FORMAT,
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  id: 'e2e-media-bad',
  title: 'E2E Media Bad',
  rounds: [
    {
      id: 'board-round',
      type: 'category-board',
      title: 'Bad Board',
      config: {
        categories: [
          {
            id: 'bad-cat',
            title: 'Bad',
            tiles: [
              {
                id: 'bad-100',
                value: 100,
                prompt: {
                  kind: 'audio',
                  source: { kind: 'same-origin-path', path: 'x.mp3' },
                  alt: 'should fail',
                },
                answer: 'Nope',
              },
            ],
          },
        ],
      },
    },
  ],
}

async function openHost(page: Page) {
  await page.goto('#/host')
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible()
}

async function openDisplay(page: Page) {
  await page.goto('#/display')
  await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
}

async function importJson(host: Page, document: unknown) {
  await host.getByRole('button', { name: /initialize \/ reset session/i }).click()
  await host.getByTestId('import-json').fill(JSON.stringify(document, null, 2))
  await host.getByTestId('import-run').click()
}

async function startImportedBoard(host: Page, document: unknown) {
  await importJson(host, document)
  await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
  await host.getByRole('button', { name: /advance to next round/i }).click()
  await expect(host.getByTestId('cbh-grid')).toBeVisible()
}

async function expectNoPrivateMediaContent(display: Page) {
  const body = (await display.locator('body').innerText()).toLowerCase()
  for (const label of FORBIDDEN_DISPLAY_LABELS) {
    expect(body, `display must not contain "${label}"`).not.toContain(label.toLowerCase())
  }
  for (const secret of PRIVATE_IMAGE_CONTENT) {
    expect(body, `display must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
  const html = (await display.content()).toLowerCase()
  for (const secret of PRIVATE_IMAGE_CONTENT) {
    expect(html, `DOM must not contain "${secret}"`).not.toContain(secret.toLowerCase())
  }
}

test('legacy string import still plays through prompt and answer', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startImportedBoard(host, LEGACY_GAME)

  await host.getByTestId('cbh-tile-text-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('cbd-prompt')).toContainText(
    'Which layer lies beneath the crust?',
  )
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  await expectNoPrivateMediaContent(display)

  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toContainText('The mantle')
  await expect(display.getByTestId('cbd-prompt')).toBeVisible()

  await host.close()
  await display.close()
})

test('image-game import, reveal stages, privacy, and return clear media', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startImportedBoard(host, IMAGE_GAME)

  // Selected — no projector media
  await host.getByTestId('cbh-tile-image-100').click()
  await expect(display.getByTestId('cbd-open')).toBeVisible()
  await expect(display.getByTestId('cbd-prompt')).toHaveCount(0)
  await expect(display.getByTestId('mcd-img')).toHaveCount(0)
  expect((await display.content()).toLowerCase()).not.toContain('media-fixtures')
  await expectNoPrivateMediaContent(display)

  // Host private preview shows the image; projector still does not.
  await expect(host.getByTestId('cbh-prompt-image')).toBeVisible()
  await expect(host.getByTestId('cbh-prompt-alt')).toContainText('Teal fixture pixel')
  await expect(host.getByTestId('cbh-notes')).toContainText('HOST-ONLY-MEDIA-NOTE')
  await expect(host.getByTestId('cbh-alternates')).toContainText('MEDIA-ALTERNATE-ONE')

  // Reveal prompt — image visible; answer absent
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('mcd-img')).toBeVisible()
  await expect(display.getByTestId('mcd-img')).toHaveAttribute(
    'alt',
    'Teal fixture pixel for Slice 11',
  )
  await expect(display.getByTestId('mcd-caption')).toContainText('Fixture caption')
  await expect(display.getByTestId('mcd-attribution')).toContainText('CI test asset')
  await expect(display.getByTestId('cbd-answer')).toHaveCount(0)
  expect((await display.content())).not.toContain('IMAGE-ANSWER-PRIVATE')
  await expectNoPrivateMediaContent(display)

  // Reveal answer — answer text visible; prompt media retained
  await host.getByTestId('cbh-reveal-answer').click()
  await expect(display.getByTestId('cbd-answer')).toContainText('IMAGE-ANSWER-PRIVATE')
  await expect(display.getByTestId('mcd-img')).toBeVisible()
  // Notes/alternates never in display DOM
  const html = await display.content()
  expect(html).not.toContain('HOST-ONLY-MEDIA-NOTE')
  expect(html).not.toContain('MEDIA-ALTERNATE-ONE')

  // Return clears projector media
  await host.getByTestId('cbh-return').click()
  await expect(display.getByTestId('cbd-board')).toBeVisible()
  await expect(display.getByTestId('mcd-img')).toHaveCount(0)
  expect((await display.content()).toLowerCase()).not.toContain('media-fixtures')
  await expectNoPrivateMediaContent(display)

  await host.close()
  await display.close()
})

test('unsupported media import fails with no active-state change', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)

  await startImportedBoard(host, LEGACY_GAME)
  await expect(host.getByTestId('game-title')).toHaveText('E2E Media Legacy')
  await expect(host.getByTestId('import-active-game')).toContainText('e2e-media-legacy')

  await host.getByTestId('import-json').fill(JSON.stringify(UNSUPPORTED_MEDIA_GAME, null, 2))
  await host.getByTestId('import-run').click()
  const result = host.getByTestId('import-result')
  await expect(result).toContainText(/import failed/i)
  await expect(result).toContainText('unsupported-media-kind')
  // Prior game remains active — failed import mutates nothing.
  await expect(host.getByTestId('game-title')).toHaveText('E2E Media Legacy')
  await expect(host.getByTestId('import-active-game')).toContainText('e2e-media-legacy')

  // Projector still shows the prior board — no bad-media content leaked.
  await expect(display.getByTestId('cbd-board')).toBeVisible()
  expect((await display.content()).toLowerCase()).not.toContain('audio')
  await expectNoPrivateMediaContent(display)

  await host.close()
  await display.close()
})

test('undo after prompt reveal clears projector media', async ({ context }) => {
  const host = await context.newPage()
  const display = await context.newPage()
  await openHost(host)
  await openDisplay(display)
  await startImportedBoard(host, IMAGE_GAME)

  await host.getByTestId('cbh-tile-image-100').click()
  await host.getByTestId('cbh-reveal-prompt').click()
  await expect(display.getByTestId('mcd-img')).toBeVisible()

  await host.getByRole('button', { name: /undo last reversible/i }).click()
  await expect(display.getByTestId('cbd-prompt')).toHaveCount(0)
  await expect(display.getByTestId('mcd-img')).toHaveCount(0)
  expect((await display.content()).toLowerCase()).not.toContain('media-fixtures')

  await host.close()
  await display.close()
})
