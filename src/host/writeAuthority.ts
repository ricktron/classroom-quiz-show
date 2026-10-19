export type PersistLeadership = 'unknown' | 'leader' | 'follower'
export type PersistWriteSurface = 'editor' | 'home'

export const FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE =
  'Another Classroom Quiz Show window is currently responsible for saving. Your edits are still here.'

export const FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE =
  'Another Classroom Quiz Show window is currently responsible for saving.'

/**
 * Truthful Home copy for the controls a read-only (follower) window disables.
 * Saving returns to this window as soon as the other window closes.
 */
export const FOLLOWER_HOME_READ_ONLY_DETAIL =
  'This window is read-only until that window closes. Resume class, Start fresh, New Game, imports, and changes to your games are turned off here.'

/**
 * Class Setup Names when this window is a known follower.
 * Session team identities are Host mutations; a follower must not show
 * "Selected: …" for a name that never reaches the session (Phase 3 R1).
 */
export const FOLLOWER_CLASS_SETUP_NAMES_MESSAGE =
  'Another Classroom Quiz Show window is running this class. Team names cannot be changed here.'

export const UNKNOWN_WRITE_BLOCKED_MESSAGE =
  'Your edits could not be saved. They are still open here.'

export const UNREADABLE_SESSION_TEACHER_MESSAGE =
  'This unfinished class session could not be read.'

export function canPersistMutations(leadership: PersistLeadership): boolean {
  return leadership === 'leader'
}

/**
 * Whether Class Setup may publish Session team names into the live session.
 *
 * Matches session-command availability (`leadership !== 'follower'`): a storage-
 * unavailable / unknown window must remain usable and must not silently drop a
 * "Selected" name. A known follower is permanent read-only for this surface.
 */
export function canPublishSessionTeamNames(leadership: PersistLeadership): boolean {
  return leadership !== 'follower'
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

/** Whether this Host tab may broadcast sanitized PublicState on the sync channel. */
export function canPublishHostPublicState(input: {
  readonly bootPhase: 'loading' | 'recovery' | 'invalid-recovery' | 'ready'
  readonly leadership: PersistLeadership
  readonly durabilityStatus: 'loading' | 'unavailable' | 'idle' | 'saving' | 'saved' | 'failed'
}): boolean {
  if (input.bootPhase !== 'ready') return false
  if (input.leadership === 'follower') return false
  if (input.leadership === 'leader') return true
  return input.durabilityStatus === 'unavailable'
}
