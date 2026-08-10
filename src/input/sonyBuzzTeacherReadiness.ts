import type { SonyBuzzTransportHealth } from './sonyBuzzKeepAliveLifecycle'
import {
  SONY_BUZZ_COLOR_OFFSET,
  SONY_BUZZ_HANDSET_SLOT_COUNT,
  SONY_BUZZ_SLOT_BASES,
  type SonyBuzzSlotId,
  sonyBuzzSlotId,
} from './sonyBuzzSupportedProfile'

/**
 * Teacher-facing readiness layers for the supported Sony Buzz profile.
 *
 * Transport health (WebHID keep-alive) is NEVER alone treated as “Sony Buzz
 * ready.” Controllers responding and team mapping are separate layers.
 *
 * Pure helpers only — no React, no HID, no Gamepad polling.
 */

export type SonyBuzzReceiverLayer =
  | 'unsupported'
  | 'needs-permission'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'disabled'
  | 'recovering'

export type SonyBuzzControllerLayer = 'waiting' | 'responding'

export type SonyBuzzMappingLayer =
  | 'loading'
  | 'absent'
  | 'ready'
  | 'needs-reassign'
  | 'unusable'

export type SonyBuzzTeacherSummary =
  | 'receiver-disconnected'
  | 'receiver-waiting-for-controllers'
  | 'controllers-need-team-setup'
  | 'sony-buzz-ready'
  | 'receiver-needs-attention'
  | 'receiver-paused'

export type SonyBuzzRepairStep =
  | 'idle'
  | 'power-off'
  | 'solid-blue'
  | 'bind-blink'
  | 'observe-red'
  | 'done'

export function classifyReceiverLayer(health: SonyBuzzTransportHealth): SonyBuzzReceiverLayer {
  switch (health) {
    case 'unsupported-api':
      return 'unsupported'
    case 'permission-required':
      return 'needs-permission'
    case 'connecting':
      return 'connecting'
    case 'healthy':
    case 'degraded':
      return 'connected'
    case 'disconnected':
      return 'disconnected'
    case 'failed':
      return 'failed'
    case 'disabled':
      return 'disabled'
    case 'recovering':
      return 'recovering'
  }
}

export function classifyControllerLayer(respondingSlotCount: number): SonyBuzzControllerLayer {
  return respondingSlotCount > 0 ? 'responding' : 'waiting'
}

export function classifyMappingLayer(
  mappingStatus: string,
  associationCount: number,
): SonyBuzzMappingLayer {
  if (mappingStatus === 'loading') return 'loading'
  if (mappingStatus === 'stale') return 'needs-reassign'
  if (mappingStatus === 'unsupported-version' || mappingStatus === 'malformed') return 'unusable'
  if (associationCount === 0 || mappingStatus === 'absent') return 'absent'
  if (mappingStatus === 'ready') return 'ready'
  return associationCount > 0 ? 'ready' : 'absent'
}

/**
 * Composite teacher summary. Receiver `connected`/`healthy` alone is never
 * “Sony Buzz ready.”
 */
export function classifyTeacherSummary(input: {
  readonly receiver: SonyBuzzReceiverLayer
  readonly controllers: SonyBuzzControllerLayer
  readonly mapping: SonyBuzzMappingLayer
}): SonyBuzzTeacherSummary {
  if (input.receiver === 'disconnected') return 'receiver-disconnected'
  if (input.receiver === 'disabled') return 'receiver-paused'
  if (
    input.receiver === 'unsupported' ||
    input.receiver === 'needs-permission' ||
    input.receiver === 'failed' ||
    input.receiver === 'recovering' ||
    input.receiver === 'connecting'
  ) {
    return 'receiver-needs-attention'
  }
  // receiver === 'connected'
  if (input.controllers === 'waiting') return 'receiver-waiting-for-controllers'
  if (input.mapping !== 'ready') return 'controllers-need-team-setup'
  return 'sony-buzz-ready'
}

export function teacherSummaryLabel(summary: SonyBuzzTeacherSummary): string {
  switch (summary) {
    case 'receiver-disconnected':
      return 'Receiver disconnected — keyboard remains available.'
    case 'receiver-paused':
      return 'Sony connection paused for pairing — keyboard remains available.'
    case 'receiver-waiting-for-controllers':
      return 'Receiver connected — waiting for controllers.'
    case 'controllers-need-team-setup':
      return 'Controllers responding — team setup required.'
    case 'sony-buzz-ready':
      return 'Sony Buzz ready.'
    case 'receiver-needs-attention':
      return 'Receiver needs attention — keyboard remains available.'
  }
}

