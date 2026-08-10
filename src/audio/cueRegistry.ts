/**
 * Slice 22 — MVP cue registry (one personality: modern/core).
 *
 * Future personalities may replace this mapping without changing gameplay
 * semantics or GameDefinition / event contracts. This is intentionally not a
 * plugin loader, pack selector, or remote manifest.
 */

import type { PresentationCueId } from './presentationCueId'
import { PRESENTATION_CUE_IDS } from './presentationCueId'

import activeClaimUrl from '../assets/audio/core/active-claim.wav'
import positiveAwardUrl from '../assets/audio/core/positive-award.wav'
import incorrectUrl from '../assets/audio/core/incorrect.wav'
import timerExpiredUrl from '../assets/audio/core/timer-expired.wav'
import gameCompleteUrl from '../assets/audio/core/game-complete.wav'

export type CueRegistry = Readonly<Record<PresentationCueId, string>>

/** Application-owned commercially safe core personality for MVP. */
export const CORE_CUE_REGISTRY: CueRegistry = Object.freeze({
  'active-claim': activeClaimUrl,
  'positive-award': positiveAwardUrl,
  incorrect: incorrectUrl,
  'timer-expired': timerExpiredUrl,
  'game-complete': gameCompleteUrl,
})

export function assetUrlForCue(
  cueId: PresentationCueId,
  registry: CueRegistry = CORE_CUE_REGISTRY,
): string {
  return registry[cueId]
}

export function allCueAssetUrls(registry: CueRegistry = CORE_CUE_REGISTRY): readonly string[] {
  return PRESENTATION_CUE_IDS.map((id) => registry[id])
}
