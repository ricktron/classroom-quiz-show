import { describe, expect, it } from 'vitest'
import {
  buttonIndexForSlotColor,
  isExactSupportedWbuzzIds,
  keepalivePayload,
  materializeSupportedProfileMapping,
  matchesExpectedWbuzzGamepadTopology,
  reportedIdLooksLikeSupportedWbuzz,
  SONY_BUZZ_KEEPALIVE_BYTES,
  SONY_BUZZ_KEEPALIVE_CADENCE_MS,
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_ID,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
  validateSupportedWbuzzOutputFraming,
} from './sonyBuzzSupportedProfile'
import { PRIMARY_BUZZ } from './logicalAction'
import { teamId } from '../game/ids'

describe('sonyBuzzSupportedProfile', () => {
  it('uses the exact supported profile identity', () => {
    expect(SONY_BUZZ_SUPPORTED_PROFILE_ID).toBe('cqs.sony-buzz.namtai-wbuzz-wireless.v1')
    expect(SONY_BUZZ_SUPPORTED_VENDOR_ID).toBe(0x054c)
    expect(SONY_BUZZ_SUPPORTED_PRODUCT_ID).toBe(0x1000)
    expect(SONY_BUZZ_KEEPALIVE_CADENCE_MS).toBe(2000)
  })

  it('recognizes exact VID/PID only', () => {
    expect(isExactSupportedWbuzzIds(0x054c, 0x1000)).toBe(true)
    expect(isExactSupportedWbuzzIds(0x054c, 0x0002)).toBe(false)
    expect(isExactSupportedWbuzzIds(0x1234, 0x1000)).toBe(false)
  })

  it('does not treat name-only text as supported', () => {
    expect(reportedIdLooksLikeSupportedWbuzz('Sony Buzz Controller')).toBe(false)
    expect(reportedIdLooksLikeSupportedWbuzz('Vendor: 054c Product: 1000')).toBe(true)
    expect(reportedIdLooksLikeSupportedWbuzz('Vendor: 054c Product: 0002')).toBe(false)
  })

  it('requires 20-button topology', () => {
    expect(matchesExpectedWbuzzGamepadTopology(20)).toBe(true)
    expect(matchesExpectedWbuzzGamepadTopology(20, 2)).toBe(true)
    expect(matchesExpectedWbuzzGamepadTopology(12)).toBe(false)
    expect(matchesExpectedWbuzzGamepadTopology(20, 0)).toBe(false)
  })

  it('encodes the static four-slot recipe', () => {
    expect(buttonIndexForSlotColor(1, 'red')).toBe(0)
    expect(buttonIndexForSlotColor(2, 'yellow')).toBe(6)
    expect(buttonIndexForSlotColor(3, 'blue')).toBe(14)
    expect(buttonIndexForSlotColor(4, 'orange')).toBe(18)
  })

  it('fail-closes on framing mismatch', () => {
    expect(validateSupportedWbuzzOutputFraming([])).toMatchObject({ ok: false })
    expect(
      validateSupportedWbuzzOutputFraming([
        { reportId: 0, totalBytes: 7 },
        { reportId: 1, totalBytes: 7 },
      ]),
    ).toMatchObject({ ok: false })
    expect(validateSupportedWbuzzOutputFraming([{ reportId: 1, totalBytes: 7 }])).toMatchObject({
      ok: false,
    })
    expect(validateSupportedWbuzzOutputFraming([{ reportId: 0, totalBytes: 8 }])).toMatchObject({
      ok: false,
    })
    expect(validateSupportedWbuzzOutputFraming([{ reportId: 0, totalBytes: 7 }])).toEqual({
      ok: true,
      reportId: 0,
      byteLength: 7,
    })
  })

  it('uses seven zero bytes for keep-alive', () => {
    const payload = keepalivePayload()
    expect(payload).toBeInstanceOf(Uint8Array)
    expect(payload.length).toBe(SONY_BUZZ_KEEPALIVE_BYTES)
    expect([...payload]).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('materializes mapping without persisting index and marks red as primary', () => {
    const red = teamId('red')
    const blue = teamId('blue')
    const result = materializeSupportedProfileMapping({
      controllerIndex: 1,
      associations: [
        { slotId: 1, teamId: red },
        { slotId: 2, teamId: blue },
      ],
      teams: [{ id: red }, { id: blue }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const redPrimary = result.mapping.bindings.find(
      (b) => b.teamId === red && b.action.kind === 'primary-buzz',
    )
    expect(redPrimary).toMatchObject({ controllerIndex: 1, buttonIndex: 0, action: PRIMARY_BUZZ })
    const secondary = result.mapping.bindings.filter((b) => b.action.kind === 'secondary')
    expect(secondary.length).toBeGreaterThan(0)
    expect(result.mapping.bindings.every((b) => b.controllerIndex === 1)).toBe(true)
  })

  it('fail-closes materialization on stale team', () => {
    const result = materializeSupportedProfileMapping({
      controllerIndex: 0,
      associations: [{ slotId: 1, teamId: teamId('ghost') }],
      teams: [{ id: teamId('red') }],
    })
    expect(result.ok).toBe(false)
  })
})
