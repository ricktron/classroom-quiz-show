/**
 * Slice 22 — stable semantic presentation cue IDs.
 *
 * Gameplay code must never know asset filenames. Cue IDs are the only
 * presentation vocabulary between authoritative facts and the asset registry.
 */

export const PRESENTATION_CUE_IDS = [
  'active-claim',
  'positive-award',
  'incorrect',
  'timer-expired',
  'game-complete',
] as const

export type PresentationCueId = (typeof PRESENTATION_CUE_IDS)[number]

const CUE_ID_SET: ReadonlySet<string> = new Set(PRESENTATION_CUE_IDS)

export function isPresentationCueId(value: unknown): value is PresentationCueId {
  return typeof value === 'string' && CUE_ID_SET.has(value)
}
