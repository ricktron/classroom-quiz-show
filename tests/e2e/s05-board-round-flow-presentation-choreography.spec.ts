import { test, expect } from '@playwright/test'
import {
  visualStressBoardSnapshot,
  visualStressBoardWithFinalReadySnapshot,
  visualStressCategoryClearedBoardSnapshot,
  visualStressFinalSetupFromBoardSnapshot,
  visualStressFreshBoardSnapshot,
  visualStressPromptOnlySnapshot,
  visualStressSelectedSnapshot,
} from '../../src/test/visualStressDisplaySnapshots'
import {
  assertNoHorizontalOverflow,
  expectAcknowledgementExpires,
  injectPublicState,
  openDisplayWithHeldAcks,
} from './helpers/displayPublicState'

/**
 * S05 board / round-flow presentation choreography — remount-safe causality
 * for board reveal, tile selection, question reveal, return-to-board, optional
 * category-clear acknowledgement, and Display-side board→Final bridge.
 *
 * Injects sanitizer-derived PublicState snapshots. No PublicState / schema
 * expansion. Physical Sony / projector qualification remains S06.
 *
 * Display opens on a paused page clock, so ~420ms acknowledgement holds stay
 * observable until a test advances time (no wall-clock race). Observed
 * transitions first wait for their starting state to render.
 */

test.describe.configure({ mode: 'serial' })

