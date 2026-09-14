/**
 * Host-only mapping from the existing Sony supported-profile actions to
 * team-name selection. Does not change the profile, button recipe, or gameplay
 * translator. Red never selects.
 */

import type { LocalInputAction } from './logicalAction'
import { TEAM_NAME_CHOICE_COLORS, type TeamNameChoiceColor } from '../session/teamNameSelection'

export const SONY_NAME_SELECTION_DEBOUNCE_MS = 40

export type SonyNameSelectionIntent =
  | { readonly kind: 'cycle' }
  | { readonly kind: 'claim'; readonly choiceIndex: 0 | 1 | 2 | 3; readonly color: TeamNameChoiceColor }

/**
 * Existing supported-profile actions:
 * yellow → secondary4, green → secondary3, orange → secondary2, blue → secondary1,
 * red → primary-buzz.
 */
export function intentFromSonyNameAction(action: LocalInputAction): SonyNameSelectionIntent | null {
  if (action.kind === 'primary-buzz') return { kind: 'cycle' }
  if (action.kind !== 'secondary') return null
  switch (action.slot) {
    case 'secondary4':
      return { kind: 'claim', choiceIndex: 0, color: 'yellow' }
    case 'secondary3':
      return { kind: 'claim', choiceIndex: 1, color: 'green' }
    case 'secondary2':
      return { kind: 'claim', choiceIndex: 2, color: 'orange' }
    case 'secondary1':
      return { kind: 'claim', choiceIndex: 3, color: 'blue' }
    default:
      return null
  }
}

export function choiceColorLabel(color: TeamNameChoiceColor, index: number): string {
  const word = color[0]?.toUpperCase() + color.slice(1)
  return `Choice ${index + 1}, ${word}`
}

export function shouldAcceptSonyNamePress(input: {
  readonly teamId: string
  readonly intentKey: string
  readonly now: number
  readonly last?: { readonly teamId: string; readonly intentKey: string; readonly at: number } | null
}): boolean {
  if (!input.last) return true
  if (input.last.teamId !== input.teamId || input.last.intentKey !== input.intentKey) return true
  return input.now - input.last.at >= SONY_NAME_SELECTION_DEBOUNCE_MS
}

export { TEAM_NAME_CHOICE_COLORS }
