import { describe, expect, it } from 'vitest'
import type { SonyBuzzTransportHealth } from './sonyBuzzKeepAliveLifecycle'
import {
  addRespondingSlot,
  classifyControllerLayer,
  classifyMappingLayer,
  classifyReceiverLayer,
  classifyTeacherSummary,
  discoveredControllerLine,
  nextRepairStep,
  repairStepCopy,
  respondingControllerCountLabel,
  slotIdForPrimaryRedButton,
  teacherSummaryLabel,
  SONY_BUZZ_REPAIR_STEP_ORDER,
} from './sonyBuzzTeacherReadiness'

describe('classifyReceiverLayer', () => {
  const cases: Array<[SonyBuzzTransportHealth, string]> = [
    ['healthy', 'connected'],
    ['degraded', 'connected'],
    ['disconnected', 'disconnected'],
    ['disabled', 'disabled'],
    ['failed', 'failed'],
    ['permission-required', 'needs-permission'],
    ['unsupported-api', 'unsupported'],
    ['connecting', 'connecting'],
    ['recovering', 'recovering'],
  ]
  for (const [health, layer] of cases) {
    it(`maps ${health} → ${layer}`, () => {
      expect(classifyReceiverLayer(health)).toBe(layer)
    })
  }
})

describe('teacher summary — transport healthy alone is not ready', () => {
  it('healthy + no controller input → waiting for controllers', () => {
    const summary = classifyTeacherSummary({
      receiver: 'connected',
      controllers: 'waiting',
      mapping: 'ready',
    })
    expect(summary).toBe('receiver-waiting-for-controllers')
    expect(teacherSummaryLabel(summary)).toMatch(/waiting for controllers/i)
    expect(teacherSummaryLabel(summary)).not.toMatch(/^Sony Buzz ready/)
  })

  it('healthy + responding + mapping absent → team setup required', () => {
    const summary = classifyTeacherSummary({
      receiver: 'connected',
      controllers: 'responding',
      mapping: 'absent',
    })
    expect(summary).toBe('controllers-need-team-setup')
    expect(teacherSummaryLabel(summary)).toMatch(/team setup required/i)
  })

  it('healthy + responding + mapping ready → Sony Buzz ready', () => {
    expect(
      classifyTeacherSummary({
        receiver: 'connected',
        controllers: 'responding',
        mapping: 'ready',
      }),
    ).toBe('sony-buzz-ready')
  })

  it('disconnected keeps keyboard-available wording', () => {
    expect(teacherSummaryLabel('receiver-disconnected')).toMatch(/keyboard remains available/i)
  })
})

describe('mapping layer', () => {
  it('absent when no associations', () => {
    expect(classifyMappingLayer('absent', 0)).toBe('absent')
    expect(classifyMappingLayer('ready', 0)).toBe('absent')
  })

  it('ready when saved associations present', () => {
    expect(classifyMappingLayer('ready', 3)).toBe('ready')
  })
})

describe('controller discovery progression', () => {
  it('counts responding slots', () => {
    expect(classifyControllerLayer(0)).toBe('waiting')
    expect(classifyControllerLayer(2)).toBe('responding')
  })

  it('labels progressive detection without physical handset numbers', () => {
    expect(respondingControllerCountLabel(0)).toMatch(/No controllers/i)
    expect(discoveredControllerLine(1)).toBe('Controller 1 detected')
    expect(discoveredControllerLine(2)).toBe('Controller 2 detected')
    expect(discoveredControllerLine(3)).toBe('Controller 3 detected')
  })

  it('maps only primary Red button indexes to slots', () => {
    expect(slotIdForPrimaryRedButton(0)).toBe(1)
    expect(slotIdForPrimaryRedButton(5)).toBe(2)
    expect(slotIdForPrimaryRedButton(10)).toBe(3)
    expect(slotIdForPrimaryRedButton(15)).toBe(4)
    expect(slotIdForPrimaryRedButton(1)).toBeNull()
    expect(slotIdForPrimaryRedButton(6)).toBeNull()
  })

  it('accumulates unique slots in order', () => {
    expect(addRespondingSlot([], 2)).toEqual([2])
    expect(addRespondingSlot([2], 1)).toEqual([1, 2])
    expect(addRespondingSlot([1, 2], 2)).toEqual([1, 2])
  })
})

describe('repair flow order and copy', () => {
  it('walks power-off → solid-blue → bind-blink → observe-red → done', () => {
    expect(SONY_BUZZ_REPAIR_STEP_ORDER).toEqual([
      'power-off',
      'solid-blue',
      'bind-blink',
      'observe-red',
    ])
    expect(nextRepairStep('idle')).toBe('power-off')
    expect(nextRepairStep('power-off')).toBe('solid-blue')
    expect(nextRepairStep('solid-blue')).toBe('bind-blink')
    expect(nextRepairStep('bind-blink')).toBe('observe-red')
    expect(nextRepairStep('observe-red')).toBe('done')
  })

  it('exposes teacher CTAs without BIND+Red shortcut language', () => {
    expect(repairStepCopy('solid-blue').cta).toBe('All controller lights are solid blue')
    expect(repairStepCopy('bind-blink').cta).toBe('They blinked')
    expect(repairStepCopy('solid-blue').body).toMatch(/Do not press BIND yet/i)
    expect(repairStepCopy('observe-red').body).toMatch(/Press RED/i)
  })
})
