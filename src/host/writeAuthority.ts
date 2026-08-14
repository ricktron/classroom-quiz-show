export type PersistLeadership = 'unknown' | 'leader' | 'follower'
export type PersistWriteSurface = 'editor' | 'home'

export const FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE =
  'Another Classroom Quiz Show window is currently responsible for saving. Your edits are still here.'

export const FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE =
  'Another Classroom Quiz Show window is currently responsible for saving.'

export const UNKNOWN_WRITE_BLOCKED_MESSAGE =
  'Your edits could not be saved. They are still open here.'

export const UNREADABLE_SESSION_TEACHER_MESSAGE =
  'This unfinished class session could not be read.'

export function canPersistMutations(leadership: PersistLeadership): boolean {
  return leadership === 'leader'
}

export function rejectIfCannotPersist(
  leadership: PersistLeadership,
  surface: PersistWriteSurface = 'home',
): { readonly ok: false; readonly message: string } | null {
  if (canPersistMutations(leadership)) return null
  if (leadership === 'follower') {
    return {
      ok: false,
      message:
        surface === 'editor' ? FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE : FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE,
    }
  }
  return { ok: false, message: UNKNOWN_WRITE_BLOCKED_MESSAGE }
}