test.describe('S05 board/round-flow presentation choreography', () => {
  test('remount into board seeds durable board without fabricating reveal', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressFreshBoardSnapshot(200))
    const board = page.getByTestId('cbd-board')
    await expect(board).toBeVisible()
    await expect(board).toHaveAttribute('data-seeded', 'true')
    await expect(board).toHaveAttribute('data-flow-ack', 'false')
    await expect(board).toHaveAttribute('data-flow-moment', 'none')
    await assertNoHorizontalOverflow(page)
  })

  test('observed board→selected acknowledges tile selection immediately', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressFreshBoardSnapshot(201))
    await expect(page.getByTestId('cbd-board')).toHaveAttribute('data-flow-ack', 'false')

    await injectPublicState(page, visualStressSelectedSnapshot(202))
    const open = page.getByTestId('cbd-open')
    await expect(open).toHaveAttribute('data-flow-moment', 'selection')
    await expect(open).toHaveAttribute('data-flow-ack', 'true')
    await expect(page.getByTestId('cbd-selection-header')).toHaveAttribute(
      'data-selection-ack',
      'true',
    )
    await expect(page.getByTestId('cbd-value')).toBeVisible()
    await assertNoHorizontalOverflow(page)

    // The acknowledgement is a transient hold; the selection itself remains.
    await expectAcknowledgementExpires(page, open, 'data-flow-ack')
    await expect(page.getByTestId('cbd-selection-header')).toHaveAttribute(
      'data-selection-ack',
      'false',
    )
    await expect(page.getByTestId('cbd-value')).toBeVisible()
  })

  test('remount into clue seeds without fabricating tile/question events', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressPromptOnlySnapshot(203))
    const open = page.getByTestId('cbd-open')
    await expect(open).toHaveAttribute('data-seeded', 'true')
    await expect(open).toHaveAttribute('data-flow-ack', 'false')
    await expect(page.getByTestId('cbd-prompt')).toHaveAttribute('data-prompt-ack', 'false')
    await expect(page.getByTestId('cbd-prompt')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('observed selected→prompt acknowledges question reveal', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressSelectedSnapshot(204))
    await expect(page.getByTestId('cbd-selection-header')).toBeVisible()
    await expect(page.getByTestId('cbd-prompt')).toHaveCount(0)
    await injectPublicState(page, visualStressPromptOnlySnapshot(205))
    await expect(page.getByTestId('cbd-open')).toHaveAttribute('data-flow-moment', 'prompt-reveal')
    await expect(page.getByTestId('cbd-prompt')).toHaveAttribute('data-prompt-ack', 'true')
    await assertNoHorizontalOverflow(page)
  })

  test('observed clue→board return acknowledges and orients used tile', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressPromptOnlySnapshot(206))
    await expect(page.getByTestId('cbd-prompt')).toBeVisible()
    await injectPublicState(page, visualStressBoardSnapshot(207))
    const board = page.getByTestId('cbd-board')
    await expect(board).toHaveAttribute('data-flow-moment', 'board-enter')
    await expect(board).toHaveAttribute('data-flow-ack', 'true')
    await expect(board).toHaveAttribute('data-orient-tile', /.+/ )
    await assertNoHorizontalOverflow(page)
  })

  test('rapid next selection replaces stale board-return acknowledgement', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressPromptOnlySnapshot(208))
    await expect(page.getByTestId('cbd-prompt')).toBeVisible()
    await injectPublicState(page, visualStressBoardSnapshot(209))
    await expect(page.getByTestId('cbd-board')).toHaveAttribute('data-flow-ack', 'true')

    await injectPublicState(page, visualStressSelectedSnapshot(210))
    await expect(page.getByTestId('cbd-open')).toHaveAttribute('data-flow-moment', 'selection')
    await expect(page.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'true')
    await expect(page.getByTestId('cbd-board')).toHaveCount(0)
    await assertNoHorizontalOverflow(page)
  })

  test('remount into partially consumed / cleared board has no fake completion', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressCategoryClearedBoardSnapshot(211))
    const board = page.getByTestId('cbd-board')
    // data-seeded is set by an effect of the same commit as the clear-ack seed,
    // so once it renders, a fabricated clear acknowledgement would be visible.
    await expect(board).toHaveAttribute('data-seeded', 'true')
    await expect(board).toHaveAttribute('data-flow-ack', 'false')
    await expect(page.locator('[data-clear-ack="true"]')).toHaveCount(0)
    await expect(page.locator('[data-cleared="true"]').first()).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('observed board→Final bridge acknowledges; remount into Final does not', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'projector-720p' && info.project.name !== 'desktop-1080p',
      'projector viewports only',
    )
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressBoardWithFinalReadySnapshot(220))
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-final-bridge-ack',
      'false',
    )

    await injectPublicState(page, visualStressFinalSetupFromBoardSnapshot(221))
    await expect(page.getByTestId('audience-final')).toHaveAttribute(
      'data-final-bridge-ack',
      'true',
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-final-bridge-ack',
      'true',
    )

    // Remount Display into Final — seed only. A same-URL hash goto is a
    // same-document navigation (no remount); reload remounts on the held clock.
    await page.reload()
    await expect(page.getByRole('heading', { name: /game display ready/i })).toBeVisible()
    await injectPublicState(page, visualStressFinalSetupFromBoardSnapshot(222))
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-final-bridge-seeded',
      'true',
    )
    await expect(page.getByTestId('audience-shell')).toHaveAttribute(
      'data-final-bridge-ack',
      'false',
    )
    await assertNoHorizontalOverflow(page)
  })

  test('reduced-motion keeps static acknowledgement without animation', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'reduced-motion proof on 720p')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openDisplayWithHeldAcks(page)
    await injectPublicState(page, visualStressFreshBoardSnapshot(230))
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await injectPublicState(page, visualStressSelectedSnapshot(231))
    const header = page.getByTestId('cbd-selection-header')
    await expect(header).toHaveAttribute('data-selection-ack', 'true')
    const animationName = await header.evaluate((el) => getComputedStyle(el).animationName)
    expect(animationName === 'none' || animationName === '').toBe(true)
    await assertNoHorizontalOverflow(page)
  })

  test('high-contrast board/clue transitions remain readable', async ({ page }, info) => {
    test.skip(info.project.name !== 'projector-720p', 'high-contrast on 720p')
    await openDisplayWithHeldAcks(page, 'high-contrast')
    await injectPublicState(page, visualStressFreshBoardSnapshot(240))
    await expect(page.getByTestId('cbd-board')).toBeVisible()
    await injectPublicState(page, visualStressSelectedSnapshot(241))
    await expect(page.getByTestId('cbd-open')).toHaveAttribute('data-flow-ack', 'true')
    await expect(page.getByTestId('cbd-category')).toBeVisible()
    await injectPublicState(page, visualStressPromptOnlySnapshot(242))
    await expect(page.getByTestId('cbd-prompt')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })
})
