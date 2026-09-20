/**
 * Pure policy: audience Display intentional placement and off-screen rescue.
 *
 * Two distinct decisions (do not conflate):
 * - Placement: where to put Display when exactly one non-Host screen exists.
 * - Rescue: if Display is stranded off every connected screen, bring it back
 *   onto a teacher-visible connected screen (prefer Host's screen).
 *
 * No Electron import. Main-process code maps screen APIs into these shapes.
 * Ambiguous multi-monitor topologies refuse to guess a projector.
 */

export interface DisplayRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface DisplayScreenInfo {
  readonly id: number
  readonly bounds: DisplayRect
  /** Usable area excluding OS chrome (taskbar/menu bar). Prefer for placement. */
  readonly workArea: DisplayRect
}

export type AudienceDisplayPlacementDecision =
  | {
      readonly kind: 'no-placement'
      readonly reason: 'single-display' | 'ambiguous-external' | 'host-display-unknown'
    }
  | {
      readonly kind: 'place'
      /** Target OS display id (for tests / diagnostics; never shown to teachers). */
      readonly displayId: number
      /** Full usable area of the target display (membership / already-there checks). */
      readonly workArea: DisplayRect
      /** Window bounds to apply (fitted inside workArea). */
      readonly bounds: DisplayRect
    }

export type AudienceDisplayRescueDecision =
  | {
      readonly kind: 'no-rescue'
      readonly reason: 'already-on-connected-display' | 'no-safe-target'
    }
  | {
      readonly kind: 'rescue'
      readonly displayId: number
      readonly workArea: DisplayRect
      readonly bounds: DisplayRect
    }

const DEFAULT_DISPLAY_WIDTH = 1280
const DEFAULT_DISPLAY_HEIGHT = 800

export function pointInRect(x: number, y: number, rect: DisplayRect): boolean {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height
  )
}

/** True when two axis-aligned rects share a positive-area intersection. */
export function rectsOverlap(a: DisplayRect, b: DisplayRect): boolean {
  const left = Math.max(a.x, b.x)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const top = Math.max(a.y, b.y)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > left && bottom > top
}

export function displayContainingPoint(
  displays: readonly DisplayScreenInfo[],
  x: number,
  y: number,
): DisplayScreenInfo | null {
  for (const display of displays) {
    if (pointInRect(x, y, display.bounds)) return display
  }
  return null
}

export function windowCenter(bounds: DisplayRect): { readonly x: number; readonly y: number } {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

/**
 * A window is still teacher-recoverable if any positive-area overlap remains
 * with a connected display's full bounds (not merely center-point ownership).
 * Uses bounds rather than workArea so chrome overlap still counts as visible.
 */
export function windowOnAnyConnectedDisplay(
  windowBounds: DisplayRect,
  displays: readonly DisplayScreenInfo[],
): boolean {
  return displays.some((display) => rectsOverlap(windowBounds, display.bounds))
}

/**
 * Choose audience-Display placement from Host window bounds and OS displays.
 *
 * - One display: open normally; do not claim projector placement.
 * - Host display + exactly one other: place on the other display's work area.
 * - Multiple external candidates: no silent guess.
 */
export function decideAudienceDisplayPlacement(input: {
  readonly displays: readonly DisplayScreenInfo[]
  readonly hostBounds: DisplayRect
}): AudienceDisplayPlacementDecision {
  const { displays, hostBounds } = input
  if (displays.length <= 1) {
    return { kind: 'no-placement', reason: 'single-display' }
  }

  const center = windowCenter(hostBounds)
  const hostDisplay = displayContainingPoint(displays, center.x, center.y)
  if (!hostDisplay) {
    return { kind: 'no-placement', reason: 'host-display-unknown' }
  }

  const external = displays.filter((d) => d.id !== hostDisplay.id)
  if (external.length === 0) {
    return { kind: 'no-placement', reason: 'single-display' }
  }
  if (external.length > 1) {
    return { kind: 'no-placement', reason: 'ambiguous-external' }
  }

  const target = external[0]
  return {
    kind: 'place',
    displayId: target.id,
    workArea: target.workArea,
    bounds: fitWindowInWorkArea(target.workArea),
  }
}

/**
 * Rescue a Display stranded outside every currently connected screen.
 *
 * Prefer the Host's screen; else the sole connected screen; else refuse to
 * guess among multiple screens when Host ownership is unknown.
 * This is recoverability, not projector selection.
 */
export function decideAudienceDisplayRescue(input: {
  readonly displays: readonly DisplayScreenInfo[]
  readonly hostBounds: DisplayRect
  readonly windowBounds: DisplayRect
}): AudienceDisplayRescueDecision {
  const { displays, hostBounds, windowBounds } = input
  if (displays.length === 0) {
    return { kind: 'no-rescue', reason: 'no-safe-target' }
  }
  if (windowOnAnyConnectedDisplay(windowBounds, displays)) {
    return { kind: 'no-rescue', reason: 'already-on-connected-display' }
  }

  const hostCenter = windowCenter(hostBounds)
  const hostDisplay = displayContainingPoint(displays, hostCenter.x, hostCenter.y)
  if (hostDisplay) {
    return {
      kind: 'rescue',
      displayId: hostDisplay.id,
      workArea: hostDisplay.workArea,
      bounds: fitWindowInWorkArea(hostDisplay.workArea),
    }
  }

  if (displays.length === 1) {
    const only = displays[0]
    return {
      kind: 'rescue',
      displayId: only.id,
      workArea: only.workArea,
      bounds: fitWindowInWorkArea(only.workArea),
    }
  }

  return { kind: 'no-rescue', reason: 'no-safe-target' }
}

/** True when the window's center already lies on the target work area. */
export function windowAlreadyOnPlacement(
  windowBounds: DisplayRect,
  decision: AudienceDisplayPlacementDecision,
): boolean {
  if (decision.kind !== 'place') return false
  const center = windowCenter(windowBounds)
  return pointInRect(center.x, center.y, decision.workArea)
}

/**
 * Fit a default Display size into a work area without leaving the area.
 * Handles negative-origin monitors by using workArea.x / workArea.y as-is.
 */
export function fitWindowInWorkArea(workArea: DisplayRect): DisplayRect {
  const width = Math.max(320, Math.min(DEFAULT_DISPLAY_WIDTH, workArea.width))
  const height = Math.max(240, Math.min(DEFAULT_DISPLAY_HEIGHT, workArea.height))
  return {
    x: workArea.x,
    y: workArea.y,
    width,
    height,
  }
}
