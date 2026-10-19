import { describe, expect, it } from 'vitest'
import {
  FOLLOWER_CLASS_SETUP_NAMES_MESSAGE,
  FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE,
  FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE,
  UNREADABLE_SESSION_TEACHER_MESSAGE,
  UNKNOWN_WRITE_BLOCKED_MESSAGE,
  canPersistMutations,
  canPublishSessionTeamNames,
  rejectIfCannotPersist,
} from './writeAuthority'

const IMPLEMENTATION_LEAK =
  /persistence lease|host tab owns persistence|indexeddb|object store|\badapter\b|\bwire\b|transaction/i

describe('write authority', () => {
  it('allows only the leader to persist mutations', () => {
    expect(canPersistMutations('leader')).toBe(true)
    expect(canPersistMutations('follower')).toBe(false)
    expect(canPersistMutations('unknown')).toBe(false)
    expect(rejectIfCannotPersist('leader')).toBeNull()
  })

  it('allows Session team-name publish for leader and unknown, not follower (Phase 3 R1)', () => {
    // Storage-unavailable leaves leadership unknown; Class Setup must stay usable
    // and must not silently drop a "Selected" name. Follower is known read-only.
    expect(canPublishSessionTeamNames('leader')).toBe(true)
    expect(canPublishSessionTeamNames('unknown')).toBe(true)
    expect(canPublishSessionTeamNames('follower')).toBe(false)
    expect(FOLLOWER_CLASS_SETUP_NAMES_MESSAGE).not.toMatch(IMPLEMENTATION_LEAK)
  })

  it('uses teacher language for follower and unknown refusals', () => {
    expect(rejectIfCannotPersist('follower', 'editor')?.message).toBe(FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE)
    expect(rejectIfCannotPersist('follower', 'home')?.message).toBe(FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE)
    expect(rejectIfCannotPersist('unknown')?.message).toBe(UNKNOWN_WRITE_BLOCKED_MESSAGE)
    expect(FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE).not.toMatch(IMPLEMENTATION_LEAK)
    expect(FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE).not.toMatch(IMPLEMENTATION_LEAK)
    expect(UNKNOWN_WRITE_BLOCKED_MESSAGE).not.toMatch(IMPLEMENTATION_LEAK)
    expect(UNREADABLE_SESSION_TEACHER_MESSAGE).not.toMatch(IMPLEMENTATION_LEAK)
  })
})