export function receiverLayerLabel(layer: SonyBuzzReceiverLayer): string {
  switch (layer) {
    case 'unsupported':
      return 'WebHID unavailable in this browser'
    case 'needs-permission':
      return 'Permission required — use Connect Sony Buzz'
    case 'connecting':
      return 'Connecting…'
    case 'connected':
      return 'Receiver connected'
    case 'disconnected':
      return 'Receiver disconnected'
    case 'failed':
      return 'Receiver failed to reconnect'
    case 'disabled':
      return 'Sony connection paused'
    case 'recovering':
      return 'Receiver recovering…'
  }
}

export function controllerLayerLabel(
  layer: SonyBuzzControllerLayer,
  respondingSlotCount: number,
): string {
  if (layer === 'waiting') return 'Waiting for controller presses'
  if (respondingSlotCount === 1) return '1 controller responding'
  return `${respondingSlotCount} controllers responding`
}

export function mappingLayerLabel(layer: SonyBuzzMappingLayer): string {
  switch (layer) {
    case 'loading':
      return 'Loading saved team mapping…'
    case 'absent':
      return 'Team assignments not saved yet'
    case 'ready':
      return 'Team mapping saved'
    case 'needs-reassign':
      return 'Team mapping needs reassignment for this game'
    case 'unusable':
      return 'Saved mapping cannot be used — clear and reassign'
  }
}

/** Map a Gamepad button index to a profile slot when it is that slot’s Red. */
export function slotIdForPrimaryRedButton(buttonIndex: number): SonyBuzzSlotId | null {
  if (!Number.isInteger(buttonIndex) || buttonIndex < 0) return null
  const offset = SONY_BUZZ_COLOR_OFFSET.red
  for (let i = 0; i < SONY_BUZZ_HANDSET_SLOT_COUNT; i++) {
    if (buttonIndex === SONY_BUZZ_SLOT_BASES[i]! + offset) {
      return sonyBuzzSlotId(i)
    }
  }
  return null
}

export function addRespondingSlot(
  current: readonly SonyBuzzSlotId[],
  slotId: SonyBuzzSlotId,
): readonly SonyBuzzSlotId[] {
  if (current.includes(slotId)) return current
  return [...current, slotId].sort((a, b) => a - b)
}

export function respondingControllerCountLabel(count: number): string {
  if (count <= 0) return 'No controllers detected yet'
  if (count === 1) return 'Controller 1 detected'
  return `${count} controllers detected`
}

export function discoveredControllerLine(ordinal: number): string {
  return `Controller ${ordinal} detected`
}

/** Ordered repair steps the teacher walks (excluding idle/done). */
export const SONY_BUZZ_REPAIR_STEP_ORDER: readonly Exclude<
  SonyBuzzRepairStep,
  'idle' | 'done'
>[] = ['power-off', 'solid-blue', 'bind-blink', 'observe-red'] as const

export function nextRepairStep(step: SonyBuzzRepairStep): SonyBuzzRepairStep {
  switch (step) {
    case 'idle':
      return 'power-off'
    case 'power-off':
      return 'solid-blue'
    case 'solid-blue':
      return 'bind-blink'
    case 'bind-blink':
      return 'observe-red'
    case 'observe-red':
      return 'done'
    case 'done':
      return 'done'
  }
}

export function repairStepCopy(step: Exclude<SonyBuzzRepairStep, 'idle' | 'done'>): {
  readonly title: string
  readonly body: string
  readonly cta: string | null
} {
  switch (step) {
    case 'power-off':
      return {
        title: 'Step 1 — Power off',
        body: 'Turn the Buzz controllers off.',
        cta: 'Controllers are off',
      }
    case 'solid-blue':
      return {
        title: 'Step 2 — Pairing lights',
        body: 'Hold POWER on each controller for about 4 seconds until its blue pairing light stays on (solid blue). Do not press BIND yet.',
        cta: 'All controller lights are solid blue',
      }
    case 'bind-blink':
      return {
        title: 'Step 3 — Receiver BIND',
        body: 'Hold BIND on the receiver until the controllers blink.',
        cta: 'They blinked',
      }
    case 'observe-red':
      return {
        title: 'Step 4 — Check controllers',
        body: 'Press RED on each controller. Newly responding controllers appear below. You do not need button numbers or browser indexes.',
        cta: null,
      }
  }
}
