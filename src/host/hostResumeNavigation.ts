/**
 * Navigation intent: Home Resume should perform Host recovery once, without a
 * second Resume gate. Intent is route-state only (lost on hard refresh), which
 * preserves ADR-013 explicit recovery on cold boot.
 */
export const HOST_RESUME_RECOVERY_STATE = 'cqsResumeRecovery' as const

export type HostResumeRecoveryState = {
  readonly [HOST_RESUME_RECOVERY_STATE]?: true
}

export function hostResumeRecoveryState(): HostResumeRecoveryState {
  return { [HOST_RESUME_RECOVERY_STATE]: true }
}

export function shouldResumeRecoveryFromNavigation(state: unknown): boolean {
  if (state === null || typeof state !== 'object') return false
  return (state as HostResumeRecoveryState)[HOST_RESUME_RECOVERY_STATE] === true
}
