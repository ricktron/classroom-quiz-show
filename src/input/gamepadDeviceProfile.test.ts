import { describe, expect, it } from 'vitest'
import {
  classifyGamepadController,
  classifyGamepadReportedId,
  classificationCopyClaimsSupport,
  GAMEPAD_DEVICE_CLASSIFICATION_LABEL,
  GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE,
  GAMEPAD_DEVICE_CLASSIFICATIONS,
  SONY_BUZZ_WIRED_PRODUCT_ID,
  SONY_USB_VENDOR_ID,
} from './gamepadDeviceProfile'
import { controller, reportedId } from '../test/gamepadFixtures'
import { UNAVAILABLE_GAMEPAD_REPORTED_ID } from './gamepadSource'

/**
 * Host-private device PROFILE classification (Slice 10).
 *
 * Candidate matches require primary-source USB vendor/product tokens — never
 * name-only strings. Classification copy must never claim support.
 */

describe('candidate Sony Buzz! wired (054c + 0002)', () => {
  for (const value of [
    'Vendor: 054c Product: 0002',
    '054c:0002',
    '054c-0002-xxxx',
    'Some Vendor Some Product (STANDARD GAMEPAD Vendor: 054c Product: 0002)',
  ]) {
    it(`matches ${value}`, () => {
      expect(classifyGamepadReportedId(reportedId(value))).toBe('candidate-sony-buzz-wired')
    })
  }
})

describe('candidate Sony Buzz! wireless (054c + 1000)', () => {
  for (const value of ['Vendor: 054c Product: 1000', '054c:1000', '054c-1000-abcd']) {
    it(`matches ${value}`, () => {
      expect(classifyGamepadReportedId(reportedId(value))).toBe('candidate-sony-buzz-wireless')
    })
  }
})

describe('identity unavailable', () => {
  it('classifies unavailable reported id as identity-unavailable', () => {
    expect(classifyGamepadReportedId(UNAVAILABLE_GAMEPAD_REPORTED_ID)).toBe('identity-unavailable')
    expect(
      classifyGamepadController(controller(0, [], { reportedId: UNAVAILABLE_GAMEPAD_REPORTED_ID })),
    ).toBe('identity-unavailable')
  })
})

describe('unrecognized identifiers', () => {
  for (const value of [
    'Sony',
    'Buzz',
    'Sony Buzz Controller',
    'Logitech',
    'Hub',
    'joystick',
  ]) {
    it(`does not classify name-only "${value}" as a candidate`, () => {
      expect(classifyGamepadReportedId(reportedId(value))).toBe('unrecognized')
    })
  }

  it('does not classify vendor-only as a candidate', () => {
    expect(classifyGamepadReportedId(reportedId(`Vendor: ${SONY_USB_VENDOR_ID}`))).toBe(
      'unrecognized',
    )
  })

  it('does not classify product-only as a candidate', () => {
    expect(classifyGamepadReportedId(reportedId(`Product: ${SONY_BUZZ_WIRED_PRODUCT_ID}`))).toBe(
      'unrecognized',
    )
  })
})

describe('classification copy vocabulary', () => {
  it('covers every classification with label and message', () => {
    for (const kind of GAMEPAD_DEVICE_CLASSIFICATIONS) {
      expect(GAMEPAD_DEVICE_CLASSIFICATION_LABEL[kind].length).toBeGreaterThan(0)
      expect(GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE[kind].length).toBeGreaterThan(0)
    }
  })

  it('never claims support in labels', () => {
    for (const kind of GAMEPAD_DEVICE_CLASSIFICATIONS) {
      expect(
        classificationCopyClaimsSupport(GAMEPAD_DEVICE_CLASSIFICATION_LABEL[kind]),
        `${kind} label`,
      ).toBe(false)
    }
  })

  it('negates support claims in candidate messages rather than asserting them', () => {
    for (const kind of ['candidate-sony-buzz-wired', 'candidate-sony-buzz-wireless'] as const) {
      const message = GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE[kind].toLowerCase()
      expect(message).toContain('candidate match only')
      expect(message).toContain('not proof the hardware works here')
      expect(classificationCopyClaimsSupport(message)).toBe(false)
    }
  })

  it('never describes a candidate as validated hardware', () => {
    for (const kind of ['candidate-sony-buzz-wired', 'candidate-sony-buzz-wireless'] as const) {
      const surface = [
        GAMEPAD_DEVICE_CLASSIFICATION_LABEL[kind],
        GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE[kind],
      ]
        .join(' ')
        .toLowerCase()
      expect(surface).not.toMatch(/\bis validated\b/)
      expect(surface).not.toMatch(/\bvalidated controller\b/)
      expect(surface).toContain('candidate')
    }
  })

  it('distinguishes wired and wireless candidate copy', () => {
    expect(GAMEPAD_DEVICE_CLASSIFICATION_LABEL['candidate-sony-buzz-wired']).toContain('wired')
    expect(GAMEPAD_DEVICE_CLASSIFICATION_LABEL['candidate-sony-buzz-wireless']).toContain('wireless')
  })
})
