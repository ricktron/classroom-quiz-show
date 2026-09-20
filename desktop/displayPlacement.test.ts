import { describe, expect, it } from 'vitest'
import {
  decideAudienceDisplayPlacement,
  decideAudienceDisplayRescue,
  fitWindowInWorkArea,
  pointInRect,
  rectsOverlap,
  windowAlreadyOnPlacement,
  windowOnAnyConnectedDisplay,
  type DisplayScreenInfo,
} from './displayPlacement'

const primary: DisplayScreenInfo = {
  id: 1,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
}

const externalRight: DisplayScreenInfo = {
  id: 2,
  bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
  workArea: { x: 1920, y: 0, width: 1920, height: 1080 },
}

const externalLeftNegative: DisplayScreenInfo = {
  id: 3,
  bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
  workArea: { x: -1920, y: 25, width: 1920, height: 1055 },
}

const externalAbove: DisplayScreenInfo = {
  id: 4,
  bounds: { x: 0, y: -1200, width: 1600, height: 1200 },
  workArea: { x: 0, y: -1175, width: 1600, height: 1175 },
}

const externalFar: DisplayScreenInfo = {
  id: 5,
  bounds: { x: 4000, y: 0, width: 1920, height: 1080 },
  workArea: { x: 4000, y: 0, width: 1920, height: 1080 },
}

describe('decideAudienceDisplayPlacement', () => {
  it('does not place when only one display exists', () => {
    expect(
      decideAudienceDisplayPlacement({
        displays: [primary],
        hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
      }),
    ).toEqual({ kind: 'no-placement', reason: 'single-display' })
  })

  it('places on the sole non-Host display', () => {
    const decision = decideAudienceDisplayPlacement({
      displays: [primary, externalRight],
      hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
    })
    expect(decision.kind).toBe('place')
    if (decision.kind !== 'place') return
    expect(decision.displayId).toBe(2)
    expect(decision.bounds).toEqual(fitWindowInWorkArea(externalRight.workArea))
    expect(decision.bounds.x).toBe(1920)
  })

  it('places onto a negative-coordinate external display', () => {
    const decision = decideAudienceDisplayPlacement({
      displays: [primary, externalLeftNegative],
      hostBounds: { x: 200, y: 200, width: 1000, height: 700 },
    })
    expect(decision.kind).toBe('place')
    if (decision.kind !== 'place') return
    expect(decision.displayId).toBe(3)
    expect(decision.bounds.x).toBe(-1920)
    expect(decision.bounds.y).toBe(25)
    expect(pointInRect(decision.bounds.x + 10, decision.bounds.y + 10, externalLeftNegative.workArea)).toBe(
      true,
    )
  })

  it('places onto an external display above the primary (negative y)', () => {
    const decision = decideAudienceDisplayPlacement({
      displays: [primary, externalAbove],
      hostBounds: { x: 10, y: 10, width: 800, height: 600 },
    })
    expect(decision.kind).toBe('place')
    if (decision.kind !== 'place') return
    expect(decision.displayId).toBe(4)
    expect(decision.bounds.y).toBeLessThan(0)
  })

  it('refuses to guess among multiple external displays', () => {
    expect(
      decideAudienceDisplayPlacement({
        displays: [primary, externalRight, externalLeftNegative],
        hostBounds: { x: 100, y: 100, width: 800, height: 600 },
      }),
    ).toEqual({ kind: 'no-placement', reason: 'ambiguous-external' })
  })

  it('reports host-display-unknown when Host bounds are off every screen', () => {
    expect(
      decideAudienceDisplayPlacement({
        displays: [primary, externalRight],
        hostBounds: { x: 50_000, y: 50_000, width: 100, height: 100 },
      }),
    ).toEqual({ kind: 'no-placement', reason: 'host-display-unknown' })
  })

  it('treats already-correct placement as already on target', () => {
    const decision = decideAudienceDisplayPlacement({
      displays: [primary, externalRight],
      hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
    })
    expect(decision.kind).toBe('place')
    if (decision.kind !== 'place') return
    expect(
      windowAlreadyOnPlacement(
        { x: 2000, y: 40, width: 1280, height: 800 },
        decision,
      ),
    ).toBe(true)
    expect(
      windowAlreadyOnPlacement(
        { x: 40, y: 40, width: 1280, height: 800 },
        decision,
      ),
    ).toBe(false)
  })
})

