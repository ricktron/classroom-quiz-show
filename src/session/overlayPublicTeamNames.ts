/**
 * Overlay session-owned display names onto existing public team fields.
 *
 * This changes values of already-public `name` fields only. It does not add
 * keys, bank contents, controller diagnostics, or any new wire field.
 */

import type { PublicState } from '../state/publicState'
import { isPublicState } from '../state/publicState'

export function overlayPublicTeamNames(
  publicState: PublicState,
  namesByOrder: readonly string[] | null | undefined,
): PublicState {
  if (!namesByOrder || namesByOrder.length === 0) return publicState
  if (publicState.teams?.status !== 'available' || !publicState.teams.teams) return publicState
  const teams = publicState.teams.teams.map((team, index) => {
    const overlay = namesByOrder[index]
    if (typeof overlay !== 'string' || overlay.trim().length === 0) return team
    return { ...team, name: overlay }
  })
  const next: PublicState = {
    ...publicState,
    teams: {
      ...publicState.teams,
      teams,
    },
  }
  return isPublicState(next) ? next : publicState
}
