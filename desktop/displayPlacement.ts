/**
 * Pure policy: where should the audience Display window be placed?
 *
 * No Electron import. Main-process code maps screen APIs into these shapes.
 * Ambiguous multi-monitor topologies refuse to guess.
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