describe('decideAudienceDisplayRescue', () => {
  it('rescues stale external bounds onto the sole remaining Host screen after disconnect', () => {
    const staleProjectorBounds = { x: 2000, y: 40, width: 1280, height: 800 }
    expect(windowOnAnyConnectedDisplay(staleProjectorBounds, [primary])).toBe(false)

    const rescue = decideAudienceDisplayRescue({
      displays: [primary],
      hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
      windowBounds: staleProjectorBounds,
    })
    expect(rescue.kind).toBe('rescue')
    if (rescue.kind !== 'rescue') return
    expect(rescue.displayId).toBe(1)
    expect(rescue.bounds).toEqual(fitWindowInWorkArea(primary.workArea))
    expect(windowOnAnyConnectedDisplay(rescue.bounds, [primary])).toBe(true)
  })

  it('rescues off-screen Display to Host screen when multiple screens remain', () => {
    const vanishedProjectorBounds = { x: 50_000, y: 40, width: 1280, height: 800 }
    const rescue = decideAudienceDisplayRescue({
      displays: [primary, externalRight],
      hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
      windowBounds: vanishedProjectorBounds,
    })
    expect(rescue.kind).toBe('rescue')
    if (rescue.kind !== 'rescue') return
    expect(rescue.displayId).toBe(1)
    expect(rescue.bounds.x).toBe(0)
    expect(rescue.displayId).not.toBe(externalRight.id)
  })

  it('does not rescue when Display still intersects a connected display under ambiguous topology', () => {
    const partiallyOnPrimary = { x: 1800, y: 100, width: 400, height: 600 }
    expect(rectsOverlap(partiallyOnPrimary, primary.bounds)).toBe(true)
    expect(
      decideAudienceDisplayRescue({
        displays: [primary, externalRight, externalFar],
        hostBounds: { x: 100, y: 100, width: 800, height: 600 },
        windowBounds: partiallyOnPrimary,
      }),
    ).toEqual({ kind: 'no-rescue', reason: 'already-on-connected-display' })
  })

  it('rescues onto a negative-coordinate Host screen', () => {
    const hostOnLeft = { x: -1800, y: 40, width: 1280, height: 800 }
    const stale = { x: 50_000, y: 0, width: 800, height: 600 }
    const rescue = decideAudienceDisplayRescue({
      displays: [externalLeftNegative, primary],
      hostBounds: hostOnLeft,
      windowBounds: stale,
    })
    expect(rescue.kind).toBe('rescue')
    if (rescue.kind !== 'rescue') return
    expect(rescue.displayId).toBe(3)
    expect(rescue.bounds.x).toBe(-1920)
    expect(rescue.bounds.y).toBe(25)
  })

  it('refuses rescue when Host is unknown and multiple screens remain', () => {
    expect(
      decideAudienceDisplayRescue({
        displays: [primary, externalRight],
        hostBounds: { x: 50_000, y: 50_000, width: 100, height: 100 },
        windowBounds: { x: 60_000, y: 0, width: 800, height: 600 },
      }),
    ).toEqual({ kind: 'no-rescue', reason: 'no-safe-target' })
  })

  it('still places onto the sole external after rescue is unnecessary', () => {
    const onHost = { x: 40, y: 40, width: 1280, height: 800 }
    expect(
      decideAudienceDisplayRescue({
        displays: [primary, externalRight],
        hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
        windowBounds: onHost,
      }),
    ).toEqual({ kind: 'no-rescue', reason: 'already-on-connected-display' })

    const placement = decideAudienceDisplayPlacement({
      displays: [primary, externalRight],
      hostBounds: { x: 100, y: 100, width: 1280, height: 800 },
    })
    expect(placement.kind).toBe('place')
    if (placement.kind !== 'place') return
    expect(windowAlreadyOnPlacement(onHost, placement)).toBe(false)
    expect(windowAlreadyOnPlacement(placement.bounds, placement)).toBe(true)
  })
})
