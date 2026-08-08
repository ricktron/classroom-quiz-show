import { describe, expect, it } from 'vitest'
import {
  createPackPathTracker,
  isAllowedV1EntryPath,
  toPackMediaPath,
  validatePackEntryPath,
} from './paths'
import { GAME_ENTRY_PATH, MANIFEST_PATH } from './constants'

describe('pack paths', () => {
  it('maps canonical source paths under media/', () => {
    expect(toPackMediaPath('photos/clue.png')).toBe('media/photos/clue.png')
  })

  it('allows only v1 root and media entries', () => {
    expect(isAllowedV1EntryPath(MANIFEST_PATH)).toBe(true)
    expect(isAllowedV1EntryPath(GAME_ENTRY_PATH)).toBe(true)
    expect(isAllowedV1EntryPath('media/photos/clue.png')).toBe(true)
    expect(isAllowedV1EntryPath('extra.txt')).toBe(false)
  })

  it.each([
    '../secret.png',
    '/absolute.png',
    'media\\x.png',
    'C:/windows/path.png',
    'media:bad.png',
    'media/%2e%2e/x.png',
    'media//x.png',
    'media/x.png?x=1',
    'media/x.png#frag',
    'media/x.png\n',
    'media/.',
  ])('rejects unsafe entry path %s', (path) => {
    expect(validatePackEntryPath(path)).toBe(false)
    expect(isAllowedV1EntryPath(path)).toBe(false)
  })

  it('detects duplicate and case-variant collisions', () => {
    const tracker = createPackPathTracker()
    expect(tracker.add('media/A.png').ok).toBe(true)
    expect(tracker.add('media/A.png').ok).toBe(false)
    const second = createPackPathTracker()
    expect(second.add('media/a.png').ok).toBe(true)
    expect(second.add('media/A.png').ok).toBe(false)
  })
})
