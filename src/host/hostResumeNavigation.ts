/**
 * Navigation intent: Home Resume should perform Host recovery once, without a
 * second Resume gate. Intent is route-state only (lost on hard refresh), which
 * preserves ADR-013 explicit recovery on cold boot.
 *
 * Q1 also reuses this substrate for contextual Fix team count → Save → direct
 * Class Setup return: auto-resume + auto-confirm same-Game roster replace so
 * the teacher is not forced through Home / Play / Resume / replace theater.
 */
export const HOST_RESUME_RECOVERY_STATE = 'cqsResumeRecovery' as const
export const HOST_CONTEXTUAL_TEAM_COUNT_RETURN = 'cqsContextualTeamCountReturn' as const
export const HOST_SETUP_FOCUS = 'cqsSetupFocus' as const

export type HostSetupFocusTask = 'names' | 'teams' | 'buzzers'

export type HostResumeRecoveryState = {
  readonly [HOST_RESUME_RECOVERY_STATE]?: true
}

export type ContextualTeamCountReturnState = HostResumeRecoveryState & {
  readonly [HOST_CONTEXTUAL_TEAM_COUNT_RETURN]?: true
  readonly [HOST_SETUP_FOCUS]?: HostSetupFocusTask
}

export function hostResumeRecoveryState(): HostResumeRecoveryState {
  return { [HOST_RESUME_RECOVERY_STATE]: true }
}

/** Authoring Save → Host Class Setup after Fix team count (Q1 target path). */
export function contextualTeamCountReturnState(
  options: { readonly setupFocus?: HostSetupFocusTask } = {},
): ContextualTeamCountReturnState {
  return {
    [HOST_RESUME_RECOVERY_STATE]: true,
    [HOST_CONTEXTUAL_TEAM_COUNT_RETURN]: true,
    ...(options.setupFocus ? { [HOST_SETUP_FOCUS]: options.setupFocus } : {}),
  }
}

export function shouldResumeRecoveryFromNavigation(state: unknown): boolean {
  if (state === null || typeof state !== 'object') return false
  return (state as HostResumeRecoveryState)[HOST_RESUME_RECOVERY_STATE] === true
}

export function isContextualTeamCountReturn(state: unknown): boolean {
  if (state === null || typeof state !== 'object') return false
  return (state as ContextualTeamCountReturnState)[HOST_CONTEXTUAL_TEAM_COUNT_RETURN] === true
}

export function setupFocusFromNavigation(state: unknown): HostSetupFocusTask | null {
  if (state === null || typeof state !== 'object') return null
  const focus = (state as ContextualTeamCountReturnState)[HOST_SETUP_FOCUS]
  if (focus === 'names' || focus === 'teams' || focus === 'buzzers') return focus
  return null
}
