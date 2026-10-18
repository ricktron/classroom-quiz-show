import { describe, expect, it } from 'vitest'
import {
  buttonIndexForSlotColor,
  isExactSupportedWbuzzIds,
  SONY_BUZZ_COLORS,
  sonyBuzzButtonLabel,
  sonyBuzzerLabel,
  sonyBuzzHandsetForButton,
  defaultSonyBuzzSlotAssociations,
  keepalivePayload,
  materializeSupportedProfileMapping,
  matchesExpectedWbuzzGamepadTopology,
  reportedIdLooksLikeSupportedWbuzz,
  SONY_BUZZ_KEEPALIVE_BYTES,
  SONY_BUZZ_KEEPALIVE_CADENCE_MS,
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_ID,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
  teamSetSignature,
  validateSupportedWbuzzOutputFraming,
} from './sonyBuzzSupportedProfile'
import { PRIMARY_BUZZ } from './logicalAction'
import { teamId } from '../game/ids'
import { createTeamDefinitions } from '../game/teams/definition'

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

  it('materializes several Buzzers for one team: every slot buzzes its own team (CBN-1)', () => {
    const a = teamId('a')
    const b = teamId('b')
    const result = materializeSupportedProfileMapping({
      controllerIndex: 0,
      associations: [
        { slotId: 1, teamId: a },
        { slotId: 2, teamId: b },
        { slotId: 3, teamId: a },
        { slotId: 4, teamId: a },
      ],
      teams: [{ id: a }, { id: b }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mapping.bindings).toHaveLength(4 * SONY_BUZZ_COLORS.length)
    const primaryTeamForSlot = (slot: 1 | 2 | 3 | 4) =>
      result.mapping.bindings.find(
        (binding) =>
          binding.buttonIndex === buttonIndexForSlotColor(slot, 'red') &&
          binding.action.kind === 'primary-buzz',
      )?.teamId
    expect(primaryTeamForSlot(1)).toBe(a)
    expect(primaryTeamForSlot(2)).toBe(b)
    expect(primaryTeamForSlot(3)).toBe(a)
    expect(primaryTeamForSlot(4)).toBe(a)
  })

  it('still refuses the same Buzzer slot twice (CBN-1)', () => {
    const a = teamId('a')
    const b = teamId('b')
    const result = materializeSupportedProfileMapping({
      controllerIndex: 0,
      associations: [
        { slotId: 2, teamId: a },
        { slotId: 2, teamId: b },
      ],
      teams: [{ id: a }, { id: b }],
    })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toMatch(/Buzzer 2/)
  })

  it('teamSetSignature is deterministic and order-independent', () => {
    const a = teamId('alpha')
    const b = teamId('beta')
    const c = teamId('gamma')
    const forward = teamSetSignature([{ id: a }, { id: b }, { id: c }])
    const reverse = teamSetSignature([{ id: c }, { id: b }, { id: a }])
    const shuffled = teamSetSignature([{ id: b }, { id: a }, { id: c }])
    expect(forward).toBe(reverse)
    expect(forward).toBe(shuffled)
    expect(forward).toBe(`${String(a)}\u001f${String(b)}\u001f${String(c)}`)
    expect(teamSetSignature([{ id: a }, { id: b }])).not.toBe(forward)
    expect(teamSetSignature([{ id: a }, { id: c }])).not.toBe(
      teamSetSignature([{ id: a }, { id: b }]),
    )
  })
})


describe('defaultSonyBuzzSlotAssociations', () => {
  it('maps Controller N to Team N without persisting', () => {
    const teams = createTeamDefinitions([
      { id: 'a', name: 'A', accent: 'crimson' },
      { id: 'b', name: 'B', accent: 'azure' },
      { id: 'c', name: 'C', accent: 'emerald' },
      { id: 'd', name: 'D', accent: 'amber' },
    ])
    expect(defaultSonyBuzzSlotAssociations(teams)).toEqual([
      { slotId: 1, teamId: 'a' },
      { slotId: 2, teamId: 'b' },
      { slotId: 3, teamId: 'c' },
      { slotId: 4, teamId: 'd' },
    ])
    expect(defaultSonyBuzzSlotAssociations(teams.slice(0, 2))).toEqual([
      { slotId: 1, teamId: 'a' },
      { slotId: 2, teamId: 'b' },
    ])
  })
})

describe('CB-04 canonical buzzer labels', () => {
  it('every Wbuzz button maps back to exactly one Buzzer N and colour (inverse of the layout)', () => {
    const seen = new Set<string>()
    for (const slot of [1, 2, 3, 4] as const) {
      for (const color of SONY_BUZZ_COLORS) {
        const index = buttonIndexForSlotColor(slot, color)
        expect(sonyBuzzHandsetForButton(index)).toEqual({ slotId: slot, color })
        seen.add(`${slot}:${color}`)
      }
    }
    expect(seen.size).toBe(20)
    expect(sonyBuzzHandsetForButton(20)).toBeNull()
    expect(sonyBuzzHandsetForButton(-1)).toBeNull()
    expect(sonyBuzzHandsetForButton(1.5)).toBeNull()
  })

  it('labels a handset button as "Buzzer N · Colour" with no raw controller or button index', () => {
    expect(sonyBuzzButtonLabel(buttonIndexForSlotColor(2, 'red'))).toBe('Buzzer 2 · Red')
    expect(sonyBuzzButtonLabel(buttonIndexForSlotColor(4, 'yellow'))).toBe('Buzzer 4 · Yellow')
    expect(sonyBuzzButtonLabel(buttonIndexForSlotColor(1, 'blue'))).toBe('Buzzer 1 · Blue')
    expect(sonyBuzzButtonLabel(99)).toBeNull()
    for (const slot of [1, 2, 3, 4] as const) {
      expect(sonyBuzzerLabel(slot)).toBe(`Buzzer ${slot}`)
    }
  })
})
