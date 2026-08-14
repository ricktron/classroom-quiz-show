import { describe, expect, it } from 'vitest'
import {
  FOLLOWER_EDITOR_WRITE_BLOCKED_MESSAGE,
  FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE,
  UNREADABLE_SESSION_TEACHER_MESSAGE,
  UNKNOWN_WRITE_BLOCKED_MESSAGE,
  canPersistMutations,
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
