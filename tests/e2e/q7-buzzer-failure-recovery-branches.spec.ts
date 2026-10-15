import { test, expect } from '@playwright/test'
import { importDemoAndPlay } from './helpers/menusClassSetup'
import {
  installWbuzzHardwareSimulator,
  exposeSimulatedWbuzzGamepad,
  hideSimulatedWbuzzGamepad,
  disconnectSimulatedReceiver,
  exposeAdditionalGenericGamepad,
  pressWbuzzButton,
  getHidSimSnapshot,
  type HidSimMode,
} from './helpers/simulatedWbuzzHardware'
import {
  openOptionalBuzzers,
  clickShowBuzzerSetup,
  connectSimulatedReceiver,
} from './helpers/q7BuzzerTeacherJourney'
import { buttonIndexForSlotColor } from '../../src/input/sonyBuzzSupportedProfile'
import { expectShowBuzzerSetupTeacherEffect } from './helpers/viewportDiscoverability'

/**
 * Q7 bounded failure/recovery matrix around the ordinary buzzer workflow.
 * Simulation only — not physical Sony evidence.
 */

test.describe.configure({ mode: 'serial' })

async function startAtShow(page: import('@playwright/test').Page, mode: HidSimMode) {
  await page.setViewportSize({ width: 1280, height: 720 })
  await installWbuzzHardwareSimulator(page, mode)
  await importDemoAndPlay(page)
  await openOptionalBuzzers(page)
  await clickShowBuzzerSetup(page)
}

test('branch: Show buzzer setup with no receiver still has visible effect', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await expectShowBuzzerSetupTeacherEffect(page)
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeEnabled()
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i)
})

test('branch: WebHID permission cancelled — honest + retry', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'permission-cancelled')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect
    .poll(async () => (await getHidSimSnapshot(page)).requestCalls)
    .toBeGreaterThan(0)
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i)
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeEnabled()
})

test('branch: exact receiver absent — no false healthy', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'exact-absent')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i)
  const snap = await getHidSimSnapshot(page)
  expect(snap.sendCalls.length).toBe(0)
})

test('branch: HID open failure — no healthy lie', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'open-fail')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i, {
    timeout: 5_000,
  })
  expect((await getHidSimSnapshot(page)).sendCalls.length).toBe(0)
})

test('branch: framing mismatch — fail closed, no keep-alive', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'framing-mismatch')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i, {
    timeout: 5_000,
  })
  expect((await getHidSimSnapshot(page)).sendCalls.length).toBe(0)
})

test('branch: first output failure — no healthy lie', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'send-fail')
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Failed|Connecting|Permission/i, {
    timeout: 8_000,
  })
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i)
})

test('branch: HID healthy / Gamepad absent — Buzzers not falsely ready', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i)
  await expect(page.getByTestId('sbs-controller-layer')).not.toContainText(/responding/i)
  await expect(page.getByTestId('sbs-teacher-summary')).not.toContainText(/^Buzzers ready\./i)
})

test('branch: Gamepad later appears — readiness can converge after press', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await exposeSimulatedWbuzzGamepad(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('sbs-controller-layer')).toContainText(/responding/i, {
    timeout: 10_000,
  })
})

test('branch: Gamepad disappears — status becomes truthful', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await exposeSimulatedWbuzzGamepad(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('sbs-controller-layer')).toContainText(/responding/i)
  await hideSimulatedWbuzzGamepad(page)
  // Leave Buzzer Check and re-enter so sticky press memory is not mistaken for live pads.
  await page.getByTestId('sbs-test-mode').click()
  await expect(page.getByTestId('sbs-test-mode')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('sbs-test-mode').click()
  await expect(page.getByTestId('sbs-controller-layer')).not.toContainText(/responding/i)
  await expect(page.getByTestId('sbs-teacher-summary')).not.toContainText(/^Buzzers ready\./i)
})

test('branch: receiver disconnect — visible degradation', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await disconnectSimulatedReceiver(page)
  await expect(page.getByTestId('sbs-receiver-layer')).not.toContainText(/^Connected$/i, {
    timeout: 10_000,
  })
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeEnabled()
})

test('branch: reconnect after disconnect', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await disconnectSimulatedReceiver(page)
  await expect(page.getByRole('button', { name: 'Connect buzzers' })).toBeEnabled()
  await page.getByRole('button', { name: 'Connect buzzers' }).click()
  await expect(page.getByTestId('sbs-receiver-layer')).toContainText(/Connected/i, {
    timeout: 10_000,
  })
})

test('branch: generic Gamepad coexistence — Wbuzz attribution preserved', async ({ page }, info) => {
  test.skip(info.project.name !== 'projector-720p', 'primary viewport')
  await startAtShow(page, 'ready')
  await connectSimulatedReceiver(page)
  await exposeSimulatedWbuzzGamepad(page)
  await exposeAdditionalGenericGamepad(page)
  await pressWbuzzButton(page, buttonIndexForSlotColor(1, 'red'))
  await expect(page.getByTestId('sbs-test-outcome')).toContainText(/Buzzer Check:/i, {
    timeout: 10_000,
  })
})
